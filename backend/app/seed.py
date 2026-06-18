from datetime import date, datetime

from .extensions import db
from .models import (
    AdminUser,
    AnnualReview,
    ReviewFile,
    Studio,
    SystemConfig,
    Teacher,
    TeacherDetail,
    TeacherTier,
)


def seed_demo_data():
    if Teacher.query.first():
        return

    tiers = {
        "L0": TeacherTier(code="L0", name="见习教师", review_cycle_years=2, review_required=True, sort_order=0),
        "L1": TeacherTier(code="L1", name="认证教师", review_cycle_years=2, review_required=True, sort_order=1),
        "L2": TeacherTier(code="L2", name="资深教师", review_cycle_years=2, review_required=True, sort_order=2),
        "L3": TeacherTier(code="L3", name="认证导师", review_cycle_years=2, review_required=True, sort_order=3),
        "L4": TeacherTier(code="L4", name="高级导师", review_cycle_years=3, review_required=True, sort_order=4),
        "L5": TeacherTier(code="L5", name="荣誉导师", review_cycle_years=None, review_required=False, sort_order=5),
    }
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
                password_hash=generate_password_hash("password"),
                role="super_admin",
            )
        )

    db.session.commit()
