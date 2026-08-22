"""allow long legacy avatar URLs"""
from alembic import op
import sqlalchemy as sa

revision = "008_expand_avatar_url"
down_revision = "007_expand_cert_url"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        "teachers",
        "avatar_url",
        existing_type=sa.String(length=256),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade():
    op.alter_column(
        "teachers",
        "avatar_url",
        existing_type=sa.Text(),
        type_=sa.String(length=256),
        existing_nullable=True,
    )
