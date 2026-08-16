import os
import uuid

from flask import current_app, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from ...extensions import db, limiter
from ...models import User
from ...services.auth_service import AuthError, password_login, wx_login, get_phone_number
from . import mp_bp


@mp_bp.post("/auth/login")
@limiter.limit("10 per minute")
def mp_login():
    payload = request.get_json(silent=True) or {}
    code = (payload.get("code") or "").strip()
    if not code:
        return {"error": "code required"}, 400

    try:
        token, user = wx_login(code)
    except AuthError as e:
        return {"error": e.message}, e.status_code

    return {
        "token": token,
        "userId": user.id,
        "teacherId": user.teacher_id,
        "role": user.role,
        "phoneBound": bool(user.phone),
        "avatarUrl": user.avatar_url,
        "nickname": user.nickname,
    }


@mp_bp.post("/auth/password-login")
@limiter.limit("5 per minute")
def teacher_password_login():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    if not username or not password:
        return {"error": "username and password required"}, 400
    try:
        token, user = password_login(username, password)
    except AuthError as e:
        return {"error": e.message}, e.status_code
    return {"token": token, "userId": user.id, "teacherId": user.teacher_id, "role": user.role,
            "mustChangePassword": user.must_change_password}


@mp_bp.post("/auth/change-password")
@jwt_required()
def change_password():
    payload = request.get_json(silent=True) or {}
    current_password = payload.get("currentPassword") or ""
    new_password = payload.get("newPassword") or ""
    if len(new_password) < 8:
        return {"error": "new password must be at least 8 characters"}, 400
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.password_hash:
        return {"error": "password account not found"}, 404
    if not user.must_change_password and not check_password_hash(user.password_hash, current_password):
        return {"error": "current password is incorrect"}, 400
    user.password_hash = generate_password_hash(new_password, method="pbkdf2:sha256")
    user.must_change_password = False
    db.session.commit()
    return {"ok": True}


@mp_bp.post("/auth/bind-phone")
@limiter.limit("5 per minute")
@jwt_required()
def bind_phone():
    payload = request.get_json(silent=True) or {}
    code = (payload.get("code") or "").strip()
    if not code:
        return {"error": "code required"}, 400

    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return {"error": "user not found"}, 404

    try:
        phone_number = get_phone_number(code)
    except AuthError as e:
        return {"error": e.message}, e.status_code

    user.phone = phone_number
    db.session.commit()

    return {"phone": phone_number}


@mp_bp.get("/auth/me")
@jwt_required()
def auth_me():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return {"error": "user not found"}, 404
    return {
        "userId": user.id,
        "teacherId": user.teacher_id,
        "role": user.role,
        "phoneBound": bool(user.phone),
        "phone": user.phone,
        "avatarUrl": user.avatar_url,
        "nickname": user.nickname,
        "mustChangePassword": user.must_change_password,
    }


ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


def _save_avatar(avatar_file):
    ext = os.path.splitext(secure_filename(avatar_file.filename))[1].lower() or ".jpg"
    if ext not in ALLOWED_AVATAR_EXTENSIONS:
        return None
    filename = f"{uuid.uuid4().hex}{ext}"

    cos_bucket = os.getenv("COS_BUCKET")
    cos_region = os.getenv("COS_REGION")
    cos_secret_id = os.getenv("COS_SECRET_ID")
    cos_secret_key = os.getenv("COS_SECRET_KEY")

    if cos_bucket and cos_region and cos_secret_id and cos_secret_key:
        from qcloud_cos import CosConfig, CosS3Client

        config = CosConfig(Region=cos_region, SecretId=cos_secret_id, SecretKey=cos_secret_key)
        client = CosS3Client(config)
        key = f"avatars/{filename}"
        client.put_object(Bucket=cos_bucket, Body=avatar_file.stream, Key=key, ContentType=avatar_file.content_type or "image/jpeg")
        return f"https://{cos_bucket}.cos.{cos_region}.myqcloud.com/{key}"
    else:
        upload_dir = os.path.join(current_app.instance_path, "..", "uploads", "avatars")
        os.makedirs(upload_dir, exist_ok=True)
        avatar_file.save(os.path.join(upload_dir, filename))
        return f"/uploads/avatars/{filename}"


@mp_bp.post("/auth/update-profile")
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user:
        return {"error": "user not found"}, 404

    nickname = (request.form.get("nickname") or "").strip()
    if not nickname:
        json_body = request.get_json(silent=True) or {}
        nickname = (json_body.get("nickname") or "").strip()
    if nickname:
        user.nickname = nickname

    avatar_file = request.files.get("avatar")
    if avatar_file and avatar_file.filename:
        avatar_url = _save_avatar(avatar_file)
        if avatar_url is None:
            return {"error": "avatar must be jpg/png/gif/webp"}, 400
        user.avatar_url = avatar_url

    db.session.commit()

    return {
        "avatarUrl": user.avatar_url,
        "nickname": user.nickname,
    }


@mp_bp.get("/uploads/avatars/<path:filename>")
def serve_avatar(filename):
    upload_dir = os.path.join(current_app.instance_path, "..", "uploads", "avatars")
    return send_from_directory(upload_dir, filename)
