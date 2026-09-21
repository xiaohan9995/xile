import base64
import hashlib
import hmac
import json
import os
import time
import uuid
from datetime import datetime

from flask import current_app, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from ...extensions import db, limiter
from ...models import User
from ...utils.storage import StorageNotConfiguredError, cos_is_configured, file_url, object_url, upload_to_cos
from . import mp_bp

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}


def _validate_extension(filename):
    ext = os.path.splitext(filename)[1].lower() if filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return None
    return ext


def _post_object_form(secret_id, secret_key, key, max_bytes, expires=600):
    """构造 COS POST Object 表单直传字段（永久密钥，V5 签名）。

    wx.uploadFile 只能发 POST（multipart/form-data），不能发 PUT，因此用
    PUT 预签名 URL 会得到 MalformedPOSTRequest。这里按 COS POST Object
    规范生成 policy + q-signature，前端用 wx.uploadFile 直传存储桶。
    """
    now = int(time.time())
    key_time = f"{now};{now + expires}"
    sign_key = hmac.new(secret_key.encode("utf-8"), key_time.encode("utf-8"), hashlib.sha1).hexdigest()

    expiration = datetime.utcfromtimestamp(now + expires).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    policy = {
        "expiration": expiration,
        "conditions": [
            {"key": key},
            ["content-length-range", 1, max_bytes],
            {"q-sign-algorithm": "sha1"},
            {"q-ak": secret_id},
            {"q-sign-time": key_time},
        ],
    }
    policy_text = json.dumps(policy, separators=(",", ":"), ensure_ascii=False)
    policy_b64 = base64.b64encode(policy_text.encode("utf-8")).decode("utf-8")
    string_to_sign = hashlib.sha1(policy_text.encode("utf-8")).hexdigest()
    q_signature = hmac.new(sign_key.encode("utf-8"), string_to_sign.encode("utf-8"), hashlib.sha1).hexdigest()

    return {
        "key": key,
        "policy": policy_b64,
        "q-sign-algorithm": "sha1",
        "q-ak": secret_id,
        "q-key-time": key_time,
        "q-signature": q_signature,
    }


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
    prefix = (payload.get("prefix") or "reviews").strip()
    if prefix not in ("reviews", "studio-images", "banners"):
        return {"error": "invalid prefix"}, 400
    key = f"{prefix}/{user.teacher_id}/{uuid.uuid4().hex}{ext}"

    if cos_is_configured():
        form = _post_object_form(cos_secret_id, cos_secret_key, key, 10485760)
        return {
            # POST Object 直传的目标是存储桶根地址，key 放在 formData 里。
            "uploadUrl": f"https://{cos_bucket}.cos.{cos_region}.myqcloud.com/",
            "formData": form,
            "fileKey": key,
            "maxSize": 10485760,
            "publicUrl": object_url(key),
            "downloadUrl": file_url(key),
        }
    if current_app.debug or current_app.testing:
        return {
            "uploadUrl": "/api/mp/upload/file",
            "fileKey": key,
            "publicUrl": f"/uploads/{prefix}/{key.split('/')[-1]}",
        }
    return {"error": "对象存储未配置，无法上传文件"}, 503


@mp_bp.post("/upload/evidence")
@limiter.limit("10 per minute")
@jwt_required()
def upload_evidence():
    """Server-side upload for teaching/service record evidence.

    wx.uploadFile only issues POST, so a COS PUT presign cannot be used from the
    mini program. The file is streamed through the backend instead.
    """
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user or not user.teacher_id:
        return {"error": "仅已关联教师可上传佐证材料"}, 403

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

    key = f"reviews/{user.teacher_id}/{uuid.uuid4().hex}{ext}"
    try:
        upload_to_cos(uploaded.stream, key, uploaded.mimetype or "application/octet-stream")
    except StorageNotConfiguredError:
        if not (current_app.debug or current_app.testing):
            return {"error": "对象存储未配置，无法上传佐证材料"}, 503
        filename = f"{uuid.uuid4().hex}{ext}"
        upload_dir = os.path.join(current_app.instance_path, "..", "uploads", "reviews")
        os.makedirs(upload_dir, exist_ok=True)
        uploaded.save(os.path.join(upload_dir, filename))
        key = f"reviews/{filename}"
    return {"fileKey": key, "url": file_url(key)}


@mp_bp.post("/upload/studio-image")
@limiter.limit("20 per minute")
@jwt_required()
def upload_studio_image():
    """上传工作室公开图片（封面/轮播/联系图片）。

    这些图片需在未登录的小程序端公开展示，因此以 public-read 存到 COS，
    返回稳定对象 URL（无签名、不过期），供回显与公开详情页直接加载。
    """
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user or not user.teacher_id:
        return {"error": "仅已关联教师可上传工作室图片"}, 403

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

    key = f"studio-images/{user.teacher_id}/{uuid.uuid4().hex}{ext}"
    try:
        # 私有上传，避免对「私有读写」存储桶设置 public-read ACL 失败。
        # 返回稳定对象 URL；回显时后端 file_url 会重新签发临时签名地址。
        url = upload_to_cos(
            uploaded.stream,
            key,
            uploaded.mimetype or "application/octet-stream",
            public_read=False,
        )
    except StorageNotConfiguredError:
        if not (current_app.debug or current_app.testing):
            return {"error": "对象存储未配置，无法上传工作室图片"}, 503
        filename = f"{uuid.uuid4().hex}{ext}"
        upload_dir = os.path.join(current_app.instance_path, "..", "uploads", "studio-images")
        os.makedirs(upload_dir, exist_ok=True)
        uploaded.save(os.path.join(upload_dir, filename))
        return {"url": f"/uploads/studio-images/{filename}"}
    except Exception as exc:
        current_app.logger.exception("upload_studio_image failed")
        return {"error": f"图片上传失败：{exc}"}, 500
    # 私有存储桶下，稳定对象 URL 无法直接访问；返回签名 URL 供前端即时预览。
    # 提交后 apply_pending_draft 会归一化为稳定 URL 存库，回显时再重新签名。
    return {"url": file_url(url)}


@mp_bp.get("/uploads/studio-images/<path:filename>")
def serve_studio_image(filename):
    """本地开发模式下公开访问工作室图片（无需登录）。"""
    upload_dir = os.path.join(current_app.instance_path, "..", "uploads", "studio-images")
    return send_from_directory(upload_dir, filename)


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
