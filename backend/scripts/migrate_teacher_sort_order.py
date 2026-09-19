"""按 xlsx 名单顺序回填教师 sort_order。

docss/喜乐瑜伽教师信息表-部分.xlsx「教师名单汇总」sheet 第 4 行起的 28 位
教师身份证号顺序已硬编码于此（生产容器无 docss 目录）。按 teacher_no
（身份证号）大小写归一化匹配，依次设置 sort_order = 1..N。幂等，可重复执行。

用法（在 backend/ 目录下运行）：
    python scripts/migrate_teacher_sort_order.py
"""
import os
import sys

# 脚本位于 scripts/ 子目录，把上级目录（backend/ 或生产容器 /app）加入模块
# 搜索路径，使 `from app import ...` 能找到 app 包。
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.extensions import db
from app.models import Teacher

# docss/喜乐瑜伽教师信息表-部分.xlsx「教师名单汇总」第 4 行起的身份证号顺序。
TEACHER_ID_NUMBERS = [
    "06104446", "231005197504122026", "03353291", "750120-01-5016",
    "421127198904130037", "00605986", "04334155", "430111198301141722",
    "440105197605140921", "441302197711255426", "320381198908150611",
    "211323197708220045", "15282719810628422X", "152827198509154227",
    "110102197601071142", "110104198108131321", "510102196706148441",
    "110105197802081127", "110224197110040027", "350322198302160028",
    "110108196906304027", "152628198407217229", "130626199202105860",
    "130721198207124648", "42242619840310002x", "130631198202210229",
    "152827195602150144", "110108197201169720",
]


def backfill_teacher_sort_order():
    """幂等回填：按 xlsx 名单顺序，用身份证号匹配设置 sort_order=1..N。

    未匹配的教师（数据库中没有对应身份证号）保持原有 sort_order 不变。
    返回 (matched, skipped)，skipped 为 (顺序, 身份证号, 原因) 列表。
    """
    teachers = Teacher.query.filter(Teacher.status != "hidden").all()
    by_no = {}
    for teacher in teachers:
        if teacher.teacher_no:
            by_no[teacher.teacher_no.strip().upper()] = teacher

    matched = 0
    skipped = []
    for order, id_number in enumerate(TEACHER_ID_NUMBERS, start=1):
        key = id_number.strip().upper()
        teacher = by_no.get(key)
        if teacher is None:
            skipped.append((order, id_number, "数据库中未找到"))
            continue
        teacher.sort_order = order
        matched += 1
        del by_no[key]

    db.session.commit()
    return matched, skipped


def main():
    app = create_app()
    with app.app_context():
        matched, skipped = backfill_teacher_sort_order()
        print(f"回填完成：按 xlsx 顺序设置 sort_order，匹配 {matched} 位教师")
        if skipped:
            print(f"跳过 {len(skipped)} 个（数据库未找到）：")
            for order, id_number, reason in skipped:
                print(f"  顺序{order} 身份证号={id_number} 原因={reason}")
        else:
            print("无跳过项")


if __name__ == "__main__":
    main()
