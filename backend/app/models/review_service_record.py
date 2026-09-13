from ..extensions import db


class ReviewServiceRecord(db.Model):
    __tablename__ = "review_service_records"

    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(db.Integer, db.ForeignKey("annual_reviews.id"), nullable=False, index=True)
    service_record_id = db.Column(db.Integer, db.ForeignKey("service_records.id"), nullable=False, index=True)

    service_record = db.relationship("ServiceRecord", lazy="joined")
