"""一次性迁移脚本：把旧格式证书号（JY{year}{seq}）重新生成为新规则。

新规则：2050 + 认证级别 + XL + 首次认证年份 + 身份证后四位
例：2050L4XL20180921

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
        teachers = Teacher.query.filter(Teacher.certificate_no.isnot(None)).all()

        seen = set()
        migrated = 0
        skipped = []

        for teacher in teachers:
            if not teacher.tier or not teacher.first_certified_on or not teacher.teacher_no:
                skipped.append((teacher.id, teacher.certificate_no, "缺少级别/首次认证日期/身份证号"))
                continue

            new_no = generate_certificate_no(
                teacher.tier.code,
                teacher.first_certified_on.year,
                teacher.teacher_no,
            )
            if new_no in seen:
                skipped.append((teacher.id, teacher.certificate_no, f"证书号冲突 {new_no}"))
                continue
            seen.add(new_no)
            teacher.certificate_no = new_no
            migrated += 1

        try:
            db.session.commit()
        except Exception as exc:  # unique 约束冲突兜底
            db.session.rollback()
            print(f"迁移提交失败：{exc}")
            sys.exit(1)

        print(f"迁移完成：{migrated} 个教师证书号已更新")
        if skipped:
            print(f"跳过 {len(skipped)} 个（需手动处理）：")
            for teacher_id, old_no, reason in skipped:
                print(f"  teacher_id={teacher_id} 旧号={old_no} 原因={reason}")
        else:
            print("无跳过项")


if __name__ == "__main__":
    main()
