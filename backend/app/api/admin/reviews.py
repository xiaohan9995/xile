from flask import g, request

from ...extensions import db
from ...models import AnnualReview, AuditLog
from ...services.review_service import ReviewError, decide_review
from ...utils.storage import file_url as _file_url
from .helpers import current_admin_id, require_admin_roles, require_admin_token, _date_text, _datetime_text
from . import admin_bp


@admin_bp.get("/reviews")
@require_admin_token
def review_queue():
    status = request.args.get("status", "").strip()
    query = AnnualReview.query
    if status and status != "all":
        query = query.filter_by(status=status)
    reviews = query.order_by(AnnualReview.submitted_at.desc(), AnnualReview.id.desc()).all()
    if getattr(g, "current_admin_role", None) in ("reviewer", "group_leader"):
        admin_id = current_admin_id()
        reviews = [review for review in reviews if review.group and (
            review.group.leader_id == admin_id or any(member.admin_id == admin_id for member in review.group.members)
        )]
    items = [
        {
            "id": review.id,
            "teacherId": review.teacher_id,
            "teacherName": review.teacher.real_name if review.teacher else None,
            "teacherNo": review.teacher.teacher_no if review.teacher else None,
            "xileName": review.teacher.xile_name if review.teacher else None,
            "tier": review.teacher.tier.code if review.teacher and review.teacher.tier else None,
            "city": review.teacher.city if review.teacher else None,
            "avatarUrl": _file_url(review.teacher.avatar_url) if review.teacher else None,
            "reviewYear": review.review_year,
            "cycleId": review.cycle_id,
            "cycleName": review.cycle.name if review.cycle else None,
            "groupId": review.group_id,
            "groupName": review.group.name if review.group else None,
            "status": review.status,
            "submittedAt": _datetime_text(review.submitted_at),
            "reviewedAt": _datetime_text(review.reviewed_at),
            "reviewerComment": review.reviewer_comment,
            "groupDecision": review.group_decision,
            "publishedAt": _datetime_text(review.published_at),
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
@require_admin_roles("admin", "super_admin")
def review_decision(review_id):
    return {"error": "direct decisions are retired; use the collaborative review workflow"}, 410
