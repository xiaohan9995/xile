from ..extensions import db


class Teacher(db.Model):
    __tablename__ = "teachers"

    id = db.Column(db.Integer, primary_key=True)
    teacher_no = db.Column(db.String(32), unique=True, nullable=False, index=True)
    real_name = db.Column(db.String(32), nullable=False, index=True)
    xile_name = db.Column(db.String(32), index=True)
    alias = db.Column(db.String(32), index=True)
    id_number = db.Column(db.String(32), unique=True, index=True)
    tier_id = db.Column(db.Integer, db.ForeignKey("teacher_tiers.id"), nullable=False, index=True)
    city = db.Column(db.String(32), index=True)
    district = db.Column(db.String(32))
    status = db.Column(db.String(16), default="active", nullable=False)  # active/expiring/expired/hidden
    first_certified_on = db.Column(db.Date)
    valid_until = db.Column(db.Date, index=True)
    current_tier_certified_on = db.Column(db.Date)
    residences = db.Column(db.String(255))
    public_profile_settings = db.Column(db.Text)
    certificate_url = db.Column(db.Text)
    avatar_url = db.Column(db.Text)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    tier = db.relationship("TeacherTier", lazy="joined")
    detail = db.relationship("TeacherDetail", backref="teacher", uselist=False, lazy="joined")
