"""add teacher instructor (training teacher) certification column"""
from alembic import op
import sqlalchemy as sa

revision = "021_teacher_instructor_certification"
down_revision = "020_teacher_can_manage_banner"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("teachers")}

    # 中间版本曾用一个布尔列存「是否授权」，同一次改动里统一改为存等级文本。
    if "instructor_certified" in columns:
        op.drop_column("teachers", "instructor_certified")
    if "instructor_certification" not in columns:
        op.add_column(
            "teachers",
            sa.Column("instructor_certification", sa.String(length=32), nullable=True),
        )


def downgrade():
    op.drop_column("teachers", "instructor_certification")
