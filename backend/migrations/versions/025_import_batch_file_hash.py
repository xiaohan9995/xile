"""add import_batches.file_hash for preview/commit consistency"""
from alembic import op
import sqlalchemy as sa

revision = "025_import_batch_file_hash"
down_revision = "024_add_teacher_country"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("import_batches")}

    if "file_hash" not in columns:
        op.add_column("import_batches", sa.Column("file_hash", sa.String(length=64), nullable=True))


def downgrade():
    op.drop_column("import_batches", "file_hash")
