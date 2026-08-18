from datetime import date, datetime, timedelta

from flask import request
from werkzeug.security import generate_password_hash

from ...extensions import db
from ...models import (
    AdminUser,
    AnnualReview,
    AuditLog,
    Studio,
    SystemConfig,
    Teacher,
    TeacherTier,
    User,
)
from .helpers import current_admin_id, require_admin_roles, require_admin_token, _date_text, _datetime_text
from . import admin_bp


# ─── Dashboard ───────────────────────────────────────────────────────────────


@admin_bp.get("/stats/dashboard")
@require_admin_token
def dashboard_stats():
    today = date.today()
    expiring_deadline = today + timedelta(days=90)
    current_year = today.year

    eligible = Teacher.query.join(TeacherTier).filter(Teacher.status != "hidden", TeacherTier.review_required.is_(True)).count()
    return {
        "teacherCount": Teacher.query.filter(Teacher.status != "hidden").count(),
        "activeTeacherCount": Teacher.query.filter_by(status="active").count(),
        "pendingReviewCount": AnnualReview.query.filter_by(status="submitted").count(),
        "openStudioCount": Studio.query.filter_by(status="open").count(),
        "expiringCount": Teacher.query.filter(
            Teacher.status == "active",
            Teacher.valid_until <= expiring_deadline,
            Teacher.valid_until >= today,
        ).count(),
        "completedReviewCount": AnnualReview.query.filter(
            AnnualReview.status == "approved",
            db.extract("year", AnnualReview.reviewed_at) == current_year,
        ).count(),
        "reviewOverview": {
            "due": eligible,
            "submitted": AnnualReview.query.filter(AnnualReview.status.in_(("submitted", "in_review"))).count(),
            "inReview": AnnualReview.query.filter_by(status="in_review").count(),
            "pendingPublication": AnnualReview.query.filter(AnnualReview.status.in_(("pending_publication", "pending_publication_rejected"))).count(),
            "publishedApproved": AnnualReview.query.filter_by(status="published_approved").count(),
            "publishedRejected": AnnualReview.query.filter_by(status="published_rejected").count(),
        },
    }


# ─── Analytics ───────────────────────────────────────────────────────────────


@admin_bp.get("/analytics")
@require_admin_token
def analytics():
    teachers = Teacher.query.filter(Teacher.status != "hidden").all()
    total = len(teachers)

    tier_counts = {}
    city_counts = {}
    for t in teachers:
        tier_code = t.tier.code if t.tier else "Unknown"
        tier_counts[tier_code] = tier_counts.get(tier_code, 0) + 1
        if t.city:
            city_counts[t.city] = city_counts.get(t.city, 0) + 1

    tier_distribution = [
        {"tier": k, "count": v, "percent": round(v / total * 100, 1) if total else 0}
        for k, v in sorted(tier_counts.items())
    ]
    city_distribution = sorted(city_counts.items(), key=lambda x: -x[1])[:10]
    city_distribution = [
        {"city": k, "count": v, "percent": round(v / total * 100, 1) if total else 0}
        for k, v in city_distribution
    ]

    today = date.today()
    monthly_trend = []
    for i in range(11, -1, -1):
        month_start = date(today.year, today.month, 1)
        month_start = date(
            month_start.year - (i // 12 + (1 if (month_start.month - i % 12) <= 0 else 0)),
            ((month_start.month - i % 12 - 1) % 12) + 1,
            1,
        )
        if month_start.month == 12:
            month_end = date(month_start.year + 1, 1, 1)
        else:
            month_end = date(month_start.year, month_start.month + 1, 1)

        count = AnnualReview.query.filter(
            AnnualReview.status == "approved",
            AnnualReview.reviewed_at >= datetime(month_start.year, month_start.month, month_start.day),
            AnnualReview.reviewed_at < datetime(month_end.year, month_end.month, month_end.day),
        ).count()
        monthly_trend.append({"month": month_start.strftime("%Y-%m"), "count": count})

    active_count = Teacher.query.filter_by(status="active").count()
    total_cities = db.session.query(db.func.count(db.distinct(Teacher.city))).filter(
        Teacher.status != "hidden", Teacher.city.isnot(None)
    ).scalar()

    return {
        "tierDistribution": tier_distribution,
        "cityDistribution": city_distribution,
        "monthlyTrend": monthly_trend,
        "totalTeachers": total,
        "activeRate": round(active_count / total * 100, 1) if total else 0,
        "totalCities": total_cities or 0,
    }


# ─── Settings ────────────────────────────────────────────────────────────────


@admin_bp.get("/settings")
@require_admin_token
def get_settings():
    tiers = TeacherTier.query.order_by(TeacherTier.sort_order.asc()).all()
    tier_settings = [
        {
            "code": t.code,
            "name": t.name,
            "reviewCycleYears": t.review_cycle_years,
            "reviewRequired": t.review_required,
        }
        for t in tiers
    ]

    configs = {c.key: c.value for c in SystemConfig.query.all()}
    return {
        "tiers": tier_settings,
        "features": {
            "qrVerifyEnabled": configs.get("qr_verify_enabled", "true") == "true",
            "certExpiryNotify": configs.get("cert_expiry_notify", "true") == "true",
        },
    }


@admin_bp.put("/settings")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def update_settings():
    payload = request.get_json(silent=True) or {}

    tiers_payload = payload.get("tiers")
    if tiers_payload and isinstance(tiers_payload, list):
        for item in tiers_payload:
            tier = TeacherTier.query.filter_by(code=item.get("code")).first()
            if tier and "reviewCycleYears" in item:
                tier.review_cycle_years = item["reviewCycleYears"]

    features = payload.get("features")
    if features and isinstance(features, dict):
        for key, val in features.items():
            db_key = "qr_verify_enabled" if key == "qrVerifyEnabled" else "cert_expiry_notify" if key == "certExpiryNotify" else None
            if db_key:
                config = db.session.get(SystemConfig, db_key)
                if config:
                    config.value = "true" if val else "false"
                else:
                    db.session.add(SystemConfig(key=db_key, value="true" if val else "false"))

    db.session.commit()
    return {"ok": True}


# ─── Permissions ─────────────────────────────────────────────────────────────


@admin_bp.get("/permissions")
@require_admin_token
def get_permissions():
    admins = AdminUser.query.order_by(AdminUser.id.asc()).all()
    items = [
        {
            "id": a.id,
            "username": a.username,
            "role": a.role,
            "createdAt": _datetime_text(a.created_at),
        }
        for a in admins
    ]
    return {"items": items, "total": len(items)}


@admin_bp.post("/permissions/invite")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def invite_admin():
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    if not username:
        return {"error": "username required"}, 400

    existing = AdminUser.query.filter_by(username=username).first()
    if existing:
        return {"error": "username already exists"}, 409

    password = (payload.get("password") or "").strip()
    if len(password) < 8:
        return {"error": "password must be at least 8 characters"}, 400
    role = payload.get("role") or "admin"
    if role not in ("admin", "super_admin", "reviewer", "group_leader"):
        return {"error": "invalid admin role"}, 400

    admin = AdminUser(
        username=username,
        password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
        role=role,
    )
    db.session.add(admin)
    db.session.commit()

    return {"id": admin.id, "username": admin.username, "role": admin.role}, 201


@admin_bp.put("/permissions/<int:admin_id>/role")
@require_admin_token
@require_admin_roles("super_admin")
def update_admin_role(admin_id):
    admin = db.session.get(AdminUser, admin_id)
    payload = request.get_json(silent=True) or {}
    role = (payload.get("role") or "").strip()
    if admin is None:
        return {"error": "admin user not found"}, 404
    if admin.id == current_admin_id():
        return {"error": "cannot change your own super administrator role"}, 409
    if role not in ("admin", "reviewer", "group_leader", "super_admin"):
        return {"error": "invalid admin role"}, 400
    admin.role = role
    db.session.commit()
    return {"id": admin.id, "username": admin.username, "role": admin.role}


@admin_bp.post("/teacher-accounts")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def create_teacher_account():
    """Create or reset a teacher's initial password account."""
    payload = request.get_json(silent=True) or {}
    teacher_id = payload.get("teacherId")
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""
    if not teacher_id or not username or len(password) < 8:
        return {"error": "teacherId, username and an 8-character password are required"}, 400
    teacher = db.session.get(Teacher, teacher_id)
    if not teacher:
        return {"error": "teacher not found"}, 404
    user = User.query.filter_by(teacher_id=teacher_id).first()
    if user is None:
        user = User(teacher_id=teacher_id, role="teacher")
        db.session.add(user)
    duplicate = User.query.filter(User.username == username, User.id != user.id).first()
    if duplicate:
        return {"error": "username already exists"}, 409
    user.username = username
    user.password_hash = generate_password_hash(password, method="pbkdf2:sha256")
    user.must_change_password = True
    db.session.add(AuditLog(admin_id=current_admin_id() or 1, action="set_teacher_password", target_type="teacher", target_id=teacher_id))
    db.session.commit()
    return {"id": user.id, "teacherId": teacher_id, "username": username, "mustChangePassword": True}, 201


@admin_bp.post("/teachers/<int:teacher_id>/link-code")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def create_teacher_link_code(teacher_id):
    """Create the code a teacher enters after signing in with WeChat."""
    from ...services.auth_service import create_teacher_link_code as create_code

    teacher = db.session.get(Teacher, teacher_id)
    if teacher is None:
        return {"error": "teacher not found"}, 404

    code, record = create_code(teacher, current_admin_id())
    db.session.add(AuditLog(
        admin_id=current_admin_id() or 1,
        action="create_teacher_link_code",
        target_type="teacher",
        target_id=teacher.id,
    ))
    db.session.commit()
    return {
        "teacherId": teacher.id,
        "code": code,
        "expiresAt": record.expires_at.isoformat(timespec="minutes") + "Z",
    }, 201


# ─── Users (Mini Program) ───────────────────────────────────────────────────


@admin_bp.get("/users")
@require_admin_token
def user_list():
    users = User.query.order_by(User.created_at.desc()).all()
    items = []
    for user in users:
        teacher_name = None
        if user.teacher_id:
            teacher = db.session.get(Teacher, user.teacher_id)
            teacher_name = teacher.real_name if teacher else None
        items.append({
            "id": user.id,
            "openid": user.openid[:8] + "..." if user.openid and len(user.openid) > 8 else user.openid,
            "phone": user.phone,
            "role": user.role,
            "teacherId": user.teacher_id,
            "teacherName": teacher_name,
            "createdAt": _datetime_text(user.created_at),
        })
    return {"items": items, "total": len(items)}


@admin_bp.put("/users/<int:user_id>/role")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def update_user_role(user_id):
    user = db.session.get(User, user_id)
    if user is None:
        return {"error": "user not found"}, 404

    payload = request.get_json(silent=True) or {}
    role = payload.get("role", "").strip()
    if role not in ("student", "teacher"):
        return {"error": "role must be student or teacher"}, 400

    teacher_id = payload.get("teacherId")

    if role == "teacher":
        if not teacher_id:
            return {"error": "teacherId required when setting role to teacher"}, 400
        teacher = db.session.get(Teacher, teacher_id)
        if teacher is None:
            return {"error": "teacher not found"}, 404
        existing_link = User.query.filter(User.teacher_id == teacher_id, User.id != user_id).first()
        if existing_link:
            return {"error": "teacher already linked to another user"}, 409
        user.teacher_id = teacher_id
    else:
        user.teacher_id = None

    user.role = role
    db.session.commit()

    return {
        "id": user.id,
        "role": user.role,
        "teacherId": user.teacher_id,
    }
