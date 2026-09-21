import os
import uuid

from flask import request
from werkzeug.utils import secure_filename

from ...extensions import limiter
from ...utils.storage import StorageNotConfiguredError, file_url, upload_to_cos
from .helpers import require_admin_roles, require_admin_token
from . import admin_bp


_ASSET_PREFIXES = {
    "teacher-avatar": "teacher-avatars",
    "teacher-certificate": "teacher-certificates",
    "studio-cover": "studio-covers",
    "studio-contact": "studio-contacts",
    "banner": "banners",
}

# 需要公开读、且以稳定 COS 地址存库的资源类型（头像/封面/联系工作室图片/横幅）。
# 其余（证书等）返回临时签名地址，仅用于即时预览。
_PUBLIC_ASSET_TYPES = {"teacher-avatar", "studio-cover", "studio-contact", "banner"}
_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
_IMAGE_CONTENT_TYPES = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp",
}
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
        return {"error": "仅支持 JPG、PNG 和 WebP 格式的图片"}, 400
    uploaded.stream.seek(0, 2)
    size = uploaded.stream.tell()
    uploaded.stream.seek(0)
    if size > _MAX_IMAGE_BYTES:
        return {"error": "image too large, max 8MB"}, 413

    key = f"{prefix}/{uuid.uuid4().hex}{ext}"
    try:
        url = upload_to_cos(
            uploaded.stream,
            key,
            _IMAGE_CONTENT_TYPES[ext],
            public_read=asset_type in _PUBLIC_ASSET_TYPES,
        )
    except StorageNotConfiguredError as error:
        return {"error": str(error)}, 503
    # Public admin images are stored as their stable COS URL. Returning a
    # presigned URL here can exceed the database's legacy 256-char cover/avatar
    # columns and makes a subsequent edit fail with a 500. Private assets use
    # a temporary URL for immediate preview as before.
    preview_url = url if asset_type in _PUBLIC_ASSET_TYPES else file_url(url)
    return {"key": key, "url": preview_url}, 201
