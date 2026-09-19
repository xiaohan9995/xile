"""add studio manager_teacher_ids for teacher-management permission"""
from alembic import op
import sqlalchemy as sa

revision = "017_studio_manager_teacher_ids"
down_revision = "016_studio_contact_image"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("studios")}

    if "manager_teacher_ids" not in columns:
        op.add_column("studios", sa.Column("manager_teacher_ids", sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column("studios", "manager_teacher_ids")
