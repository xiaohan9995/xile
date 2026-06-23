from datetime import timedelta
import uuid

from flask import current_app, request
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash

from ...extensions import db, limiter
from ...models import AdminUser
from .helpers import require_admin_token, _datetime_text
from . import admin_bp


@admin_bp.post("/login")
@limiter.limit("5 per minute")
def login():
    payload = request.get_json(silent=True) or {}
    username = payload.get("username", "")
    password = payload.get("password", "")

    dev_token = current_app.config.get("ADMIN_DEV_TOKEN")
    if dev_token and username == "admin" and password == "password":
        return {
            "token": dev_token,
            "admin": {"username": "admin", "name": "系统管理员"},
        }

    admin = AdminUser.query.filter_by(username=username).first()
    if not admin or not check_password_hash(admin.password_hash, password):
        return {"error": "invalid credentials"}, 401

    token = create_access_token(
        identity=str(admin.id),
        additional_claims={"role": admin.role, "type": "admin", "jti": uuid.uuid4().hex},
        expires_delta=timedelta(hours=8),
    )
    return {
        "token": token,
        "admin": {"username": admin.username, "name": admin.username, "role": admin.role},
    }
