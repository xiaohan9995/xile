import json

from flask import request

from ...extensions import db
from ...models import AuditLog, Studio, Teacher
from .helpers import current_admin_id, require_admin_roles, require_admin_token
from . import admin_bp


MAX_TAGS = 8
MAX_TAG_LENGTH = 6
MAX_IMAGES = 9
MAX_COURSE_INTRO_LENGTH = 500


def _validate_tags(value):
    """Validate a comma-separated tag string against the studio rules.

    Each tag may be at most MAX_TAG_LENGTH characters and there may be at most
    MAX_TAGS tags. Returns ``None`` on success or an error message string.
    """
    tags = [t.strip() for t in (value or "").split(",") if t.strip()]
    if len(tags) > MAX_TAGS:
        return f"标签最多 {MAX_TAGS} 个"
    if any(len(t) > MAX_TAG_LENGTH for t in tags):
        return f"每个标签最多 {MAX_TAG_LENGTH} 个字"
    return None


def _validate_images(value):
    """Validate an image URL list (or comma-separated string)."""
    if isinstance(value, str):
        images = [u.strip() for u in value.split(",") if u.strip()]
    elif isinstance(value, list):
        images = [str(u).strip() for u in value if str(u).strip()]
    else:
        images = []
    if len(images) > MAX_IMAGES:
        return None, f"图片最多 {MAX_IMAGES} 张"
    return images, None


def _resolve_teacher_ids(value):
    """Normalize owner teacher ids to a list of existing teacher ids."""
    if not isinstance(value, list):
        return None, "主理教师格式无效"
    ids = []
    for item in value:
        try:
            ids.append(int(item))
        except (TypeError, ValueError):
            return None, "主理教师格式无效"
    if not ids:
        return [], None
    existing = {t.id for t in Teacher.query.filter(Teacher.id.in_(ids)).all()}
    return [i for i in ids if i in existing], None


def _resolve_manager_ids(value, owner_ids):
    """Normalize manager teacher ids; managers must be a subset of owner teachers."""
    if not isinstance(value, list):
        return None, "管理员格式无效"
    ids = []
    for item in value:
        try:
            ids.append(int(item))
        except (TypeError, ValueError):
            return None, "管理员格式无效"
    if not ids:
        return [], None
    owner_set = set(owner_ids)
    invalid = [i for i in ids if i not in owner_set]
    if invalid:
        return None, "管理员必须是主理教师"
    return ids, None


def _parse_manager_ids(value):
    """Parse a comma-separated manager_teacher_ids string into ints."""
    if not value:
        return []
    result = []
    for item in str(value).split(","):
        item = item.strip()
        if not item:
            continue
        try:
            result.append(int(item))
        except (TypeError, ValueError):
            continue
    return result


def _pending_draft_payload(s):
    if not s.pending_draft:
        return None
    try:
        draft = json.loads(s.pending_draft)
    except (TypeError, ValueError):
        return None
    images = draft.get("images") or []
    if isinstance(images, str):
        images = [u.strip() for u in images.split(",") if u.strip()]
    return {
        "address": draft.get("address"),
        "city": draft.get("city"),
        "district": draft.get("district"),
        "contact": draft.get("contact"),
        "contactImage": draft.get("contactImage"),
        "tags": [t.strip() for t in (draft.get("tags") or "").split(",") if t.strip()],
        "courseIntro": draft.get("courseIntro"),
        "images": images,
        "latitude": draft.get("latitude"),
        "longitude": draft.get("longitude"),
    }


def _studio_payload(s):
    images = [u.strip() for u in (s.images or "").split(",") if u.strip()]
    # 合并旧字段 owner_teacher_id 指向的教师与多对多关联表，避免历史数据里
    # 只设置了单一 owner 的教师被遗漏（按 id 去重、保持稳定顺序）。
    owner_teachers = [t for t in s.teachers if t.status != "hidden"]
    seen = {t.id for t in owner_teachers}
    if s.owner and s.owner.status != "hidden" and s.owner.id not in seen:
        owner_teachers.append(s.owner)
    return {
        "id": s.id,
        "name": s.name,
        "city": s.city,
        "district": s.district,
        "address": s.address,
        "latitude": s.latitude,
        "longitude": s.longitude,
        "ownerTeacherName": s.owner.real_name if s.owner else None,
        "coverUrl": images[0] if images else s.cover_url,
        "images": images,
        "courseIntro": s.course_intro,
        "ownerTeachers": [
            {"id": t.id, "name": t.real_name, "xileName": t.xile_name}
            for t in owner_teachers
        ],
        "managerTeacherIds": _parse_manager_ids(s.manager_teacher_ids),
        "tags": [t.strip() for t in (s.tags or "").split(",") if t.strip()],
        "intro": s.intro,
        "openingHours": s.opening_hours,
        "contactText": s.contact_text,
        "contactImage": s.contact_image,
        "status": s.status,
        "displayOrder": s.display_order,
        "hasPending": s.status == "pending",
        "pendingRejectReason": s.pending_reject_reason,
        "pending": _pending_draft_payload(s),
    }


@admin_bp.get("/studios")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def studio_list():
    query = Studio.query
    status = request.args.get("status", "").strip()
    if status:
        query = query.filter_by(status=status)
    studios = query.order_by(Studio.display_order.desc(), Studio.id.asc()).all()
    items = [_studio_payload(s) for s in studios]
    return {"items": items, "total": len(items)}


@admin_bp.post("/studios")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def create_studio():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return {"error": "name required"}, 400

    tags_error = _validate_tags(payload.get("tags"))
    if tags_error:
        return {"error": tags_error}, 400

    images, images_error = _validate_images(payload.get("images"))
    if images_error:
        return {"error": images_error}, 400

    teacher_ids, teachers_error = _resolve_teacher_ids(payload.get("ownerTeacherIds", []))
    if teachers_error:
        return {"error": teachers_error}, 400

    manager_ids, manager_error = _resolve_manager_ids(payload.get("managerTeacherIds", []), teacher_ids)
    if manager_error:
        return {"error": manager_error}, 400

    course_intro = str(payload.get("courseIntro") or "").strip() or None
    if course_intro and len(course_intro) > MAX_COURSE_INTRO_LENGTH:
        return {"error": f"课程介绍最多 {MAX_COURSE_INTRO_LENGTH} 字"}, 400

    studio = Studio(
        name=name,
        city=payload.get("city", "").strip() or None,
        district=payload.get("district", "").strip() or None,
        address=payload.get("address", "").strip() or None,
        latitude=payload.get("latitude"),
        longitude=payload.get("longitude"),
        contact_text=payload.get("contact", "").strip() or None,
        contact_image=str(payload.get("contactImage") or "").strip() or None,
        tags=payload.get("tags", "").strip() or None,
        intro=payload.get("intro", "").strip() or None,
        images=",".join(images) or None,
        cover_url=images[0] if images else (payload.get("coverUrl", "").strip() or None),
        course_intro=course_intro,
        status="open",
        manager_teacher_ids=",".join(str(i) for i in manager_ids) if manager_ids else None,
    )
    if teacher_ids:
        studio.teachers = Teacher.query.filter(Teacher.id.in_(teacher_ids)).all()
        # 同步旧字段 owner_teacher_id，保持 legacy owner 与多对多关联一致。
        studio.owner_teacher_id = teacher_ids[0]
    db.session.add(studio)
    db.session.commit()

    return {"id": studio.id, "name": studio.name, "status": studio.status}, 201


@admin_bp.delete("/studios/<int:studio_id>")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def delete_studio(studio_id):
    studio = db.session.get(Studio, studio_id)
    if studio is None:
        return {"error": "not found"}, 404
    studio.status = "hidden"
    db.session.add(AuditLog(admin_id=current_admin_id() or 1, action="delete_studio", target_type="studio", target_id=studio.id))
    db.session.commit()
    return {"id": studio.id, "status": "hidden"}


@admin_bp.put("/studios/<int:studio_id>")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def update_studio(studio_id):
    studio = db.session.get(Studio, studio_id)
    if studio is None or studio.status == "hidden":
        return {"error": "not found"}, 404

    payload = request.get_json(silent=True) or {}

    if "name" in payload:
        studio.name = str(payload["name"] or "").strip()
    if "city" in payload:
        studio.city = str(payload["city"] or "").strip() or None
    if "district" in payload:
        studio.district = str(payload["district"] or "").strip() or None
    if "address" in payload:
        studio.address = str(payload["address"] or "").strip() or None
    if "latitude" in payload:
        studio.latitude = payload["latitude"]
    if "longitude" in payload:
        studio.longitude = payload["longitude"]
    if "contact" in payload:
        studio.contact_text = str(payload["contact"] or "").strip() or None
    if "contactImage" in payload:
        studio.contact_image = str(payload["contactImage"] or "").strip() or None
    if "tags" in payload:
        tags_error = _validate_tags(payload.get("tags"))
        if tags_error:
            return {"error": tags_error}, 400
        studio.tags = str(payload["tags"] or "").strip() or None
    if "intro" in payload:
        studio.intro = str(payload["intro"] or "").strip() or None
    if "images" in payload:
        images, images_error = _validate_images(payload.get("images"))
        if images_error:
            return {"error": images_error}, 400
        studio.images = ",".join(images) or None
        if images:
            studio.cover_url = images[0]
    if "courseIntro" in payload:
        course_intro = str(payload.get("courseIntro") or "").strip() or None
        if course_intro and len(course_intro) > MAX_COURSE_INTRO_LENGTH:
            return {"error": f"课程介绍最多 {MAX_COURSE_INTRO_LENGTH} 字"}, 400
        studio.course_intro = course_intro
    if "ownerTeacherIds" in payload:
        teacher_ids, teachers_error = _resolve_teacher_ids(payload.get("ownerTeacherIds"))
        if teachers_error:
            return {"error": teachers_error}, 400
        teachers = Teacher.query.filter(Teacher.id.in_(teacher_ids)).all()
        studio.teachers = teachers
        # 同步旧字段 owner_teacher_id，避免 legacy owner 与多对多关联表不一致，
        # 导致展示时遗漏第一个主理教师。
        studio.owner_teacher_id = teacher_ids[0] if teacher_ids else None

    if "managerTeacherIds" in payload:
        # 校验时以当前生效的主理教师集合为准：若本次也更新了 ownerTeacherIds，
        # 用新值；否则回退到 studio.teachers 现有集合。
        current_owner_ids = (
            _resolve_teacher_ids(payload.get("ownerTeacherIds"))[0]
            if "ownerTeacherIds" in payload
            else [t.id for t in studio.teachers]
        )
        manager_ids, manager_error = _resolve_manager_ids(payload.get("managerTeacherIds"), current_owner_ids)
        if manager_error:
            return {"error": manager_error}, 400
        studio.manager_teacher_ids = ",".join(str(i) for i in manager_ids) if manager_ids else None

    db.session.add(AuditLog(admin_id=current_admin_id() or 1, action="update_studio", target_type="studio", target_id=studio.id))
    db.session.commit()
    return {"id": studio.id, "name": studio.name}


def _apply_pending_draft(studio, draft):
    """Copy the approved draft fields onto the published studio fields.

    Only the editable fields (地址/城市/地区/联系方式/标签/课程介绍/图片/坐标)
    are applied; intro stays admin-owned and never changes here.
    """
    if "address" in draft:
        studio.address = draft.get("address")
    # 城市/地区随地址一起审批生效，保证与地图选点结果一致。
    if "city" in draft:
        studio.city = draft.get("city")
    if "district" in draft:
        studio.district = draft.get("district")
    # 经纬度随地址一同审批生效，保证地图位置与地址一致。
    if "latitude" in draft and "longitude" in draft:
        lat = draft.get("latitude")
        lng = draft.get("longitude")
        if lat is not None and lng is not None:
            studio.latitude = lat
            studio.longitude = lng
    if "contact" in draft:
        studio.contact_text = draft.get("contact")
    # 联系工作室图片随草稿一同审批生效。
    if "contactImage" in draft:
        studio.contact_image = draft.get("contactImage")
    if "tags" in draft:
        studio.tags = draft.get("tags")
    if "courseIntro" in draft:
        studio.course_intro = draft.get("courseIntro")
    if "images" in draft:
        images = draft.get("images") or []
        studio.images = ",".join(images) if images else None
        if images:
            studio.cover_url = images[0]


@admin_bp.post("/studios/<int:studio_id>/approve")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def approve_studio(studio_id):
    studio = db.session.get(Studio, studio_id)
    if studio is None or studio.status == "hidden":
        return {"error": "not found"}, 404
    if studio.status != "pending" or not studio.pending_draft:
        return {"error": "该工作室没有待审批的提交"}, 400

    try:
        draft = json.loads(studio.pending_draft)
    except (TypeError, ValueError):
        return {"error": "待审批草稿格式无效"}, 400

    _apply_pending_draft(studio, draft)
    studio.pending_draft = None
    studio.pending_reject_reason = None
    studio.status = "open"
    db.session.add(AuditLog(admin_id=current_admin_id() or 1, action="approve_studio", target_type="studio", target_id=studio.id))
    db.session.commit()
    return {"id": studio.id, "status": "open"}


@admin_bp.post("/studios/<int:studio_id>/reject")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def reject_studio(studio_id):
    studio = db.session.get(Studio, studio_id)
    if studio is None or studio.status == "hidden":
        return {"error": "not found"}, 404
    if studio.status != "pending":
        return {"error": "该工作室没有待审批的提交"}, 400

    payload = request.get_json(silent=True) or {}
    reason = str(payload.get("reason") or "").strip()
    if not reason:
        return {"error": "请填写驳回原因"}, 400

    studio.pending_reject_reason = reason[:256]
    studio.pending_draft = None
    # Revert to the previously-published state. If the studio had any formal
    # content published before, it stays open; otherwise it falls back to
    # incomplete so it is not shown publicly.
    has_published_content = any([studio.city, studio.address, studio.images, studio.course_intro, studio.intro, studio.tags, studio.contact_text, studio.contact_image])
    studio.status = "open" if has_published_content else "incomplete"
    db.session.add(AuditLog(admin_id=current_admin_id() or 1, action="reject_studio", target_type="studio", target_id=studio.id))
    db.session.commit()
    return {"id": studio.id, "status": studio.status}
