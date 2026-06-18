from ..extensions import db


class ReviewFile(db.Model):
    __tablename__ = "review_files"

    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(db.Integer, db.ForeignKey("annual_reviews.id"), nullable=False, index=True)
    file_key = db.Column(db.String(256), nullable=False)
    file_name = db.Column(db.String(128))
    file_type = db.Column(db.String(16))
    file_size = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
