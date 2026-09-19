"""add teacher sort_order for list ordering"""
from alembic import op
import sqlalchemy as sa

revision = "018_teacher_sort_order"
down_revision = "017_studio_manager_teacher_ids"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("teachers")}

    if "sort_order" not in columns:
        op.add_column("teachers", sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"))


def downgrade():
    op.drop_column("teachers", "sort_order")
