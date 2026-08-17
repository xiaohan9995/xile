"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-06-22
"""
from alembic import op
import sqlalchemy as sa

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def create_table_if_missing(name, *columns, **kwargs):
    """Make the first migration safe to resume after non-transactional MySQL DDL."""
    if sa.inspect(op.get_bind()).has_table(name):
        return None
    return op.create_table(name, *columns, **kwargs)


def upgrade():
    create_table_if_missing(
        "teacher_tiers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(4), unique=True, nullable=False),
        sa.Column("name", sa.String(32), nullable=False),
        sa.Column("review_cycle_years", sa.Integer(), nullable=True),
        sa.Column("review_required", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
    )

    create_table_if_missing(
        "teachers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("teacher_no", sa.String(32), unique=True, nullable=False, index=True),
        sa.Column("real_name", sa.String(32), nullable=False, index=True),
        sa.Column("xile_name", sa.String(32), index=True),
        sa.Column("tier_id", sa.Integer(), sa.ForeignKey("teacher_tiers.id"), nullable=False, index=True),
        sa.Column("city", sa.String(32), index=True),
        sa.Column("district", sa.String(32)),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("first_certified_on", sa.Date()),
        sa.Column("valid_until", sa.Date(), index=True),
        sa.Column("certificate_url", sa.String(256)),
        sa.Column("avatar_url", sa.String(256)),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    create_table_if_missing(
        "teacher_details",
        sa.Column("teacher_id", sa.Integer(), sa.ForeignKey("teachers.id"), primary_key=True),
        sa.Column("phone", sa.String(20)),
        sa.Column("specialties", sa.String(256)),
        sa.Column("teaching_summary", sa.Text()),
        sa.Column("committee_remark", sa.Text()),
        sa.Column("extra_json", sa.Text()),
    )

    create_table_if_missing(
        "admin_users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(32), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(128), nullable=False),
        sa.Column("role", sa.String(16), server_default="admin"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    create_table_if_missing(
        "annual_reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("teacher_id", sa.Integer(), sa.ForeignKey("teachers.id"), nullable=False, index=True),
        sa.Column("review_year", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="draft"),
        sa.Column("submitted_at", sa.DateTime()),
        sa.Column("reviewed_at", sa.DateTime()),
        sa.Column("reviewer_admin_id", sa.Integer(), sa.ForeignKey("admin_users.id")),
        sa.Column("reviewer_comment", sa.Text()),
        sa.Column("previous_valid_until", sa.Date()),
        sa.Column("next_valid_until", sa.Date()),
        sa.UniqueConstraint("teacher_id", "review_year", name="uq_review_teacher_year"),
    )

    create_table_if_missing(
        "review_files",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("review_id", sa.Integer(), sa.ForeignKey("annual_reviews.id"), nullable=False, index=True),
        sa.Column("file_key", sa.String(256), nullable=False),
        sa.Column("file_name", sa.String(128)),
        sa.Column("file_type", sa.String(16)),
        sa.Column("file_size", sa.Integer()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    create_table_if_missing(
        "studios",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(64), nullable=False),
        sa.Column("city", sa.String(32), index=True),
        sa.Column("district", sa.String(32)),
        sa.Column("address", sa.String(128)),
        sa.Column("owner_teacher_id", sa.Integer(), sa.ForeignKey("teachers.id"), index=True),
        sa.Column("cover_url", sa.String(256)),
        sa.Column("tags", sa.String(256)),
        sa.Column("intro", sa.Text()),
        sa.Column("opening_hours", sa.String(64)),
        sa.Column("contact_text", sa.String(128)),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("display_order", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    create_table_if_missing(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("openid", sa.String(64), unique=True, nullable=False, index=True),
        sa.Column("phone", sa.String(20), index=True),
        sa.Column("avatar_url", sa.String(512)),
        sa.Column("nickname", sa.String(64)),
        sa.Column("role", sa.String(16), server_default="student"),
        sa.Column("teacher_id", sa.Integer(), sa.ForeignKey("teachers.id")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    create_table_if_missing(
        "import_batches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("admin_users.id"), nullable=False),
        sa.Column("total_rows", sa.Integer(), server_default="0"),
        sa.Column("success_rows", sa.Integer(), server_default="0"),
        sa.Column("error_rows", sa.Integer(), server_default="0"),
        sa.Column("status", sa.String(16), server_default="preview"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    create_table_if_missing(
        "import_errors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("batch_id", sa.Integer(), sa.ForeignKey("import_batches.id"), nullable=False, index=True),
        sa.Column("row_number", sa.Integer(), nullable=False),
        sa.Column("field", sa.String(32)),
        sa.Column("error_message", sa.String(256)),
    )

    create_table_if_missing(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("admin_users.id"), nullable=False, index=True),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("target_type", sa.String(32)),
        sa.Column("target_id", sa.Integer()),
        sa.Column("detail", sa.Text()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    create_table_if_missing(
        "system_configs",
        sa.Column("key", sa.String(64), primary_key=True),
        # Older Tencent Cloud MySQL versions reject DEFAULT values on TEXT.
        # SystemConfig's ORM-level default supplies an empty value when needed.
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("system_configs")
    op.drop_table("audit_logs")
    op.drop_table("import_errors")
    op.drop_table("import_batches")
    op.drop_table("users")
    op.drop_table("studios")
    op.drop_table("review_files")
    op.drop_table("annual_reviews")
    op.drop_table("admin_users")
    op.drop_table("teacher_details")
    op.drop_table("teachers")
    op.drop_table("teacher_tiers")
