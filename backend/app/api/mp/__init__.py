from datetime import date, datetime, timezone

from flask import Blueprint, request

from ...extensions import db
from ...models import AnnualReview, ReviewFile, Studio, Teacher

mp_bp = Blueprint("mp", __name__)


def _certification_status(teacher):
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
        "validUntil": teacher.valid_until.isoformat() if teacher.valid_until else None,
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
    return {
        "id": studio.id,
        "name": studio.name,
        "city": studio.city,
        "district": studio.district,
        "address": studio.address,
        "coverUrl": studio.cover_url,
        "intro": studio.intro,
        "openingHours": studio.opening_hours,
        "contactText": studio.contact_text,
        "ownerTeacherName": studio.owner.real_name if studio.owner else None,
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
    }


def _review_payload(review):
    return {
        "id": review.id,
        "reviewYear": review.review_year,
        "yearTitle": f"{review.review_year}年度年审",
        "status": review.status,
        "submittedAt": _datetime_text(review.submitted_at),
        "reviewedAt": _datetime_text(review.reviewed_at),
        "reviewer": "教师管理委员会" if review.reviewed_at else "待审核",
        "previousValidUntil": _date_text(review.previous_valid_until),
        "nextValidUntil": _date_text(review.next_valid_until),
        "files": [_file_payload(file) for file in review.files.order_by("id").all()],
    }


@mp_bp.get("/teachers/search")
def search_teachers():
    keyword = request.args.get("q", "").strip()
    city = request.args.get("city", "").strip()
    tier = request.args.get("tier", "").strip()

    query = Teacher.query.filter(Teacher.status != "hidden")
    if keyword:
        like_keyword = f"%{keyword}%"
        query = query.filter(
            (Teacher.real_name.like(like_keyword))
            | (Teacher.xile_name.like(like_keyword))
            | (Teacher.teacher_no.like(like_keyword))
        )
    if city:
        query = query.filter(Teacher.city == city)
    if tier:
        query = query.join(Teacher.tier).filter_by(code=tier)

    teachers = query.order_by(Teacher.valid_until.desc(), Teacher.id.asc()).all()
    return {"items": [_teacher_summary(teacher) for teacher in teachers], "total": len(teachers)}


@mp_bp.get("/teachers/<int:teacher_id>/summary")
def get_teacher_summary(teacher_id):
    teacher = Teacher.query.filter(Teacher.id == teacher_id, Teacher.status != "hidden").first_or_404()
    return _teacher_profile(teacher)


@mp_bp.get("/teachers/<int:teacher_id>/certification")
def get_teacher_certification(teacher_id):
    teacher = Teacher.query.filter(Teacher.id == teacher_id, Teacher.status != "hidden").first_or_404()
    today = date.today()
    days_left = (teacher.valid_until - today).days if teacher.valid_until else None
    reviews = (
        AnnualReview.query.filter_by(teacher_id=teacher.id)
        .order_by(AnnualReview.review_year.desc(), AnnualReview.id.desc())
        .all()
    )

    return {
        "teacher": {
            **_teacher_summary(teacher),
            "validUntil": _date_text(teacher.valid_until),
            "firstCertifiedOn": _date_text(teacher.first_certified_on),
            "daysLeft": max(days_left, 0) if days_left is not None else None,
            "reviewCycleYears": teacher.tier.review_cycle_years if teacher.tier else None,
            "reviewRequired": teacher.tier.review_required if teacher.tier else True,
            "certificateUrl": teacher.certificate_url,
            "teachingSummary": teacher.detail.teaching_summary if teacher.detail else None,
        },
        "reviews": [_review_payload(review) for review in reviews],
    }


@mp_bp.get("/studios")
def list_studios():
    studios = (
        Studio.query.filter_by(status="open")
        .order_by(Studio.display_order.desc(), Studio.id.asc())
        .all()
    )
    return {"items": [_studio_summary(studio) for studio in studios], "total": len(studios)}


@mp_bp.get("/studios/<int:studio_id>")
def get_studio(studio_id):
    studio = Studio.query.filter_by(id=studio_id, status="open").first_or_404()
    return _studio_summary(studio)


@mp_bp.post("/reviews")
def submit_review():
    payload = request.get_json(silent=True) or {}
    teacher_id = payload.get("teacherId")
    if not teacher_id:
        return {"error": "teacherId required"}, 400

    teacher = Teacher.query.filter(Teacher.id == teacher_id, Teacher.status != "hidden").first()
    if teacher is None:
        return {"error": "teacher not found"}, 404

    try:
        review_year = int(payload.get("reviewYear") or date.today().year)
    except (TypeError, ValueError):
        return {"error": "invalid reviewYear"}, 400

    files = payload.get("files") or []
    if not isinstance(files, list) or not files:
        return {"error": "files required"}, 400

    review = AnnualReview.query.filter_by(teacher_id=teacher.id, review_year=review_year).first()
    if review is None:
        review = AnnualReview(
            teacher_id=teacher.id,
            review_year=review_year,
            previous_valid_until=teacher.valid_until,
            next_valid_until=teacher.valid_until,
        )
        db.session.add(review)
    else:
        for file in review.files.all():
            db.session.delete(file)

    review.status = "submitted"
    review.submitted_at = datetime.now(timezone.utc).replace(tzinfo=None)
    review.reviewer_admin_id = None
    review.reviewer_comment = None
    review.reviewed_at = None

    for index, file in enumerate(files, start=1):
        filename = file.get("fileName") or file.get("filename") or file.get("title") or f"review-file-{index}"
        review.files.append(
            ReviewFile(
                file_key=file.get("fileKey") or f"mp-review/{teacher.teacher_no}/{review_year}/{index}-{filename}",
                file_name=filename[:128],
                file_type=(file.get("fileType") or "material")[:16],
                file_size=int(file.get("fileSize") or 0),
            )
        )

    db.session.commit()

    return {
        "id": review.id,
        "teacherId": review.teacher_id,
        "reviewYear": review.review_year,
        "status": review.status,
        "submittedAt": _datetime_text(review.submitted_at),
        "files": [_file_payload(file) for file in review.files.order_by("id").all()],
    }, 201
