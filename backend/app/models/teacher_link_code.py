from ..extensions import db


class TeacherLinkCode(db.Model):
    """A short-lived, single-use code for binding a WeChat user to a teacher."""

    __tablename__ = "teacher_link_codes"

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id"), nullable=False, index=True)
    code_hash = db.Column(db.String(64), nullable=False, unique=True, index=True)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    used_at = db.Column(db.DateTime, nullable=True)
    created_by_id = db.Column(db.Integer, db.ForeignKey("admin_users.id"), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
