import os
import uuid

from flask import current_app, request, send_from_directory
from flask_jwt_extended import get_jwt_identity, jwt_required
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from ...extensions import db, limiter
from ...models import Teacher, User
from ...utils.storage import StorageNotConfiguredError, file_url as _file_url, upload_to_cos
from ...services.auth_service import (
    AuthError,
    cloudbase_login,
    get_phone_number,
    link_wechat_user_to_teacher_by_code,
    link_user_to_teacher_by_phone,
    password_login,
    _issue_token,
    wx_login,
)
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
        "avatarUrl": _file_url(user.avatar_url),
        "nickname": user.nickname,
        "xileName": (db.session.get(Teacher, user.teacher_id).xile_name if user.teacher_id else None),
    }


@mp_bp.post("/auth/cloudbase-login")
@limiter.limit("10 per minute")
def mp_cloudbase_login():
    """Exchange the verified identity returned by the CloudBase bridge function."""
    payload = request.get_json(silent=True) or {}
    try:
        token, user = cloudbase_login(payload.get("assertion"), payload.get("profile"))
    except AuthError as e:
        return {"error": e.message}, e.status_code

    return {
        "token": token,
        "userId": user.id,
        "teacherId": user.teacher_id,
        "role": user.role,
        "phoneBound": bool(user.phone),
        "avatarUrl": _file_url(user.avatar_url),
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

    existing_user = User.query.filter(User.phone == phone_number, User.id != user.id).first()
    if existing_user:
        return {"error": "该手机号已绑定其他微信账号，请联系管理员处理"}, 409

    user.phone = phone_number
    teacher = link_user_to_teacher_by_phone(user, phone_number)
    db.session.commit()

    return {
        "phone": phone_number,
        "teacherId": teacher.id if teacher else None,
        "role": user.role,
        "matchedTeacher": bool(teacher),
    }


@mp_bp.post("/auth/link-teacher")
@limiter.limit("5 per minute")
@jwt_required()
def link_teacher():
    """Bind the active WeChat session to an administrator-created teacher record."""
    payload = request.get_json(silent=True) or {}
    code = (payload.get("code") or "").strip()
    if not code:
        return {"error": "关联码不能为空"}, 400

    user = db.session.get(User, int(get_jwt_identity()))
    if user is None:
        return {"error": "user not found"}, 404
    try:
        linked_user, teacher = link_wechat_user_to_teacher_by_code(user, code)
        db.session.commit()
    except AuthError as e:
        db.session.rollback()
        return {"error": e.message}, e.status_code

    return {
        "token": _issue_token(linked_user),
        "userId": linked_user.id,
        "teacherId": teacher.id,
        "role": linked_user.role,
        "phoneBound": bool(linked_user.phone),
        "avatarUrl": _file_url(linked_user.avatar_url),
        "nickname": linked_user.nickname,
    }


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
        "avatarUrl": _file_url(user.avatar_url),
        "nickname": user.nickname,
        "xileName": (db.session.get(Teacher, user.teacher_id).xile_name if user.teacher_id else None),
        "mustChangePassword": user.must_change_password,
    }


ALLOWED_AVATAR_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


def _save_avatar(avatar_file):
    ext = os.path.splitext(secure_filename(avatar_file.filename))[1].lower() or ".jpg"
    if ext not in ALLOWED_AVATAR_EXTENSIONS:
        return None
    filename = f"{uuid.uuid4().hex}{ext}"

    key = f"avatars/{filename}"
    try:
        return upload_to_cos(
            avatar_file.stream,
            key,
            avatar_file.content_type or "image/jpeg",
            public_read=True,
        )
    except StorageNotConfiguredError:
        if not (current_app.debug or current_app.testing):
            raise
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
    xile_name = (request.form.get("xileName") or "").strip()
    if not nickname:
        json_body = request.get_json(silent=True) or {}
        nickname = (json_body.get("nickname") or "").strip()
    if nickname:
        user.nickname = nickname

    avatar_file = request.files.get("avatar")
    teacher_avatar_url = None
    if avatar_file and avatar_file.filename:
        try:
            avatar_url = _save_avatar(avatar_file)
        except StorageNotConfiguredError as error:
            return {"error": str(error)}, 503
        if avatar_url is None:
            return {"error": "avatar must be jpg/png/gif/webp"}, 400
        user.avatar_url = avatar_url
        if user.teacher_id:
            teacher = db.session.get(Teacher, user.teacher_id)
            if teacher:
                teacher.avatar_url = avatar_url
                teacher_avatar_url = avatar_url

    if xile_name:
        if not user.teacher_id:
            return {"error": "关联教师后才能设置喜乐名"}, 403
        teacher = db.session.get(Teacher, user.teacher_id)
        if not teacher:
            return {"error": "关联教师档案不存在"}, 404
        teacher.xile_name = xile_name

    db.session.commit()

    return {
        "avatarUrl": _file_url(user.avatar_url),
        "teacherAvatarUrl": _file_url(teacher_avatar_url),
        "nickname": user.nickname,
        "xileName": (db.session.get(Teacher, user.teacher_id).xile_name if user.teacher_id else None),
    }


@mp_bp.get("/uploads/avatars/<path:filename>")
def serve_avatar(filename):
    upload_dir = os.path.join(current_app.instance_path, "..", "uploads", "avatars")
    return send_from_directory(upload_dir, filename)
