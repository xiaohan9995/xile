#!/bin/bash
set -e

cd /app

# Cloud Hosting probes TCP port 80 while the application prepares its database.
# Start Nginx first so a slow first migration does not cause a restart loop.
echo "[startup] starting nginx on port 80"
nginx -g 'daemon on;'

# Run schema migrations. Do not mask failures: the container log must show the
# actual database connection or migration error for an operator to resolve it.
echo "[startup] applying database migrations"
flask db upgrade

# Create only required reference data (tiers and system defaults); no demo data.
echo "[startup] initializing production reference data"
python /app/init_production_data.py

# Start gunicorn
echo "[startup] starting application server"
exec gunicorn -c gunicorn.conf.py "app:create_app()"
