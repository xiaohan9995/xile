from flask import request

from ...services import banner_service
from .helpers import require_admin_roles, require_admin_token
from . import admin_bp


@admin_bp.get("/banners")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def admin_get_banners():
    return banner_service.get_banners()


@admin_bp.put("/banner-config")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def admin_update_banner_config():
    payload = request.get_json(silent=True) or {}
    return banner_service.update_banners(
        home=payload.get("home") if "home" in payload else None,
        studio=payload.get("studio") if "studio" in payload else None,
    )
