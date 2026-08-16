from ..extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    openid = db.Column(db.String(64), unique=True, nullable=True, index=True)
    username = db.Column(db.String(64), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(256))
    must_change_password = db.Column(db.Boolean, nullable=False, default=False)
    phone = db.Column(db.String(20), nullable=True, index=True)
    avatar_url = db.Column(db.String(512), nullable=True)
    nickname = db.Column(db.String(64), nullable=True)
    role = db.Column(db.String(16), default="student")  # student/teacher
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id"), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
