#!/bin/bash
set -e

cd /app

# Cloud Hosting probes TCP port 80 while the application prepares its database.
# Start Nginx first so a slow first migration does not cause a restart loop.
nginx -g 'daemon on;'

# Run schema migrations. Do not mask failures: the container log must show the
# actual database connection or migration error for an operator to resolve it.
flask db upgrade

# Create only required reference data (tiers and system defaults); no demo data.
python /app/init_production_data.py

# Start gunicorn
exec gunicorn -c gunicorn.conf.py "app:create_app()"
