"""一次性脚本：按 xlsx 名单顺序回填教师的 sort_order。

读取 docss/喜乐瑜伽教师信息表-部分.xlsx 的「教师名单汇总」sheet（数据从
第 4 行开始），按行顺序取身份证号（ID NO. 列，索引 18），用 teacher_no
匹配数据库教师并依次设置 sort_order = 1..N。未匹配的教师保持 0（排最末）。

用法（在 backend/ 目录下运行）：
    python scripts/migrate_teacher_sort_order.py
"""
import os
import sys

import openpyxl

from app import create_app
from app.extensions import db
from app.models import Teacher

XLSX_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "docss", "喜乐瑜伽教师信息表-部分.xlsx",
)


def read_xlsx_id_numbers():
    wb = openpyxl.load_workbook(XLSX_PATH, read_only=True, data_only=True)
    ws = wb["教师名单汇总"]
    id_numbers = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i < 3:
            continue  # 跳过前 3 行（标题 / 分组表头 / 字段名）
        name = row[5] if len(row) > 5 else None
        if not name or not str(name).strip():
            continue
        id_number = row[18] if len(row) > 18 else None
        if id_number is None or not str(id_number).strip():
            continue
        id_numbers.append(str(id_number).strip())
    wb.close()
    return id_numbers


def main():
    if not os.path.exists(XLSX_PATH):
        print(f"未找到 xlsx 文件：{XLSX_PATH}")
        sys.exit(1)

    id_numbers = read_xlsx_id_numbers()
    if not id_numbers:
        print("xlsx 中未解析到任何教师")
        sys.exit(1)

    app = create_app()
    with app.app_context():
        teachers = Teacher.query.filter(Teacher.status != "hidden").all()
        by_no = {}
        for teacher in teachers:
            if teacher.teacher_no:
                by_no[teacher.teacher_no] = teacher

        matched = 0
        skipped = []
        for order, id_number in enumerate(id_numbers, start=1):
            teacher = by_no.get(id_number)
            if teacher is None:
                skipped.append((order, id_number, "数据库中未找到"))
                continue
            teacher.sort_order = order
            matched += 1
            del by_no[id_number]

        try:
            db.session.commit()
        except Exception as exc:
            db.session.rollback()
            print(f"提交失败：{exc}")
            sys.exit(1)

        print(f"回填完成：按 xlsx 顺序设置 sort_order，匹配 {matched} 位教师")
        if skipped:
            print(f"跳过 {len(skipped)} 个（数据库未找到）：")
            for order, id_number, reason in skipped:
                print(f"  顺序{order} 身份证号={id_number} 原因={reason}")
        else:
            print("无跳过项")


if __name__ == "__main__":
    main()
