"""rename L3/L4 tier names to 中级喜乐瑜伽教师 / 高级喜乐瑜伽教师"""
from alembic import op

revision = "022_rename_middle_teacher_tiers"
down_revision = "021_teacher_instructor_certification"
branch_labels = None
depends_on = None

RENAMES = (
    (
        "喜乐健康生活管理师（喜乐瑜伽中级教师）",
        "喜乐健康生活管理师（中级喜乐瑜伽教师）",
    ),
    (
        "喜乐智慧生命教练（喜乐瑜伽高级教师）",
        "喜乐智慧生命教练（高级喜乐瑜伽教师）",
    ),
)


def upgrade():
    for old, new in RENAMES:
        op.execute("UPDATE teacher_tiers SET name = '%s' WHERE name = '%s'" % (new, old))


def downgrade():
    for old, new in RENAMES:
        op.execute("UPDATE teacher_tiers SET name = '%s' WHERE name = '%s'" % (old, new))
