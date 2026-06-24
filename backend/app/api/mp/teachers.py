from datetime import date
import os

from flask import request, send_file
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import extract
from sqlalchemy.sql.expression import func

from ...extensions import db, limiter
from ...models import Announcement, AnnualReview, Studio, Teacher, TeacherTier, User
from .helpers import (
    _certification_status,
    _date_text,
    _get_current_user,
    _is_owner_teacher,
    _review_payload,
    _studio_summary,
    _teacher_profile,
    _teacher_summary,
    escape_like,
)
from . import mp_bp


@mp_bp.get("/homepage")
def homepage_data():
    announcements = (
        Announcement.query.filter_by(status="active")
        .order_by(Announcement.display_order.desc(), Announcement.id.desc())
        .limit(5)
        .all()
    )
    featured_teachers = (
        Teacher.query.filter(Teacher.status == "active")
        .order_by(func.random())
        .limit(3)
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
        "featuredTeachers": [_teacher_summary(t) for t in featured_teachers],
    }


@mp_bp.get("/stats/overview")
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
def search_teachers():
    keyword = request.args.get("q", "").strip()
    city = request.args.get("city", "").strip()
    tier = request.args.get("tier", "").strip()
    try:
        page = max(int(request.args.get("page", 1)), 1)
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = max(min(int(request.args.get("pageSize", 20)), 50), 1)
    except (ValueError, TypeError):
        page_size = 20

    query = Teacher.query.filter(Teacher.status != "hidden")
    if keyword:
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
def get_teacher_summary(teacher_id):
    teacher = Teacher.query.filter(Teacher.id == teacher_id, Teacher.status != "hidden").first_or_404()
    return _teacher_profile(teacher)


def _certification_payload(teacher, include_reviews=True):
    today = date.today()
    days_left = (teacher.valid_until - today).days if teacher.valid_until else None
    result = {
        "teacher": {
            **_teacher_summary(teacher),
            "validUntil": _date_text(teacher.valid_until),
            "firstCertifiedOn": _date_text(teacher.first_certified_on),
            "daysLeft": max(days_left, 0) if days_left is not None else None,
            "reviewCycleYears": teacher.tier.review_cycle_years if teacher.tier else None,
            "reviewRequired": teacher.tier.review_required if teacher.tier else True,
            "certificateUrl": teacher.certificate_url,
            "teachingSummary": teacher.detail.teaching_summary if teacher.detail else None,
            "phone": teacher.detail.phone if teacher.detail else None,
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
    return _certification_payload(teacher, include_reviews=True)


@mp_bp.get("/teachers/<int:teacher_id>/certification")
def get_teacher_certification(teacher_id):
    teacher = Teacher.query.filter(Teacher.id == teacher_id, Teacher.status != "hidden").first_or_404()
    user = _get_current_user()
    if _is_owner_teacher(user, teacher_id):
        return _certification_payload(teacher, include_reviews=True)
    return {
        "teacher": {
            **_teacher_summary(teacher),
            "validUntil": _date_text(teacher.valid_until),
            "firstCertifiedOn": _date_text(teacher.first_certified_on),
            "certificateUrl": teacher.certificate_url,
            "teachingSummary": teacher.detail.teaching_summary if teacher.detail else None,
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
        cos_bucket = os.getenv("COS_BUCKET")
        cos_region = os.getenv("COS_REGION")
        if cos_bucket and cos_region and teacher.certificate_url.startswith("http"):
            return {"certificateUrl": teacher.certificate_url}

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

    return send_file(buffer, mimetype="image/png", download_name=f"cert_{teacher.teacher_no}.png")
