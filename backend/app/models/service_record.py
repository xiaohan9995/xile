from ..extensions import db


class ServiceRecord(db.Model):
    __tablename__ = "service_records"

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id"), nullable=False, index=True)
    served_on = db.Column(db.Date, index=True)
    service_type = db.Column(db.String(64))
    title = db.Column(db.String(128))
    location = db.Column(db.String(128))
    description = db.Column(db.Text)
    evidence_key = db.Column(db.String(256))
    status = db.Column(db.String(16), nullable=False, default="submitted")
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    teacher = db.relationship("Teacher")
