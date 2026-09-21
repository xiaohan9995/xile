from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from ...extensions import db
from ...models import User

mp_bp = Blueprint("mp", __name__)

_PASSWORD_RESET_EXEMPT_ENDPOINTS = {
    "mp.mp_login", "mp.mp_cloudbase_login", "mp.teacher_password_login",
    "mp.change_password", "mp.auth_me", "mp.link_teacher",
    "mp.link_teacher_by_password", "mp.avatar_proxy",
}


@mp_bp.before_request
def require_initial_password_reset():
    """Block business APIs until a teacher replaces an initial password."""
    verify_jwt_in_request(optional=True)
    if get_jwt().get("type") == "admin":
        return {"error": "unauthorized"}, 401
    if request.endpoint in _PASSWORD_RESET_EXEMPT_ENDPOINTS:
        return None
    identity = get_jwt_identity()
    user = db.session.get(User, int(identity)) if identity else None
    if user and user.must_change_password:
        return {"error": "请先重置初始密码后再继续操作", "code": "PASSWORD_CHANGE_REQUIRED"}, 403
    return None

# Import sub-modules to register their routes on the blueprint
from . import auth  # noqa: F401, E402
from . import teachers  # noqa: F401, E402
from . import studios  # noqa: F401, E402
from . import reviews  # noqa: F401, E402
from . import uploads  # noqa: F401, E402
from . import teaching_records  # noqa: F401, E402
from . import service_records  # noqa: F401, E402
from . import banners  # noqa: F401, E402
