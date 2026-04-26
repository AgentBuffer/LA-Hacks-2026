"""ASI:One natural-language slot ranker — Fetch.ai prize beat."""

from __future__ import annotations

import json
import os

from fastapi import APIRouter
from openai import OpenAI
from pydantic import BaseModel

from gateway.auth import OrgId
from gateway.db import get_supabase

router = APIRouter(prefix="/api", tags=["ranking"])


class RankSlotsRequest(BaseModel):
    slot_ids: list[str]


@router.post("/rank-slots")
async def rank_slots(body: RankSlotsRequest, org_id: OrgId) -> list[dict]:
    sb = get_supabase()
    rows = sb.table("content_slots").select("id, caption, platform").in_("id", body.slot_ids).eq("org_id", org_id).execute().data or []
    if not rows:
        return []
    client = OpenAI(base_url=os.environ.get("ASI_ONE_BASE_URL", "https://api.asi1.ai/v1"), api_key=os.environ.get("ASI_ONE_API_KEY", ""))
    prompt = "Rank these social posts by predicted engagement. Reply JSON: [{slot_id,rank,reasoning}]\n" + json.dumps(rows)
    resp = client.chat.completions.create(model=os.environ.get("ASI_ONE_MODEL", "asi1"), messages=[{"role": "user", "content": prompt}], max_tokens=512)
    try:
        return json.loads(resp.choices[0].message.content.strip().strip("`").lstrip("json").strip())
    except Exception:
        return [{"slot_id": r["id"], "rank": i + 1, "reasoning": ""} for i, r in enumerate(rows)]
