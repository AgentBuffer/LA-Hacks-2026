"""Content slot endpoints — real queries against content_slots."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from gateway.auth import OrgId
from gateway.db import get_supabase

router = APIRouter(prefix="/api", tags=["slots"])


@router.get("/slots")
async def list_slots(
    org_id: OrgId,
    brand_id: str | None = Query(default=None),
    slate_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
) -> list[dict]:
    """Return content_slots for the authenticated org, optionally filtered."""
    sb = get_supabase()
    q = (
        sb.table("content_slots")
        .select(
            "id, slot_number, caption, image_prompt, image_url, platform, status, "
            "critic_scores, publish_result, scheduled_for, brand_id, slate_id, created_at"
        )
        .eq("org_id", org_id)
    )
    if brand_id:
        q = q.eq("brand_id", brand_id)
    if slate_id:
        q = q.eq("slate_id", slate_id)
    rows = q.order("scheduled_for", desc=False).limit(limit).execute().data or []

    out = []
    for r in rows:
        scores = r.get("critic_scores") or {}
        critic_scores = scores.get("scores") if isinstance(scores, dict) else None
        critic_average = scores.get("average") if isinstance(scores, dict) else None
        critic_summary = scores.get("summary") if isinstance(scores, dict) else None
        out.append(
            {
                "slot_id": r["id"],
                "slot_number": r["slot_number"],
                "caption": r.get("caption"),
                "image_prompt": r.get("image_prompt"),
                "image_url": r.get("image_url"),
                "platform": r.get("platform"),
                "status": r.get("status"),
                "scheduled_for": r.get("scheduled_for"),
                "brand_id": r.get("brand_id"),
                "slate_id": r.get("slate_id"),
                "critic_scores": critic_scores,
                "critic_average": critic_average,
                "critic_summary": critic_summary,
                "publish_result": r.get("publish_result"),
            }
        )
    return out


@router.get("/slots/{slot_id}")
async def get_slot(slot_id: str, org_id: OrgId) -> dict:
    sb = get_supabase()
    rows = (
        sb.table("content_slots")
        .select("*")
        .eq("id", slot_id)
        .eq("org_id", org_id)
        .limit(1)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Slot not found")
    return rows[0]
