from flask import request
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_limiter import Limiter


def _get_real_ip():
    # Nginx overwrites X-Real-IP with the peer address before forwarding to
    # Gunicorn. Do not trust a client-supplied X-Forwarded-For value here: it
    # would let an attacker rotate that header and bypass login rate limits.
    return request.headers.get("X-Real-IP", request.remote_addr or "127.0.0.1")


db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
limiter = Limiter(key_func=_get_real_ip, default_limits=["200 per minute"])
