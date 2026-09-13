"""add teacher public profile fields and service records"""
from alembic import op
import sqlalchemy as sa

revision = "009_teacher_profile_service_records"
down_revision = "008_expand_avatar_url"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("teachers") as batch:
        batch.add_column(sa.Column("alias", sa.String(length=32), nullable=True))
        batch.add_column(sa.Column("id_number", sa.String(length=32), nullable=True))
        batch.add_column(sa.Column("current_tier_certified_on", sa.Date(), nullable=True))
        batch.add_column(sa.Column("residences", sa.String(length=255), nullable=True))
        batch.add_column(sa.Column("public_profile_settings", sa.Text(), nullable=True))
        batch.create_index("ix_teachers_alias", ["alias"])
        batch.create_index("ix_teachers_id_number", ["id_number"], unique=True)

    op.create_table(
        "service_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("teacher_id", sa.Integer(), sa.ForeignKey("teachers.id"), nullable=False),
        sa.Column("served_on", sa.Date(), nullable=False),
        sa.Column("service_type", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=128), nullable=False),
        sa.Column("location", sa.String(length=128), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("evidence_key", sa.String(length=256), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="submitted"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_service_records_teacher_id", "service_records", ["teacher_id"])
    op.create_index("ix_service_records_served_on", "service_records", ["served_on"])
    op.create_table(
        "review_service_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("review_id", sa.Integer(), sa.ForeignKey("annual_reviews.id"), nullable=False),
        sa.Column("service_record_id", sa.Integer(), sa.ForeignKey("service_records.id"), nullable=False),
    )
    op.create_index("ix_review_service_records_review_id", "review_service_records", ["review_id"])
    op.create_index("ix_review_service_records_service_record_id", "review_service_records", ["service_record_id"])


def downgrade():
    op.drop_index("ix_review_service_records_service_record_id", table_name="review_service_records")
    op.drop_index("ix_review_service_records_review_id", table_name="review_service_records")
    op.drop_table("review_service_records")
    op.drop_index("ix_service_records_served_on", table_name="service_records")
    op.drop_index("ix_service_records_teacher_id", table_name="service_records")
    op.drop_table("service_records")
    with op.batch_alter_table("teachers") as batch:
        batch.drop_index("ix_teachers_alias")
        batch.drop_index("ix_teachers_id_number")
        batch.drop_column("id_number")
        batch.drop_column("public_profile_settings")
        batch.drop_column("residences")
        batch.drop_column("current_tier_certified_on")
        batch.drop_column("alias")
