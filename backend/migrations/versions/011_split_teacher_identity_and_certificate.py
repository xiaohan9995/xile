"""separate teacher identity from certificate number

Revision ID: 011_split_teacher_identity_and_certificate
Revises: 010_add_user_session_version
"""
from alembic import op
import sqlalchemy as sa
from werkzeug.security import generate_password_hash


revision = "011_split_teacher_identity_and_certificate"
down_revision = "010_add_user_session_version"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("teachers")}
    has_id_number = "id_number" in columns
    if "certificate_no" not in columns:
        op.add_column("teachers", sa.Column("certificate_no", sa.String(length=32), nullable=True))
        op.create_index("ix_teachers_certificate_no", "teachers", ["certificate_no"], unique=True)

    # Historically, ``teacher_no`` stored the identity-card number.  The
    # short-lived ``id_number`` column was introduced later and is blank for
    # older teachers, so it must only take precedence when it was explicitly
    # populated.  The new certificate number is intentionally left blank:
    # it is a separate, optional business field going forward.
    #
    # A previous deployment attempt may have already dropped ``id_number``
    # (MySQL DDL commits immediately) while crashing before Alembic could
    # stamp the revision.  In that half-applied state ``teacher_no`` already
    # holds the identity number, so re-running must not reference the
    # removed column.
    if has_id_number:
        identity_sql = "UPPER(COALESCE(NULLIF(TRIM(id_number), ''), TRIM(teacher_no)))"
    else:
        identity_sql = "UPPER(TRIM(teacher_no))"

    missing = bind.execute(sa.text(
        f"SELECT COUNT(*) FROM teachers WHERE {identity_sql} IS NULL OR {identity_sql} = ''"
    )).scalar()
    duplicate = bind.execute(sa.text(
        f"SELECT COUNT(*) FROM (SELECT {identity_sql} AS identity_no FROM teachers "
        f"WHERE {identity_sql} IS NOT NULL AND {identity_sql} <> '' "
        "GROUP BY identity_no HAVING COUNT(*) > 1) AS duplicate_ids"
    )).scalar()
    username_collision = bind.execute(sa.text(f"""
        SELECT COUNT(*)
        FROM users AS teacher_user
        JOIN teachers ON teachers.id = teacher_user.teacher_id
        JOIN users AS other_user ON other_user.username = {identity_sql}
          AND other_user.id <> teacher_user.id
        WHERE teacher_user.role = 'teacher'
    """)).scalar()
    if missing or duplicate or username_collision:
        raise RuntimeError(
            f"教师身份证号迁移被阻止：缺失 {missing} 条，重复 {duplicate} 组，登录账号冲突 {username_collision} 条。"
            "请先在管理后台修正后再部署。"
        )

    if has_id_number:
        bind.execute(sa.text("UPDATE teachers SET certificate_no = NULL"))
        bind.execute(sa.text(f"UPDATE teachers SET teacher_no = {identity_sql}"))

    # Existing password accounts are deliberately reset because their login
    # name has changed from the old field to the ID-number teacher_no.
    # Re-running after an interrupted attempt is safe: the reset is
    # deterministic and repairs any half-finished user updates.
    accounts = bind.execute(sa.text("SELECT users.id, teachers.teacher_no FROM users JOIN teachers ON teachers.id = users.teacher_id WHERE users.role = 'teacher'"))
    for user_id, teacher_no in accounts:
        bind.execute(
            sa.text("UPDATE users SET username = :username, password_hash = :password_hash, must_change_password = 1, session_version = COALESCE(session_version, 0) + 1 WHERE id = :id"),
            {"id": user_id, "username": teacher_no, "password_hash": generate_password_hash(teacher_no[-6:], method="pbkdf2:sha256")},
        )

    if has_id_number:
        indexes = {item["name"] for item in inspector.get_indexes("teachers")}
        if "ix_teachers_id_number" in indexes:
            op.drop_index("ix_teachers_id_number", table_name="teachers")
        op.drop_column("teachers", "id_number")


def downgrade():
    op.add_column("teachers", sa.Column("id_number", sa.String(length=32), nullable=True))
    op.create_index("ix_teachers_id_number", "teachers", ["id_number"], unique=True)
    op.execute("UPDATE teachers SET id_number = teacher_no")
    op.drop_index("ix_teachers_certificate_no", table_name="teachers")
    op.drop_column("teachers", "certificate_no")
