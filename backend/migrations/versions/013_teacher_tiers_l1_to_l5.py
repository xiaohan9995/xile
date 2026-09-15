"""renumber teacher tiers to L1 through L5

Revision ID: 013_teacher_tiers_l1_to_l5
Revises: 012_normalize_teacher_tiers
"""
from alembic import op
import sqlalchemy as sa


revision = "013_teacher_tiers_l1_to_l5"
down_revision = "012_normalize_teacher_tiers"
branch_labels = None
depends_on = None


# The single source of truth for the tier dictionary. 个人设置 / 管理后台 read
# teacher_tiers, so a renumbering only has to move the codes and rewrite the
# labels in place.
TIERS = (
    ("L1", "喜乐顾问", 2, 1),
    ("L2", "喜乐瑜伽初级教师", 2, 2),
    ("L3", "喜乐健康生活管理师（喜乐瑜伽中级教师）", 2, 3),
    ("L4", "喜乐智慧生命教练（喜乐瑜伽高级教师）", 2, 4),
    ("L5", "喜乐生命工程师（喜乐智慧导师）", 3, 5),
)

# Shifted in descending order so the target code is always free. Renaming the
# row keeps every teacher, review and opinion pointing at the same tier.
CODE_SHIFTS = (("L4", "L5"), ("L3", "L4"), ("L2", "L3"), ("L1", "L2"), ("L0", "L1"))
REVERSE_SHIFTS = tuple((new, old) for old, new in reversed(CODE_SHIFTS))


def _codes(bind):
    return {code: tier_id for tier_id, code in bind.execute(sa.text("SELECT id, code FROM teacher_tiers"))}


def _shift(bind, shifts):
    rows = _codes(bind)
    used = set(rows)
    for old_code, new_code in shifts:
        if old_code in used and new_code not in used:
            bind.execute(
                sa.text("UPDATE teacher_tiers SET code = :new_code WHERE code = :old_code"),
                {"old_code": old_code, "new_code": new_code},
            )
            used.discard(old_code)
            used.add(new_code)


def _upsert(bind, tiers):
    rows = _codes(bind)
    for code, name, review_cycle_years, sort_order in tiers:
        if code in rows:
            bind.execute(
                sa.text(
                    "UPDATE teacher_tiers SET name = :name, review_cycle_years = :review_cycle_years, "
                    "sort_order = :sort_order WHERE id = :id"
                ),
                {"id": rows[code], "name": name, "review_cycle_years": review_cycle_years, "sort_order": sort_order},
            )
        else:
            bind.execute(
                sa.text(
                    "INSERT INTO teacher_tiers (code, name, review_cycle_years, review_required, sort_order) "
                    "VALUES (:code, :name, :review_cycle_years, 1, :sort_order)"
                ),
                {"code": code, "name": name, "review_cycle_years": review_cycle_years, "sort_order": sort_order},
            )


def upgrade():
    bind = op.get_bind()
    # L5 never existed before this renumbering, so its presence marks a
    # completed migration and keeps a re-run from shifting the codes twice.
    if "L5" not in _codes(bind):
        _shift(bind, CODE_SHIFTS)
    _upsert(bind, TIERS)


def downgrade():
    bind = op.get_bind()
    _shift(bind, REVERSE_SHIFTS)
    _upsert(
        bind,
        (
            ("L0", "顾问", 2, 0),
            ("L1", "初级喜乐瑜伽教师", 2, 1),
            ("L2", "中级喜乐瑜伽教师", 2, 2),
            ("L3", "高级喜乐瑜伽教师", 2, 3),
            ("L4", "导师", 3, 4),
        ),
    )
