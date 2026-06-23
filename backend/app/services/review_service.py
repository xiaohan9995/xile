from datetime import date, datetime, timezone

from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import AnnualReview, ReviewFile, Teacher, User


class ReviewError(Exception):
    def __init__(self, message, status_code=400):
        self.message = message
        self.status_code = status_code


def submit_review(user_id, teacher_id, review_year, files):
    user = db.session.get(User, user_id)
    if not user or not user.teacher_id:
        raise ReviewError("not a teacher", 403)

    if teacher_id != user.teacher_id:
        raise ReviewError("can only submit reviews for yourself", 403)

    teacher = Teacher.query.filter(Teacher.id == teacher_id, Teacher.status != "hidden").first()
    if teacher is None:
        raise ReviewError("teacher not found", 404)

    if teacher.tier and not teacher.tier.review_required:
        raise ReviewError("your tier is exempt from annual review", 400)

    current_year = date.today().year
    if review_year < current_year - 1 or review_year > current_year:
        raise ReviewError("reviewYear must be current or previous year", 400)

    if not isinstance(files, list) or not files:
        raise ReviewError("files required", 400)

    next_valid = _calculate_next_valid(teacher)

    review = AnnualReview.query.filter_by(teacher_id=teacher.id, review_year=review_year).first()
    if review is None:
        review = AnnualReview(
            teacher_id=teacher.id,
            review_year=review_year,
            previous_valid_until=teacher.valid_until,
            next_valid_until=next_valid,
        )
        db.session.add(review)
    else:
        if review.status == "approved":
            raise ReviewError("cannot resubmit an approved review", 409)
        for file in review.files.all():
            db.session.delete(file)
        review.previous_valid_until = teacher.valid_until
        review.next_valid_until = next_valid

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

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ReviewError("review already submitted for this year", 409)

    return review


def decide_review(review_id, status, comment=""):
    if status not in ("approved", "rejected"):
        raise ReviewError("invalid status", 400)

    review = db.session.get(AnnualReview, review_id)
    if review is None:
        raise ReviewError("not found", 404)

    review.status = status
    review.reviewer_comment = comment
    review.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)

    if status == "approved" and review.next_valid_until and review.teacher:
        review.teacher.valid_until = review.next_valid_until
        if review.teacher.status == "expiring":
            review.teacher.status = "active"

    db.session.commit()
    return review


def _calculate_next_valid(teacher):
    cycle_years = teacher.tier.review_cycle_years if teacher.tier else 2
    if teacher.valid_until and cycle_years:
        return teacher.valid_until.replace(year=teacher.valid_until.year + cycle_years)
    return teacher.valid_until
