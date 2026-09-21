"""add teacher can_manage_banner permission flag"""
from alembic import op
import sqlalchemy as sa

revision = "020_teacher_can_manage_banner"
down_revision = "019_teacher_data_backfill"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("teachers")}

    if "can_manage_banner" not in columns:
        op.add_column("teachers", sa.Column("can_manage_banner", sa.Boolean(), nullable=False, server_default="0"))


def downgrade():
    op.drop_column("teachers", "can_manage_banner")
