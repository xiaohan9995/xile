"""backfill teacher sort_order and missing certificate numbers"""
from alembic import op
import sqlalchemy as sa

revision = "019_teacher_data_backfill"
down_revision = "018_teacher_sort_order"
branch_labels = None
depends_on = None

# docss/喜乐瑜伽教师信息表-部分.xlsx「教师名单汇总」第 4 行起的身份证号顺序。
TEACHER_ID_NUMBERS = [
    "06104446", "231005197504122026", "03353291", "750120-01-5016",
    "421127198904130037", "00605986", "04334155", "430111198301141722",
    "440105197605140921", "441302197711255426", "320381198908150611",
    "211323197708220045", "15282719810628422X", "152827198509154227",
    "110102197601071142", "110104198108131321", "510102196706148441",
    "110105197802081127", "110224197110040027", "350322198302160028",
    "110108196906304027", "152628198407217229", "130626199202105860",
    "130721198207124648", "42242619840310002x", "130631198202210229",
    "152827195602150144", "110108197201169720",
]


def _cert_year(value):
    """从 first_certified_on 提取年份（兼容 date 对象与字符串）。"""
    if value is None:
        return None
    if hasattr(value, "year"):
        return value.year
    s = str(value)
    return int(s[:4]) if s[:4].isdigit() else None


def _cert_no(tier_code, certified_value, id_number):
    """与 services/teacher_service.generate_certificate_no 保持一致。"""
    tier = (tier_code or "").strip().upper() or "L1"
    last4 = (id_number or "").strip()[-4:] or "0000"
    year = _cert_year(certified_value)
    return f"2050{tier}XL{year}{last4}"


def upgrade():
    conn = op.get_bind()

    # 1. 回填 sort_order（按名单顺序，身份证号精确匹配）。
    for order, id_number in enumerate(TEACHER_ID_NUMBERS, start=1):
        conn.execute(
            sa.text("UPDATE teachers SET sort_order = :o WHERE teacher_no = :no"),
            {"o": order, "no": id_number},
        )

    # 2. 补齐缺失的证书号（certificate_no 为空的教师，按新规则生成）。
    rows = conn.execute(
        sa.text(
            """
            SELECT t.id, ti.code, t.first_certified_on, t.teacher_no
            FROM teachers t
            JOIN teacher_tiers ti ON ti.id = t.tier_id
            WHERE t.certificate_no IS NULL AND t.status != 'hidden'
            """
        )
    ).fetchall()

    existing = {
        r[0] for r in conn.execute(
            sa.text("SELECT certificate_no FROM teachers WHERE certificate_no IS NOT NULL")
        ).fetchall()
    }

    for teacher_id, tier_code, first_certified_on, teacher_no in rows:
        if not tier_code or not first_certified_on or not teacher_no:
            continue
        cert_no = _cert_no(tier_code, first_certified_on, teacher_no)
        if cert_no in existing:
            continue  # 撞号（同年同级别同身份证后四位），跳过
        existing.add(cert_no)
        conn.execute(
            sa.text("UPDATE teachers SET certificate_no = :c WHERE id = :id"),
            {"c": cert_no, "id": teacher_id},
        )


def downgrade():
    pass
