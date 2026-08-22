"""add map coordinates to studios"""
from alembic import op
import sqlalchemy as sa

revision = "006_add_studio_coordinates"
down_revision = "005_add_teacher_link_codes"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("studios")}
    if "latitude" not in columns:
        op.add_column("studios", sa.Column("latitude", sa.Float(), nullable=True))
    if "longitude" not in columns:
        op.add_column("studios", sa.Column("longitude", sa.Float(), nullable=True))


def downgrade():
    op.drop_column("studios", "longitude")
    op.drop_column("studios", "latitude")
