from datetime import date

from ..extensions import db
from ..models import Teacher, TeacherDetail, TeacherTier


def refresh_status(teacher):
    if teacher.status == "hidden" or not teacher.valid_until:
        return
    today = date.today()
    days_left = (teacher.valid_until - today).days
    if days_left < 0 and teacher.status != "expired":
        teacher.status = "expired"
        db.session.commit()
    elif 0 <= days_left <= 90 and teacher.status == "active":
        teacher.status = "expiring"
        db.session.commit()
    elif days_left > 90 and teacher.status in ("expiring", "expired"):
        teacher.status = "active"
        db.session.commit()


def generate_teacher_no():
    year = date.today().year
    max_no = (
        db.session.query(db.func.max(Teacher.teacher_no))
        .filter(Teacher.teacher_no.like(f"JY{year}%"))
        .scalar()
    )
    seq = int(max_no[-4:]) + 1 if max_no else 1
    return f"JY{year}{seq:04d}"


def create_teacher(name, tier_code="L1", city=None, district=None, xile_name=None,
                   phone=None, valid_until=None):
    tier_code = (tier_code or "L1").strip().upper()
    if not tier_code.startswith("L"):
        tier_code = "L1"
    tier = TeacherTier.query.filter_by(code=tier_code).first()
    if tier is None:
        tier = TeacherTier.query.filter_by(code="L1").first()

    teacher_no = generate_teacher_no()

    if valid_until is None:
        year = date.today().year
        valid_until = date(year + 3, 12, 31)

    teacher = Teacher(
        teacher_no=teacher_no,
        real_name=name,
        xile_name=xile_name or None,
        tier_id=tier.id,
        city=city or None,
        district=district or None,
        status="active",
        first_certified_on=date.today(),
        valid_until=valid_until,
    )
    db.session.add(teacher)
    db.session.flush()

    if phone:
        detail = TeacherDetail(teacher_id=teacher.id, phone=phone)
        db.session.add(detail)

    db.session.commit()
    return teacher, tier
