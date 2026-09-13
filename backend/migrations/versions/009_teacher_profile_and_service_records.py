"""add teacher public profile fields and service records"""
from alembic import op
import sqlalchemy as sa

revision = "009_teacher_profile_service_records"
down_revision = "008_expand_avatar_url"
branch_labels = None
depends_on = None


def _column_names(bind, table_name):
    return {column["name"] for column in sa.inspect(bind).get_columns(table_name)}


def _index_names(bind, table_name):
    inspector = sa.inspect(bind)
    names = {index["name"] for index in inspector.get_indexes(table_name)}
    names.update(item["name"] for item in inspector.get_unique_constraints(table_name) if item.get("name"))
    return names


def upgrade():
    # Some production databases received individual profile fields through a
    # prior manual release while their Alembic revision remained at 008. Check
    # the actual schema so this migration can safely complete the missing work.
    bind = op.get_bind()
    teacher_columns = _column_names(bind, "teachers")
    new_columns = [
        ("alias", sa.String(length=32)),
        ("id_number", sa.String(length=32)),
        ("current_tier_certified_on", sa.Date()),
        ("residences", sa.String(length=255)),
        ("public_profile_settings", sa.Text()),
    ]
    for name, column_type in new_columns:
        if name not in teacher_columns:
            op.add_column("teachers", sa.Column(name, column_type, nullable=True))

    teacher_indexes = _index_names(bind, "teachers")
    if "ix_teachers_alias" not in teacher_indexes:
        op.create_index("ix_teachers_alias", "teachers", ["alias"])
    if "ix_teachers_id_number" not in teacher_indexes:
        op.create_index("ix_teachers_id_number", "teachers", ["id_number"], unique=True)

    inspector = sa.inspect(bind)
    if not inspector.has_table("service_records"):
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
    service_indexes = _index_names(bind, "service_records")
    if "ix_service_records_teacher_id" not in service_indexes:
        op.create_index("ix_service_records_teacher_id", "service_records", ["teacher_id"])
    if "ix_service_records_served_on" not in service_indexes:
        op.create_index("ix_service_records_served_on", "service_records", ["served_on"])

    if not inspector.has_table("review_service_records"):
        op.create_table(
            "review_service_records",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("review_id", sa.Integer(), sa.ForeignKey("annual_reviews.id"), nullable=False),
            sa.Column("service_record_id", sa.Integer(), sa.ForeignKey("service_records.id"), nullable=False),
        )
    review_service_indexes = _index_names(bind, "review_service_records")
    if "ix_review_service_records_review_id" not in review_service_indexes:
        op.create_index("ix_review_service_records_review_id", "review_service_records", ["review_id"])
    if "ix_review_service_records_service_record_id" not in review_service_indexes:
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
