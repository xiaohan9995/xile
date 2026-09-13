import logging
from logging.config import fileConfig

from flask import current_app
from alembic import context
import sqlalchemy as sa

config = context.config
fileConfig(config.config_file_name)
logger = logging.getLogger("alembic.env")


def get_engine():
    try:
        return current_app.extensions["migrate"].db.get_engine()
    except (TypeError, AttributeError):
        return current_app.extensions["migrate"].db.engine


def get_engine_url():
    try:
        return get_engine().url.render_as_string(hide_password=False).replace("%", "%%")
    except AttributeError:
        return str(get_engine().url).replace("%", "%%")


config.set_main_option("sqlalchemy.url", get_engine_url())
target_db = current_app.extensions["migrate"].db


def get_metadata():
    if hasattr(target_db, "metadatas"):
        return target_db.metadatas[None]
    return target_db.metadata


def ensure_alembic_version_capacity(connection):
    """Upgrade legacy Alembic metadata before a long revision is recorded.

    Some early production databases created ``alembic_version.version_num``
    with a short VARCHAR length.  Alembic applies a migration's DDL before it
    records the new revision, so a long revision identifier then leaves the
    database half-upgraded and prevents the container from starting.
    """
    if connection.dialect.name not in {"mysql", "mariadb"}:
        return

    inspector = sa.inspect(connection)
    if not inspector.has_table("alembic_version"):
        return
    version_column = next(
        (column for column in inspector.get_columns("alembic_version") if column["name"] == "version_num"),
        None,
    )
    if version_column is None or (getattr(version_column["type"], "length", None) or 0) >= 255:
        return

    logger.warning("Expanding legacy alembic_version.version_num to VARCHAR(255)")
    connection.execute(sa.text("ALTER TABLE alembic_version MODIFY COLUMN version_num VARCHAR(255) NOT NULL"))


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=get_metadata(), literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = get_engine()
    with connectable.connect() as connection:
        # Cloud Hosting can start more than one container for a new revision.
        # MySQL DDL is non-transactional, so concurrent initial migrations can
        # leave a table behind before Alembic records the revision. Serialize
        # the complete migration run on MySQL with a connection-scoped lock.
        lock_name = "xile_yoga_alembic_migration"
        lock_acquired = False
        if connection.dialect.name in {"mysql", "mariadb"}:
            lock_acquired = connection.execute(
                sa.text("SELECT GET_LOCK(:name, :timeout)"),
                {"name": lock_name, "timeout": 120},
            ).scalar() == 1
            if not lock_acquired:
                raise RuntimeError("Timed out waiting for the database migration lock")
        try:
            ensure_alembic_version_capacity(connection)
            context.configure(connection=connection, target_metadata=get_metadata())
            with context.begin_transaction():
                context.run_migrations()
        finally:
            if lock_acquired:
                connection.execute(sa.text("SELECT RELEASE_LOCK(:name)"), {"name": lock_name})


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
