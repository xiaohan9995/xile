from ..extensions import db


class TeachingRecord(db.Model):
    __tablename__ = "teaching_records"

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id"), nullable=False, index=True)
    taught_on = db.Column(db.Date, nullable=False, index=True)
    platform = db.Column(db.String(128), nullable=False)
    title = db.Column(db.String(128), nullable=False)
    duration_hours = db.Column(db.Numeric(5, 1))
    participant_count = db.Column(db.Integer)
    description = db.Column(db.Text)
    evidence_key = db.Column(db.String(256))
    status = db.Column(db.String(16), nullable=False, default="submitted")
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    teacher = db.relationship("Teacher")
