"""add a per-user JWT session version for password-reset invalidation"""
from alembic import op
import sqlalchemy as sa


revision = "010_add_user_session_version"
down_revision = "009_teacher_profile_service_records"
branch_labels = None
depends_on = None


def upgrade():
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("users")}
    if "session_version" not in columns:
        op.add_column(
            "users",
            sa.Column("session_version", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade():
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("users")}
    if "session_version" in columns:
        op.drop_column("users", "session_version")
