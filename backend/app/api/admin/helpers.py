from functools import wraps

from flask import current_app, g, request
from flask_jwt_extended import decode_token

from ...extensions import db
from ...models import AdminUser


def require_admin_token(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return {"error": "unauthorized"}, 401

        token = auth_header[7:]

        dev_token = current_app.config.get("ADMIN_DEV_TOKEN")
        if dev_token and token == dev_token:
            g.current_admin = AdminUser.query.filter_by(username="admin").first()
            g.current_admin_role = g.current_admin.role if g.current_admin else "super_admin"
            return view(*args, **kwargs)

        try:
            decoded = decode_token(token)
            if decoded.get("type") != "admin":
                return {"error": "unauthorized"}, 401
            admin_id = decoded.get("sub")
            if not admin_id:
                return {"error": "unauthorized"}, 401
            admin = db.session.get(AdminUser, int(admin_id))
            if not admin:
                return {"error": "unauthorized"}, 401
        except Exception:
            return {"error": "unauthorized"}, 401

        g.current_admin = admin
        g.current_admin_role = admin.role
        return view(*args, **kwargs)

    return wrapped


def require_admin_roles(*roles):
    """Restrict an admin endpoint after require_admin_token has authenticated it."""
    def decorator(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            role = getattr(g, "current_admin_role", None)
            if role not in roles:
                return {"error": "forbidden"}, 403
            return view(*args, **kwargs)
        return wrapped
    return decorator


def current_admin_id():
    admin = getattr(g, "current_admin", None)
    return admin.id if admin else None


def _date_text(value):
    return value.strftime("%Y.%m.%d") if value else None


def _datetime_text(value):
    return value.strftime("%Y.%m.%d %H:%M") if value else None
