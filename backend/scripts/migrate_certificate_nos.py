"""给缺证书号的教师生成证书编号。

新规则：2050 + 认证级别 + XL + 首次认证年份 + 身份证后四位
例：2050L4XL20180921

遍历所有未删除教师：certificate_no 为空的，若具备级别 + 首次认证日期 +
身份证号，则按规则生成；已有证书号的保持不变。撞号（同年同级别同身份证
后四位）跳过并报告。幂等，可重复执行。

用法（在 backend/ 目录下运行）：
    python scripts/migrate_certificate_nos.py
"""
import os
import sys

# 脚本位于 scripts/ 子目录，把上级目录加入模块搜索路径，使 from app 可导入。
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db
from app.models import Teacher
from app.services.teacher_service import generate_certificate_no


def main():
    app = create_app()
    with app.app_context():
        teachers = Teacher.query.filter(Teacher.status != "hidden").all()

        existing_nos = set(t.certificate_no for t in teachers if t.certificate_no)
        generated = 0
        skipped = []

        for teacher in teachers:
            if teacher.certificate_no:
                continue  # 已有证书号，保持不变
            if not teacher.tier or not teacher.first_certified_on or not teacher.teacher_no:
                skipped.append((teacher.id, teacher.real_name, "缺少级别/首次认证日期/身份证号"))
                continue

            new_no = generate_certificate_no(
                teacher.tier.code,
                teacher.first_certified_on.year,
                teacher.teacher_no,
            )
            if new_no in existing_nos:
                skipped.append((teacher.id, teacher.real_name, f"证书号冲突 {new_no}"))
                continue
            existing_nos.add(new_no)
            teacher.certificate_no = new_no
            generated += 1

        try:
            db.session.commit()
        except Exception as exc:  # unique 约束冲突兜底
            db.session.rollback()
            print(f"生成提交失败：{exc}")
            sys.exit(1)

        print(f"生成完成：{generated} 位教师证书号已补齐")
        if skipped:
            print(f"跳过 {len(skipped)} 个（需手动处理）：")
            for teacher_id, name, reason in skipped:
                print(f"  teacher_id={teacher_id} 姓名={name} 原因={reason}")
        else:
            print("无跳过项")


if __name__ == "__main__":
    main()
