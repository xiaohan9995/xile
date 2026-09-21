from flask import request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ...extensions import db
from ...models import SystemConfig, Teacher, User
from ...utils.storage import file_url as _file_url, storage_reference
from . import mp_bp

# 首页 / 工作室页横幅图，值存「稳定对象 URL」，读取时经 file_url 重新签名。
_BANNER_KEYS = ("home_banner_url", "studio_banner_url")


def _banner_values():
    configs = {c.key: c.value for c in SystemConfig.query.filter(SystemConfig.key.in_(_BANNER_KEYS)).all()}
    return {
        "home": _file_url(configs.get("home_banner_url")),
        "studio": _file_url(configs.get("studio_banner_url")),
    }


def _current_teacher():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.teacher_id:
        return None
    return db.session.get(Teacher, user.teacher_id)


@mp_bp.get("/banners")
@jwt_required()
def get_banners():
    return _banner_values()


@mp_bp.put("/banner-config")
@jwt_required()
def update_banner_config():
    teacher = _current_teacher()
    if not teacher:
        return {"error": "teacher access required"}, 403
    if not teacher.can_manage_banner:
        return {"error": "无横幅管理权限"}, 403

    payload = request.get_json(silent=True) or {}
    updates = {}
    if "home" in payload:
        updates["home_banner_url"] = storage_reference((payload["home"] or "").strip())
    if "studio" in payload:
        updates["studio_banner_url"] = storage_reference((payload["studio"] or "").strip())

    for key, value in updates.items():
        config = db.session.get(SystemConfig, key)
        if not value:
            if config:
                db.session.delete(config)
        elif config:
            config.value = value
        else:
            db.session.add(SystemConfig(key=key, value=value))
    db.session.commit()
    return _banner_values()
