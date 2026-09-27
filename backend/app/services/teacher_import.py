"""教师批量导入：解析年审汇总表，已存在更新、不存在新增。

导入文件以《喜乐瑜伽教师信息汇总表》的「教师名单汇总」工作表为准：

- 表头行由脚本自动定位（表头可能带有换行，匹配前统一去掉空白字符）。
- 字段按表头名匹配，不依赖固定列序。
- N–Q 四列是分角色的首次认证年份（顾问 / 初阶 / 中阶 / 高阶），
  取第一个非空值作为该教师的首次认证年份。
- 已存在的教师执行更新，不存在的教师执行新增。
"""

import calendar
import re
from datetime import date, datetime

from ..extensions import db
from ..models import Teacher, TeacherDetail, TeacherTier
from .teacher_service import generate_certificate_no

VALID_TIERS = ("L1", "L2", "L3", "L4", "L5")

# 表头 → 内部字段。表头里可能含换行或多余空格，匹配前统一去掉空白并转小写。
HEADER_ALIASES = {
    "级别": "tier",
    "阶段": "stage",
    "中文名": "name",
    "个人常用名": "common_name",
    "老师赐喜乐名": "xile_name",
    "喜乐名": "xile_name",
    "性别": "gender",
    "国家": "country",
    "省份": "province",
    "城市": "city",
    "首次顾问认证年份": "cert_year_advisor",
    "首次初阶认证年份": "cert_year_initial",
    "首次中阶认证年份": "cert_year_intermediate",
    "首次高阶认证年份": "cert_year_advanced",
    "年审有效期": "valid_until",
    "师资培训讲师": "instructor",
    "绑定微信手机号": "phone",
    "手机号": "phone",
    "idno.": "id_number",
    "身份证号": "id_number",
    "备注": "remark",
}

# 首次认证年份的取值优先级：顾问 → 初阶 → 中阶 → 高阶。
CERT_YEAR_FIELDS = (
    ("cert_year_advisor", "首次顾问认证年份"),
    ("cert_year_initial", "首次初阶认证年份"),
    ("cert_year_intermediate", "首次中阶认证年份"),
    ("cert_year_advanced", "首次高阶认证年份"),
)

CERT_YEAR_LABELS = {field: label for field, label in CERT_YEAR_FIELDS}

# 「阶段」列 → 当前等级认证年份所在的列：导师/高级取自高阶，中级取自中阶，
# 初级取自初阶，顾问取自顾问。
STAGE_CERT_YEAR_FIELDS = {
    "导师": "cert_year_advanced",
    "高级": "cert_year_advanced",
    "中级": "cert_year_intermediate",
    "初级": "cert_year_initial",
    "顾问": "cert_year_advisor",
}

# 师资培训资格认证只有两档；表里只写「授权」时按初级培训师处理。
INSTRUCTOR_CERTIFICATION_LEVELS = ("初级", "高级")
INSTRUCTOR_LEVEL_HINTS = (("高级", "高级"), ("初级", "初级"))
INSTRUCTOR_NEGATIVE_TOKENS = {"否", "未授权", "无", "撤销", "false", "no", "n", "0", "-", "--"}

PREFERRED_SHEET_NAMES = ("教师名单汇总",)
HEADER_SCAN_LIMIT = 12
EXCEL_EPOCH = date(1899, 12, 30)
# 年审有效期填「终身」时统一落到该日期（与既有数据保持一致）。
PERPETUAL_VALID_UNTIL = date(2099, 1, 1)

TEMPLATE_TITLE = "喜乐瑜伽教师名单汇总表"
TEMPLATE_HEADERS = [
    "级别",
    "阶段",
    "中文名",
    "个人常用名",
    "老师赐喜乐名",
    "性别",
    "国家",
    "省份",
    "城市",
    "首次顾问认证年份",
    "首次初阶认证年份",
    "首次中阶认证年份",
    "首次高阶认证年份",
    "年审有效期",
    "师资培训讲师",
    "绑定微信手机号",
    "ID NO.",
    "备注",
]
TEMPLATE_SAMPLE_ROW = [
    "L2",
    "初级",
    "张三（示例行，导入前请删除）",
    "",
    "善悦",
    "女",
    "中国",
    "北京",
    "北京",
    "",
    "2024",
    "",
    "",
    "2027-09-30",
    "",
    "13800000000",
    "310101199001011234",
    "",
]
TEMPLATE_COLUMN_WIDTHS = [8, 10, 22, 14, 18, 8, 12, 12, 14, 16, 16, 16, 16, 14, 14, 18, 22, 20]


def _normalize_header(value):
    """表头归一化：去掉所有空白字符（含换行、全角空格）并转小写。"""
    if value is None:
        return ""
    return "".join(ch for ch in str(value) if not ch.isspace()).lower()


def _cell_text(value):
    """把单元格值转成字符串，并把换行/制表符规整成单个空格。

    表里偶尔会把两个手机号写在同一格里用换行分隔，直接入库会带出控制字符。
    """
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, float) and value == int(value):
        return str(int(value))
    return " ".join(str(value).split())


def _row_is_empty(row):
    if row is None:
        return True
    return all(cell is None or str(cell).strip() == "" for cell in row)


def _parse_year(text):
    """从「2014」「2014年」「2014.0」这类文本里取出四位年份。"""
    digits = "".join(ch for ch in str(text or "") if ch.isdigit())
    if len(digits) < 4:
        return None
    value = int(digits[:6])
    # 有些表把年份列存成真正的日期单元格，读出来是 Excel 序列号（如 44927）。
    if 20000 <= value <= 60000:
        return (EXCEL_EPOCH.fromordinal(EXCEL_EPOCH.toordinal() + value)).year
    year = int(digits[:4])
    return year if 1900 <= year <= 2100 else None


def _parse_iso_date(text):
    value = str(text or "").strip().replace(".", "-").replace("/", "-")
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _parse_valid_until(text):
    """年审有效期：支持 Excel 日期序列、ISO 日期文本与「终身」。"""
    value = str(text or "").strip()
    if not value:
        return None, None
    if value in ("终身", "永久"):
        return PERPETUAL_VALID_UNTIL, None
    if value.replace(".", "", 1).isdigit():
        serial = float(value)
        if serial > 0:
            return EXCEL_EPOCH.fromordinal(EXCEL_EPOCH.toordinal() + int(serial)), None
        return None, "年审有效期无效"
    parsed = _parse_iso_date(value)
    if parsed is None:
        return None, "年审有效期无效（需为 Excel 日期或 YYYY-MM-DD）"
    return parsed, None


def _derive_certified_year(record):
    """按 N → O → P → Q 顺序取第一个非空的认证年份。"""
    for field, label in CERT_YEAR_FIELDS:
        year = _parse_year(record.get(field))
        if year:
            return year, label, None
    return None, None, "首次认证年份不能为空（需填写顾问/初阶/中阶/高阶中至少一列）"


def _derive_current_tier_year(record):
    """当前等级认证年份：按「阶段」列取对应列的年份。"""
    stage = (record.get("stage") or "").strip()
    field = STAGE_CERT_YEAR_FIELDS.get(stage)
    if field is None:
        return None, None, "阶段无效（需为顾问/初级/中级/高级/导师）"
    year = _parse_year(record.get(field))
    if not year:
        return None, None, f"{CERT_YEAR_LABELS[field]}不能为空（当前阶段为{stage}）"
    return year, field, None


def _parse_instructor_certification(text):
    """师资培训资格认证：解析出「初级 / 高级」，留空表示本次不调整。

    表里目前只填「授权」，按初级培训师处理；若后续直接写了初级/高级字样，
    则按字样取值。明确的否定词视为「未认证」，会清空该字段。
    """
    value = str(text or "").strip()
    if not value:
        return None
    if value.lower() in INSTRUCTOR_NEGATIVE_TOKENS:
        return ""
    for hint, level in INSTRUCTOR_LEVEL_HINTS:
        if hint in value:
            return level
    return "初级"


def _map_columns(row):
    """把一行里的表头文本映射成 {列下标: 字段名}，同一字段只取首次出现。"""
    columns = {}
    for column, cell in enumerate(row or ()):
        field = HEADER_ALIASES.get(_normalize_header(cell))
        if field and field not in columns.values():
            columns[column] = field
    return columns


def _merge_missing_columns(columns, extra):
    """把上一行分组标题里补充的表头并进来，不覆盖已识别的列。"""
    used = set(columns.values())
    for column, field in extra.items():
        if column in columns or field in used:
            continue
        columns[column] = field
        used.add(field)


def locate_header(rows):
    """在前若干行里找到表头行，返回 (行下标, {列下标: 字段名})。

    有些表格会把「ID NO.」「备注」这类表头写在上一行的分组标题里，
    因此识别到表头行后再用上一行补一次缺失的列。
    """
    for index, row in enumerate(rows[:HEADER_SCAN_LIMIT]):
        columns = _map_columns(row)
        if "name" in columns.values() and "tier" in columns.values():
            if index > 0:
                _merge_missing_columns(columns, _map_columns(rows[index - 1]))
            return index, columns
    return None, None


# WPS 等工具写出的工作簿里会出现空的 <fill/>，openpyxl 解析样式时会抛
# 「Fill() takes no arguments」。这里把空样式补成 none 填充后重试。
_EMPTY_FILL_PATTERN = re.compile(rb"<fill\s*/>")
_NONE_FILL = b'<fill><patternFill patternType="none"/></fill>'


def _open_workbook(stream):
    import openpyxl
    from io import BytesIO

    data = stream.read() if hasattr(stream, "read") else bytes(stream)
    try:
        return openpyxl.load_workbook(BytesIO(data), read_only=True, data_only=True)
    except Exception:
        repaired = _repair_workbook_archive(data)
        return openpyxl.load_workbook(repaired, read_only=True, data_only=True)


def _repair_workbook_archive(data):
    """重写压缩包，把空的 <fill/> 样式补成 patternType="none"。"""
    import zipfile
    from io import BytesIO

    source = zipfile.ZipFile(BytesIO(data))
    output = BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as target:
        for item in source.infolist():
            payload = source.read(item.filename)
            if item.filename == "xl/styles.xml":
                payload = _EMPTY_FILL_PATTERN.sub(_NONE_FILL, payload)
            target.writestr(item, payload)
    output.seek(0)
    return output


def load_worksheet_rows(stream):
    """读取工作簿，优先使用「教师名单汇总」，返回 (表名, 全部行, 表头行下标, 列映射)。"""
    workbook = _open_workbook(stream)
    try:
        candidates = []
        for worksheet in workbook.worksheets:
            rows = [row for row in worksheet.iter_rows(values_only=True)]
            header_index, columns = locate_header(rows)
            if header_index is not None:
                candidates.append((worksheet.title, rows, header_index, columns))
        if not candidates:
            raise ValueError("未找到表头行（需包含「中文名」与「级别」列）")
        for name, rows, header_index, columns in candidates:
            if name in PREFERRED_SHEET_NAMES:
                return name, rows, header_index, columns
        return candidates[0]
    finally:
        workbook.close()


def parse_rows(rows, header_index, columns):
    """把数据行解析成记录，返回 (records, errors, total_rows)。"""
    records = []
    errors = []
    total_rows = 0

    for offset, row in enumerate(rows[header_index + 1 :]):
        row_number = header_index + 2 + offset
        if _row_is_empty(row):
            continue

        record = {"rowNumber": row_number, "source": {}}
        for column, field in columns.items():
            record[field] = _cell_text(row[column]) if column < len(row) else ""
        for field in HEADER_ALIASES.values():
            record.setdefault(field, "")

        record["tier"] = (record.get("tier") or "").strip().upper()
        record["idNumber"] = (record.get("id_number") or "").replace(" ", "").upper()
        record["name"] = (record.get("name") or "").strip()

        # 表里夹着只填了统计数字或级别、没有姓名的排版行，直接跳过不算数据行。
        if not record["name"] and not record["idNumber"]:
            continue

        total_rows += 1
        row_errors = []
        if not record["name"]:
            row_errors.append((row_number, "name", "中文名不能为空"))
        if record["tier"] not in VALID_TIERS:
            row_errors.append((row_number, "tier", "级别无效（需为 L1-L5）"))

        year, year_source, year_error = _derive_certified_year(record)
        if year_error:
            row_errors.append((row_number, "certifiedAt", year_error))
        else:
            record["certifiedYear"] = year
            record["certifiedYearSource"] = year_source
            record["certifiedAt"] = date(year, 1, 1)

        tier_year, tier_year_source, tier_year_error = _derive_current_tier_year(record)
        if tier_year_error:
            row_errors.append((row_number, "currentTierCertifiedOn", tier_year_error))
        else:
            record["currentTierCertifiedYear"] = tier_year
            record["currentTierCertifiedYearSource"] = tier_year_source
            record["currentTierCertifiedOn"] = date(tier_year, 1, 1)

        record["instructorCertification"] = _parse_instructor_certification(record.get("instructor"))

        valid_until, valid_error = _parse_valid_until(record.get("valid_until"))
        if valid_error:
            row_errors.append((row_number, "validUntil", valid_error))
        else:
            record["validUntil"] = valid_until

        record["district"] = record.get("province") or record.get("country") or ""

        if row_errors:
            errors.extend(row_errors)
            continue
        records.append(record)

    return records, errors, total_rows


def parse_workbook(stream):
    """解析导入文件，返回 (sheet_title, records, errors, total_rows)。"""
    sheet_title, rows, header_index, columns = load_worksheet_rows(stream)
    records, errors, total_rows = parse_rows(rows, header_index, columns)
    return sheet_title, records, errors, total_rows


def _find_teacher(record):
    """先按身份证号匹配，再按姓名匹配；同名多条且无法确定时返回冲突。"""
    id_number = record.get("idNumber")
    if id_number:
        teacher = Teacher.query.filter(Teacher.teacher_no == id_number).first()
        if teacher:
            return teacher, None

    matches = Teacher.query.filter(Teacher.real_name == record["name"]).all()
    if not matches:
        return None, None
    visible = [teacher for teacher in matches if teacher.status != "hidden"]
    if len(visible) > 1:
        return None, "库中同名教师有多条记录，请先合并后再导入"
    return (visible or matches)[0], None


def _empty_to_none(value):
    return value if value else None


def _build_update(teacher, record, tiers):
    """计算需要更新的字段，返回 (待写入字段, 变更描述)。"""
    fields = {}
    changes = []

    def note(label, old, new):
        changes.append({"label": label, "from": old, "to": new})

    if record["name"] and record["name"] != teacher.real_name:
        fields["real_name"] = record["name"]
        note("姓名", teacher.real_name, record["name"])

    xile_name = _empty_to_none(record.get("xile_name"))
    if xile_name and xile_name != teacher.xile_name:
        fields["xile_name"] = xile_name
        note("喜乐名", teacher.xile_name, xile_name)

    tier = tiers.get(record["tier"])
    if tier and tier.id != teacher.tier_id:
        fields["tier_id"] = tier.id
        note("级别", getattr(teacher.tier, "code", None), record["tier"])

    city = _empty_to_none(record.get("city"))
    if city and city != teacher.city:
        fields["city"] = city
        note("城市", teacher.city, city)

    district = _empty_to_none(record.get("district"))
    if district and district != teacher.district:
        fields["district"] = district
        note("省份/地区", teacher.district, district)

    certified_at = record.get("certifiedAt")
    if certified_at and certified_at != teacher.first_certified_on:
        fields["first_certified_on"] = certified_at
        note("首次认证日期", teacher.first_certified_on, certified_at)

    current_tier_on = record.get("currentTierCertifiedOn")
    if current_tier_on and current_tier_on != teacher.current_tier_certified_on:
        fields["current_tier_certified_on"] = current_tier_on
        note("当前等级认证日期", teacher.current_tier_certified_on, current_tier_on)

    instructor = record.get("instructorCertification")
    if instructor is not None:
        new_value = instructor or None
        if new_value != teacher.instructor_certification:
            fields["instructor_certification"] = new_value
            note("师资培训资格认证", teacher.instructor_certification or "无", new_value or "无")

    if record.get("validUntil") and record["validUntil"] != teacher.valid_until:
        fields["valid_until"] = record["validUntil"]
        note("年审有效期至", teacher.valid_until, record["validUntil"])

    phone = _empty_to_none(record.get("phone"))
    current_phone = teacher.detail.phone if teacher.detail else None
    if phone and phone != current_phone:
        fields["phone"] = phone
        note("手机号", current_phone, phone)

    return fields, changes


def build_plan(records, tiers=None):
    """为每条记录判定新增/更新，返回计划列表。"""
    tiers = tiers or {tier.code: tier for tier in TeacherTier.query.all()}
    plan = []
    pending_creates = set()
    for record in records:
        teacher, conflict = _find_teacher(record)
        if conflict:
            plan.append({**record, "action": "error", "message": conflict})
            continue
        if teacher is None:
            if not record.get("idNumber"):
                plan.append({**record, "action": "error", "message": "缺少身份证号，无法新增该教师"})
                continue
            if record["idNumber"] in pending_creates:
                plan.append({**record, "action": "error", "message": "同一文件内身份证号重复"})
                continue
            pending_creates.add(record["idNumber"])
            plan.append({**record, "action": "create"})
            continue
        fields, changes = _build_update(teacher, record, tiers)
        plan.append(
            {
                **record,
                "action": "update" if changes else "skip",
                "teacherId": teacher.id,
                "teacherNo": teacher.teacher_no,
                "fields": fields,
                "changes": changes,
            }
        )
    return plan


def _apply_create(record, tiers, existing_nos, existing_teacher_nos, sort_order):
    tier = tiers.get(record["tier"])
    if tier is None:
        raise ValueError("级别不存在")
    if record["idNumber"] in existing_teacher_nos:
        raise ValueError("该身份证号已存在")

    certificate_no = _allocate_certificate_no(record, existing_nos)

    valid_until = record.get("validUntil")
    if valid_until is None:
        cycle = tier.review_cycle_years or 3
        certified_at = record["certifiedAt"]
        target_year = certified_at.year + cycle
        target_day = min(certified_at.day, calendar.monthrange(target_year, certified_at.month)[1])
        valid_until = date(target_year, certified_at.month, target_day)

    teacher = Teacher(
        teacher_no=record["idNumber"],
        certificate_no=certificate_no,
        real_name=record["name"],
        xile_name=_empty_to_none(record.get("xile_name")),
        tier_id=tier.id,
        city=_empty_to_none(record.get("city")),
        district=_empty_to_none(record.get("district")),
        status="active",
        first_certified_on=record["certifiedAt"],
        current_tier_certified_on=record.get("currentTierCertifiedOn"),
        instructor_certification=record.get("instructorCertification") or None,
        valid_until=valid_until,
        sort_order=sort_order,
    )
    db.session.add(teacher)
    db.session.flush()
    existing_nos.add(certificate_no)
    existing_teacher_nos.add(record["idNumber"])

    if record.get("phone"):
        db.session.add(TeacherDetail(teacher_id=teacher.id, phone=record["phone"]))
    return teacher


def _allocate_certificate_no(record, existing_nos):
    """分配证书号；撞号时按「后进入的加 2」规则追加序号。"""
    base = generate_certificate_no(record["tier"], record["certifiedYear"], record["idNumber"])
    if base not in existing_nos:
        return base
    for suffix in range(2, 100):
        candidate = f"{base}{suffix}"
        if candidate not in existing_nos:
            return candidate
    raise ValueError(f"证书号冲突（{base}），请先调整该教师信息后重试")


def apply_plan(plan, tiers=None):
    """执行计划，返回 (created, updated, skipped, failed)。"""
    tiers = tiers or {tier.code: tier for tier in TeacherTier.query.all()}
    existing_nos = {
        no for (no,) in db.session.query(Teacher.certificate_no).filter(Teacher.certificate_no.isnot(None)).all()
    }
    existing_teacher_nos = {no for (no,) in db.session.query(Teacher.teacher_no).all()}
    sort_order = (db.session.query(db.func.max(Teacher.sort_order)).scalar() or 0) + 1

    created = updated = skipped = failed = 0
    failures = []

    for item in plan:
        if item["action"] == "error":
            failed += 1
            failures.append({"rowNumber": item["rowNumber"], "field": "row", "message": item["message"]})
            continue

        if item["action"] == "create":
            try:
                _apply_create(item, tiers, existing_nos, existing_teacher_nos, sort_order)
            except ValueError as error:
                failed += 1
                failures.append({"rowNumber": item["rowNumber"], "field": "row", "message": str(error)})
                continue
            created += 1
            sort_order += 1
            continue

        teacher = db.session.get(Teacher, item["teacherId"])
        if teacher is None:
            failed += 1
            failures.append({"rowNumber": item["rowNumber"], "field": "row", "message": "教师记录已不存在"})
            continue

        fields = item.get("fields") or {}
        if not fields:
            skipped += 1
            continue

        phone = fields.pop("phone", None)
        for attribute, value in fields.items():
            setattr(teacher, attribute, value)
        if phone:
            if not teacher.detail:
                teacher.detail = TeacherDetail(teacher_id=teacher.id)
            teacher.detail.phone = phone
        updated += 1

    return created, updated, skipped, failed, failures


def build_template_workbook():
    """生成与导入格式一致的模板工作簿（BytesIO）。"""
    import openpyxl
    from openpyxl.styles import Font
    from openpyxl.utils import get_column_letter
    from io import BytesIO

    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = "教师名单汇总"
    sheet.append([TEMPLATE_TITLE])
    sheet["A1"].font = Font(bold=True, size=13)
    sheet.append(TEMPLATE_HEADERS)
    for cell in sheet[2]:
        cell.font = Font(bold=True)
    sheet.append(TEMPLATE_SAMPLE_ROW)
    for index, width in enumerate(TEMPLATE_COLUMN_WIDTHS, start=1):
        sheet.column_dimensions[get_column_letter(index)].width = width
    sheet.freeze_panes = "C3"

    guide = workbook.create_sheet("填写说明")
    for line in [
        "1. 只需填写「教师名单汇总」工作表；示例行请在导入前删除。",
        "2. 首次认证年份按 顾问 → 初阶 → 中阶 → 高阶 的顺序取第一个非空值。",
        "3. 当前等级认证年份按「阶段」列取对应列：顾问→首次顾问、初级→首次初阶、中级→首次中阶、高级/导师→首次高阶。",
        "4. 年审有效期支持 Excel 日期、YYYY-MM-DD 文本；长期有效填「终身」。",
        "5. ID NO. 为教师登录账号，已有教师请保留原值；导入时按该列匹配。",
        "6. 库中已存在的教师执行更新，不存在的教师执行新增。",
    ]:
        guide.append([line])
    guide.column_dimensions["A"].width = 72

    output = BytesIO()
    workbook.save(output)
    output.seek(0)
    return output
