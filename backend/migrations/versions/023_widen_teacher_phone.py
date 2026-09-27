"""widen teacher_details.phone for international / backup numbers"""
from alembic import op
import sqlalchemy as sa

revision = "023_widen_teacher_phone"
down_revision = "022_rename_middle_teacher_tiers"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"]: column for column in inspector.get_columns("teacher_details")}
    phone = columns.get("phone")
    if phone is not None and getattr(phone["type"], "length", None) != 64:
        op.alter_column(
            "teacher_details",
            "phone",
            existing_type=sa.String(length=20),
            type_=sa.String(length=64),
            existing_nullable=True,
        )


def downgrade():
    op.alter_column(
        "teacher_details",
        "phone",
        existing_type=sa.String(length=64),
        type_=sa.String(length=20),
        existing_nullable=True,
    )
