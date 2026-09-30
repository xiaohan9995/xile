"""add teacher pending certificate columns for certificate image review"""
from alembic import op
import sqlalchemy as sa

revision = "026_teacher_pending_certificate"
down_revision = "025_import_batch_file_hash"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("teachers")}

    if "pending_certificate_url" not in columns:
        op.add_column("teachers", sa.Column("pending_certificate_url", sa.Text(), nullable=True))
    if "pending_certificate_reject_reason" not in columns:
        op.add_column(
            "teachers",
            sa.Column("pending_certificate_reject_reason", sa.String(length=256), nullable=True),
        )


def downgrade():
    op.drop_column("teachers", "pending_certificate_reject_reason")
    op.drop_column("teachers", "pending_certificate_url")
