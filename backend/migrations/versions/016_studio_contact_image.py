"""add studio contact image for the 联系工作室 card"""
from alembic import op
import sqlalchemy as sa

revision = "016_studio_contact_image"
down_revision = "015_studio_pending_submission"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("studios")}

    if "contact_image" not in columns:
        op.add_column("studios", sa.Column("contact_image", sa.String(length=512), nullable=True))


def downgrade():
    op.drop_column("studios", "contact_image")
