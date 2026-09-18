from flask import request
from sqlalchemy import or_

from ...extensions import db
from ...models import TeachingRecord
from ...utils.storage import file_url as _file_url
from ..mp.helpers import _parse_record_date
from .helpers import _date_text, _datetime_text, require_admin_roles, require_admin_token
from . import admin_bp


def _record_payload(record):
    teacher = record.teacher
    return {
        "id": record.id,
        "teacherId": record.teacher_id,
        "teacherName": teacher.real_name if teacher else None,
        "xileName": teacher.xile_name if teacher else None,
        "certificateNo": teacher.certificate_no if teacher else None,
        "taughtOn": _date_text(record.taught_on),
        "platform": record.platform,
        "title": record.title,
        "durationHours": float(record.duration_hours) if record.duration_hours is not None else None,
        "participantCount": record.participant_count,
        "description": record.description,
        "evidenceUrl": _file_url(record.evidence_key),
        "status": record.status,
        "createdAt": _datetime_text(record.created_at),
    }


@admin_bp.get("/teaching-records")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def teaching_record_list():
    query = TeachingRecord.query
    teacher_name = (request.args.get("teacherName") or "").strip()
    platform = (request.args.get("platform") or "").strip()
    status = (request.args.get("status") or "").strip()
    if teacher_name:
        query = query.join(TeachingRecord.teacher).filter(
            or_(TeachingRecord.teacher.has(real_name=teacher_name), TeachingRecord.teacher.has(xile_name=teacher_name))
        )
    if platform:
        query = query.filter(TeachingRecord.platform.like(f"%{platform}%"))
    if status:
        query = query.filter(TeachingRecord.status == status)
    records = query.order_by(TeachingRecord.taught_on.desc(), TeachingRecord.id.desc()).all()
    return {"items": [_record_payload(record) for record in records], "total": len(records)}


@admin_bp.put("/teaching-records/<int:record_id>")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def teaching_record_update(record_id):
    record = db.session.get(TeachingRecord, record_id)
    if not record:
        return {"error": "teaching record not found"}, 404
    payload = request.get_json(silent=True) or {}
    if payload.get("taughtOn"):
        try:
            parsed = _parse_record_date(payload["taughtOn"])
        except ValueError:
            return {"error": "valid taughtOn required"}, 400
        if parsed is None:
            return {"error": "valid taughtOn required"}, 400
        record.taught_on = parsed
    for key, attr in (
        ("platform", "platform"),
        ("title", "title"),
        ("durationHours", "duration_hours"),
        ("participantCount", "participant_count"),
        ("description", "description"),
        ("evidenceKey", "evidence_key"),
    ):
        if key in payload:
            value = payload[key]
            if key in ("platform", "title", "description", "evidenceKey"):
                value = (value or "").strip() or None
            setattr(record, attr, value)
    status = payload.get("status")
    if status is not None:
        if status not in ("draft", "submitted"):
            return {"error": "valid status required"}, 400
        if status == "submitted" and (not record.platform or not record.title):
            return {"error": "platform and title required"}, 400
        record.status = status
    db.session.commit()
    return _record_payload(record)


@admin_bp.delete("/teaching-records/<int:record_id>")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def teaching_record_delete(record_id):
    record = db.session.get(TeachingRecord, record_id)
    if not record:
        return {"error": "teaching record not found"}, 404
    db.session.delete(record)
    db.session.commit()
    return {"deleted": True}
