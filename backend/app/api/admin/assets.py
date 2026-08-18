import os
import uuid

from flask import request
from werkzeug.utils import secure_filename

from ...extensions import limiter
from ...utils.storage import StorageNotConfiguredError, upload_to_cos
from .helpers import require_admin_roles, require_admin_token
from . import admin_bp


_ASSET_PREFIXES = {
    "teacher-avatar": "teacher-avatars",
    "teacher-certificate": "teacher-certificates",
    "studio-cover": "studio-covers",
}
_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
_MAX_IMAGE_BYTES = 8 * 1024 * 1024


@admin_bp.post("/assets/upload")
@limiter.limit("20 per minute")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def upload_asset():
    """Upload an admin-managed image into COS, never the CloudRun filesystem."""
    asset_type = (request.form.get("assetType") or "").strip()
    prefix = _ASSET_PREFIXES.get(asset_type)
    if not prefix:
        return {"error": "unsupported asset type"}, 400
    uploaded = request.files.get("file")
    if not uploaded or not uploaded.filename:
        return {"error": "file required"}, 400
    ext = os.path.splitext(secure_filename(uploaded.filename))[1].lower()
    if ext not in _IMAGE_EXTENSIONS:
        return {"error": "only JPG, PNG and WebP images are supported"}, 400
    uploaded.stream.seek(0, 2)
    size = uploaded.stream.tell()
    uploaded.stream.seek(0)
    if size > _MAX_IMAGE_BYTES:
        return {"error": "image too large, max 8MB"}, 413

    key = f"{prefix}/{uuid.uuid4().hex}{ext}"
    try:
        url = upload_to_cos(uploaded.stream, key, uploaded.content_type or "image/jpeg")
    except StorageNotConfiguredError as error:
        return {"error": str(error)}, 503
    return {"key": key, "url": url}, 201
