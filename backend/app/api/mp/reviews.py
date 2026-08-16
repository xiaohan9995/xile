from datetime import date, datetime, timezone

from flask import request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ...extensions import db
from ...models import AnnualReview, ReviewFile, Teacher, User
from ...services.review_service import ReviewError, submit_review
from .helpers import _datetime_text, _file_payload
from . import mp_bp


@mp_bp.post("/reviews")
@jwt_required()
def submit_review_endpoint():
    user_id = int(get_jwt_identity())
    payload = request.get_json(silent=True) or {}

    user = db.session.get(User, user_id)
    teacher_id = payload.get("teacherId") or (user.teacher_id if user else None)

    try:
        review_year = int(payload.get("reviewYear") or date.today().year)
    except (TypeError, ValueError):
        return {"error": "invalid reviewYear"}, 400

    files = payload.get("files") or []
    teaching_record_ids = payload.get("teachingRecordIds") or []

    try:
        review = submit_review(user_id, teacher_id, review_year, files, teaching_record_ids)
    except ReviewError as e:
        return {"error": e.message}, e.status_code

    return {
        "id": review.id,
        "teacherId": review.teacher_id,
        "reviewYear": review.review_year,
        "status": review.status,
        "submissionVersion": review.submission_version,
        "submittedAt": _datetime_text(review.submitted_at),
        "files": [_file_payload(f) for f in review.files.order_by("id").all()],
    }, 201
