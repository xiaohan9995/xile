from ..extensions import db


class AnnualReview(db.Model):
    __tablename__ = "annual_reviews"

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id"), nullable=False, index=True)
    cycle_id = db.Column(db.Integer, db.ForeignKey("review_cycles.id"), index=True)
    group_id = db.Column(db.Integer, db.ForeignKey("review_groups.id"), index=True)
    review_year = db.Column(db.Integer, nullable=False)
    submission_version = db.Column(db.Integer, nullable=False, default=1)
    status = db.Column(db.String(32), default="draft", nullable=False)
    submitted_at = db.Column(db.DateTime)
    reviewed_at = db.Column(db.DateTime)
    reviewer_admin_id = db.Column(db.Integer, db.ForeignKey("admin_users.id"))
    reviewer_comment = db.Column(db.Text)
    group_decision = db.Column(db.Text)
    group_decided_at = db.Column(db.DateTime)
    published_by_id = db.Column(db.Integer, db.ForeignKey("admin_users.id"))
    published_at = db.Column(db.DateTime)
    final_tier_id = db.Column(db.Integer, db.ForeignKey("teacher_tiers.id"))
    previous_valid_until = db.Column(db.Date)
    next_valid_until = db.Column(db.Date)

    __table_args__ = (
        db.UniqueConstraint("teacher_id", "review_year", name="uq_review_teacher_year"),
    )

    teacher = db.relationship("Teacher", lazy="joined")
    cycle = db.relationship("ReviewCycle", lazy="joined")
    group = db.relationship("ReviewGroup", lazy="joined")
    final_tier = db.relationship("TeacherTier", foreign_keys=[final_tier_id], lazy="joined")
    files = db.relationship("ReviewFile", backref="review", lazy="dynamic")
    opinions = db.relationship("ReviewOpinion", backref="review", lazy="dynamic", cascade="all, delete-orphan")
    teaching_records = db.relationship("ReviewTeachingRecord", backref="review", lazy="dynamic", cascade="all, delete-orphan")
