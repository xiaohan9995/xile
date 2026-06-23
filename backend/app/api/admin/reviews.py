from flask import request

from ...extensions import db
from ...models import AnnualReview, AuditLog
from ...services.review_service import ReviewError, decide_review
from ...utils.storage import file_url as _file_url
from .helpers import require_admin_token, _date_text, _datetime_text
from . import admin_bp


@admin_bp.get("/reviews")
@require_admin_token
def review_queue():
    status = request.args.get("status", "").strip()
    query = AnnualReview.query
    if status and status != "all":
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
            "avatarUrl": review.teacher.avatar_url if review.teacher else None,
            "reviewYear": review.review_year,
            "status": review.status,
            "submittedAt": _datetime_text(review.submitted_at),
            "reviewedAt": _datetime_text(review.reviewed_at),
            "reviewerComment": review.reviewer_comment,
            "previousValidUntil": _date_text(review.previous_valid_until),
            "nextValidUntil": _date_text(review.next_valid_until),
            "files": [
                {
                    "id": file.id,
                    "filename": file.file_name,
                    "fileKey": file.file_key,
                    "fileType": file.file_type,
                    "fileSize": file.file_size,
                    "url": _file_url(file.file_key),
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
    comment = payload.get("comment", "")

    try:
        review = decide_review(review_id, status, comment)
    except ReviewError as e:
        return {"error": e.message}, e.status_code

    db.session.add(AuditLog(admin_id=1, action=f"review_{review.status}", target_type="annual_review", target_id=review.id))
    db.session.commit()

    return {
        "id": review.id,
        "status": review.status,
        "reviewerComment": review.reviewer_comment,
        "reviewedAt": _datetime_text(review.reviewed_at),
    }
