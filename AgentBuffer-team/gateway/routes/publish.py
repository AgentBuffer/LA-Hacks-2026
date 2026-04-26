"""Publish trigger endpoint — calls publish_one for each requested slot."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from gateway.auth import OrgId
from gateway.db import get_supabase
from services.publisher.agent import publish_one
from services.shared.db import update_slot_publish
from services.shared.models import ContentSlot, Platform

router = APIRouter(prefix="/api", tags=["publish"])

logger = logging.getLogger(__name__)


class TriggerPublishRequest(BaseModel):
    slot_ids: list[str]


@router.post("/trigger-publish")
async def trigger_publish(body: TriggerPublishRequest, org_id: OrgId) -> list[dict]:
    """Publish each approved slot via its platform adapter."""
    sb = get_supabase()
    rows = (
        sb.table("content_slots")
        .select(
            "id, brand_id, slot_number, caption, image_prompt, image_url, "
            "platform, scheduled_for, status"
        )
        .in_("id", body.slot_ids)
        .eq("org_id", org_id)
        .execute()
        .data
        or []
    )

    results = []
    for r in rows:
        try:
            slot = ContentSlot(
                slot_id=r["id"],
                slot_number=r["slot_number"],
                caption=r.get("caption") or "",
                image_prompt=r.get("image_prompt") or "",
                platform=Platform(r["platform"]),
                scheduled_for=r["scheduled_for"],
                image_url=r.get("image_url"),
                status=r.get("status", "approved"),
            )
            result = await publish_one(slot, brand_id=r["brand_id"])
            update_slot_publish(
                slot_id=r["id"],
                success=result.success,
                permalink=result.permalink,
                error=result.error,
            )
            results.append(result.model_dump())
        except Exception as exc:
            logger.exception("trigger_publish failed for slot %s", r["id"])
            results.append(
                {
                    "slot_id": r["id"],
                    "platform": r.get("platform"),
                    "success": False,
                    "error": str(exc),
                    "permalink": None,
                    "idempotency_key": "",
                }
            )

    if not results:
        raise HTTPException(status_code=404, detail="No matching approved slots")
    return results
