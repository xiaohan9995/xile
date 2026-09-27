"""教师批量导入：解析规则与「已存在更新、不存在新增」。"""

import io
from datetime import date

import pytest
from openpyxl import Workbook

from backend.app import create_app
from backend.app.extensions import db
from backend.app.models import Teacher, TeacherDetail, TeacherTier
from backend.app.seed import ensure_initial_admin, ensure_system_defaults
from backend.app.services.teacher_import import parse_workbook

# 与年审汇总表一致：表头允许带换行。
HEADERS = [
    "级别",
    "阶段",
    "中文名",
    "个人常用名",
    "老师赐喜乐名",
    "性别",
    "国家",
    "省份",
    "城市",
    "首次顾问\n认证年份",
    "首次初阶\n认证年份",
    "首次中阶\n认证年份",
    "首次高阶\n认证年份",
    "年审有效期",
    "师资培训讲师",
    "绑定微信手机号",
    "ID  NO.",
    "备注",
]


def build_workbook(rows, sheet_title="教师名单汇总"):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = sheet_title
    sheet.append(["喜乐瑜伽教师名单汇总表"])
    sheet.append(HEADERS)
    for row in rows:
        sheet.append(row)
    output = io.BytesIO()
    workbook.save(output)
    output.seek(0)
    return output


@pytest.fixture()
def application():
    app = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "ADMIN_DEV_TOKEN": "test-admin-token",
        }
    )
    with app.app_context():
        db.create_all()
        ensure_system_defaults()
        ensure_initial_admin("admin", "test-admin-password")
        yield app
        db.session.remove()


@pytest.fixture()
def client(application):
    return application.test_client()


ADMIN_HEADERS = {"Authorization": "Bearer test-admin-token"}


def test_parse_workbook_takes_first_non_empty_cert_year_and_dates(application):
    stream = build_workbook(
        [
            [
                "L1", "顾问", "顾问优先", "", "喜乐甲", "女", "中国", "北京", "北京",
                "2023", "2014", "", "", "47026", "授权", "13800000000", "11010119900101123X", "",
            ],
            [
                "L2", "初级", "只填初阶", "", "喜乐乙", "女", "中国", "上海", "上海",
                "", "2016", "", "", "终身", "", "13800000001", "310101199001011234", "",
            ],
        ]
    )

    sheet_title, records, errors, total_rows = parse_workbook(stream)

    assert sheet_title == "教师名单汇总"
    assert errors == []
    assert total_rows == 2

    advisor_first, initial_only = records
    assert advisor_first["certifiedYear"] == 2023
    assert advisor_first["certifiedAt"] == date(2023, 1, 1)
    assert advisor_first["currentTierCertifiedOn"] == date(2023, 1, 1)
    assert advisor_first["validUntil"] == date(2028, 9, 30)
    assert advisor_first["district"] == "北京"
    assert advisor_first["instructorCertification"] == "初级"

    assert initial_only["certifiedYear"] == 2016
    assert initial_only["currentTierCertifiedOn"] == date(2016, 1, 1)
    assert initial_only["validUntil"] == date(2099, 1, 1)
    assert initial_only["instructorCertification"] is None


def test_import_appends_suffix_when_certificate_number_collides(client, application):
    tier = TeacherTier.query.filter_by(code="L2").first()
    # 先放一位同年份、同级别、证件后四位相同的教师，占住基础证书号。
    db.session.add(
        Teacher(
            teacher_no="310101199001011234",
            certificate_no="2050L2XL20201234",
            real_name="先到教师",
            tier_id=tier.id,
            status="active",
            first_certified_on=date(2020, 1, 1),
            valid_until=date(2028, 9, 30),
            sort_order=1,
        )
    )
    db.session.commit()

    stream = build_workbook(
        [
            [
                "L2", "初级", "后到教师", "", "", "女", "中国", "上海", "上海",
                "", "2020", "", "", "47026", "", "", "110101199001011234", "",
            ],
        ]
    )
    preview = client.post(
        "/api/admin/import/teachers/preview",
        data={"file": (stream, "teachers.xlsx")},
        headers=ADMIN_HEADERS,
        content_type="multipart/form-data",
    )
    batch_id = preview.get_json()["batchId"]

    commit = client.post(
        "/api/admin/import/teachers/commit",
        data={"file": (build_workbook([
            [
                "L2", "初级", "后到教师", "", "", "女", "中国", "上海", "上海",
                "", "2020", "", "", "47026", "", "", "110101199001011234", "",
            ],
        ]), "teachers.xlsx"), "batchId": str(batch_id)},
        headers=ADMIN_HEADERS,
        content_type="multipart/form-data",
    )

    assert commit.get_json()["createdCount"] == 1
    created = Teacher.query.filter_by(teacher_no="110101199001011234").first()
    assert created.certificate_no == "2050L2XL202012342"


@pytest.mark.parametrize(
    ("stage", "expected_year"),
    [
        ("顾问", 2020),
        ("初级", 2021),
        ("中级", 2022),
        ("高级", 2023),
        ("导师", 2023),
    ],
)
def test_current_tier_year_follows_stage_column(application, stage, expected_year):
    stream = build_workbook(
        [
            [
                "L2", stage, "阶段取值", "", "", "女", "中国", "上海", "上海",
                "2020", "2021", "2022", "2023", "47026", "", "", "310101199001011234", "",
            ],
        ]
    )

    _, records, errors, _ = parse_workbook(stream)

    assert errors == []
    assert records[0]["currentTierCertifiedOn"] == date(expected_year, 1, 1)


def test_parse_workbook_reports_rows_without_any_cert_year(application):
    stream = build_workbook(
        [
            [
                "L2", "初级", "缺年份", "", "", "女", "中国", "上海", "上海",
                "", "", "", "", "47026", "", "", "310101199001011234", "",
            ],
        ]
    )

    _, records, errors, total_rows = parse_workbook(stream)

    assert records == []
    assert total_rows == 1
    assert errors[0][1] == "certifiedAt"


def test_import_preview_then_commit_updates_existing_and_creates_new(client, application):
    tier = TeacherTier.query.filter_by(code="L2").first()
    existing = Teacher(
        teacher_no="310101199001011234",
        certificate_no="2050L2XL20161234",
        real_name="已有教师",
        xile_name="旧名",
        tier_id=tier.id,
        city="上海",
        district="上海",
        status="active",
        first_certified_on=date(2016, 1, 1),
        valid_until=date(2026, 1, 1),
        sort_order=1,
    )
    db.session.add(existing)
    db.session.flush()
    db.session.add(TeacherDetail(teacher_id=existing.id, phone="13000000000"))
    db.session.commit()

    rows = [
        [
            "L3", "中级", "已有教师", "", "新喜乐名", "女", "中国", "上海", "上海",
            "", "2014", "2016", "", "47026", "授权", "13900000000", "310101199001011234", "",
        ],
        [
            "L1", "顾问", "新增教师", "", "喜乐新", "女", "中国", "北京", "北京",
            "2023", "", "", "", "终身", "", "13800000000", "11010119900101123X", "",
        ],
    ]
    stream = build_workbook(rows)

    preview = client.post(
        "/api/admin/import/teachers/preview",
        data={"file": (stream, "teachers.xlsx")},
        headers=ADMIN_HEADERS,
        content_type="multipart/form-data",
    )
    assert preview.status_code == 200
    payload = preview.get_json()
    assert payload["totalRows"] == 2
    assert payload["updateRows"] == 1
    assert payload["createRows"] == 1
    assert payload["errors"] == []

    commit = client.post(
        "/api/admin/import/teachers/commit",
        data={"file": (build_workbook(rows), "teachers.xlsx"), "batchId": str(payload["batchId"])},
        headers=ADMIN_HEADERS,
        content_type="multipart/form-data",
    )
    assert commit.status_code == 200
    result = commit.get_json()
    assert result["createdCount"] == 1
    assert result["updatedCount"] == 1
    assert result["failedCount"] == 0

    db.session.expire_all()
    updated = Teacher.query.filter_by(teacher_no="310101199001011234").first()
    assert updated.tier.code == "L3"
    assert updated.xile_name == "新喜乐名"
    assert updated.valid_until == date(2028, 9, 30)
    assert updated.first_certified_on == date(2014, 1, 1)
    assert updated.current_tier_certified_on == date(2016, 1, 1)
    assert updated.instructor_certification == "初级"
    assert updated.detail.phone == "13900000000"

    created = Teacher.query.filter_by(teacher_no="11010119900101123X").first()
    assert created is not None
    assert created.status == "active"
    assert created.first_certified_on == date(2023, 1, 1)
    assert created.current_tier_certified_on == date(2023, 1, 1)
    assert created.instructor_certification is None
    assert created.valid_until == date(2099, 1, 1)
    assert created.certificate_no == "2050L1XL2023123X"


def test_import_preview_flags_new_teacher_without_id_number(client, application):
    stream = build_workbook(
        [
            [
                "L2", "初级", "无证件号", "", "", "女", "中国", "上海", "上海",
                "", "2020", "", "", "47026", "", "", "", "",
            ],
        ]
    )

    preview = client.post(
        "/api/admin/import/teachers/preview",
        data={"file": (stream, "teachers.xlsx")},
        headers=ADMIN_HEADERS,
        content_type="multipart/form-data",
    )

    payload = preview.get_json()
    assert payload["createRows"] == 0
    assert payload["failedRows"] == 1
    assert "身份证号" in payload["errors"][0]["message"]
