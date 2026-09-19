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


def generate_certificate_no(tier_code, certified_year, id_number):
    """生成证书号：2050 + 认证级别 + XL + 首次认证年份 + 身份证后四位。

    例：2050L4XL20180921（2050 / L4 / XL / 2018 / 0921）
    """
    tier = (tier_code or "").strip().upper() or "L1"
    last4 = (id_number or "").strip()[-4:] or "0000"
    year = certified_year or date.today().year
    return f"2050{tier}XL{year}{last4}"


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
    # 未显式提供证书号时，若具备首次认证日期，则按规则自动生成。
    if not certificate_no and certified_on:
        certificate_no = generate_certificate_no(tier_code, certified_on.year, id_number)
    # 排序号：新添加的教师排在当前最大 sort_order 之后。
    sort_order = (db.session.query(db.func.max(Teacher.sort_order)).scalar() or 0) + 1
    # A concurrent certificate-number allocation can collide between the read
    # and commit. Teacher numbers themselves are ID credentials and supplied
    # by the administrator.
    for _ in range(3):
        teacher = Teacher(
            teacher_no=id_number,
            certificate_no=certificate_no,
            real_name=name,
            xile_name=xile_name or None,
            tier_id=tier.id,
            city=city or None,
            district=district or None,
            status="active",
            first_certified_on=certified_on,
            valid_until=valid_until,
            sort_order=sort_order,
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
