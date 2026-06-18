from ..extensions import db


class TeacherDetail(db.Model):
    __tablename__ = "teacher_details"

    teacher_id = db.Column(db.Integer, db.ForeignKey("teachers.id"), primary_key=True)
    phone = db.Column(db.String(20))
    specialties = db.Column(db.String(256))
    teaching_summary = db.Column(db.Text)
    committee_remark = db.Column(db.Text)
    extra_json = db.Column(db.Text)
