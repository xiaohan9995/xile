import json
from datetime import date

from ...extensions import db
from ...models import Teacher
from ...services.teacher_service import refresh_status as _refresh_teacher_status
from ...utils.storage import file_url as _file_url


def escape_like(value):
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _certification_status(teacher):
    _refresh_teacher_status(teacher)
    if teacher.status == "active":
        return "认证有效"
    if teacher.status == "expiring":
        return "即将到期"
    if teacher.status == "expired":
        return "已过期"
    return "未公开"


def _teacher_summary(teacher):
    settings = _public_profile_settings(teacher)
    return {
        "id": teacher.id,
        "teacherNo": teacher.certificate_no,
        "name": _display_name(teacher),
        "xileName": _public_xile_name(teacher),
        "realName": _public_real_name(teacher),
        "alias": teacher.alias if settings["showAlias"] else None,
        "tier": teacher.tier.code,
        "tierName": teacher.tier.name,
        "city": teacher.city,
        "district": teacher.district,
        "avatarUrl": _file_url(teacher.avatar_url),
        "validUntil": _date_text(teacher.valid_until),
        "certifiedAt": _date_text(teacher.first_certified_on) if settings["showFirstCertifiedOn"] else None,
        "currentTierCertifiedOn": _date_text(teacher.current_tier_certified_on) if settings["showCurrentTierCertifiedOn"] else None,
        "residences": _residences(teacher) if settings["showResidences"] else [],
        "certificationStatus": _certification_status(teacher),
    }


def _teacher_profile(teacher):
    specialties = []
    if teacher.detail and teacher.detail.specialties:
        specialties = [item.strip() for item in teacher.detail.specialties.split(",") if item.strip()]

    profile = _teacher_summary(teacher)
    profile.update(
        {
            "specialties": specialties,
            "teachingSummary": teacher.detail.teaching_summary if teacher.detail and _public_profile_settings(teacher)["showBio"] else None,
            "certificationNote": "该教师已通过喜乐瑜伽教师认证，资质处于有效期内。",
            "certificateUrl": _file_url(teacher.certificate_url),
        }
    )
    return profile


_PROFILE_DEFAULTS = {
    # 姓名 and 别名 are shown on the public teacher page by default; a teacher
    # can still hide them from 个人设置.
    "showRealName": True,
    "showAlias": True,
    # 经常居住地 and 个人简介 are always public: 个人设置 no longer offers a
    # visibility switch for them, and the teacher page has to show what the
    # teacher filled in.
    "showResidences": True,
    "showBio": True,
    "showFirstCertifiedOn": True,
    "showCurrentTierCertifiedOn": True,
}

# Keys the teacher can no longer toggle in 个人设置. Stored values are ignored
# so a profile saved while the switches still existed keeps rendering.
_ALWAYS_PUBLIC_PROFILE_KEYS = ("showResidences", "showBio")


def _public_profile_settings(teacher):
    try:
        saved = json.loads(teacher.public_profile_settings or "{}")
    except (TypeError, ValueError):
        saved = {}
    settings = {key: bool(saved.get(key, default)) for key, default in _PROFILE_DEFAULTS.items()}
    for key in _ALWAYS_PUBLIC_PROFILE_KEYS:
        settings[key] = True
    return settings


def _residences(teacher):
    return [item.strip() for item in (teacher.residences or "").split(",") if item.strip()]


# Spreadsheets filled by the committee often use a filler such as 无 when a
# public 喜乐名 has not been assigned yet; those must not leak into the profile.
_NAME_PLACEHOLDERS = {
    "", "无", "暂无", "未知", "待定", "空", "没有", "none", "null", "n/a", "na", "-", "--", "—", "/",
}


def _clean_name(value):
    text = (value or "").strip()
    return "" if text.lower() in _NAME_PLACEHOLDERS else text


def _display_name(teacher):
    return _clean_name(teacher.xile_name) or _clean_name(teacher.alias) or _clean_name(teacher.real_name) or None


def _public_xile_name(teacher):
    """Return the 喜乐名, treating imported fillers such as 无 as unset."""
    return _clean_name(teacher.xile_name) or None


def _public_real_name(teacher):
    """Expose the legal name when the teacher opted in from 个人设置.

    喜乐名 / 别名 is the public identity, so the legal name stays private by
    default. It is still returned as a display fallback for teachers who have
    not been given a 喜乐名 yet, so their profile never renders nameless.
    """
    if not _clean_name(teacher.xile_name):
        return _clean_name(teacher.real_name) or None
    if not _public_profile_settings(teacher)["showRealName"]:
        return None
    return _clean_name(teacher.real_name) or None


def _studio_summary(studio):
    tags = [t.strip() for t in (studio.tags or "").split(",") if t.strip()]
    images = [u.strip() for u in (studio.images or "").split(",") if u.strip()]
    # The many-to-many `teachers` list is authoritative, but records seeded
    # before the migration (or via the legacy owner field) may only have the
    # single `owner` relationship populated — merge it so the lead teacher never
    # renders empty, and so a studio set via owner_teacher_id plus additional
    # many-to-many teachers never drops the legacy owner.
    owner_teachers = [t for t in studio.teachers if t.status != "hidden"]
    seen = {t.id for t in owner_teachers}
    if studio.owner and studio.owner.status != "hidden" and studio.owner.id not in seen:
        owner_teachers.append(studio.owner)
    lead = owner_teachers[0] if owner_teachers else None
    return {
        "id": studio.id,
        "name": studio.name,
        "city": studio.city,
        "district": studio.district,
        "address": studio.address,
        "latitude": studio.latitude,
        "longitude": studio.longitude,
        "coverUrl": images[0] if images else studio.cover_url,
        "images": images,
        "courseIntro": studio.course_intro,
        "tags": tags,
        "intro": studio.intro,
        "openingHours": studio.opening_hours,
        "contactText": studio.contact_text,
        # 联系工作室图片：详情页点选后直接预览，内含电话、二维码等联系方式。
        "contactImage": _file_url(studio.contact_image),
        "ownerTeachers": [
            {
                "id": t.id,
                "name": _display_name(t),
                "xileName": _public_xile_name(t),
                "realName": _public_real_name(t),
                "avatarUrl": _file_url(t.avatar_url),
                "tier": t.tier.code if t.tier else None,
                "tierName": t.tier.name if t.tier else None,
                "validUntil": _date_text(t.valid_until),
                "city": t.city,
            }
            for t in owner_teachers
        ],
        "ownerTeacherName": _display_name(lead) if lead else None,
        "ownerTeacherRealName": _public_real_name(lead) if lead else None,
    }


def _datetime_text(value):
    return value.strftime("%Y.%m.%d %H:%M") if value else None


def _date_text(value):
    return value.strftime("%Y.%m.%d") if value else None


def _parse_record_date(value):
    """Parse a record date that the mini program submits as YYYY-MM.

    Teaching and service records are collected with a month picker, so the day
    is not part of the value any more. Store it as the first of the month and
    keep accepting a legacy full date.
    """
    text = (value or "").strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        pass
    try:
        return date.fromisoformat(f"{text}-01")
    except ValueError:
        raise ValueError(text)


def _file_payload(file):
    return {
        "id": file.id,
        "filename": file.file_name,
        "fileKey": file.file_key,
        "fileType": file.file_type,
        "fileSize": file.file_size,
        "url": _file_url(file.file_key),
    }


def _review_payload(review):
    published = review.status in ("approved", "rejected", "published_approved", "published_rejected")
    payload = {
        "id": review.id,
        "reviewYear": review.review_year,
        "yearTitle": f"{review.review_year}年度年审",
        "status": review.status,
        "submittedAt": _datetime_text(review.submitted_at),
        "reviewedAt": _datetime_text(review.reviewed_at),
        "reviewer": "教师管理委员会" if published else "审核中",
        "previousValidUntil": _date_text(review.previous_valid_until),
        "nextValidUntil": _date_text(review.next_valid_until),
        "submissionVersion": review.submission_version,
        "submissionDeadline": _date_text(review.cycle.submission_deadline) if review.cycle else None,
        "teachingRecordIds": [item.teaching_record_id for item in review.teaching_records.order_by("id").all()],
        "serviceRecordIds": [item.service_record_id for item in review.service_records.order_by("id").all()],
        "files": [_file_payload(file) for file in review.files.order_by("id").all()],
    }
    if published:
        payload.update({
            "groupDecision": review.group_decision or review.reviewer_comment,
            "finalTier": review.final_tier.code if review.final_tier else None,
            "publishedAt": _datetime_text(review.published_at),
        })
    return payload


def _get_current_user():
    """Get current user from JWT, returns None if not authenticated."""
    from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            from ...models import User
            return db.session.get(User, int(identity))
    except Exception:
        pass
    return None


def _is_owner_teacher(user, teacher_id):
    """Check if user is the teacher who owns this resource."""
    return user and user.role == "teacher" and user.teacher_id == teacher_id


def _is_studio_owner_teacher(user, studio):
    """Check if user's linked teacher is one of the studio's lead teachers."""
    if not user or user.role != "teacher" or not user.teacher_id or not studio:
        return False
    if any(t.id == user.teacher_id for t in studio.teachers):
        return True
    # 兼容旧字段 owner_teacher_id：历史数据可能只在单一 owner 字段里关联教师，
    # 未同步到多对多关联表，这里也视为主理教师。
    return studio.owner_teacher_id == user.teacher_id
