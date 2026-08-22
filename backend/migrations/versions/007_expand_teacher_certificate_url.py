"""allow long signed certificate URLs"""
from alembic import op
import sqlalchemy as sa

revision = "007_expand_teacher_certificate_url"
down_revision = "006_add_studio_coordinates"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "teachers",
        "certificate_url",
        existing_type=sa.String(length=256),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade():
    op.alter_column(
        "teachers",
        "certificate_url",
        existing_type=sa.Text(),
        type_=sa.String(length=256),
        existing_nullable=True,
    )
