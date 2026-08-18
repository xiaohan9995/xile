import hashlib
import hmac
import os
import re
import time
import uuid

import requests as http_requests
from flask import current_app
from flask_jwt_extended import create_access_token
from werkzeug.security import check_password_hash

from ..extensions import db
from ..models import Teacher, TeacherDetail, User

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


def cloudbase_login(assertion):
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
