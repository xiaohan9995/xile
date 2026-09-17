"""add studio gallery images, course intro and multi-teacher link"""
from alembic import op
import sqlalchemy as sa

revision = "014_studio_gallery_and_course_intro"
down_revision = "013_teacher_tiers_l1_to_l5"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("studios")}

    if "images" not in columns:
        op.add_column("studios", sa.Column("images", sa.Text(), nullable=True))
    if "course_intro" not in columns:
        op.add_column("studios", sa.Column("course_intro", sa.Text(), nullable=True))

    if "studio_teachers" not in sa.inspect(op.get_bind()).get_table_names():
        op.create_table(
            "studio_teachers",
            sa.Column("studio_id", sa.Integer(), nullable=False),
            sa.Column("teacher_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["studio_id"], ["studios.id"]),
            sa.ForeignKeyConstraint(["teacher_id"], ["teachers.id"]),
            sa.PrimaryKeyConstraint("studio_id", "teacher_id"),
        )

    # Backfill the many-to-many table from the legacy owner_teacher_id column.
    op.execute(
        """
        INSERT INTO studio_teachers (studio_id, teacher_id)
        SELECT id, owner_teacher_id
        FROM studios
        WHERE owner_teacher_id IS NOT NULL
        """
    )


def downgrade():
    op.drop_table("studio_teachers")
    op.drop_column("studios", "course_intro")
    op.drop_column("studios", "images")
