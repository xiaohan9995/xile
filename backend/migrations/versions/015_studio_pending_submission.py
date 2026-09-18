"""add studio pending submission draft and reject reason"""
from alembic import op
import sqlalchemy as sa

revision = "015_studio_pending_submission"
down_revision = "014_studio_gallery_and_course_intro"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("studios")}

    if "pending_draft" not in columns:
        op.add_column("studios", sa.Column("pending_draft", sa.Text(), nullable=True))
    if "pending_reject_reason" not in columns:
        op.add_column("studios", sa.Column("pending_reject_reason", sa.String(length=256), nullable=True))


def downgrade():
    op.drop_column("studios", "pending_reject_reason")
    op.drop_column("studios", "pending_draft")
