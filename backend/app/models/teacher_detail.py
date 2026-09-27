from ..extensions import db


class TeacherDetail(db.Model):
    __tablename__ = "teacher_details"

    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id"), primary_key=True)
    # 含国际号码/备用号码时可能超过 20 位（如 13591185526/+6588054991）。
    phone = db.Column(db.String(64))
    specialties = db.Column(db.String(256))
    teaching_summary = db.Column(db.Text)
    committee_remark = db.Column(db.Text)
    extra_json = db.Column(db.Text)
