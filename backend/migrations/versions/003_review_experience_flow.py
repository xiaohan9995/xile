"""review experience flow

Revision ID: 003_review_experience_flow
Revises: 002_review_collaboration_mvp
Create Date: 2026-08-16
"""
from alembic import op
import sqlalchemy as sa


revision = "003_review_experience_flow"
down_revision = "002_review_collaboration_mvp"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    review_columns = {column["name"] for column in inspector.get_columns("annual_reviews")}
    if "submission_version" not in review_columns:
        with op.batch_alter_table("annual_reviews") as batch:
            batch.add_column(sa.Column("submission_version", sa.Integer(), nullable=False, server_default="1"))
    if "review_teaching_records" not in inspector.get_table_names():
        op.create_table(
            "review_teaching_records",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("review_id", sa.Integer(), sa.ForeignKey("annual_reviews.id"), nullable=False, index=True),
            sa.Column("teaching_record_id", sa.Integer(), sa.ForeignKey("teaching_records.id"), nullable=False, index=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
            sa.UniqueConstraint("review_id", "teaching_record_id", name="uq_review_teaching_record"),
        )


def downgrade():
    op.drop_table("review_teaching_records")
    with op.batch_alter_table("annual_reviews") as batch:
        batch.drop_column("submission_version")
