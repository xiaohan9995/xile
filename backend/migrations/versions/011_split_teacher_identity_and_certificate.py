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
    if "certificate_no" not in columns:
        op.add_column("teachers", sa.Column("certificate_no", sa.String(length=32), nullable=True))
        op.create_index("ix_teachers_certificate_no", "teachers", ["certificate_no"], unique=True)

    # A teacher number becomes the identity credential. Do all data checks
    # before changing rows, so ambiguous historical records never get partly
    # converted during container startup.
    missing = bind.execute(sa.text("SELECT COUNT(*) FROM teachers WHERE id_number IS NULL OR TRIM(id_number) = ''")).scalar()
    duplicate = bind.execute(sa.text("SELECT COUNT(*) FROM (SELECT id_number FROM teachers WHERE id_number IS NOT NULL AND TRIM(id_number) <> '' GROUP BY id_number HAVING COUNT(*) > 1) AS duplicate_ids")).scalar()
    username_collision = bind.execute(sa.text("""
        SELECT COUNT(*)
        FROM users AS teacher_user
        JOIN teachers ON teachers.id = teacher_user.teacher_id
        JOIN users AS other_user ON other_user.username = UPPER(TRIM(teachers.id_number))
          AND other_user.id <> teacher_user.id
        WHERE teacher_user.role = 'teacher'
    """)).scalar()
    if missing or duplicate or username_collision:
        raise RuntimeError(
            f"教师身份证号迁移被阻止：缺失 {missing} 条，重复 {duplicate} 组，登录账号冲突 {username_collision} 条。"
            "请先在管理后台修正后再部署。"
        )

    # Preserve certificate numbers only for teachers that have been certified.
    bind.execute(sa.text("UPDATE teachers SET certificate_no = CASE WHEN first_certified_on IS NOT NULL THEN teacher_no ELSE NULL END"))
    bind.execute(sa.text("UPDATE teachers SET teacher_no = UPPER(TRIM(id_number))"))

    # Existing password accounts are deliberately reset because their login
    # name has changed from the old field to the ID-number teacher_no.
    accounts = bind.execute(sa.text("SELECT users.id, teachers.teacher_no FROM users JOIN teachers ON teachers.id = users.teacher_id WHERE users.role = 'teacher'"))
    for user_id, teacher_no in accounts:
        bind.execute(
            sa.text("UPDATE users SET username = :username, password_hash = :password_hash, must_change_password = 1, session_version = COALESCE(session_version, 0) + 1 WHERE id = :id"),
            {"id": user_id, "username": teacher_no, "password_hash": generate_password_hash(teacher_no[-6:], method="pbkdf2:sha256")},
        )

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
