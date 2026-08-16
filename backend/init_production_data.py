"""Idempotently initialise production reference data after migrations."""

from app import create_app
from app.seed import ensure_system_defaults


app = create_app()

with app.app_context():
    ensure_system_defaults()
    app.logger.info("Production reference data is ready")
