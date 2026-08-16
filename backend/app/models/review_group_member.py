from ..extensions import db


class ReviewGroupMember(db.Model):
    __tablename__ = "review_group_members"

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey("review_groups.id"), nullable=False, index=True)
    admin_id = db.Column(db.Integer, db.ForeignKey("admin_users.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    admin = db.relationship("AdminUser")
    __table_args__ = (db.UniqueConstraint("group_id", "admin_id", name="uq_group_member"),)
