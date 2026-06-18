from ..extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    openid = db.Column(db.String(64), unique=True, nullable=False, index=True)
    role = db.Column(db.String(16), default="student")  # student/teacher
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id"), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
