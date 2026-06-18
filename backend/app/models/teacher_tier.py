from ..extensions import db


class TeacherTier(db.Model):
    __tablename__ = "teacher_tiers"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(4), unique=True, nullable=False)  # L0-L5
    name = db.Column(db.String(32), nullable=False)
    review_cycle_years = db.Column(db.Integer, nullable=True)  # NULL = exempt
    review_required = db.Column(db.Boolean, default=True, nullable=False)
    sort_order = db.Column(db.Integer, default=0)
