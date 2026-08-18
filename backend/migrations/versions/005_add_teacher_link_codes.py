"""add one-time teacher link codes

Revision ID: 005_add_teacher_link_codes
Revises: 004_add_announcements
Create Date: 2026-08-19
"""
from alembic import op
import sqlalchemy as sa


revision = "005_add_teacher_link_codes"
down_revision = "004_add_announcements"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    if inspector.has_table("teacher_link_codes"):
        return
    op.create_table(
        "teacher_link_codes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("teacher_id", sa.Integer(), sa.ForeignKey("teachers.id"), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("admin_users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_teacher_link_codes_teacher_id", "teacher_link_codes", ["teacher_id"])
    op.create_index("ix_teacher_link_codes_expires_at", "teacher_link_codes", ["expires_at"])


def downgrade():
    inspector = sa.inspect(op.get_bind())
    if inspector.has_table("teacher_link_codes"):
        op.drop_table("teacher_link_codes")
