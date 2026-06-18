from datetime import date

from .extensions import db
from .models import AnnualReview, ReviewFile, Studio, Teacher, TeacherDetail, TeacherTier


def seed_demo_data():
    if Teacher.query.first():
        return

    tiers = {
        "L1": TeacherTier(code="L1", name="认证教师", review_cycle_years=2, sort_order=1),
        "L2": TeacherTier(code="L2", name="资深教师", review_cycle_years=2, sort_order=2),
        "L3": TeacherTier(code="L3", name="认证导师", review_cycle_years=2, sort_order=3),
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
        ]
    )

    review = AnnualReview(
        teacher=teachers[1],
        review_year=2026,
        status="submitted",
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
                name="喜乐瑜伽静安馆",
                city="上海市",
                district="静安区",
                address="上海市静安区常德路 88 号",
                owner=teachers[0],
                intro="以女性身心疗愈和进阶练习为核心的城市工作室。",
                opening_hours="周一至周日 09:00-21:00",
                contact_text="预约请通过有赞学堂",
                status="open",
                display_order=10,
            ),
            Studio(
                name="喜乐瑜伽湖畔馆",
                city="杭州市",
                district="西湖区",
                address="杭州市西湖区湖滨路 12 号",
                owner=teachers[1],
                intro="面向初学者和进阶学员的湖畔瑜伽练习空间。",
                opening_hours="周二至周日 10:00-20:00",
                contact_text="预约请通过有赞学堂",
                status="open",
                display_order=8,
            ),
            Studio(
                name="喜乐瑜伽内部筹备馆",
                city="上海市",
                district="徐汇区",
                address="上海市徐汇区衡山路 20 号",
                owner=teachers[2],
                intro="筹备中，暂不公开展示。",
                status="hidden",
                display_order=1,
            ),
        ]
    )

    db.session.commit()
