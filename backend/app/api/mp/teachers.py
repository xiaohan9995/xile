import json
from datetime import date
import os

from flask import current_app, request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import extract

from ...extensions import db, limiter
from ...models import Announcement, AnnualReview, ReviewCycle, Studio, Teacher, TeacherTier, User
from ...utils.storage import StorageNotConfiguredError, cos_is_configured, download_cos_object, file_url, upload_to_cos
from .helpers import (
    _certification_status,
    _date_text,
    _get_current_user,
    _is_owner_teacher,
    _review_payload,
    _studio_summary,
    _teacher_profile,
    _teacher_summary,
    _public_profile_settings,
    _residences,
    escape_like,
)
from . import mp_bp


@mp_bp.get("/homepage")
@jwt_required()
def homepage_data():
    announcements = (
        Announcement.query.filter_by(status="active")
        .order_by(Announcement.display_order.desc(), Announcement.id.desc())
        .limit(5)
        .all()
    )
    return {
        "announcements": [
            {
                "id": a.id,
                "title": a.title,
                "content": a.content,
                "linkUrl": a.link_url,
            }
            for a in announcements
        ],
        # Teacher cards are loaded separately through the paginated endpoint.
        # Keeping the homepage payload small prevents a horizontal carousel from
        # growing the initial request as the teacher directory grows.
        "featuredTeachers": [],
    }


@mp_bp.get("/teachers/featured")
@limiter.limit("60 per minute")
@jwt_required()
def featured_teachers():
    """Return one lightweight page for the homepage teacher carousel."""
    try:
        page = max(int(request.args.get("page", 1)), 1)
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = max(min(int(request.args.get("pageSize", 10)), 10), 1)
    except (ValueError, TypeError):
        page_size = 10

    query = Teacher.query.join(Teacher.tier).filter(Teacher.status == "active")
    total = query.count()
    teachers = (
        query.order_by(
            TeacherTier.sort_order.desc(),
            Teacher.updated_at.desc(),
            Teacher.id.desc(),
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [_teacher_summary(teacher) for teacher in teachers],
        "page": page,
        "pageSize": page_size,
        "hasMore": page * page_size < total,
    }


@mp_bp.get("/stats/overview")
@jwt_required()
def stats_overview():
    total_teachers = Teacher.query.filter(Teacher.status != "hidden").count()
    total_studios = Studio.query.filter_by(status="open").count()
    current_year = date.today().year
    completed_reviews = AnnualReview.query.filter(
        AnnualReview.status == "approved",
        extract("year", AnnualReview.reviewed_at) == current_year,
    ).count()
    return {
        "totalTeachers": total_teachers,
        "totalStudios": total_studios,
        "completedReviews": completed_reviews,
    }


@mp_bp.get("/teachers/search")
@limiter.limit("60 per minute")
@jwt_required()
def search_teachers():
    keyword = request.args.get("q", "").strip()
    city = request.args.get("city", "").strip()
    tier = request.args.get("tier", "").strip()
    mode = request.args.get("mode", "name").strip()
    if mode not in ("name", "certificate", "region", "tier"):
        return {"error": "invalid search mode"}, 400
    try:
        page = max(int(request.args.get("page", 1)), 1)
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = max(min(int(request.args.get("pageSize", 20)), 50), 1)
    except (ValueError, TypeError):
        page_size = 20

    query = Teacher.query.filter(Teacher.status != "hidden")
    if mode == "certificate" and keyword:
        query = query.filter(Teacher.teacher_no == keyword)
    elif mode == "name" and keyword:
        like_keyword = f"%{escape_like(keyword)}%"
        query = query.filter(
            (Teacher.real_name.like(like_keyword))
            | (Teacher.xile_name.like(like_keyword))
            | (Teacher.teacher_no.like(like_keyword))
        )
    if city:
        query = query.filter(Teacher.city == city)
    if tier:
        query = query.join(Teacher.tier).filter_by(code=tier)

    total = query.count()
    teachers = query.order_by(Teacher.valid_until.desc(), Teacher.id.asc()).offset((page - 1) * page_size).limit(page_size).all()

    cities = [row[0] for row in db.session.query(db.distinct(Teacher.city)).filter(
        Teacher.status != "hidden", Teacher.city.isnot(None)
    ).order_by(Teacher.city).all()]

    return {
        "items": [_teacher_summary(t) for t in teachers],
        "total": total,
        "page": page,
        "pageSize": page_size,
        "hasMore": page * page_size < total,
        "cities": cities,
    }


@mp_bp.get("/teachers/<int:teacher_id>/summary")
@jwt_required()
def get_teacher_summary(teacher_id):
    teacher = Teacher.query.filter(Teacher.id == teacher_id, Teacher.status != "hidden").first_or_404()
    return _teacher_profile(teacher)


def _certification_payload(teacher, include_reviews=True):
    today = date.today()
    days_left = (teacher.valid_until - today).days if teacher.valid_until else None
    review_cycle = ReviewCycle.query.filter_by(status="open").order_by(ReviewCycle.start_date.desc()).first()
    result = {
        "teacher": {
            **_teacher_summary(teacher),
            "validUntil": _date_text(teacher.valid_until),
            "firstCertifiedOn": _date_text(teacher.first_certified_on),
            "daysLeft": max(days_left, 0) if days_left is not None else None,
            "reviewCycleYears": teacher.tier.review_cycle_years if teacher.tier else None,
            "reviewRequired": teacher.tier.review_required if teacher.tier else True,
            "certificateUrl": file_url(teacher.certificate_url),
            "teachingSummary": teacher.detail.teaching_summary if teacher.detail else None,
            "phone": teacher.detail.phone if teacher.detail else None,
        },
        "reviewWindow": {
            "isOpen": bool(review_cycle and review_cycle.start_date <= today <= review_cycle.submission_deadline),
            "startDate": _date_text(review_cycle.start_date) if review_cycle else None,
            "submissionDeadline": _date_text(review_cycle.submission_deadline) if review_cycle else None,
        },
    }
    if include_reviews:
        reviews = (
            AnnualReview.query.filter_by(teacher_id=teacher.id)
            .order_by(AnnualReview.review_year.desc(), AnnualReview.id.desc())
            .all()
        )
        result["reviews"] = [_review_payload(review) for review in reviews]
    return result


@mp_bp.get("/teachers/me/certification")
@jwt_required()
def get_my_certification():
    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user or not user.teacher_id:
        return {"error": "not a teacher"}, 403
    teacher = Teacher.query.filter(Teacher.id == user.teacher_id, Teacher.status != "hidden").first_or_404()
    # Fill only legacy teacher records that have no avatar. An administrator
    # may intentionally update the teacher avatar independently; never
    # overwrite that newer value with the mini-program user's cached avatar.
    if user.avatar_url and not teacher.avatar_url:
        teacher.avatar_url = user.avatar_url
        db.session.commit()
    return _certification_payload(teacher, include_reviews=True)


@mp_bp.get("/teachers/me/public-profile")
@jwt_required()
def get_my_public_profile():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.teacher_id:
        return {"error": "仅已关联教师可维护公开资料"}, 403
    teacher = Teacher.query.filter(Teacher.id == user.teacher_id, Teacher.status != "hidden").first_or_404()
    return {
        "xileName": teacher.xile_name or "",
        "alias": teacher.alias or "",
        "residences": _residences(teacher),
        "teachingSummary": teacher.detail.teaching_summary if teacher.detail else "",
        "currentTierCertifiedOn": _date_text(teacher.current_tier_certified_on),
        "visibility": _public_profile_settings(teacher),
    }


@mp_bp.put("/teachers/me/public-profile")
@jwt_required()
def update_my_public_profile():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.teacher_id:
        return {"error": "仅已关联教师可维护公开资料"}, 403
    teacher = Teacher.query.filter(Teacher.id == user.teacher_id, Teacher.status != "hidden").first_or_404()
    payload = request.get_json(silent=True) or {}
    if "alias" in payload:
        teacher.alias = str(payload["alias"] or "").strip()[:32] or None
    if "residences" in payload:
        residences = payload["residences"]
        if not isinstance(residences, list):
            return {"error": "常住地格式无效"}, 400
        teacher.residences = ",".join(str(item).strip()[:64] for item in residences if str(item).strip()) or None
    if "teachingSummary" in payload:
        if not teacher.detail:
            from ...models import TeacherDetail
            teacher.detail = TeacherDetail(teacher_id=teacher.id)
        teacher.detail.teaching_summary = str(payload["teachingSummary"] or "").strip() or None
    if "currentTierCertifiedOn" in payload:
        value = str(payload["currentTierCertifiedOn"] or "").strip()
        try:
            teacher.current_tier_certified_on = date.fromisoformat(value) if value else None
        except ValueError:
            return {"error": "当前等级认证时间格式无效"}, 400
    if "visibility" in payload:
        visibility = payload["visibility"]
        if not isinstance(visibility, dict):
            return {"error": "公开设置格式无效"}, 400
        allowed = {"showAlias", "showResidences", "showBio", "showFirstCertifiedOn", "showCurrentTierCertifiedOn"}
        teacher.public_profile_settings = json.dumps({key: bool(visibility.get(key, default)) for key, default in _public_profile_settings(teacher).items() if key in allowed}, ensure_ascii=False)
    db.session.commit()
    return get_my_public_profile()


@mp_bp.get("/teachers/<int:teacher_id>/certification")
@jwt_required()
def get_teacher_certification(teacher_id):
    teacher = Teacher.query.filter(Teacher.id == teacher_id, Teacher.status != "hidden").first_or_404()
    user = _get_current_user()
    if _is_owner_teacher(user, teacher_id):
        return _certification_payload(teacher, include_reviews=True)
    return {
        "teacher": {
            **_teacher_summary(teacher),
            "validUntil": _date_text(teacher.valid_until),
            "firstCertifiedOn": _date_text(teacher.first_certified_on) if _public_profile_settings(teacher)["showFirstCertifiedOn"] else None,
            "certificateUrl": file_url(teacher.certificate_url),
            "teachingSummary": teacher.detail.teaching_summary if teacher.detail and _public_profile_settings(teacher)["showBio"] else None,
        },
    }


@mp_bp.get("/teachers/me/certificate-image")
@jwt_required()
def generate_certificate_image():
    from io import BytesIO

    user_id = int(get_jwt_identity())
    user = db.session.get(User, user_id)
    if not user or not user.teacher_id:
        return {"error": "not a teacher"}, 403

    teacher = db.session.get(Teacher, user.teacher_id)
    if not teacher or teacher.status == "hidden":
        return {"error": "teacher not found"}, 404

    if teacher.certificate_url:
        # Do not redirect the mini program to COS. A redirected private file
        # may be saved as an unknown temporary file or be rejected by COS,
        # which prevents wx.saveImageToPhotosAlbum from accepting it.
        try:
            content, content_type = download_cos_object(teacher.certificate_url)
            return send_file(
                BytesIO(content),
                mimetype=content_type.split(";", 1)[0],
                download_name=f"cert_{teacher.teacher_no}.png",
                max_age=0,
            )
        except StorageNotConfiguredError:
            # Retain compatibility for legacy non-COS certificate URLs.
            return {"error": "证书文件无法读取"}, 503
        except Exception:
            current_app.logger.exception("failed to download certificate for teacher_id=%s", teacher.id)
            return {"error": "证书文件下载失败，请稍后重试"}, 502

    from PIL import Image, ImageDraw, ImageFont

    width, height = 800, 1100
    img = Image.new("RGB", (width, height), "#FFFDF8")
    draw = ImageDraw.Draw(img)

    try:
        font_title = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
        font_body = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    except (OSError, IOError):
        font_title = ImageFont.load_default()
        font_body = ImageFont.load_default()
        font_small = ImageFont.load_default()

    draw.rectangle([(30, 30), (width - 30, height - 30)], outline="#78887A", width=3)
    draw.rectangle([(40, 40), (width - 40, height - 40)], outline="#B89A63", width=1)

    y = 80
    draw.text((width // 2, y), "喜乐瑜伽教师认证中心", fill="#1F2521", font=font_title, anchor="mt")
    y += 50
    draw.text((width // 2, y), "XILE YOGA TEACHER CERTIFICATION", fill="#78887A", font=font_small, anchor="mt")
    y += 60
    draw.line([(100, y), (width - 100, y)], fill="#B89A63", width=2)
    y += 50
    draw.text((width // 2, y), "教师资格认证证书", fill="#1F2521", font=font_title, anchor="mt")
    y += 80

    tier_name = teacher.tier.name if teacher.tier else "认证讲师"
    tier_code = teacher.tier.code if teacher.tier else "L1"
    cert_date = teacher.first_certified_on.strftime("%Y年%m月%d日") if teacher.first_certified_on else "--"
    valid_date = teacher.valid_until.strftime("%Y年%m月%d日") if teacher.valid_until else "--"

    for line in [f"姓名：{teacher.real_name}", f"编号：{teacher.teacher_no}", f"等级：{tier_code} {tier_name}", f"认证日期：{cert_date}", f"有效期至：{valid_date}"]:
        draw.text((120, y), line, fill="#1F2521", font=font_body)
        y += 55

    y += 40
    draw.line([(100, y), (width - 100, y)], fill="#B89A63", width=1)
    y += 40
    draw.text((width // 2, y), "本证书由喜乐瑜伽教师管理委员会颁发", fill="#78887A", font=font_small, anchor="mt")
    y += 30
    draw.text((width // 2, y), "可通过小程序在线验证教师资质", fill="#78887A", font=font_small, anchor="mt")

    seal_center = (width - 150, height - 200)
    draw.ellipse([(seal_center[0] - 60, seal_center[1] - 60), (seal_center[0] + 60, seal_center[1] + 60)], outline="#B89A63", width=3)
    draw.text(seal_center, "认证", fill="#B89A63", font=font_body, anchor="mm")

    buffer = BytesIO()
    img.save(buffer, format="PNG", quality=95)
    buffer.seek(0)

    if cos_is_configured():
        try:
            teacher.certificate_url = upload_to_cos(
                buffer,
                f"teacher-certificates/generated/{teacher.teacher_no}.png",
                "image/png",
            )
            db.session.commit()
            content, content_type = download_cos_object(teacher.certificate_url)
            return send_file(
                BytesIO(content),
                mimetype=content_type.split(";", 1)[0],
                download_name=f"cert_{teacher.teacher_no}.png",
                max_age=0,
            )
        except StorageNotConfiguredError:
            pass
    if not (current_app.debug or current_app.testing):
        return {"error": "对象存储未配置，无法生成电子证书"}, 503

    return send_file(buffer, mimetype="image/png", download_name=f"cert_{teacher.teacher_no}.png")
