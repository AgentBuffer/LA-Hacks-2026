"""Brand endpoints — real Supabase queries by org_id from JWT."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from gateway.auth import OrgId
from gateway.db import get_supabase

router = APIRouter(prefix="/api", tags=["brands"])


@router.get("/brands")
async def list_brands(org_id: OrgId) -> list[dict]:
    """Return brands for the authenticated org."""
    sb = get_supabase()
    rows = (
        sb.table("brands")
        .select("id, name, brand_kit, logo_url, social_links, created_at")
        .eq("org_id", org_id)
        .execute()
        .data
        or []
    )
    out = []
    for r in rows:
        kit = r.get("brand_kit") or {}
        # Spread kit FIRST so authoritative columns (id, org_id, name, ...)
        # always win — old onboarding writes embedded a stale brand_id inside
        # brand_kit JSONB that would otherwise shadow the real row id and
        # cause downstream lookups to 404.
        merged = {k: v for k, v in kit.items() if k not in ("id", "name", "brand_id", "org_id")}
        merged.update(
            {
                "brand_id": r["id"],
                "org_id": org_id,
                "name": r["name"],
                "logo_url": r.get("logo_url"),
                "social_links": r.get("social_links"),
                "created_at": r.get("created_at"),
            }
        )
        out.append(merged)
    return out


@router.get("/brands/{brand_id}")
async def get_brand(brand_id: str, org_id: OrgId) -> dict:
    sb = get_supabase()
    rows = (
        sb.table("brands")
        .select("id, name, brand_kit, logo_url, social_links")
        .eq("id", brand_id)
        .eq("org_id", org_id)
        .limit(1)
        .execute()
        .data
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Brand not found")
    r = rows[0]
    kit = r.get("brand_kit") or {}
    # Spread kit first; authoritative row columns must win over any stale
    # brand_id / org_id baked into the JSONB blob.
    merged = {k: v for k, v in kit.items() if k not in ("id", "name", "brand_id", "org_id")}
    merged.update(
        {
            "brand_id": r["id"],
            "org_id": org_id,
            "name": r["name"],
            "logo_url": r.get("logo_url"),
            "social_links": r.get("social_links"),
        }
    )
    return merged
