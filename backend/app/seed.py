from datetime import date, datetime

from .extensions import db
from .models import (
    AdminUser,
    Announcement,
    AnnualReview,
    ReviewFile,
    Studio,
    SystemConfig,
    Teacher,
    TeacherDetail,
    TeacherTier,
)


DEFAULT_TEACHER_TIERS = (
    {"code": "L0", "name": "见习教师", "review_cycle_years": 2, "review_required": True, "sort_order": 0},
    {"code": "L1", "name": "认证教师", "review_cycle_years": 2, "review_required": True, "sort_order": 1},
    {"code": "L2", "name": "资深教师", "review_cycle_years": 2, "review_required": True, "sort_order": 2},
    {"code": "L3", "name": "认证导师", "review_cycle_years": 2, "review_required": True, "sort_order": 3},
    {"code": "L4", "name": "高级导师", "review_cycle_years": 3, "review_required": True, "sort_order": 4},
    {"code": "L5", "name": "荣誉导师", "review_cycle_years": None, "review_required": False, "sort_order": 5},
)

DEFAULT_SYSTEM_CONFIGS = {
    "qr_verify_enabled": "true",
    "cert_expiry_notify": "true",
}


def ensure_system_defaults():
    """Create required reference data without changing existing production settings.

    Safe to invoke at every container start: only rows that do not yet exist are
    inserted. This deliberately excludes demo teachers, studios and accounts.
    """
    existing_tier_codes = {code for (code,) in db.session.query(TeacherTier.code).all()}
    for tier in DEFAULT_TEACHER_TIERS:
        if tier["code"] not in existing_tier_codes:
            db.session.add(TeacherTier(**tier))

    existing_config_keys = {key for (key,) in db.session.query(SystemConfig.key).all()}
    for key, value in DEFAULT_SYSTEM_CONFIGS.items():
        if key not in existing_config_keys:
            db.session.add(SystemConfig(key=key, value=value))

    db.session.commit()


def ensure_initial_admin(username, password):
    """Create the first production administrator once, without demo credentials."""
    if AdminUser.query.first():
        return

    username = (username or "").strip()
    if not username or not password:
        raise RuntimeError(
            "No administrator exists. Set INITIAL_ADMIN_USERNAME and "
            "INITIAL_ADMIN_PASSWORD before starting the service."
        )
    if len(password) < 12:
        raise RuntimeError("INITIAL_ADMIN_PASSWORD must be at least 12 characters")

    from werkzeug.security import generate_password_hash

    db.session.add(
        AdminUser(
            username=username,
            password_hash=generate_password_hash(password, method="pbkdf2:sha256"),
            role="super_admin",
        )
    )
    db.session.commit()


def reset_admin_password(username, password):
    """Reset one named administrator only during an explicit release operation."""
    username = (username or "").strip()
    if not username or not password:
        raise RuntimeError(
            "Set INITIAL_ADMIN_USERNAME and ADMIN_PASSWORD_RESET_PASSWORD "
            "before requesting an administrator password reset."
        )
    if len(password) < 12:
        raise RuntimeError("ADMIN_PASSWORD_RESET_PASSWORD must be at least 12 characters")

    admin = AdminUser.query.filter_by(username=username).first()
    if not admin:
        raise RuntimeError(f"Administrator '{username}' does not exist; password was not changed.")

    from werkzeug.security import generate_password_hash

    admin.password_hash = generate_password_hash(password, method="pbkdf2:sha256")
    db.session.commit()


def seed_demo_data():
    if Teacher.query.first():
        return

    tiers = {tier["code"]: TeacherTier(**tier) for tier in DEFAULT_TEACHER_TIERS}
    db.session.add_all(tiers.values())
    db.session.flush()

    teachers = [
        Teacher(
            teacher_no="JY20230001",
            real_name="张三",
            xile_name="善悦",
            tier=tiers["L3"],
            city="上海市",
            district="静安区",
            status="active",
            first_certified_on=date(2023, 1, 1),
            valid_until=date(2028, 12, 31),
            avatar_url="/static/demo/teacher-zhangsan.jpg",
        ),
        Teacher(
            teacher_no="JY20230002",
            real_name="李四",
            xile_name="清心",
            tier=tiers["L2"],
            city="北京市",
            district="朝阳区",
            status="active",
            first_certified_on=date(2024, 6, 30),
            valid_until=date(2026, 6, 30),
            avatar_url="/static/demo/teacher-lisi.jpg",
        ),
        Teacher(
            teacher_no="JY20230003",
            real_name="王五",
            xile_name="自在",
            tier=tiers["L1"],
            city="杭州市",
            district="西湖区",
            status="hidden",
            first_certified_on=date(2023, 12, 31),
            valid_until=date(2025, 12, 31),
            avatar_url="/static/demo/teacher-wangwu.jpg",
        ),
        Teacher(
            teacher_no="JY20230004",
            real_name="海六",
            xile_name="明净",
            tier=tiers["L4"],
            city="深圳市",
            district="南山区",
            status="active",
            first_certified_on=date(2022, 8, 10),
            valid_until=date(2028, 8, 10),
            avatar_url="/static/demo/teacher-hailiu.jpg",
        ),
        Teacher(
            teacher_no="JY20230005",
            real_name="畅琦",
            xile_name="喜乐",
            tier=tiers["L5"],
            city="广州市",
            district="天河区",
            status="active",
            first_certified_on=date(2020, 2, 18),
            valid_until=date(2099, 12, 31),
            avatar_url="/static/demo/teacher-changqi.jpg",
        ),
    ]
    db.session.add_all(teachers)
    db.session.flush()

    db.session.add_all(
        [
            TeacherDetail(
                teacher_id=teachers[0].id,
                phone="13800000000",
                specialties="阴瑜伽, 流瑜伽, 产后瑜伽",
                teaching_summary="喜乐瑜伽 300 小时教师培训",
            ),
            TeacherDetail(
                teacher_id=teachers[1].id,
                phone="13900000000",
                specialties="哈他瑜伽, 颂钵疗愈",
                teaching_summary="长期带领女性身心平衡课程",
            ),
            TeacherDetail(
                teacher_id=teachers[3].id,
                phone="13700000000",
                specialties="阴瑜伽, 冥想, 中医理疗",
                teaching_summary="深耕阴瑜伽与中医经络疗愈十余年",
            ),
            TeacherDetail(
                teacher_id=teachers[4].id,
                phone="13600000000",
                specialties="音钵疗愈, 颂钵阴瑜伽",
                teaching_summary="国内音钵疗愈先驱，喜乐瑜伽创始导师",
            ),
        ]
    )

    review = AnnualReview(
        teacher=teachers[1],
        review_year=2026,
        status="submitted",
        submitted_at=datetime(2026, 5, 20, 14, 30),
        previous_valid_until=date(2026, 6, 30),
        next_valid_until=date(2028, 6, 30),
    )
    db.session.add(review)
    db.session.flush()
    db.session.add(
        ReviewFile(
            review=review,
            file_key="demo/review/continuing-education.pdf",
            file_name="继续教育证明.pdf",
            file_type="pdf",
            file_size=284000,
        )
    )

    db.session.add_all(
        [
            Studio(
                name="静心瑜伽空间",
                city="上海市",
                district="徐汇区",
                address="上海市徐汇区衡山路 88 号",
                owner=teachers[0],
                tags="静心冥想, 小班授课, 哈他瑜伽, 舒缓拉伸",
                intro="适合哈他瑜伽、流瑜伽、女性身心疗愈等日常练习",
                opening_hours="周一至周日 09:00-20:30",
                contact_text="由客服统一对接",
                status="open",
                display_order=10,
            ),
            Studio(
                name="清悦身心练习室",
                city="北京市",
                district="朝阳区",
                address="北京市朝阳区建国路 58 号",
                owner=teachers[1],
                tags="露台瑜伽, 空中瑜伽, 活力流瑜伽, 日落冥想",
                intro="面向初学者和进阶学员的城市瑜伽练习空间",
                opening_hours="周二至周日 10:00-20:00",
                contact_text="预约请通过有赞学堂",
                status="open",
                display_order=8,
            ),
            Studio(
                name="自在瑜伽小院",
                city="杭州市",
                district="西湖区",
                address="杭州市西湖区湖滨路 12 号",
                owner=teachers[3],
                tags="中式庭院, 茶道瑜伽, 疗愈颂钵, 自然采光",
                intro="中式庭院风格，主打疗愈颂钵与茶道瑜伽",
                opening_hours="周一至周六 09:00-18:00",
                contact_text="预约请联系客服",
                status="open",
                display_order=6,
            ),
            Studio(
                name="喜乐瑜伽内部筹备馆",
                city="上海市",
                district="静安区",
                address="上海市静安区常德路 20 号",
                owner=teachers[2],
                intro="筹备中，暂不公开展示。",
                status="hidden",
                display_order=1,
            ),
        ]
    )

    # System configs
    db.session.add_all(
        [
            SystemConfig(key="qr_verify_enabled", value="true"),
            SystemConfig(key="cert_expiry_notify", value="true"),
        ]
    )

    # Default admin user
    from werkzeug.security import generate_password_hash

    admin = AdminUser.query.filter_by(username="admin").first()
    if not admin:
        db.session.add(
            AdminUser(
                username="admin",
                password_hash=generate_password_hash("password", method="pbkdf2:sha256"),
                role="super_admin",
            )
        )

    # Announcements
    if not Announcement.query.first():
        db.session.add_all([
            Announcement(title="2026年度年审通知", content="请各位教师于7月31日前完成年度审核材料提交", display_order=3),
            Announcement(title="L4高级导师认证开放申请", content="符合条件的L3导师可提交晋升申请", display_order=2),
            Announcement(title="暑期工作坊报名中", content="8月杭州站·阴瑜伽深度研修班，名额有限", display_order=1),
        ])

    db.session.commit()
