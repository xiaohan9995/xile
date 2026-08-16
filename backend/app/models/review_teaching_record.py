from ..extensions import db


class ReviewTeachingRecord(db.Model):
    __tablename__ = "review_teaching_records"

    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(db.Integer, db.ForeignKey("annual_reviews.id"), nullable=False, index=True)
    teaching_record_id = db.Column(db.Integer, db.ForeignKey("teaching_records.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    teaching_record = db.relationship("TeachingRecord", lazy="joined")

    __table_args__ = (db.UniqueConstraint("review_id", "teaching_record_id", name="uq_review_teaching_record"),)
