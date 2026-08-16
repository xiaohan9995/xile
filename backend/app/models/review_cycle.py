from ..extensions import db


class ReviewCycle(db.Model):
    __tablename__ = "review_cycles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False, unique=True)
    start_date = db.Column(db.Date, nullable=False)
    submission_deadline = db.Column(db.Date, nullable=False)
    publish_date = db.Column(db.Date)
    status = db.Column(db.String(16), nullable=False, default="open")  # draft/open/closed
    created_by_id = db.Column(db.Integer, db.ForeignKey("admin_users.id"))
    created_at = db.Column(db.DateTime, server_default=db.func.now())
