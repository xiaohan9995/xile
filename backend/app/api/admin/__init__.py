from functools import wraps
from datetime import datetime, timezone

from flask import Blueprint, current_app, request

from ...extensions import db
from ...models import AnnualReview, Studio, Teacher

admin_bp = Blueprint("admin", __name__)


def require_admin_token(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        expected_token = current_app.config.get("ADMIN_DEV_TOKEN")
        auth_header = request.headers.get("Authorization", "")
        if not expected_token or auth_header != f"Bearer {expected_token}":
            return {"error": "unauthorized"}, 401
        return view(*args, **kwargs)

    return wrapped


@admin_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    username = payload.get("username", "")
    password = payload.get("password", "")

    if username != "admin" or password != "password":
        return {"error": "invalid credentials"}, 401

    token = current_app.config.get("ADMIN_DEV_TOKEN") or "dev-admin-token"
    return {
        "token": token,
        "admin": {
            "username": "admin",
            "name": "系统管理员",
        },
    }


@admin_bp.get("/stats/dashboard")
@require_admin_token
def dashboard_stats():
    return {
        "teacherCount": Teacher.query.count(),
        "activeTeacherCount": Teacher.query.filter_by(status="active").count(),
        "pendingReviewCount": AnnualReview.query.filter_by(status="submitted").count(),
        "openStudioCount": Studio.query.filter_by(status="open").count(),
    }


def _date_text(value):
    return value.strftime("%Y.%m.%d") if value else None


def _datetime_text(value):
    return value.strftime("%Y.%m.%d %H:%M") if value else None


@admin_bp.get("/teachers")
@require_admin_token
def teacher_list():
    teachers = Teacher.query.order_by(Teacher.teacher_no.asc()).all()
    items = [
        {
            "id": teacher.id,
            "teacherNo": teacher.teacher_no,
            "name": teacher.real_name,
            "xileName": teacher.xile_name,
            "tier": teacher.tier.code if teacher.tier else None,
            "tierName": teacher.tier.name if teacher.tier else None,
            "city": teacher.city,
            "district": teacher.district,
            "status": teacher.status,
            "validUntil": _date_text(teacher.valid_until),
            "avatarUrl": teacher.avatar_url,
            "phone": teacher.detail.phone if teacher.detail else None,
        }
        for teacher in teachers
    ]
    return {"items": items, "total": len(items)}


@admin_bp.get("/studios")
@require_admin_token
def studio_list():
    studios = Studio.query.order_by(Studio.display_order.desc(), Studio.id.asc()).all()
    items = [
        {
            "id": studio.id,
            "name": studio.name,
            "city": studio.city,
            "district": studio.district,
            "address": studio.address,
            "ownerTeacherName": studio.owner.real_name if studio.owner else None,
            "coverUrl": studio.cover_url,
            "intro": studio.intro,
            "openingHours": studio.opening_hours,
            "contactText": studio.contact_text,
            "status": studio.status,
            "displayOrder": studio.display_order,
        }
        for studio in studios
    ]
    return {"items": items, "total": len(items)}


@admin_bp.get("/reviews")
@require_admin_token
def review_queue():
    status = request.args.get("status", "submitted")
    query = AnnualReview.query
    if status != "all":
        query = query.filter_by(status=status)
    reviews = query.order_by(AnnualReview.submitted_at.desc(), AnnualReview.id.desc()).all()
    items = [
        {
            "id": review.id,
            "teacherId": review.teacher_id,
            "teacherName": review.teacher.real_name if review.teacher else None,
            "teacherNo": review.teacher.teacher_no if review.teacher else None,
            "xileName": review.teacher.xile_name if review.teacher else None,
            "tier": review.teacher.tier.code if review.teacher and review.teacher.tier else None,
            "city": review.teacher.city if review.teacher else None,
            "reviewYear": review.review_year,
            "status": review.status,
            "submittedAt": _datetime_text(review.submitted_at),
            "previousValidUntil": _date_text(review.previous_valid_until),
            "nextValidUntil": _date_text(review.next_valid_until),
            "files": [
                {
                    "id": file.id,
                    "filename": file.file_name,
                    "fileKey": file.file_key,
                    "fileType": file.file_type,
                    "fileSize": file.file_size,
                }
                for file in review.files.order_by("id").all()
            ],
        }
        for review in reviews
    ]
    return {"items": items, "total": len(items)}


@admin_bp.post("/reviews/<int:review_id>/decision")
@require_admin_token
def review_decision(review_id):
    payload = request.get_json(silent=True) or {}
    status = payload.get("status")
    if status not in {"approved", "rejected"}:
        return {"error": "invalid status"}, 400

    review = db.session.get(AnnualReview, review_id)
    if review is None:
        return {"error": "not found"}, 404
    review.status = status
    review.reviewer_comment = payload.get("comment", "")
    review.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.session.commit()

    return {
        "id": review.id,
        "status": review.status,
        "reviewerComment": review.reviewer_comment,
        "reviewedAt": _datetime_text(review.reviewed_at),
    }
