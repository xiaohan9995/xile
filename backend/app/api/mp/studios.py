import json

from flask import request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ...extensions import db, limiter
from ...models import Studio, Teacher, User
from .helpers import _is_studio_owner_teacher, _is_studio_manager, _studio_summary, escape_like
from . import mp_bp

MAX_TAGS = 8
MAX_TAG_LENGTH = 6
MAX_IMAGES = 9
MAX_COURSE_INTRO_LENGTH = 500
MAX_CONTACT_LENGTH = 64
MAX_CONTACT_IMAGE_LENGTH = 512

# Display fields a lead teacher may edit and submit for approval. Only these
# are editable from the mini program; the studio name, lead teachers, display
# order, city/district/coordinates/intro stay admin-owned. The editable set is:
# 轮播图片 (images)、标签 (tags)、地址 (address)、课程介绍 (courseIntro)、联系方式 (contact)
# 以及联系工作室图片 (contactImage)。
_EDITABLE_DRAFT_KEYS = {
    "address", "city", "district", "contact", "contactImage", "tags", "courseIntro", "images", "latitude", "longitude",
}


def _validate_tags(value):
    tags = [t.strip() for t in (value or "").split(",") if t.strip()]
    if len(tags) > MAX_TAGS:
        return f"标签最多 {MAX_TAGS} 个"
    if any(len(t) > MAX_TAG_LENGTH for t in tags):
        return f"每个标签最多 {MAX_TAG_LENGTH} 个字"
    return None


def _validate_images(value):
    if isinstance(value, str):
        images = [u.strip() for u in value.split(",") if u.strip()]
    elif isinstance(value, list):
        images = [str(u).strip() for u in value if str(u).strip()]
    else:
        images = []
    if len(images) > MAX_IMAGES:
        return None, f"图片最多 {MAX_IMAGES} 张"
    return images, None


def _draft_to_fields(draft):
    """Return the editable fields dict that should pre-fill the form.

    When a pending draft exists the teacher is editing the not-yet-approved
    content, so return it. Otherwise fall back to the published fields. Only
    the editable fields (address/city/district/contact/tags/courseIntro/images)
    are exposed.
    """
    images = [u.strip() for u in (draft.get("images") or "").split(",") if u.strip()] if isinstance(draft.get("images"), str) else (draft.get("images") or [])
    return {
        "address": draft.get("address") or "",
        "city": draft.get("city") or "",
        "district": draft.get("district") or "",
        "contact": draft.get("contact") or "",
        "contactImage": draft.get("contactImage") or "",
        "tags": [t.strip() for t in (draft.get("tags") or "").split(",") if t.strip()],
        "courseIntro": draft.get("courseIntro") or "",
        "images": images,
        "latitude": draft.get("latitude"),
        "longitude": draft.get("longitude"),
    }


def _my_studio_payload(studio):
    # Prefer the pending draft for form backfill; otherwise the published fields.
    if studio.pending_draft:
        try:
            draft = json.loads(studio.pending_draft)
        except (TypeError, ValueError):
            draft = {}
        editable = _draft_to_fields(draft)
    else:
        editable = _draft_to_fields({
            "address": studio.address,
            "city": studio.city,
            "district": studio.district,
            "contact": studio.contact_text,
            "contactImage": studio.contact_image,
            "tags": studio.tags,
            "courseIntro": studio.course_intro,
            "images": studio.images,
            "latitude": studio.latitude,
            "longitude": studio.longitude,
        })
    owner_teachers = [t for t in studio.teachers if t.status != "hidden"]
    return {
        "id": studio.id,
        "name": studio.name,
        "status": studio.status,
        "rejectReason": studio.pending_reject_reason,
        "ownerTeachers": [
            {"id": t.id, "name": t.real_name, "xileName": t.xile_name}
            for t in owner_teachers
        ],
        "fields": editable,
    }


@mp_bp.get("/teachers/me/studios")
@jwt_required()
def my_studios():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.teacher_id:
        return {"error": "仅已关联教师可维护工作室信息"}, 403
    studios = (
        Studio.query.filter(Studio.status != "hidden")
        .join(Studio.teachers)
        .filter_by(id=user.teacher_id)
        .order_by(Studio.id.asc())
        .all()
    )
    return {"items": [_my_studio_payload(s) for s in studios]}


@mp_bp.put("/teachers/me/studios/<int:studio_id>")
@jwt_required()
def submit_studio(studio_id):
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.teacher_id:
        return {"error": "仅已关联教师可维护工作室信息"}, 403
    studio = db.session.get(Studio, studio_id)
    if studio is None or studio.status == "hidden":
        return {"error": "not found"}, 404
    if not _is_studio_owner_teacher(user, studio):
        return {"error": "仅该工作室主理教师可提交信息"}, 403
    if studio.status == "pending":
        return {"error": "当前提交正在审批中，请先撤回后再修改提交"}, 400

    payload = request.get_json(silent=True) or {}

    # Only the editable keys are accepted: 地址/城市/地区/联系方式/标签/课程介绍/图片/坐标.
    # name/ownerTeacherIds/简介 are ignored (admin-owned).
    draft = {}
    if "tags" in payload:
        tags_error = _validate_tags(payload.get("tags"))
        if tags_error:
            return {"error": tags_error}, 400
        draft["tags"] = str(payload.get("tags") or "").strip()
    if "images" in payload:
        images, images_error = _validate_images(payload.get("images"))
        if images_error:
            return {"error": images_error}, 400
        draft["images"] = images
    if "address" in payload:
        draft["address"] = str(payload.get("address") or "").strip() or None
    # 城市/地区随地图选点结果一起提交，与地址保持同一份数据来源。
    if "city" in payload:
        draft["city"] = str(payload.get("city") or "").strip() or None
    if "district" in payload:
        draft["district"] = str(payload.get("district") or "").strip() or None
    if "contact" in payload:
        contact = str(payload.get("contact") or "").strip() or None
        if contact and len(contact) > MAX_CONTACT_LENGTH:
            return {"error": f"联系方式最多 {MAX_CONTACT_LENGTH} 字"}, 400
        draft["contact"] = contact
    # 联系工作室图片：主理教师上传的一张图，点选「联系工作室」时预览。
    if "contactImage" in payload:
        contact_image = str(payload.get("contactImage") or "").strip() or None
        if contact_image and len(contact_image) > MAX_CONTACT_IMAGE_LENGTH:
            return {"error": "联系工作室图片地址过长，请重新上传"}, 400
        draft["contactImage"] = contact_image
    if "courseIntro" in payload:
        course_intro = str(payload.get("courseIntro") or "").strip() or None
        if course_intro and len(course_intro) > MAX_COURSE_INTRO_LENGTH:
            return {"error": f"课程介绍最多 {MAX_COURSE_INTRO_LENGTH} 字"}, 400
        draft["courseIntro"] = course_intro
    # 经纬度随地址一起提交：教师用地图选点后，坐标与地址保持一致。仅接受
    # 成对且有效的数字，单独提供其中一个时忽略。
    if "latitude" in payload and "longitude" in payload:
        lat = payload.get("latitude")
        lng = payload.get("longitude")
        try:
            lat_val = float(lat) if lat not in (None, "") else None
            lng_val = float(lng) if lng not in (None, "") else None
        except (TypeError, ValueError):
            lat_val = lng_val = None
        if lat_val is not None and lng_val is not None:
            draft["latitude"] = lat_val
            draft["longitude"] = lng_val

    # Merge with the existing draft so omitted keys keep their prior draft value.
    existing = {}
    if studio.pending_draft:
        try:
            existing = json.loads(studio.pending_draft)
        except (TypeError, ValueError):
            existing = {}
    existing.update(draft)

    studio.pending_draft = json.dumps(existing, ensure_ascii=False)
    studio.pending_reject_reason = None
    studio.status = "pending"
    db.session.commit()

    return {"id": studio.id, "status": "pending"}


@mp_bp.post("/teachers/me/studios/<int:studio_id>/withdraw")
@jwt_required()
def withdraw_studio(studio_id):
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.teacher_id:
        return {"error": "仅已关联教师可维护工作室信息"}, 403
    studio = db.session.get(Studio, studio_id)
    if studio is None or studio.status == "hidden":
        return {"error": "not found"}, 404
    if not _is_studio_owner_teacher(user, studio):
        return {"error": "仅该工作室主理教师可撤回提交"}, 403
    if studio.status != "pending":
        return {"error": "当前没有待审批的提交可撤回"}, 400

    # Revert to the previously-published state without discarding the teacher's
    # edits: the draft is kept so the form can be re-opened, but the studio is
    # no longer awaiting approval. Rejected submissions already clear the draft,
    # so a withdrawn submission keeps its draft for the teacher to keep editing.
    has_published_content = any([studio.city, studio.address, studio.images, studio.course_intro, studio.intro, studio.tags, studio.contact_text, studio.contact_image])
    studio.status = "open" if has_published_content else "incomplete"
    db.session.commit()

    return {"id": studio.id, "status": studio.status}


@mp_bp.post("/teachers/me/studios/<int:studio_id>/teachers")
@jwt_required()
def add_studio_teacher(studio_id):
    """Add an existing certified teacher as a lead teacher of the studio."""
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.teacher_id:
        return {"error": "仅已关联教师可维护工作室信息"}, 403
    studio = db.session.get(Studio, studio_id)
    if studio is None or studio.status == "hidden":
        return {"error": "not found"}, 404
    if not _is_studio_manager(user, studio):
        return {"error": "仅工作室管理员可添加教师"}, 403

    payload = request.get_json(silent=True) or {}
    try:
        teacher_id = int(payload.get("teacherId"))
    except (TypeError, ValueError):
        return {"error": "教师参数无效"}, 400

    teacher = db.session.get(Teacher, teacher_id)
    if teacher is None or teacher.status == "hidden":
        return {"error": "教师不存在"}, 404

    if teacher in studio.teachers:
        return {"error": "该教师已是主理教师"}, 400

    studio.teachers.append(teacher)
    # 同步旧字段 owner_teacher_id，保持 legacy owner 与多对多关联一致。
    if not studio.owner_teacher_id:
        studio.owner_teacher_id = teacher.id
    db.session.commit()

    return {"id": studio.id, "teacherId": teacher.id}


@mp_bp.delete("/teachers/me/studios/<int:studio_id>/teachers/<int:teacher_id>")
@jwt_required()
def remove_studio_teacher(studio_id, teacher_id):
    """Remove a lead teacher from the studio."""
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.teacher_id:
        return {"error": "仅已关联教师可维护工作室信息"}, 403
    studio = db.session.get(Studio, studio_id)
    if studio is None or studio.status == "hidden":
        return {"error": "not found"}, 404
    if not _is_studio_manager(user, studio):
        return {"error": "仅工作室管理员可删除教师"}, 403
    if teacher_id == user.teacher_id:
        return {"error": "不能删除自己"}, 400

    teacher = db.session.get(Teacher, teacher_id)
    if teacher is None or teacher not in studio.teachers:
        return {"error": "该教师不是主理教师"}, 404

    studio.teachers.remove(teacher)
    # 若删除的是 legacy owner，将 owner_teacher_id 指向剩余的第一个主理教师。
    if studio.owner_teacher_id == teacher_id:
        studio.owner_teacher_id = studio.teachers[0].id if studio.teachers else None
    db.session.commit()

    return {"id": studio.id, "teacherId": teacher_id}


@mp_bp.get("/studios")
@jwt_required()
def list_studios():
    try:
        page = max(int(request.args.get("page", 1)), 1)
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = max(min(int(request.args.get("pageSize", 20)), 50), 1)
    except (ValueError, TypeError):
        page_size = 20
    city = request.args.get("city", "").strip()
    keyword = request.args.get("q", "").strip()
    # 已公开与审批中的工作室都展示；审批中展示的是审批前的公开字段（草稿不生效）。
    query = Studio.query.filter(Studio.status.in_(("open", "pending")))
    if city:
        query = query.filter(Studio.city.like(f"%{escape_like(city)}%"))
    if keyword:
        query = query.filter(
            (Studio.name.like(f"%{escape_like(keyword)}%")) | (Studio.address.like(f"%{escape_like(keyword)}%"))
        )
    query = query.order_by(Studio.display_order.desc(), Studio.id.asc())
    total = query.count()
    studios = query.offset((page - 1) * page_size).limit(page_size).all()
    # 城市筛选项动态来自已公开与审批中的工作室，避免工作室设置了非预设城市时无法筛选。
    cities = [
        row[0]
        for row in db.session.query(Studio.city)
        .filter(Studio.status.in_(("open", "pending")), Studio.city.isnot(None), Studio.city != "")
        .distinct()
        .order_by(Studio.city.asc())
        .all()
    ]
    return {"items": [_studio_summary(s) for s in studios], "cities": cities, "total": total, "page": page, "pageSize": page_size, "hasMore": page * page_size < total}


@mp_bp.get("/studios/<int:studio_id>")
@jwt_required()
def get_studio(studio_id):
    from flask_jwt_extended import get_jwt_identity
    from ...models import User
    user = db.session.get(User, int(get_jwt_identity()))

    studio = db.session.get(Studio, studio_id)
    if studio is None or studio.status == "hidden":
        return {"error": "not found"}, 404

    is_owner = _is_studio_owner_teacher(user, studio)
    # 已公开与审批中均公开展示（审批中展示的是审批前的公开字段）；仅未提交/隐藏仅 owner 可见。
    if studio.status not in ("open", "pending") and not is_owner:
        return {"error": "not found"}, 404

    payload = _studio_summary(studio)
    if is_owner:
        payload["mine"] = {
            "status": studio.status,
            "rejectReason": studio.pending_reject_reason,
            "manager": _is_studio_manager(user, studio),
        }
    return payload
