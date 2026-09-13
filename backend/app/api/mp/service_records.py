from datetime import date

from flask import request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ...extensions import db
from ...models import ServiceRecord, User
from . import mp_bp


def _current_teacher_id():
    user = db.session.get(User, int(get_jwt_identity()))
    return user.teacher_id if user and user.role == "teacher" else None


def _payload(record):
    return {
        "id": record.id,
        "servedOn": record.served_on.isoformat() if record.served_on else "",
        "serviceType": record.service_type,
        "title": record.title,
        "location": record.location,
        "description": record.description,
        "evidenceKey": record.evidence_key,
        "status": record.status,
    }


def _validate(payload, status):
    raw_served_on = (payload.get("servedOn") or "").strip()
    try:
        served_on = date.fromisoformat(raw_served_on) if raw_served_on else None
    except ValueError:
        return None, "请选择有效的服务日期"
    service_type = (payload.get("serviceType") or "").strip()
    title = (payload.get("title") or "").strip()
    if status == "submitted":
        if not served_on:
            return None, "请选择有效的服务日期"
        if not service_type or not title:
            return None, "请填写服务类型和活动名称"
    return (served_on, service_type, title), None


@mp_bp.get("/service-records")
@jwt_required()
def list_service_records():
    teacher_id = _current_teacher_id()
    if not teacher_id:
        return {"error": "仅已关联教师可查看服务记录"}, 403
    records = ServiceRecord.query.filter_by(teacher_id=teacher_id).order_by(ServiceRecord.served_on.desc(), ServiceRecord.id.desc()).all()
    return {"items": [_payload(record) for record in records], "total": len(records)}


@mp_bp.post("/service-records")
@jwt_required()
def create_service_record():
    teacher_id = _current_teacher_id()
    if not teacher_id:
        return {"error": "仅已关联教师可提交服务记录"}, 403
    payload = request.get_json(silent=True) or {}
    status = payload.get("status", "submitted")
    if status not in ("draft", "submitted"):
        return {"error": "记录状态无效"}, 400
    values, error = _validate(payload, status)
    if error:
        return {"error": error}, 400
    served_on, service_type, title = values
    record = ServiceRecord(
        teacher_id=teacher_id,
        served_on=served_on,
        service_type=service_type,
        title=title,
        location=(payload.get("location") or "").strip() or None,
        description=(payload.get("description") or "").strip() or None,
        evidence_key=(payload.get("evidenceKey") or "").strip() or None,
        status=status,
    )
    db.session.add(record)
    db.session.commit()
    return _payload(record), 201


@mp_bp.put("/service-records/<int:record_id>")
@jwt_required()
def update_service_record(record_id):
    teacher_id = _current_teacher_id()
    record = db.session.get(ServiceRecord, record_id)
    if not teacher_id or not record or record.teacher_id != teacher_id:
        return {"error": "服务记录不存在"}, 404
    payload = request.get_json(silent=True) or {}
    status = payload.get("status", record.status)
    if status not in ("draft", "submitted"):
        return {"error": "记录状态无效"}, 400
    if record.status == "submitted" and status == "draft":
        return {"error": "已提交记录不能退回草稿"}, 409
    merged = {
        "servedOn": payload.get("servedOn", record.served_on.isoformat() if record.served_on else ""),
        "serviceType": payload.get("serviceType", record.service_type),
        "title": payload.get("title", record.title),
    }
    values, error = _validate(merged, status)
    if error:
        return {"error": error}, 400
    record.served_on, record.service_type, record.title = values
    for key, attr in (("location", "location"), ("description", "description"), ("evidenceKey", "evidence_key")):
        if key in payload:
            setattr(record, attr, (payload[key] or "").strip() or None)
    record.status = status
    db.session.commit()
    return _payload(record)
