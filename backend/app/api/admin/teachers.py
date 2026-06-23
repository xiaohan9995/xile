from datetime import date

from flask import request

from ...extensions import db
from ...models import AuditLog, ImportBatch, ImportError, Teacher, TeacherDetail, TeacherTier
from ...services.teacher_service import create_teacher as svc_create_teacher, generate_teacher_no
from .helpers import require_admin_token, _date_text
from . import admin_bp


@admin_bp.get("/teachers")
@require_admin_token
def teacher_list():
    teachers = Teacher.query.filter(Teacher.status != "hidden").order_by(Teacher.teacher_no.asc()).all()
    items = [
        {
            "id": t.id,
            "teacherNo": t.teacher_no,
            "name": t.real_name,
            "xileName": t.xile_name,
            "tier": t.tier.code if t.tier else None,
            "tierName": t.tier.name if t.tier else None,
            "city": t.city,
            "district": t.district,
            "status": t.status,
            "validUntil": _date_text(t.valid_until),
            "certifiedAt": _date_text(t.first_certified_on),
            "avatarUrl": t.avatar_url,
            "phone": t.detail.phone if t.detail else None,
            "committeeRemark": t.detail.committee_remark if t.detail else None,
        }
        for t in teachers
    ]
    return {"items": items, "total": len(items)}


@admin_bp.get("/teachers/<int:teacher_id>")
@require_admin_token
def get_teacher_detail(teacher_id):
    teacher = db.session.get(Teacher, teacher_id)
    if teacher is None or teacher.status == "hidden":
        return {"error": "not found"}, 404
    return {
        "id": teacher.id,
        "teacherNo": teacher.teacher_no,
        "name": teacher.real_name,
        "xileName": teacher.xile_name,
        "tier": teacher.tier.code if teacher.tier else None,
        "tierName": teacher.tier.name if teacher.tier else None,
        "city": teacher.city,
        "district": teacher.district,
        "status": teacher.status,
        "validUntil": _date_text(teacher.valid_until),
        "certifiedAt": _date_text(teacher.first_certified_on),
        "avatarUrl": teacher.avatar_url,
        "phone": teacher.detail.phone if teacher.detail else None,
        "specialties": teacher.detail.specialties if teacher.detail else None,
        "teachingSummary": teacher.detail.teaching_summary if teacher.detail else None,
        "committeeRemark": teacher.detail.committee_remark if teacher.detail else None,
    }


@admin_bp.put("/teachers/<int:teacher_id>")
@require_admin_token
def update_teacher(teacher_id):
    teacher = db.session.get(Teacher, teacher_id)
    if teacher is None or teacher.status == "hidden":
        return {"error": "not found"}, 404

    payload = request.get_json(silent=True) or {}

    if "name" in payload:
        teacher.real_name = payload["name"].strip()
    if "xileName" in payload:
        teacher.xile_name = payload["xileName"].strip() or None
    if "city" in payload:
        teacher.city = payload["city"].strip() or None
    if "district" in payload:
        teacher.district = payload["district"].strip() or None

    if "committeeRemark" in payload or "phone" in payload or "specialties" in payload:
        if not teacher.detail:
            detail = TeacherDetail(teacher_id=teacher.id)
            db.session.add(detail)
            db.session.flush()
        if "committeeRemark" in payload:
            teacher.detail.committee_remark = payload["committeeRemark"]
        if "phone" in payload:
            teacher.detail.phone = payload["phone"].strip() or None
        if "specialties" in payload:
            teacher.detail.specialties = payload["specialties"].strip() or None

    db.session.commit()
    db.session.add(AuditLog(admin_id=1, action="update_teacher", target_type="teacher", target_id=teacher.id))
    db.session.commit()
    return {"id": teacher.id, "name": teacher.real_name}


@admin_bp.post("/teachers")
@require_admin_token
def create_teacher():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return {"error": "name required"}, 400

    valid_until_str = payload.get("expiryDate")
    valid_until = None
    if valid_until_str:
        try:
            valid_until = date.fromisoformat(valid_until_str.replace(".", "-"))
        except ValueError:
            pass

    teacher, tier = svc_create_teacher(
        name=name,
        tier_code=payload.get("level", "L1"),
        city=payload.get("city", "").strip(),
        district=payload.get("district", "").strip(),
        xile_name=payload.get("xileName", "").strip(),
        phone=payload.get("phone", "").strip(),
        valid_until=valid_until,
    )

    db.session.add(AuditLog(admin_id=1, action="create_teacher", target_type="teacher", target_id=teacher.id))
    db.session.commit()

    return {
        "id": teacher.id,
        "teacherNo": teacher.teacher_no,
        "name": teacher.real_name,
        "tier": tier.code,
        "validUntil": _date_text(teacher.valid_until),
    }, 201


@admin_bp.delete("/teachers/<int:teacher_id>")
@require_admin_token
def delete_teacher(teacher_id):
    teacher = db.session.get(Teacher, teacher_id)
    if teacher is None:
        return {"error": "not found"}, 404
    teacher.status = "hidden"
    db.session.add(AuditLog(admin_id=1, action="delete_teacher", target_type="teacher", target_id=teacher.id))
    db.session.commit()
    return {"id": teacher.id, "status": "hidden"}


# ─── Import ──────────────────────────────────────────────────────────────────


@admin_bp.post("/import/teachers/preview")
@require_admin_token
def import_preview():
    file = request.files.get("file")
    if not file:
        return {"error": "file required"}, 400

    try:
        import openpyxl
        wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
        ws = wb.active
    except Exception:
        return {"error": "invalid excel file"}, 400

    rows = list(ws.iter_rows(min_row=2, values_only=True))
    total_rows = len(rows)
    errors = []
    valid_rows = 0

    for idx, row in enumerate(rows, start=2):
        row_errors = []
        name = str(row[0]).strip() if row[0] else ""
        tier_code = str(row[1]).strip().upper() if row[1] else ""
        cert_date = str(row[2]).strip() if row[2] else ""

        if not name:
            row_errors.append({"rowNumber": idx, "field": "name", "message": "姓名不能为空"})
        if not tier_code or tier_code not in {"L0", "L1", "L2", "L3", "L4", "L5"}:
            row_errors.append({"rowNumber": idx, "field": "level", "message": "等级代码无效（需为L0-L5）"})
        if cert_date:
            try:
                date.fromisoformat(cert_date.replace(".", "-").replace("/", "-"))
            except ValueError:
                row_errors.append({"rowNumber": idx, "field": "certDate", "message": "日期格式无效（需YYYY-MM-DD）"})
        else:
            row_errors.append({"rowNumber": idx, "field": "certDate", "message": "认证日期不能为空"})

        if row_errors:
            errors.extend(row_errors)
        else:
            valid_rows += 1

    batch = ImportBatch(admin_id=1, total_rows=total_rows, success_rows=valid_rows, error_rows=len(errors), status="preview")
    db.session.add(batch)
    db.session.flush()

    for err in errors:
        db.session.add(ImportError(batch_id=batch.id, row_number=err["rowNumber"], field=err["field"], error_message=err["message"]))

    db.session.commit()
    wb.close()

    return {"batchId": batch.id, "totalRows": total_rows, "validRows": valid_rows, "errors": errors}


@admin_bp.post("/import/teachers/commit")
@require_admin_token
def import_commit():
    payload = request.get_json(silent=True) or {}
    batch_id = payload.get("batchId") or request.form.get("batchId")
    if not batch_id:
        return {"error": "batchId required"}, 400

    batch = db.session.get(ImportBatch, batch_id)
    if batch is None or batch.status != "preview":
        return {"error": "invalid batch"}, 400

    file = request.files.get("file")
    if not file:
        return {"error": "file required for commit"}, 400

    try:
        import openpyxl
        wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
        ws = wb.active
    except Exception:
        return {"error": "invalid excel file"}, 400

    rows = list(ws.iter_rows(min_row=2, values_only=True))
    year = date.today().year
    created = 0

    for row in rows:
        name = str(row[0]).strip() if row[0] else ""
        tier_code = str(row[1]).strip().upper() if row[1] else ""
        cert_date_str = str(row[2]).strip() if row[2] else ""
        phone = str(row[3]).strip() if len(row) > 3 and row[3] else ""
        city = str(row[4]).strip() if len(row) > 4 and row[4] else ""

        if not name or tier_code not in {"L0", "L1", "L2", "L3", "L4", "L5"}:
            continue
        try:
            cert_date = date.fromisoformat(cert_date_str.replace(".", "-").replace("/", "-"))
        except ValueError:
            continue

        tier = TeacherTier.query.filter_by(code=tier_code).first()
        if not tier:
            continue

        teacher_no = generate_teacher_no()

        cycle = tier.review_cycle_years or 3
        valid_until = date(cert_date.year + cycle, cert_date.month, cert_date.day)

        teacher = Teacher(
            teacher_no=teacher_no,
            real_name=name,
            tier_id=tier.id,
            city=city or None,
            status="active",
            first_certified_on=cert_date,
            valid_until=valid_until,
        )
        db.session.add(teacher)
        db.session.flush()

        if phone:
            db.session.add(TeacherDetail(teacher_id=teacher.id, phone=phone))

        created += 1

    batch.status = "committed"
    batch.success_rows = created
    db.session.commit()
    wb.close()

    return {"batchId": batch.id, "createdCount": created}
