"""normalize teacher tiers to L0 through L4

Revision ID: 012_normalize_teacher_tiers
Revises: 011_split_teacher_identity_and_certificate
"""
from alembic import op
import sqlalchemy as sa


revision = "012_normalize_teacher_tiers"
down_revision = "011_split_teacher_identity_and_certificate"
branch_labels = None
depends_on = None


TIERS = (
    ("L0", "顾问", 0),
    ("L1", "初级喜乐瑜伽教师", 1),
    ("L2", "中级喜乐瑜伽教师", 2),
    ("L3", "高级喜乐瑜伽教师", 3),
    ("L4", "导师", 4),
)


def upgrade():
    bind = op.get_bind()
    rows = {code: tier_id for tier_id, code in bind.execute(sa.text("SELECT id, code FROM teacher_tiers"))}
    for code, name, sort_order in TIERS:
        if code in rows:
            bind.execute(sa.text("UPDATE teacher_tiers SET name = :name, sort_order = :sort_order WHERE id = :id"), {"id": rows[code], "name": name, "sort_order": sort_order})
        else:
            bind.execute(sa.text("INSERT INTO teacher_tiers (code, name, review_cycle_years, review_required, sort_order) VALUES (:code, :name, 2, 1, :sort_order)"), {"code": code, "name": name, "sort_order": sort_order})
    rows = {code: tier_id for tier_id, code in bind.execute(sa.text("SELECT id, code FROM teacher_tiers"))}
    if "L5" in rows:
        target_id = rows["L4"]
        bind.execute(sa.text("UPDATE teachers SET tier_id = :target WHERE tier_id = :legacy"), {"target": target_id, "legacy": rows["L5"]})
        bind.execute(sa.text("UPDATE annual_reviews SET final_tier_id = :target WHERE final_tier_id = :legacy"), {"target": target_id, "legacy": rows["L5"]})
        bind.execute(sa.text("DELETE FROM teacher_tiers WHERE id = :legacy"), {"legacy": rows["L5"]})


def downgrade():
    op.execute("INSERT INTO teacher_tiers (code, name, review_cycle_years, review_required, sort_order) VALUES ('L5', '荣誉导师', NULL, 0, 5)")
