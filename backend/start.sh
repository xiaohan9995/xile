#!/bin/bash
set -e

# Run database migrations (create tables if needed)
cd /app
flask db upgrade 2>/dev/null || python -c "from app import create_app; from app.extensions import db; app=create_app(); app.app_context().push(); db.create_all()"

# Start nginx in background
nginx -g 'daemon on;'

# Start gunicorn
exec gunicorn -c gunicorn.conf.py "app:create_app()"
