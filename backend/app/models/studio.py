from ..extensions import db


class Studio(db.Model):
    __tablename__ = "studios"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(64), nullable=False)
    city = db.Column(db.String(32), index=True)
    district = db.Column(db.String(32))
    address = db.Column(db.String(128))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    owner_teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id"), index=True)
    cover_url = db.Column(db.String(256))
    tags = db.Column(db.String(256))
    intro = db.Column(db.Text)
    opening_hours = db.Column(db.String(64))
    contact_text = db.Column(db.String(128))
    status = db.Column(db.String(16), default="open", nullable=False)  # open/hidden/incomplete
    display_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    owner = db.relationship("Teacher", lazy="joined")
