"""add teacher country column"""
from alembic import op
import sqlalchemy as sa

revision = "024_add_teacher_country"
down_revision = "023_widen_teacher_phone"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("teachers")}

    if "country" not in columns:
        op.add_column("teachers", sa.Column("country", sa.String(length=32), nullable=True))


def downgrade():
    op.drop_column("teachers", "country")
