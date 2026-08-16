"""review collaboration MVP

Revision ID: 002_review_collaboration_mvp
Revises: 001_initial
Create Date: 2026-08-14
"""
from alembic import op
import sqlalchemy as sa


revision = "002_review_collaboration_mvp"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade():
    # Development databases created with ``db.create_all()`` may already have
    # the new tables, while still missing columns on legacy tables.  Upgrade
    # those databases in place instead of attempting to recreate every table.
    inspector = sa.inspect(op.get_bind())
    existing_tables = set(inspector.get_table_names())
    collaboration_tables = {
        "review_cycles", "review_groups", "review_group_members",
        "review_opinions", "teaching_records",
    }
    if existing_tables & collaboration_tables:
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        review_columns = {column["name"] for column in inspector.get_columns("annual_reviews")}
        with op.batch_alter_table("users") as batch:
            if "username" not in user_columns:
                batch.add_column(sa.Column("username", sa.String(64), unique=True, index=True))
            if "password_hash" not in user_columns:
                batch.add_column(sa.Column("password_hash", sa.String(256)))
            if "must_change_password" not in user_columns:
                batch.add_column(sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.false()))
            if "openid" in user_columns:
                batch.alter_column("openid", existing_type=sa.String(64), nullable=True)
        with op.batch_alter_table("annual_reviews") as batch:
            for name, column in (
                ("cycle_id", sa.Column("cycle_id", sa.Integer(), index=True)),
                ("group_id", sa.Column("group_id", sa.Integer(), index=True)),
                ("group_decision", sa.Column("group_decision", sa.Text())),
                ("group_decided_at", sa.Column("group_decided_at", sa.DateTime())),
                ("published_by_id", sa.Column("published_by_id", sa.Integer())),
                ("published_at", sa.Column("published_at", sa.DateTime())),
                ("final_tier_id", sa.Column("final_tier_id", sa.Integer())),
            ):
                if name not in review_columns:
                    batch.add_column(column)
        return

    op.create_table(
        "review_cycles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(64), nullable=False, unique=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("submission_deadline", sa.Date(), nullable=False),
        sa.Column("publish_date", sa.Date()),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("admin_users.id")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_table(
        "review_groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(64), nullable=False, unique=True),
        sa.Column("leader_id", sa.Integer(), sa.ForeignKey("admin_users.id"), nullable=False),
        sa.Column("tier_scope", sa.String(128), server_default=""),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_table(
        "review_group_members",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("review_groups.id"), nullable=False, index=True),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("admin_users.id"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("group_id", "admin_id", name="uq_group_member"),
    )
    op.create_table(
        "review_opinions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("review_id", sa.Integer(), sa.ForeignKey("annual_reviews.id"), nullable=False, index=True),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("admin_users.id"), nullable=False, index=True),
        sa.Column("recommended_tier_id", sa.Integer(), sa.ForeignKey("teacher_tiers.id")),
        sa.Column("conclusion", sa.String(16), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("review_id", "author_id", name="uq_review_opinion_author"),
    )
    op.create_table(
        "teaching_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("teacher_id", sa.Integer(), sa.ForeignKey("teachers.id"), nullable=False, index=True),
        sa.Column("taught_on", sa.Date(), nullable=False, index=True),
        sa.Column("platform", sa.String(128), nullable=False),
        sa.Column("title", sa.String(128), nullable=False),
        sa.Column("duration_hours", sa.Numeric(5, 1)),
        sa.Column("participant_count", sa.Integer()),
        sa.Column("description", sa.Text()),
        sa.Column("evidence_key", sa.String(256)),
        sa.Column("status", sa.String(16), nullable=False, server_default="submitted"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    with op.batch_alter_table("users") as batch:
        batch.alter_column("openid", existing_type=sa.String(64), nullable=True)
        batch.add_column(sa.Column("username", sa.String(64), unique=True, index=True))
        batch.add_column(sa.Column("password_hash", sa.String(256)))
        batch.add_column(sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.false()))
    with op.batch_alter_table("annual_reviews") as batch:
        batch.alter_column("status", existing_type=sa.String(16), type_=sa.String(32), existing_nullable=False)
        batch.add_column(sa.Column("cycle_id", sa.Integer(), index=True))
        batch.add_column(sa.Column("group_id", sa.Integer(), index=True))
        batch.add_column(sa.Column("group_decision", sa.Text()))
        batch.add_column(sa.Column("group_decided_at", sa.DateTime()))
        batch.add_column(sa.Column("published_by_id", sa.Integer()))
        batch.add_column(sa.Column("published_at", sa.DateTime()))
        batch.add_column(sa.Column("final_tier_id", sa.Integer()))
        batch.create_foreign_key("fk_annual_reviews_cycle", "review_cycles", ["cycle_id"], ["id"])
        batch.create_foreign_key("fk_annual_reviews_group", "review_groups", ["group_id"], ["id"])
        batch.create_foreign_key("fk_annual_reviews_published_by", "admin_users", ["published_by_id"], ["id"])
        batch.create_foreign_key("fk_annual_reviews_final_tier", "teacher_tiers", ["final_tier_id"], ["id"])


def downgrade():
    with op.batch_alter_table("annual_reviews") as batch:
        for column in ("final_tier_id", "published_at", "published_by_id", "group_decided_at", "group_decision", "group_id", "cycle_id"):
            batch.drop_column(column)
        batch.alter_column("status", existing_type=sa.String(32), type_=sa.String(16), existing_nullable=False)
    with op.batch_alter_table("users") as batch:
        batch.drop_column("must_change_password")
        batch.drop_column("password_hash")
        batch.drop_column("username")
        batch.alter_column("openid", existing_type=sa.String(64), nullable=False)
    op.drop_table("teaching_records")
    op.drop_table("review_opinions")
    op.drop_table("review_group_members")
    op.drop_table("review_groups")
    op.drop_table("review_cycles")
