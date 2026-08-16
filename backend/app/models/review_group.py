from ..extensions import db


class ReviewGroup(db.Model):
    __tablename__ = "review_groups"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False, unique=True)
    leader_id = db.Column(db.Integer, db.ForeignKey("admin_users.id"), nullable=False)
    tier_scope = db.Column(db.String(128), default="")
    active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    leader = db.relationship("AdminUser", foreign_keys=[leader_id])
    members = db.relationship("ReviewGroupMember", backref="group", cascade="all, delete-orphan")
