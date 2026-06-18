#!/bin/bash
set -e

# start nginx in background
nginx -g 'daemon on;'

# start gunicorn
cd /app
exec gunicorn -c gunicorn.conf.py "app:create_app()"
