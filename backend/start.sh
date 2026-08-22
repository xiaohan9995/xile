#!/bin/bash
set -e

cd /app

# Cloud Hosting probes TCP port 80 while the application starts. Keep the web
# process independent from schema work: MySQL locks or a slow database must
# never prevent a new revision from becoming reachable.
echo "[startup] starting nginx on port 80"
nginx

# Alembic migrations are idempotent and must run before the app serves schema
# changes. Always run them; an old RUN_DB_MIGRATIONS=0 setting must not leave
# the deployed schema behind the application code.
echo "[startup] applying database migrations"
flask db upgrade

if [ "${RUN_PRODUCTION_INIT:-}" = "run-once" ]; then
    # Create only required reference data (tiers, system defaults and first admin);
    # no demo data is created.
    echo "[startup] initializing production reference data"
    python /app/init_production_data.py
else
    echo "[startup] skipping production data initialization (set RUN_PRODUCTION_INIT=run-once for a one-time initialization)"
fi

# Password changes must never be inferred from the initial-admin variables.
# This is an explicit, one-time operation for a known existing account.
if [ "${RUN_ADMIN_PASSWORD_RESET:-}" = "run-once" ]; then
    echo "[startup] resetting the requested administrator password"
    python /app/init_production_data.py --reset-admin-password
else
    echo "[startup] skipping administrator password reset (set RUN_ADMIN_PASSWORD_RESET=run-once for one release)"
fi

# Start gunicorn
echo "[startup] starting application server"
exec gunicorn -c gunicorn.conf.py "app:create_app()"
