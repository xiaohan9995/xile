from datetime import date, datetime

from flask import g, request

from ...extensions import db
from ...models import (
    AdminUser,
    AnnualReview,
    AuditLog,
    ReviewCycle,
    ReviewGroup,
    ReviewGroupMember,
    ReviewOpinion,
    TeacherTier,
)
from . import admin_bp
from .helpers import current_admin_id, require_admin_roles, require_admin_token


def _date(value):
    return value.strftime("%Y-%m-%d") if value else None


def _cycle_payload(cycle):
    return {
        "id": cycle.id, "name": cycle.name, "startDate": _date(cycle.start_date),
        "submissionDeadline": _date(cycle.submission_deadline), "publishDate": _date(cycle.publish_date),
        "status": cycle.status,
    }


def _group_payload(group):
    return {
        "id": group.id, "name": group.name, "leaderId": group.leader_id,
        "leaderName": group.leader.username if group.leader else None,
        "tierScope": [v for v in (group.tier_scope or "").split(",") if v],
        "members": [{"id": item.admin_id, "name": item.admin.username} for item in group.members],
        "active": group.active,
    }


def _can_review(review, admin_id, role):
    if role in ("super_admin", "admin"):
        return True
    if not review.group or not admin_id:
        return False
    return review.group.leader_id == admin_id or any(m.admin_id == admin_id for m in review.group.members)


@admin_bp.get("/review-cycles")
@require_admin_token
def list_review_cycles():
    return {"items": [_cycle_payload(c) for c in ReviewCycle.query.order_by(ReviewCycle.start_date.desc()).all()]}


@admin_bp.post("/review-cycles")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def create_review_cycle():
    payload = request.get_json(silent=True) or {}
    try:
        cycle = ReviewCycle(
            name=(payload.get("name") or "").strip(),
            start_date=date.fromisoformat(payload.get("startDate", "")),
            submission_deadline=date.fromisoformat(payload.get("submissionDeadline", "")),
            publish_date=date.fromisoformat(payload["publishDate"]) if payload.get("publishDate") else None,
            status="open", created_by_id=current_admin_id(),
        )
    except ValueError:
        return {"error": "invalid cycle dates"}, 400
    if not cycle.name or cycle.submission_deadline < cycle.start_date:
        return {"error": "invalid cycle"}, 400
    db.session.add(cycle)
    db.session.commit()
    return _cycle_payload(cycle), 201


@admin_bp.get("/review-groups")
@require_admin_token
def list_review_groups():
    return {"items": [_group_payload(g) for g in ReviewGroup.query.order_by(ReviewGroup.id.desc()).all()]}


@admin_bp.post("/review-groups")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def create_review_group():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    leader_id = payload.get("leaderId")
    member_ids = {int(v) for v in payload.get("memberIds", []) if str(v).isdigit()}
    if not name or not leader_id or not db.session.get(AdminUser, leader_id):
        return {"error": "name and valid leaderId required"}, 400
    if ReviewGroup.query.filter_by(name=name).first():
        return {"error": "group name already exists"}, 409
    group = ReviewGroup(name=name, leader_id=leader_id, tier_scope=",".join(payload.get("tierScope", [])))
    db.session.add(group)
    db.session.flush()
    for member_id in member_ids:
        if db.session.get(AdminUser, member_id):
            db.session.add(ReviewGroupMember(group_id=group.id, admin_id=member_id))
    db.session.commit()
    return _group_payload(group), 201


@admin_bp.post("/reviews/<int:review_id>/assignment")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def assign_review(review_id):
    review = db.session.get(AnnualReview, review_id)
    payload = request.get_json(silent=True) or {}
    group = db.session.get(ReviewGroup, payload.get("groupId"))
    cycle = db.session.get(ReviewCycle, payload.get("cycleId")) if payload.get("cycleId") else None
    if not review or not group or not group.active:
        return {"error": "review and active group required"}, 400
    tier_scope = {tier.strip() for tier in (group.tier_scope or "").split(",") if tier.strip()}
    if tier_scope and (not review.teacher.tier or review.teacher.tier.code not in tier_scope):
        return {"error": "review teacher tier is outside the group's scope"}, 409
    review.group_id = group.id
    if cycle:
        review.cycle_id = cycle.id
    review.status = "in_review"
    db.session.add(AuditLog(admin_id=current_admin_id() or 1, action="assign_review", target_type="annual_review", target_id=review.id))
    db.session.commit()
    return {"id": review.id, "status": review.status, "groupId": review.group_id, "cycleId": review.cycle_id}


@admin_bp.post("/reviews/<int:review_id>/opinions")
@require_admin_token
def submit_review_opinion(review_id):
    review = db.session.get(AnnualReview, review_id)
    admin_id = current_admin_id()
    role = getattr(g, "current_admin_role", None)
    payload = request.get_json(silent=True) or {}
    if not review or not _can_review(review, admin_id, role):
        return {"error": "forbidden"}, 403
    if review.status not in ("in_review", "submitted"):
        return {"error": "review is not open for opinions"}, 409
    if payload.get("conclusion") not in ("approved", "rejected") or not (payload.get("comment") or "").strip():
        return {"error": "conclusion and comment required"}, 400
    tier = db.session.get(TeacherTier, payload.get("recommendedTierId")) if payload.get("recommendedTierId") else None
    opinion = ReviewOpinion.query.filter_by(review_id=review.id, author_id=admin_id).first()
    if opinion is None:
        opinion = ReviewOpinion(review_id=review.id, author_id=admin_id, conclusion=payload["conclusion"], comment=payload["comment"].strip())
        db.session.add(opinion)
    else:
        opinion.conclusion, opinion.comment, opinion.submitted_at = payload["conclusion"], payload["comment"].strip(), datetime.utcnow()
    opinion.recommended_tier_id = tier.id if tier else None
    db.session.commit()
    return {"id": opinion.id, "status": "submitted"}, 201


@admin_bp.post("/reviews/<int:review_id>/group-decision")
@require_admin_token
def submit_group_decision(review_id):
    review = db.session.get(AnnualReview, review_id)
    admin_id = current_admin_id()
    role = getattr(g, "current_admin_role", None)
    payload = request.get_json(silent=True) or {}
    is_leader = review and review.group and review.group.leader_id == admin_id
    if not review or not (role in ("admin", "super_admin") or is_leader):
        return {"error": "forbidden"}, 403
    if review.status not in ("in_review", "returned_to_group"):
        return {"error": "review is not ready for a group decision"}, 409
    if not (payload.get("decision") or "").strip() or payload.get("conclusion") not in ("approved", "rejected"):
        return {"error": "decision and conclusion required"}, 400
    required_member_ids = {member.admin_id for member in review.group.members}
    submitted_member_ids = {opinion.author_id for opinion in review.opinions.all()}
    if not required_member_ids.issubset(submitted_member_ids):
        return {"error": "all review members must submit an opinion before the group decision"}, 409
    review.group_decision = payload["decision"].strip()
    review.reviewer_comment = payload["decision"].strip()
    review.status = "pending_publication"
    review.group_decided_at = datetime.utcnow()
    tier = db.session.get(TeacherTier, payload.get("finalTierId")) if payload.get("finalTierId") else None
    review.final_tier_id = tier.id if tier else review.teacher.tier_id
    # Store the proposed final result until the administrator publishes it.
    review.status = "pending_publication" if payload["conclusion"] == "approved" else "pending_publication_rejected"
    db.session.commit()
    return {"id": review.id, "status": review.status}


@admin_bp.post("/reviews/<int:review_id>/return-to-group")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def return_to_group(review_id):
    review = db.session.get(AnnualReview, review_id)
    payload = request.get_json(silent=True) or {}
    reason = (payload.get("reason") or "").strip()
    if not review or review.status not in ("pending_publication", "pending_publication_rejected"):
        return {"error": "review is not ready to return"}, 409
    if not reason:
        return {"error": "return reason required"}, 400
    previous_decision = review.group_decision or ""
    review.status = "returned_to_group"
    db.session.add(AuditLog(
        admin_id=current_admin_id() or 1,
        action="return_to_group",
        target_type="annual_review",
        target_id=review.id,
        detail=f"reason: {reason}; decision: {previous_decision}",
    ))
    db.session.commit()
    return {"id": review.id, "status": review.status, "returnReason": reason}


@admin_bp.post("/reviews/<int:review_id>/publish")
@require_admin_token
@require_admin_roles("admin", "super_admin")
def publish_review(review_id):
    review = db.session.get(AnnualReview, review_id)
    payload = request.get_json(silent=True) or {}
    outcome = payload.get("outcome")
    if not review or review.status not in ("pending_publication", "pending_publication_rejected"):
        return {"error": "review is not ready to publish"}, 409
    if outcome not in ("approved", "rejected"):
        return {"error": "valid outcome required"}, 400
    review.published_by_id = current_admin_id()
    review.published_at = datetime.utcnow()
    review.reviewed_at = review.published_at
    review.status = "published_approved" if outcome == "approved" else "published_rejected"
    if outcome == "approved":
        if review.final_tier_id:
            review.teacher.tier_id = review.final_tier_id
        if review.next_valid_until:
            review.teacher.valid_until = review.next_valid_until
    db.session.add(AuditLog(admin_id=current_admin_id() or 1, action="publish_review", target_type="annual_review", target_id=review.id))
    db.session.commit()
    return {"id": review.id, "status": review.status, "publishedAt": review.published_at.isoformat()}


@admin_bp.get("/reviews/<int:review_id>/workflow")
@require_admin_token
def review_workflow(review_id):
    review = db.session.get(AnnualReview, review_id)
    admin_id = current_admin_id()
    role = getattr(g, "current_admin_role", None)
    if not review or not _can_review(review, admin_id, role):
        return {"error": "forbidden"}, 403
    member_ids = {member.admin_id for member in review.group.members} if review.group else set()
    submitted_member_ids = {opinion.author_id for opinion in review.opinions.all()}
    return {
        "id": review.id, "status": review.status, "group": _group_payload(review.group) if review.group else None,
        "cycle": _cycle_payload(review.cycle) if review.cycle else None,
        "currentAdmin": {"id": admin_id, "role": role},
        "groupDecision": review.group_decision,
        "opinionProgress": {"submitted": len(member_ids & submitted_member_ids), "required": len(member_ids)},
        "opinions": [{"id": o.id, "author": o.author.username, "conclusion": o.conclusion, "comment": o.comment,
                      "recommendedTier": o.recommended_tier.code if o.recommended_tier else None} for o in review.opinions.order_by(ReviewOpinion.id).all()],
    }
