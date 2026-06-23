from flask import request
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_limiter import Limiter


def _get_real_ip():
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.headers.get("X-Real-IP", request.remote_addr or "127.0.0.1")


db = SQLAlchemy()
jwt = JWTManager()
migrate = Migrate()
limiter = Limiter(key_func=_get_real_ip, default_limits=["200 per minute"])
