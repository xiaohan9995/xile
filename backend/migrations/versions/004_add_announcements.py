"""add announcements table

Revision ID: 004_add_announcements
Revises: 003_review_experience_flow
Create Date: 2026-08-18
"""
from alembic import op
import sqlalchemy as sa


revision = "004_add_announcements"
down_revision = "003_review_experience_flow"
branch_labels = None
depends_on = None


def upgrade():
    """Create the public-homepage announcement source if it is absent.

    The model existed before the initial production schema but was omitted from
    the original migration.  MySQL DDL is non-transactional, so this explicit
    existence check also makes a retried deployment safe.
    """
    inspector = sa.inspect(op.get_bind())
    if inspector.has_table("announcements"):
        return

    op.create_table(
        "announcements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(128), nullable=False),
        sa.Column("content", sa.String(512), nullable=True),
        sa.Column("link_url", sa.String(256), nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade():
    inspector = sa.inspect(op.get_bind())
    if inspector.has_table("announcements"):
        op.drop_table("announcements")
