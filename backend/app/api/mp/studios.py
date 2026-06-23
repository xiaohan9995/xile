from flask import request

from ...extensions import db, limiter
from ...models import Studio
from .helpers import _studio_summary, escape_like
from . import mp_bp


@mp_bp.get("/studios")
def list_studios():
    try:
        page = max(int(request.args.get("page", 1)), 1)
    except (ValueError, TypeError):
        page = 1
    try:
        page_size = max(min(int(request.args.get("pageSize", 20)), 50), 1)
    except (ValueError, TypeError):
        page_size = 20
    city = request.args.get("city", "").strip()
    keyword = request.args.get("q", "").strip()
    query = Studio.query.filter_by(status="open")
    if city:
        query = query.filter(Studio.city.like(f"%{escape_like(city)}%"))
    if keyword:
        query = query.filter(
            (Studio.name.like(f"%{escape_like(keyword)}%")) | (Studio.address.like(f"%{escape_like(keyword)}%"))
        )
    query = query.order_by(Studio.display_order.desc(), Studio.id.asc())
    total = query.count()
    studios = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [_studio_summary(s) for s in studios], "total": total, "page": page, "pageSize": page_size, "hasMore": page * page_size < total}


@mp_bp.get("/studios/<int:studio_id>")
def get_studio(studio_id):
    studio = Studio.query.filter_by(id=studio_id, status="open").first_or_404()
    return _studio_summary(studio)
