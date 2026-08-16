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
    return {
        "id": teacher.id,
        "teacherNo": teacher.teacher_no,
        "name": teacher.real_name,
        "xileName": teacher.xile_name,
        "tier": teacher.tier.code,
        "tierName": teacher.tier.name,
        "city": teacher.city,
        "district": teacher.district,
        "avatarUrl": teacher.avatar_url,
        "validUntil": _date_text(teacher.valid_until),
        "certifiedAt": _date_text(teacher.first_certified_on),
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
            "teachingSummary": teacher.detail.teaching_summary if teacher.detail else None,
            "certificationNote": "该教师已通过喜乐瑜伽教师认证，资质处于有效期内。",
        }
    )
    return profile


def _studio_summary(studio):
    tags = [t.strip() for t in (studio.tags or "").split(",") if t.strip()]
    return {
        "id": studio.id,
        "name": studio.name,
        "city": studio.city,
        "district": studio.district,
        "address": studio.address,
        "coverUrl": studio.cover_url,
        "tags": tags,
        "intro": studio.intro,
        "openingHours": studio.opening_hours,
        "contactText": studio.contact_text,
        "ownerTeacherName": studio.owner.real_name if studio.owner and studio.owner.status != "hidden" else None,
    }


def _datetime_text(value):
    return value.strftime("%Y.%m.%d %H:%M") if value else None


def _date_text(value):
    return value.strftime("%Y.%m.%d") if value else None


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
