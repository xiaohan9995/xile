from ..extensions import db


class ReviewOpinion(db.Model):
    __tablename__ = "review_opinions"

    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(db.Integer, db.ForeignKey("annual_reviews.id"), nullable=False, index=True)
    author_id = db.Column(db.Integer, db.ForeignKey("admin_users.id"), nullable=False, index=True)
    recommended_tier_id = db.Column(db.Integer, db.ForeignKey("teacher_tiers.id"))
    conclusion = db.Column(db.String(16), nullable=False)  # approved/rejected
    comment = db.Column(db.Text, nullable=False)
    submitted_at = db.Column(db.DateTime, server_default=db.func.now())

    author = db.relationship("AdminUser")
    recommended_tier = db.relationship("TeacherTier")
    __table_args__ = (db.UniqueConstraint("review_id", "author_id", name="uq_review_opinion_author"),)
