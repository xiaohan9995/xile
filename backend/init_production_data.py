"""Run explicit, one-off production data operations."""

import argparse

from app import create_app
from app.seed import ensure_initial_admin, ensure_system_defaults, reset_admin_password


app = create_app()

parser = argparse.ArgumentParser()
parser.add_argument("--reset-admin-password", action="store_true")
args = parser.parse_args()

with app.app_context():
    if args.reset_admin_password:
        reset_admin_password(
            app.config.get("INITIAL_ADMIN_USERNAME"),
            app.config.get("ADMIN_PASSWORD_RESET_PASSWORD"),
        )
        app.logger.info("Administrator password reset completed")
    else:
        ensure_system_defaults()
        ensure_initial_admin(
            app.config.get("INITIAL_ADMIN_USERNAME"),
            app.config.get("INITIAL_ADMIN_PASSWORD"),
        )
        app.logger.info("Production reference data is ready")
