from flask import request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ...extensions import db
from ...models import Teacher, User
from ...services import banner_service
from . import mp_bp


def _current_teacher():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.teacher_id:
        return None
    return db.session.get(Teacher, user.teacher_id)


@mp_bp.get("/banners")
@jwt_required()
def get_banner_list():
    return banner_service.get_banners()


@mp_bp.put("/banner-config")
@jwt_required()
def update_banner_config():
    teacher = _current_teacher()
    if not teacher:
        return {"error": "teacher access required"}, 403
    if not teacher.can_manage_banner:
        return {"error": "无横幅管理权限"}, 403

    payload = request.get_json(silent=True) or {}
    return banner_service.update_banners(
        home=payload.get("home") if "home" in payload else None,
        studio=payload.get("studio") if "studio" in payload else None,
    )
