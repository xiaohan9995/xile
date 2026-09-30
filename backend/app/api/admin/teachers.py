import hashlib
import json
from io import BytesIO
from datetime import date, datetime

from flask import g, request, send_file

from ...extensions import db
from ...models import AuditLog, ImportBatch, ImportError, Teacher, TeacherDetail, TeacherTier
from ...services.teacher_service import create_teacher as svc_create_teacher
from ...services.teacher_import import (
    apply_plan,
    build_plan,
    build_template_workbook,
    INSTRUCTOR_CERTIFICATION_LEVELS,
    parse_workbook,
)
from ...utils.storage import file_url as _file_url, storage_reference
from .helpers import current_admin_id, require_admin_roles, require_admin_token, _date_text
from . import admin_bp


@admin_bp.get("/teachers")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def teacher_list():
    teachers = (
        Teacher.query.filter(Teacher.status != "hidden")
        .order_by(
            db.case((Teacher.sort_order == 0, 1), else_=0),  # 未排序（0）排最末
            Teacher.sort_order.asc(),
            Teacher.real_name.asc(),
        )
        .all()
    )
    can_view_identity = getattr(g, "current_admin_role", None) in ("admin", "super_admin")
    items = [
        {
            "id": t.id,
            "teacherNo": t.certificate_no,
            "name": t.real_name,
            "xileName": t.xile_name,
            "alias": t.alias,
            "tier": t.tier.code if t.tier else None,
            "tierName": t.tier.name if t.tier else None,
            "country": t.country,
            "city": t.city,
            "district": t.district,
            "status": t.status,
            "canManageBanner": bool(t.can_manage_banner),
            "instructorCertification": t.instructor_certification,
            "validUntil": _date_text(t.valid_until),
            "certifiedAt": _date_text(t.first_certified_on),
            "currentTierCertifiedOn": _date_text(t.current_tier_certified_on),
            "residences": [item.strip() for item in (t.residences or "").split(",") if item.strip()],
            "avatarUrl": _file_url(t.avatar_url),
            "certificateUrl": _file_url(t.certificate_url),
            "pendingCertificateUrl": _file_url(t.pending_certificate_url),
            "certificateRejectReason": t.pending_certificate_reject_reason,
            **({
                "idNumber": t.teacher_no,
                "phone": t.detail.phone if t.detail else None,
                "teachingSummary": t.detail.teaching_summary if t.detail else None,
                "committeeRemark": t.detail.committee_remark if t.detail else None,
            } if can_view_identity else {}),
        }
        for t in teachers
    ]
    return {"items": items, "total": len(items)}


@admin_bp.get("/teachers/<int:teacher_id>")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def get_teacher_detail(teacher_id):
    teacher = db.session.get(Teacher, teacher_id)
    if teacher is None or teacher.status == "hidden":
        return {"error": "not found"}, 404
    return {
        "id": teacher.id,
        "teacherNo": teacher.certificate_no,
        "name": teacher.real_name,
        "xileName": teacher.xile_name,
        "alias": teacher.alias,
        "idNumber": teacher.teacher_no,
        "tier": teacher.tier.code if teacher.tier else None,
        "tierName": teacher.tier.name if teacher.tier else None,
        "country": teacher.country,
        "city": teacher.city,
        "district": teacher.district,
        "status": teacher.status,
        "canManageBanner": bool(teacher.can_manage_banner),
        "instructorCertification": teacher.instructor_certification,
        "validUntil": _date_text(teacher.valid_until),
        "certifiedAt": _date_text(teacher.first_certified_on),
        "currentTierCertifiedOn": _date_text(teacher.current_tier_certified_on),
        "residences": [item.strip() for item in (teacher.residences or "").split(",") if item.strip()],
        "publicProfileSettings": json.loads(teacher.public_profile_settings or "{}"),
        "avatarUrl": _file_url(teacher.avatar_url),
        "certificateUrl": _file_url(teacher.certificate_url),
        "pendingCertificateUrl": _file_url(teacher.pending_certificate_url),
        "certificateRejectReason": teacher.pending_certificate_reject_reason,
        "phone": teacher.detail.phone if teacher.detail else None,
        "specialties": teacher.detail.specialties if teacher.detail else None,
        "teachingSummary": teacher.detail.teaching_summary if teacher.detail else None,
        "committeeRemark": teacher.detail.committee_remark if teacher.detail else None,
    }


@admin_bp.put("/teachers/<int:teacher_id>")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def update_teacher(teacher_id):
    teacher = db.session.get(Teacher, teacher_id)
    if teacher is None or teacher.status == "hidden":
        return {"error": "not found"}, 404

    payload = request.get_json(silent=True) or {}

    if "name" in payload:
        name = str(payload["name"] or "").strip()
        if not name:
            return {"error": "姓名不能为空"}, 400
        teacher.real_name = name
    if "xileName" in payload:
        teacher.xile_name = str(payload["xileName"] or "").strip() or None
    if "alias" in payload:
        teacher.alias = str(payload["alias"] or "").strip() or None
    if "idNumber" in payload:
        id_number = str(payload["idNumber"] or "").strip().upper()
        if id_number and len(id_number) < 6:
            return {"error": "身份证号至少需要 6 位"}, 400
        duplicate = Teacher.query.filter(Teacher.teacher_no == id_number, Teacher.id != teacher.id).first() if id_number else None
        if duplicate:
            return {"error": "该身份证号已关联其他教师"}, 409
        teacher.teacher_no = id_number
    if "certificateNo" in payload:
        certificate_no = str(payload["certificateNo"] or "").strip().upper() or None
        duplicate = Teacher.query.filter(Teacher.certificate_no == certificate_no, Teacher.id != teacher.id).first() if certificate_no else None
        if duplicate:
            return {"error": "该证书编号已关联其他教师"}, 409
        teacher.certificate_no = certificate_no
    if "residences" in payload:
        residences = payload["residences"]
        teacher.residences = ",".join(str(item).strip() for item in residences if str(item).strip()) if isinstance(residences, list) else None
    if "certifiedAt" in payload:
        value = str(payload["certifiedAt"] or "").strip().replace(".", "-")
        try:
            teacher.first_certified_on = date.fromisoformat(value) if value else None
        except ValueError:
            return {"error": "首次认证日期格式无效（需 YYYY-MM-DD）"}, 400
    if "expiryDate" in payload:
        value = str(payload["expiryDate"] or "").strip().replace(".", "-")
        try:
            teacher.valid_until = date.fromisoformat(value) if value else None
        except ValueError:
            return {"error": "有效期至格式无效（需 YYYY-MM-DD）"}, 400
    if "currentTierCertifiedOn" in payload:
        value = str(payload["currentTierCertifiedOn"] or "").strip().replace(".", "-")
        try:
            teacher.current_tier_certified_on = date.fromisoformat(value) if value else None
        except ValueError:
            return {"error": "invalid currentTierCertifiedOn"}, 400
    if "publicProfileSettings" in payload:
        settings = payload["publicProfileSettings"]
        if not isinstance(settings, dict):
            return {"error": "invalid publicProfileSettings"}, 400
        teacher.public_profile_settings = json.dumps(settings, ensure_ascii=False)
    if "city" in payload:
        teacher.city = str(payload["city"] or "").strip() or None
    if "country" in payload:
        teacher.country = str(payload["country"] or "").strip() or None
    if "district" in payload:
        teacher.district = str(payload["district"] or "").strip() or None
    if "avatarUrl" in payload:
        teacher.avatar_url = storage_reference((payload["avatarUrl"] or "").strip())
    if "certificateUrl" in payload:
        teacher.certificate_url = storage_reference((payload["certificateUrl"] or "").strip())
    if "canManageBanner" in payload:
        teacher.can_manage_banner = bool(payload["canManageBanner"])
    if "instructorCertification" in payload:
        value = str(payload["instructorCertification"] or "").strip()
        if value and value not in INSTRUCTOR_CERTIFICATION_LEVELS:
            return {"error": "师资培训资格认证无效（需为初级/高级）"}, 400
        teacher.instructor_certification = value or None

    if "committeeRemark" in payload or "phone" in payload or "specialties" in payload or "teachingSummary" in payload:
        if not teacher.detail:
            detail = TeacherDetail(teacher_id=teacher.id)
            db.session.add(detail)
            db.session.flush()
        if "committeeRemark" in payload:
            teacher.detail.committee_remark = str(payload["committeeRemark"] or "").strip() or None
        if "phone" in payload:
            teacher.detail.phone = str(payload["phone"] or "").strip() or None
        if "specialties" in payload:
            teacher.detail.specialties = str(payload["specialties"] or "").strip() or None
        if "teachingSummary" in payload:
            teaching_summary = str(payload["teachingSummary"] or "").strip() or None
            if teaching_summary and len(teaching_summary) > 100:
                return {"error": "个人简介最多 100 字"}, 400
            teacher.detail.teaching_summary = teaching_summary

    db.session.commit()
    db.session.add(AuditLog(admin_id=current_admin_id() or 1, action="update_teacher", target_type="teacher", target_id=teacher.id))
    db.session.commit()
    return {"id": teacher.id, "name": teacher.real_name}


@admin_bp.post("/teachers")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def create_teacher():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return {"error": "name required"}, 400
    id_number = (payload.get("idNumber") or "").strip().upper()
    if len(id_number) < 6:
        return {"error": "请填写至少 6 位身份证号"}, 400
    existing_teacher = Teacher.query.filter_by(teacher_no=id_number).first() if id_number else None
    if existing_teacher and existing_teacher.status != "hidden":
        return {"error": "该身份证号已关联其他教师"}, 409

    valid_until_str = payload.get("expiryDate")
    valid_until = None
    if valid_until_str:
        try:
            valid_until = date.fromisoformat(valid_until_str.replace(".", "-"))
        except ValueError:
            pass

    certified_on = None
    certified_at_str = payload.get("certifiedAt")
    if certified_at_str:
        try:
            certified_on = date.fromisoformat(str(certified_at_str).replace(".", "-"))
        except ValueError:
            return {"error": "首次认证日期格式无效（需 YYYY-MM-DD）"}, 400

    if existing_teacher:
        tier_code = (payload.get("level") or "L1").strip().upper()
        tier = TeacherTier.query.filter_by(code=tier_code).first() or TeacherTier.query.filter_by(code="L1").first()
        existing_teacher.real_name = name
        existing_teacher.xile_name = (payload.get("xileName") or "").strip() or None
        existing_teacher.tier_id = tier.id
        existing_teacher.country = (payload.get("country") or "").strip() or None
        existing_teacher.city = (payload.get("city") or "").strip() or None
        existing_teacher.district = (payload.get("district") or "").strip() or None
        existing_teacher.status = "active"
        if valid_until:
            existing_teacher.valid_until = valid_until
        if certified_on:
            existing_teacher.first_certified_on = certified_on
        phone = (payload.get("phone") or "").strip()
        if phone:
            if not existing_teacher.detail:
                existing_teacher.detail = TeacherDetail(teacher_id=existing_teacher.id)
            existing_teacher.detail.phone = phone
        db.session.add(AuditLog(admin_id=current_admin_id() or 1, action="restore_teacher", target_type="teacher", target_id=existing_teacher.id))
        db.session.commit()
        return {
            "id": existing_teacher.id,
            "teacherNo": existing_teacher.certificate_no,
            "name": existing_teacher.real_name,
            "tier": tier.code,
            "validUntil": _date_text(existing_teacher.valid_until),
            "restored": True,
        }, 200

    teacher, tier = svc_create_teacher(
        name=name,
        tier_code=payload.get("level", "L1"),
        city=payload.get("city", "").strip(),
        district=payload.get("district", "").strip(),
        country=payload.get("country", "").strip(),
        xile_name=payload.get("xileName", "").strip(),
        phone=payload.get("phone", "").strip(),
        id_number=id_number,
        certificate_no=(payload.get("certificateNo") or "").strip().upper() or None,
        valid_until=valid_until,
        certified_on=certified_on,
    )

    db.session.add(AuditLog(admin_id=1, action="create_teacher", target_type="teacher", target_id=teacher.id))
    db.session.commit()

    return {
        "id": teacher.id,
        "teacherNo": teacher.certificate_no,
        "name": teacher.real_name,
        "tier": tier.code,
        "validUntil": _date_text(teacher.valid_until),
    }, 201


@admin_bp.delete("/teachers/<int:teacher_id>")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def delete_teacher(teacher_id):
    teacher = db.session.get(Teacher, teacher_id)
    if teacher is None:
        return {"error": "not found"}, 404
    teacher.status = "hidden"
    db.session.add(AuditLog(admin_id=1, action="delete_teacher", target_type="teacher", target_id=teacher.id))
    db.session.commit()
    return {"id": teacher.id, "status": "hidden"}


# ─── 证书图片审核 ─────────────────────────────────────────────────────────────
#
# 教师在小程序端上传的新证书先存 pending_certificate_url，管理员通过后才
# 覆盖 certificate_url；驳回时保留原因，教师端可见。


@admin_bp.post("/teachers/<int:teacher_id>/certificate/approve")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def approve_teacher_certificate(teacher_id):
    teacher = db.session.get(Teacher, teacher_id)
    if teacher is None or teacher.status == "hidden":
        return {"error": "not found"}, 404
    if not teacher.pending_certificate_url:
        return {"error": "该教师没有待审核的证书图片"}, 400

    teacher.certificate_url = teacher.pending_certificate_url
    teacher.pending_certificate_url = None
    teacher.pending_certificate_reject_reason = None
    db.session.add(AuditLog(admin_id=current_admin_id() or 1, action="approve_teacher_certificate",
                            target_type="teacher", target_id=teacher.id))
    db.session.commit()
    return {"id": teacher.id, "certificateUrl": _file_url(teacher.certificate_url)}


@admin_bp.post("/teachers/<int:teacher_id>/certificate/reject")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def reject_teacher_certificate(teacher_id):
    teacher = db.session.get(Teacher, teacher_id)
    if teacher is None or teacher.status == "hidden":
        return {"error": "not found"}, 404
    if not teacher.pending_certificate_url:
        return {"error": "该教师没有待审核的证书图片"}, 400

    payload = request.get_json(silent=True) or {}
    reason = str(payload.get("reason") or "").strip()
    if not reason:
        return {"error": "请填写驳回原因"}, 400

    teacher.pending_certificate_url = None
    teacher.pending_certificate_reject_reason = reason[:256]
    db.session.add(AuditLog(admin_id=current_admin_id() or 1, action="reject_teacher_certificate",
                            target_type="teacher", target_id=teacher.id))
    db.session.commit()
    return {"id": teacher.id, "reason": teacher.pending_certificate_reject_reason}


# ─── Import ──────────────────────────────────────────────────────────────────
#
# 导入格式以《喜乐瑜伽教师信息汇总表》的「教师名单汇总」工作表为准，
# 解析与新增/更新判定都在 services/teacher_import.py 里实现。


@admin_bp.get("/import/teachers/template")
@require_admin_token
def import_template():
    """Download the canonical teacher import workbook."""
    try:
        output = build_template_workbook()
        return send_file(output, as_attachment=True, download_name="教师批量导入模板.xlsx", mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    except Exception:
        return {"error": "导入模板生成失败"}, 500


def _json_value(value):
    """把 date/datetime 转成 ISO 文本，便于接口返回。"""
    if isinstance(value, datetime):
        return value.isoformat(sep=" ", timespec="seconds")
    if isinstance(value, date):
        return value.isoformat()
    return value


def _plan_counts(plan):
    return {
        "createRows": sum(1 for item in plan if item["action"] == "create"),
        "updateRows": sum(1 for item in plan if item["action"] == "update"),
        "skipRows": sum(1 for item in plan if item["action"] == "skip"),
        "failedRows": sum(1 for item in plan if item["action"] == "error"),
    }


def _plan_preview(plan, limit=50):
    rows = []
    for item in plan[:limit]:
        rows.append(
            {
                "rowNumber": item["rowNumber"],
                "name": item.get("name"),
                "tier": item.get("tier"),
                "city": item.get("city"),
                "certifiedYear": item.get("certifiedYear"),
                "currentTierCertifiedYear": item.get("currentTierCertifiedYear"),
                "instructorCertification": item.get("instructorCertification"),
                "validUntil": _json_value(item.get("validUntil")),
                "idNumber": item.get("idNumber"),
                "action": item["action"],
                "message": item.get("message"),
                "note": item.get("note"),
                "changes": [
                    {
                        "label": change["label"],
                        "from": _json_value(change["from"]),
                        "to": _json_value(change["to"]),
                    }
                    for change in item.get("changes") or []
                ],
            }
        )
    return rows


def _plan_errors(plan):
    return [
        {"rowNumber": item["rowNumber"], "field": "row", "message": item["message"]}
        for item in plan
        if item["action"] == "error"
    ]


def _record_batch(total_rows, success_rows, error_rows, errors, status="preview", file_hash=None):
    batch = ImportBatch(
        admin_id=current_admin_id() or 1,
        total_rows=total_rows,
        success_rows=success_rows,
        error_rows=error_rows,
        status=status,
        file_hash=file_hash,
    )
    db.session.add(batch)
    db.session.flush()
    for err in errors:
        db.session.add(ImportError(
            batch_id=batch.id,
            row_number=err["rowNumber"],
            field=err["field"],
            error_message=err["message"],
        ))
    return batch


@admin_bp.post("/import/teachers/preview")
@require_admin_token
@require_admin_roles("super_admin")
def import_preview():
    file = request.files.get("file")
    if not file:
        return {"error": "file required"}, 400

    payload = file.read()
    file_hash = hashlib.sha256(payload).hexdigest()
    try:
        sheet_title, records, errors, total_rows = parse_workbook(BytesIO(payload))
    except Exception:
        return {"error": "invalid excel file"}, 400

    plan = build_plan(records)
    plan_errors = _plan_errors(plan)
    all_errors = [{"rowNumber": row, "field": field, "message": message} for row, field, message in errors]
    all_errors.extend(plan_errors)
    counts = _plan_counts(plan)
    valid_rows = counts["createRows"] + counts["updateRows"] + counts["skipRows"]
    warnings = [
        {"rowNumber": item["rowNumber"], "name": item.get("name"), "message": item["note"]}
        for item in plan
        if item.get("note")
    ]

    batch = _record_batch(total_rows, valid_rows, len(all_errors), all_errors, file_hash=file_hash)
    db.session.commit()

    return {
        "batchId": batch.id,
        "sheetTitle": sheet_title,
        "totalRows": total_rows,
        "validRows": valid_rows,
        **counts,
        "errors": all_errors,
        "warnings": warnings,
        "preview": _plan_preview(plan),
    }


@admin_bp.post("/import/teachers/commit")
@require_admin_token
@require_admin_roles("super_admin")
def import_commit():
    payload = request.get_json(silent=True) or {}
    batch_id = payload.get("batchId") or request.form.get("batchId")
    if batch_id is None:
        return {"error": "batchId required"}, 400

    batch = db.session.get(ImportBatch, batch_id)
    if batch is None or batch.status != "preview":
        return {"error": "invalid batch"}, 400

    admin_id = current_admin_id()
    if admin_id is not None and batch.admin_id != admin_id:
        return {"error": "forbidden"}, 403

    file = request.files.get("file")
    if not file:
        return {"error": "file required for commit"}, 400

    file_bytes = file.read()
    if batch.file_hash and hashlib.sha256(file_bytes).hexdigest() != batch.file_hash:
        return {"error": "文件与预检时不一致，请重新预检后再提交"}, 409

    try:
        sheet_title, records, errors, total_rows = parse_workbook(BytesIO(file_bytes))
    except Exception:
        return {"error": "invalid excel file"}, 400

    plan = build_plan(records)
    created, updated, skipped, failed, failures = apply_plan(plan)

    all_errors = [{"rowNumber": row, "field": field, "message": message} for row, field, message in errors]
    all_errors.extend(_plan_errors(plan))
    all_errors.extend(failures)

    batch.status = "committed"
    batch.total_rows = total_rows
    batch.success_rows = created + updated
    batch.error_rows = len(all_errors)
    for err in all_errors:
        db.session.add(ImportError(
            batch_id=batch.id,
            row_number=err["rowNumber"],
            field=err["field"],
            error_message=err["message"],
        ))
    db.session.add(AuditLog(admin_id=current_admin_id() or 1, action="import_teachers", target_type="batch", target_id=batch.id))
    db.session.commit()

    return {
        "batchId": batch.id,
        "sheetTitle": sheet_title,
        "totalRows": total_rows,
        "createdCount": created,
        "updatedCount": updated,
        "skippedCount": skipped,
        "failedCount": failed,
        "errors": all_errors,
    }
