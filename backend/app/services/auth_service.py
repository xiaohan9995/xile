import hashlib
import hmac
import os
import re
import secrets
import time
import uuid
from datetime import datetime, timedelta

import requests as http_requests
from flask import current_app
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash

from ..extensions import db
from ..models import Teacher, TeacherDetail, TeacherLinkCode, User

_wx_token_cache = {"token": None, "expires_at": 0}


class AuthError(Exception):
    def __init__(self, message, status_code=400):
        self.message = message
        self.status_code = status_code


def wx_login(code):
    appid = os.getenv("WECHAT_APPID")
    secret = os.getenv("WECHAT_SECRET")

    if appid and secret:
        try:
            resp = http_requests.get(
                "https://api.weixin.qq.com/sns/jscode2session",
                params={"appid": appid, "secret": secret, "js_code": code, "grant_type": "authorization_code"},
                timeout=5,
            )
            data = resp.json()
        except (http_requests.RequestException, ValueError):
            current_app.logger.warning("WeChat code2Session request failed")
            raise AuthError("微信登录服务暂时不可用", 502)
        openid = data.get("openid")
        if not openid:
            current_app.logger.warning(
                "WeChat code2Session rejected login: errcode=%s",
                data.get("errcode"),
            )
            raise AuthError("微信登录校验失败，请稍后重试", 401)
        user = _get_or_create_user(openid)
    else:
        if not (current_app.debug or current_app.testing):
            raise AuthError("微信登录尚未配置，请联系管理员", 503)
        match = re.match(r"dev-mock-code-(\d+)", code)
        if match:
            teacher_id = int(match.group(1))
            teacher = db.session.get(Teacher, teacher_id)
            openid = f"dev-openid-{teacher_id}"
        else:
            openid = f"dev-openid-{code}"
            teacher_id = None
            teacher = None

        user = _get_or_create_user(openid)
        if match:
            user.teacher_id = teacher_id
            user.role = "teacher" if teacher else "student"
            db.session.commit()

    return _issue_token(user), user


def cloudbase_login(assertion, profile=None):
    """Exchange a short-lived, CloudBase-signed WeChat identity for the app JWT."""
    if not isinstance(assertion, dict):
        raise AuthError("CloudBase 登录凭证无效", 400)

    openid = assertion.get("openid")
    appid = assertion.get("appid")
    nonce = assertion.get("nonce")
    signature = assertion.get("signature")
    timestamp = assertion.get("timestamp")
    if not all(isinstance(value, str) and value for value in (openid, appid, nonce, signature)):
        raise AuthError("CloudBase 登录凭证无效", 400)
    try:
        timestamp = int(timestamp)
    except (TypeError, ValueError):
        raise AuthError("CloudBase 登录凭证无效", 400)

    secret = current_app.config.get("CLOUDBASE_AUTH_BRIDGE_SECRET")
    expected_appid = os.getenv("WECHAT_APPID")
    if not secret or not expected_appid:
        current_app.logger.error("CloudBase auth bridge is not configured")
        raise AuthError("微信登录服务尚未配置，请联系管理员", 503)
    if appid != expected_appid:
        raise AuthError("CloudBase 登录凭证不属于当前小程序", 401)

    now = int(time.time())
    ttl = current_app.config.get("CLOUDBASE_AUTH_ASSERTION_TTL_SECONDS", 300)
    if timestamp > now + 60 or now - timestamp > ttl:
        raise AuthError("CloudBase 登录凭证已过期，请重新登录", 401)

    message = f"{openid}\n{appid}\n{timestamp}\n{nonce}".encode("utf-8")
    expected_signature = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        current_app.logger.warning("CloudBase auth bridge signature verification failed")
        raise AuthError("CloudBase 登录凭证校验失败，请重新登录", 401)

    user = _get_or_create_user(openid)
    # WeChat profile data is optional and only supplied after the user grants
    # the profile permission from the login button. Do not overwrite an avatar
    # or nickname that the user has explicitly configured in the app.
    profile = profile if isinstance(profile, dict) else {}
    nickname = (profile.get("nickname") or "").strip()
    avatar_url = (profile.get("avatarUrl") or "").strip()
    profile_changed = False
    if nickname and not user.nickname:
        user.nickname = nickname
        profile_changed = True
    if avatar_url and not user.avatar_url:
        user.avatar_url = avatar_url
        profile_changed = True
        if user.teacher_id:
            teacher = db.session.get(Teacher, user.teacher_id)
            if teacher and not teacher.avatar_url:
                teacher.avatar_url = avatar_url
    if profile_changed:
        db.session.commit()
    return _issue_token(user), user


def password_login(username, password):
    user = User.query.filter_by(username=username).first()
    if not user or not user.password_hash or not check_password_hash(user.password_hash, password):
        raise AuthError("invalid username or password", 401)
    if user.role != "teacher" or not user.teacher_id:
        raise AuthError("teacher account is not linked", 403)
    return _issue_token(user), user


def get_wx_access_token():
    if _wx_token_cache["token"] and time.time() < _wx_token_cache["expires_at"] - 60:
        return _wx_token_cache["token"]
    appid = os.getenv("WECHAT_APPID")
    secret = os.getenv("WECHAT_SECRET")
    if not appid or not secret:
        return None
    resp = http_requests.get(
        "https://api.weixin.qq.com/cgi-bin/token",
        params={"grant_type": "client_credential", "appid": appid, "secret": secret},
        timeout=5,
    )
    data = resp.json()
    _wx_token_cache["token"] = data.get("access_token")
    _wx_token_cache["expires_at"] = time.time() + data.get("expires_in", 7200)
    return _wx_token_cache["token"]


def get_phone_number(phone_code):
    appid = os.getenv("WECHAT_APPID")
    secret = os.getenv("WECHAT_SECRET")

    if appid and secret:
        access_token = get_wx_access_token()
        if not access_token:
            raise AuthError("failed to get access_token", 502)

        try:
            phone_resp = http_requests.post(
                f"https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token={access_token}",
                json={"code": phone_code},
                timeout=5,
            )
            phone_data = phone_resp.json()
        except (http_requests.RequestException, ValueError):
            current_app.logger.warning("WeChat phone-number request failed")
            raise AuthError("手机号验证服务暂时不可用", 502)
        phone_info = phone_data.get("phone_info")
        if not phone_info:
            current_app.logger.warning(
                "WeChat phone-number request rejected: errcode=%s",
                phone_data.get("errcode"),
            )
            raise AuthError("手机号验证失败，请重新授权", 502)
        return phone_info.get("purePhoneNumber") or phone_info.get("phoneNumber")
    else:
        if not (current_app.debug or current_app.testing):
            raise AuthError("微信手机号验证尚未配置，请联系管理员", 503)
        return "13800001111"


def link_user_to_teacher_by_phone(user, phone_number):
    """Associate an authenticated WeChat user with the administrator's teacher record."""
    detail = TeacherDetail.query.filter_by(phone=phone_number).first()
    if detail is None:
        return None

    teacher = db.session.get(Teacher, detail.teacher_id)
    if teacher is None:
        return None

    user.teacher_id = teacher.id
    user.role = "teacher"
    return teacher


_LINK_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_LINK_CODE_TTL_MINUTES = 30


def _normalise_link_code(code):
    return "".join(str(code or "").upper().replace("-", "").split())


def _link_code_hash(code):
    return hashlib.sha256(_normalise_link_code(code).encode("utf-8")).hexdigest()


def create_teacher_link_code(teacher, created_by_id=None):
    """Invalidate outstanding codes and create a new code without storing it in plaintext."""
    now = datetime.utcnow()
    TeacherLinkCode.query.filter_by(teacher_id=teacher.id, used_at=None).update(
        {TeacherLinkCode.used_at: now}, synchronize_session=False
    )
    for _ in range(5):
        code = "".join(secrets.choice(_LINK_CODE_ALPHABET) for _ in range(8))
        if TeacherLinkCode.query.filter_by(code_hash=_link_code_hash(code)).first() is None:
            record = TeacherLinkCode(
                teacher_id=teacher.id,
                code_hash=_link_code_hash(code),
                expires_at=now + timedelta(minutes=_LINK_CODE_TTL_MINUTES),
                created_by_id=created_by_id,
            )
            db.session.add(record)
            db.session.flush()
            return f"{code[:4]}-{code[4:]}", record
    raise RuntimeError("could not generate a unique teacher link code")


def link_wechat_user_to_teacher_by_code(user, code):
    """Bind a verified WeChat account to a teacher, preserving a legacy password account.

    A prior password account is merged into rather than leaving two user rows
    linked to one teacher.  This keeps its password usable while making future
    WeChat logins resolve to the same teacher identity.
    """
    if not user or not user.openid:
        raise AuthError("请先使用微信登录再关联教师身份", 403)

    record = TeacherLinkCode.query.filter_by(code_hash=_link_code_hash(code)).first()
    if record is None:
        raise AuthError("关联码无效，请向管理员重新获取", 400)
    if record.used_at is not None:
        raise AuthError("关联码已使用，请向管理员重新获取", 410)
    if record.expires_at <= datetime.utcnow():
        raise AuthError("关联码已过期，请向管理员重新获取", 410)

    teacher = db.session.get(Teacher, record.teacher_id)
    if teacher is None:
        raise AuthError("关联的教师档案不存在，请联系管理员", 404)
    if user.teacher_id and user.teacher_id != teacher.id:
        raise AuthError("当前微信账号已关联其他教师档案", 409)

    existing_user = User.query.filter(User.teacher_id == teacher.id, User.id != user.id).first()
    linked_user = user
    if existing_user:
        if existing_user.openid and existing_user.openid != user.openid:
            raise AuthError("该教师档案已关联其他微信账号，请联系管理员", 409)
        existing_user.openid = user.openid
        existing_user.role = "teacher"
        if not existing_user.nickname:
            existing_user.nickname = user.nickname
        if not existing_user.avatar_url:
            existing_user.avatar_url = user.avatar_url
        if not existing_user.phone:
            existing_user.phone = user.phone
        linked_user = existing_user
        db.session.delete(user)
    else:
        user.teacher_id = teacher.id
        user.role = "teacher"

    record.used_at = datetime.utcnow()
    return linked_user, teacher


def _get_or_create_user(openid):
    user = User.query.filter_by(openid=openid).first()
    if user is None:
        user = User(openid=openid, role="student")
        db.session.add(user)
        db.session.flush()
        db.session.commit()
    return user


def _issue_token(user):
    return create_access_token(
        identity=str(user.id),
        additional_claims={"teacherId": user.teacher_id, "jti": uuid.uuid4().hex},
    )
