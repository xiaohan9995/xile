from datetime import date

from flask import request
from flask_jwt_extended import get_jwt_identity, jwt_required

from ...extensions import db
from ...models import TeachingRecord, User
from . import mp_bp


def _current_teacher():
    user = db.session.get(User, int(get_jwt_identity()))
    return user.teacher_id if user and user.role == "teacher" else None


def _payload(record):
    return {
        "id": record.id, "taughtOn": record.taught_on.isoformat(), "platform": record.platform,
        "title": record.title, "durationHours": float(record.duration_hours) if record.duration_hours is not None else None,
        "participantCount": record.participant_count, "description": record.description,
        "evidenceKey": record.evidence_key, "status": record.status,
    }


@mp_bp.get("/teaching-records")
@jwt_required()
def list_teaching_records():
    teacher_id = _current_teacher()
    if not teacher_id:
        return {"error": "teacher access required"}, 403
    month = (request.args.get("month") or "").strip()
    query = TeachingRecord.query.filter_by(teacher_id=teacher_id)
    if month:
        query = query.filter(db.func.strftime("%Y-%m", TeachingRecord.taught_on) == month)
    records = query.order_by(TeachingRecord.taught_on.desc()).all()
    return {"items": [_payload(record) for record in records], "total": len(records)}


@mp_bp.post("/teaching-records")
@jwt_required()
def create_teaching_record():
    teacher_id = _current_teacher()
    payload = request.get_json(silent=True) or {}
    if not teacher_id:
        return {"error": "teacher access required"}, 403
    status = payload.get("status", "submitted")
    if status not in ("draft", "submitted"):
        return {"error": "valid status required"}, 400
    try:
        taught_on = date.fromisoformat(payload.get("taughtOn", ""))
    except ValueError:
        return {"error": "valid taughtOn required"}, 400
    platform, title = (payload.get("platform") or "").strip(), (payload.get("title") or "").strip()
    if status == "submitted" and (not platform or not title):
        return {"error": "platform and title required"}, 400
    record = TeachingRecord(teacher_id=teacher_id, taught_on=taught_on, platform=platform, title=title,
                            duration_hours=payload.get("durationHours"), participant_count=payload.get("participantCount"),
                            description=(payload.get("description") or "").strip() or None,
                            evidence_key=(payload.get("evidenceKey") or "").strip() or None, status=status)
    db.session.add(record)
    db.session.commit()
    return _payload(record), 201


@mp_bp.put("/teaching-records/<int:record_id>")
@jwt_required()
def update_teaching_record(record_id):
    teacher_id = _current_teacher()
    record = db.session.get(TeachingRecord, record_id)
    payload = request.get_json(silent=True) or {}
    if not teacher_id or not record or record.teacher_id != teacher_id:
        return {"error": "not found"}, 404
    if record.status == "submitted" and payload.get("status") != "submitted":
        return {"error": "submitted records cannot return to draft"}, 409
    try:
        if payload.get("taughtOn"):
            record.taught_on = date.fromisoformat(payload["taughtOn"])
    except ValueError:
        return {"error": "valid taughtOn required"}, 400
    for key, attr in (("platform", "platform"), ("title", "title"), ("durationHours", "duration_hours"), ("participantCount", "participant_count"), ("description", "description"), ("evidenceKey", "evidence_key")):
        if key in payload:
            setattr(record, attr, (payload[key] or "").strip() if key in ("platform", "title", "description", "evidenceKey") else payload[key])
    if payload.get("status") in ("draft", "submitted"):
        if payload["status"] == "submitted" and (not record.platform or not record.title):
            return {"error": "platform and title required"}, 400
        record.status = payload["status"]
    db.session.commit()
    return _payload(record)
