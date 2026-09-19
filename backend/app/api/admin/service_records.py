from flask import request
from sqlalchemy import or_

from ...extensions import db
from ...models import ServiceRecord, Teacher
from ...utils.storage import file_url as _file_url
from ..mp.helpers import _parse_record_date
from .helpers import _date_text, _datetime_text, require_admin_roles, require_admin_token
from . import admin_bp


def _record_payload(record):
    teacher = record.teacher
    return {
        "id": record.id, "teacherId": record.teacher_id,
        "teacherName": teacher.real_name if teacher else None,
        "xileName": teacher.xile_name if teacher else None,
        "certificateNo": teacher.certificate_no if teacher else None,
        "servedOn": _date_text(record.served_on), "serviceType": record.service_type,
        "title": record.title, "location": record.location, "description": record.description,
        "evidenceUrl": _file_url(record.evidence_key), "status": record.status,
        "createdAt": _datetime_text(record.created_at),
    }


@admin_bp.get("/service-records")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def service_record_list():
    query = ServiceRecord.query
    teacher_name = (request.args.get("teacherName") or "").strip()
    service_type = (request.args.get("serviceType") or "").strip()
    status = (request.args.get("status") or "").strip()
    if teacher_name:
        like = f"%{teacher_name}%"
        query = query.join(ServiceRecord.teacher).filter(
            or_(Teacher.real_name.like(like), Teacher.xile_name.like(like))
        )
    if service_type:
        query = query.filter(ServiceRecord.service_type.like(f"%{service_type}%"))
    if status:
        query = query.filter(ServiceRecord.status == status)
    records = query.order_by(ServiceRecord.served_on.desc(), ServiceRecord.id.desc()).all()
    return {"items": [_record_payload(record) for record in records], "total": len(records)}


@admin_bp.put("/service-records/<int:record_id>")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def service_record_update(record_id):
    record = db.session.get(ServiceRecord, record_id)
    if not record:
        return {"error": "service record not found"}, 404
    payload = request.get_json(silent=True) or {}
    if payload.get("servedOn"):
        try:
            record.served_on = _parse_record_date(payload["servedOn"])
        except ValueError:
            return {"error": "valid servedOn required"}, 400
    for key, attr in (
        ("serviceType", "service_type"),
        ("title", "title"),
        ("location", "location"),
        ("description", "description"),
        ("evidenceKey", "evidence_key"),
    ):
        if key in payload:
            setattr(record, attr, (payload[key] or "").strip() or None)
    status = payload.get("status")
    if status is not None:
        if status not in ("draft", "submitted"):
            return {"error": "valid status required"}, 400
        record.status = status
    db.session.commit()
    return _record_payload(record)


@admin_bp.delete("/service-records/<int:record_id>")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def service_record_delete(record_id):
    record = db.session.get(ServiceRecord, record_id)
    if not record:
        return {"error": "service record not found"}, 404
    db.session.delete(record)
    db.session.commit()
    return {"deleted": True}
