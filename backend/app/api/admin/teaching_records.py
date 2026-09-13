from flask import request
from sqlalchemy import or_

from ...extensions import db
from ...models import TeachingRecord
from ...utils.storage import file_url as _file_url
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
