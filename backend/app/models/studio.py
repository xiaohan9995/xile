from ..extensions import db


# Many-to-many link between studios and their lead teachers. A studio may be
# run by multiple teachers, so the legacy single owner_teacher_id is kept only
# for backward compatibility and this table is the source of truth.
studio_teachers = db.Table(
    "studio_teachers",
    db.Column("studio_id", db.Integer, db.ForeignKey("studios.id"), primary_key=True),
    db.Column("teacher_id", db.Integer, db.ForeignKey("teachers.id"), primary_key=True),
)


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
    images = db.Column(db.Text)  # comma-separated gallery URLs (max 9); first is the cover
    course_intro = db.Column(db.Text)  # 课程介绍 (replaces the legacy opening_hours)
    tags = db.Column(db.String(256))
    intro = db.Column(db.Text)
    opening_hours = db.Column(db.String(64))  # legacy, no longer displayed
    contact_text = db.Column(db.String(128))
    # 联系工作室：主理教师上传的一张图片，内含联系电话、二维码等联系方式。
    # 详情页点选「联系工作室」时直接预览该图片，不再单独展示电话。
    contact_image = db.Column(db.String(512))
    status = db.Column(db.String(16), default="open", nullable=False)  # open/hidden/incomplete/pending
    # A lead teacher may submit a full display-info draft that only takes
    # effect after an admin approves it. The public fields above keep serving
    # the already-published content until then, so submitting never unpublishes.
    pending_draft = db.Column(db.Text)  # JSON string of the pending display fields
    pending_reject_reason = db.Column(db.String(256))
    display_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    owner = db.relationship("Teacher", lazy="joined", foreign_keys=[owner_teacher_id])
    teachers = db.relationship("Teacher", secondary=studio_teachers, lazy="selectin")
