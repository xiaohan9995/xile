from datetime import date, datetime, timezone

from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import AnnualReview, AuditLog, ReviewCycle, ReviewFile, ReviewTeachingRecord, TeachingRecord, Teacher, User


class ReviewError(Exception):
    def __init__(self, message, status_code=400):
        self.message = message
        self.status_code = status_code


def submit_review(user_id, teacher_id, review_year, files, teaching_record_ids=None):
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

    if not isinstance(files, list):
        raise ReviewError("files must be a list", 400)
    if not files and not teaching_record_ids:
        raise ReviewError("files or submitted teaching records required", 400)

    next_valid = _calculate_next_valid(teacher)

    review = AnnualReview.query.filter_by(teacher_id=teacher.id, review_year=review_year).first()
    if review is None:
        cycle = ReviewCycle.query.filter_by(status="open").order_by(ReviewCycle.start_date.desc()).first()
        review = AnnualReview(
            teacher_id=teacher.id,
            review_year=review_year,
            cycle_id=cycle.id if cycle else None,
            previous_valid_until=teacher.valid_until,
            next_valid_until=next_valid,
        )
        db.session.add(review)
    else:
        if review.status in ("published_approved", "approved"):
            raise ReviewError("cannot resubmit an approved review", 409)
        db.session.add(AuditLog(admin_id=1, action="teacher_resubmit", target_type="annual_review", target_id=review.id,
                                detail=f"version {review.submission_version}; previous status {review.status}"))
        review.submission_version += 1
        for file in review.files.all():
            db.session.delete(file)
        for item in review.teaching_records.all():
            db.session.delete(item)
        for opinion in review.opinions.all():
            db.session.delete(opinion)
        review.previous_valid_until = teacher.valid_until
        review.next_valid_until = next_valid

    review.status = "submitted"
    review.submitted_at = datetime.now(timezone.utc).replace(tzinfo=None)
    review.reviewer_admin_id = None
    review.reviewer_comment = None
    review.reviewed_at = None
    review.group_decision = None
    review.group_decided_at = None
    review.published_at = None
    review.published_by_id = None

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

    selected_ids = {int(item) for item in (teaching_record_ids or []) if str(item).isdigit()}
    if selected_ids:
        records = TeachingRecord.query.filter(TeachingRecord.teacher_id == teacher.id, TeachingRecord.id.in_(selected_ids), TeachingRecord.status == "submitted").all()
        if len(records) != len(selected_ids):
            raise ReviewError("teaching records must belong to you and be submitted", 400)
        for record in records:
            review.teaching_records.append(ReviewTeachingRecord(teaching_record_id=record.id))

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
