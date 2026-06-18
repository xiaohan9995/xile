from ..extensions import db


class AnnualReview(db.Model):
    __tablename__ = "annual_reviews"

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id"), nullable=False, index=True)
    review_year = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(16), default="draft", nullable=False)  # draft/submitted/approved/rejected/exempt
    submitted_at = db.Column(db.DateTime)
    reviewed_at = db.Column(db.DateTime)
    reviewer_admin_id = db.Column(db.Integer, db.ForeignKey("admin_users.id"))
    reviewer_comment = db.Column(db.Text)
    previous_valid_until = db.Column(db.Date)
    next_valid_until = db.Column(db.Date)

    __table_args__ = (
        db.UniqueConstraint("teacher_id", "review_year", name="uq_review_teacher_year"),
    )

    teacher = db.relationship("Teacher", lazy="joined")
    files = db.relationship("ReviewFile", backref="review", lazy="dynamic")
