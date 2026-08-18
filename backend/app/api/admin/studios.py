from flask import request

from ...extensions import db
from ...models import AuditLog, Studio
from .helpers import require_admin_roles, require_admin_token
from . import admin_bp


@admin_bp.get("/studios")
@require_admin_token
def studio_list():
    studios = Studio.query.order_by(Studio.display_order.desc(), Studio.id.asc()).all()
    items = [
        {
            "id": s.id,
            "name": s.name,
            "city": s.city,
            "district": s.district,
            "address": s.address,
            "ownerTeacherName": s.owner.real_name if s.owner else None,
            "coverUrl": s.cover_url,
            "tags": [t.strip() for t in (s.tags or "").split(",") if t.strip()],
            "intro": s.intro,
            "openingHours": s.opening_hours,
            "contactText": s.contact_text,
            "status": s.status,
            "displayOrder": s.display_order,
        }
        for s in studios
    ]
    return {"items": items, "total": len(items)}


@admin_bp.post("/studios")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def create_studio():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return {"error": "name required"}, 400

    studio = Studio(
        name=name,
        city=payload.get("city", "").strip() or None,
        district=payload.get("district", "").strip() or None,
        address=payload.get("address", "").strip() or None,
        contact_text=payload.get("contact", "").strip() or None,
        tags=payload.get("tags", "").strip() or None,
        intro=payload.get("intro", "").strip() or None,
        cover_url=payload.get("coverUrl", "").strip() or None,
        status="open",
    )
    db.session.add(studio)
    db.session.commit()

    return {"id": studio.id, "name": studio.name, "status": studio.status}, 201


@admin_bp.delete("/studios/<int:studio_id>")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def delete_studio(studio_id):
    studio = db.session.get(Studio, studio_id)
    if studio is None:
        return {"error": "not found"}, 404
    studio.status = "hidden"
    db.session.add(AuditLog(admin_id=1, action="delete_studio", target_type="studio", target_id=studio.id))
    db.session.commit()
    return {"id": studio.id, "status": "hidden"}


@admin_bp.put("/studios/<int:studio_id>")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def update_studio(studio_id):
    studio = db.session.get(Studio, studio_id)
    if studio is None or studio.status == "hidden":
        return {"error": "not found"}, 404

    payload = request.get_json(silent=True) or {}

    if "name" in payload:
        studio.name = payload["name"].strip()
    if "city" in payload:
        studio.city = payload["city"].strip() or None
    if "district" in payload:
        studio.district = payload["district"].strip() or None
    if "address" in payload:
        studio.address = payload["address"].strip() or None
    if "contact" in payload:
        studio.contact_text = payload["contact"].strip() or None
    if "tags" in payload:
        studio.tags = payload["tags"].strip() or None
    if "intro" in payload:
        studio.intro = payload["intro"].strip() or None
    if "openingHours" in payload:
        studio.opening_hours = payload["openingHours"].strip() or None
    if "coverUrl" in payload:
        studio.cover_url = (payload["coverUrl"] or "").strip() or None

    db.session.add(AuditLog(admin_id=1, action="update_studio", target_type="studio", target_id=studio.id))
    db.session.commit()
    return {"id": studio.id, "name": studio.name}
