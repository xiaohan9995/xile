import re
from datetime import date

from ..extensions import db
from ..models import Teacher, TeacherDetail, TeacherTier
from sqlalchemy.exc import IntegrityError


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


def generate_certificate_no():
    year = date.today().year
    prefix = f"JY{year}"
    existing = {
        certificate_no for (certificate_no,) in db.session.query(Teacher.certificate_no)
        .filter(Teacher.certificate_no.like(f"{prefix}%"))
        .all()
    }
    sequences = []
    pattern = re.compile(rf"^{re.escape(prefix)}(\d+)$")
    for certificate_no in existing:
        match = pattern.match(certificate_no or "")
        if match:
            sequences.append(int(match.group(1)))

    # Deleted teachers are soft-deleted, so their numbers remain reserved.
    # Start after the largest valid number and explicitly check the complete
    # set to avoid collisions caused by legacy or concurrent records.
    sequence = max(sequences, default=0) + 1
    while f"{prefix}{sequence:04d}" in existing:
        sequence += 1
    return f"{prefix}{sequence:04d}"


def create_teacher(name, tier_code="L1", city=None, district=None, xile_name=None,
                   phone=None, valid_until=None, id_number=None, certificate_no=None,
                   certified_on=None):
    tier_code = (tier_code or "L1").strip().upper()
    if not tier_code.startswith("L"):
        tier_code = "L1"
    tier = TeacherTier.query.filter_by(code=tier_code).first()
    if tier is None:
        tier = TeacherTier.query.filter_by(code="L1").first()

    if valid_until is None:
        year = date.today().year
        valid_until = date(year + 3, 12, 31)

    id_number = (id_number or "").strip().upper()
    if len(id_number) < 6:
        raise ValueError("身份证号至少需要 6 位")
    # A concurrent certificate-number allocation can collide between the read
    # and commit. Teacher numbers themselves are ID credentials and supplied
    # by the administrator.
    for _ in range(3):
        teacher = Teacher(
            teacher_no=id_number,
            certificate_no=certificate_no or (generate_certificate_no() if certified_on else None),
            real_name=name,
            xile_name=xile_name or None,
            tier_id=tier.id,
            city=city or None,
            district=district or None,
            status="active",
            first_certified_on=certified_on,
            valid_until=valid_until,
        )
        db.session.add(teacher)
        try:
            db.session.flush()
            if phone:
                db.session.add(TeacherDetail(teacher_id=teacher.id, phone=phone))
            db.session.commit()
            return teacher, tier
        except IntegrityError:
            db.session.rollback()

    raise RuntimeError("教师身份证号或证书编号重复，请稍后重试")
