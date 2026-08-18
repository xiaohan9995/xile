import os
import uuid

from flask import current_app, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from ...extensions import db, limiter
from ...models import User
from ...utils.storage import cos_is_configured, object_url
from . import mp_bp

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}


def _validate_extension(filename):
    ext = os.path.splitext(filename)[1].lower() if filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return None
    return ext


@mp_bp.post("/upload/presign")
@limiter.limit("10 per minute")
@jwt_required()
def get_upload_presign():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user or not user.teacher_id:
        return {"error": "not a teacher"}, 403

    cos_bucket = os.getenv("COS_BUCKET")
    cos_region = os.getenv("COS_REGION")
    cos_secret_id = os.getenv("COS_SECRET_ID")
    cos_secret_key = os.getenv("COS_SECRET_KEY")

    payload = request.get_json(silent=True) or {}
    filename = (payload.get("filename") or "file").strip()
    ext = _validate_extension(filename)
    if not ext:
        return {"error": f"file type not allowed, accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}"}, 400
    key = f"reviews/{user.teacher_id}/{uuid.uuid4().hex}{ext}"

    if cos_is_configured():
        from qcloud_cos import CosConfig, CosS3Client

        config = CosConfig(Region=cos_region, SecretId=cos_secret_id, SecretKey=cos_secret_key)
        client = CosS3Client(config)
        presigned_url = client.get_presigned_url(
            Method="PUT", Bucket=cos_bucket, Key=key, Expired=600,
            Headers={"Content-Length-Range": "1,10485760"},
        )
        return {
            "uploadUrl": presigned_url,
            "fileKey": key,
            "maxSize": 10485760,
            "publicUrl": object_url(key),
        }
    if current_app.debug or current_app.testing:
        return {
            "uploadUrl": "/api/mp/upload/file",
            "fileKey": key,
            "publicUrl": f"/uploads/reviews/{key.split('/')[-1]}",
        }
    return {"error": "对象存储未配置，无法上传年审材料"}, 503


@mp_bp.post("/upload/file")
@limiter.limit("10 per minute")
@jwt_required()
def upload_file_dev():
    if not (current_app.debug or current_app.testing):
        return {"error": "生产环境仅支持对象存储直传"}, 403
    uploaded = request.files.get("file")
    if not uploaded or not uploaded.filename:
        return {"error": "file required"}, 400

    ext = _validate_extension(secure_filename(uploaded.filename))
    if not ext:
        return {"error": f"file type not allowed, accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}"}, 400

    uploaded.seek(0, 2)
    size = uploaded.tell()
    uploaded.seek(0)
    if size > 10 * 1024 * 1024:
        return {"error": "file too large, max 10MB"}, 413

    filename = f"{uuid.uuid4().hex}{ext}"
    upload_dir = os.path.join(current_app.instance_path, "..", "uploads", "reviews")
    os.makedirs(upload_dir, exist_ok=True)
    uploaded.save(os.path.join(upload_dir, filename))

    return {
        "fileKey": f"reviews/{filename}",
        "url": f"/uploads/reviews/{filename}",
    }


@mp_bp.get("/uploads/reviews/<path:filename>")
@jwt_required()
def serve_review_file(filename):
    upload_dir = os.path.join(current_app.instance_path, "..", "uploads", "reviews")
    return send_from_directory(upload_dir, filename)
