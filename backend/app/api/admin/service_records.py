from flask import request
from sqlalchemy import or_

from ...models import ServiceRecord
from ...utils.storage import file_url as _file_url
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
        query = query.join(ServiceRecord.teacher).filter(
            or_(ServiceRecord.teacher.has(real_name=teacher_name), ServiceRecord.teacher.has(xile_name=teacher_name))
        )
    if service_type:
        query = query.filter(ServiceRecord.service_type.like(f"%{service_type}%"))
    if status:
        query = query.filter(ServiceRecord.status == status)
    records = query.order_by(ServiceRecord.served_on.desc(), ServiceRecord.id.desc()).all()
    return {"items": [_record_payload(record) for record in records], "total": len(records)}
