"""Cognition-agent endpoints — extract spec, register, trigger run."""

from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from gateway.auth import OrgId
from gateway.db import get_supabase
from services.cognition.run_now import run_now
from services.main_agent.agent import extract_spec, register_cognition
from services.shared.db import (
    get_brand_kit,
    get_scheduled_agent,
    insert_scheduled_agent,
    start_run,
)

router = APIRouter(prefix="/api", tags=["agents"])

logger = logging.getLogger(__name__)


class ExtractSpecRequest(BaseModel):
    prompt: str
    brand_id: str | None = None


class CreateAgentRequest(BaseModel):
    spec: dict
    brand_id: str | None = None


def _resolve_brand_id(sb, org_id: str, requested_brand_id: str | None) -> str:
    """Pick the brand to operate on: caller-supplied if it belongs to org,
    otherwise the org's first brand. 404 if the org has no brands at all.

    Defends against stale brand_ids cached in client React state across
    onboarding retries.
    """
    if requested_brand_id:
        owned = (
            sb.table("brands")
            .select("id")
            .eq("id", requested_brand_id)
            .eq("org_id", org_id)
            .limit(1)
            .execute()
            .data
        )
        if owned:
            return requested_brand_id

    fallback = (
        sb.table("brands")
        .select("id")
        .eq("org_id", org_id)
        .order("created_at", desc=False)
        .limit(1)
        .execute()
        .data
    )
    if not fallback:
        raise HTTPException(
            status_code=404,
            detail="No brand for this org. Complete onboarding first.",
        )
    return fallback[0]["id"]


class RunAgentRequest(BaseModel):
    scheduled_agent_id: str


@router.post("/spec/extract")
async def extract_spec_endpoint(body: ExtractSpecRequest, org_id: OrgId) -> dict:
    """Convert a free-form user request into a JSON cognition-agent spec."""
    sb = get_supabase()
    brand_id = _resolve_brand_id(sb, org_id, body.brand_id)
    logger.info("spec/extract: org=%s using brand=%s", org_id, brand_id)
    try:
        brand_kit = get_brand_kit(brand_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return extract_spec(body.prompt, brand_kit)


@router.post("/agents")
async def create_agent(body: CreateAgentRequest, org_id: OrgId) -> dict:
    """Insert a scheduled_agents row and return its id."""
    sb = get_supabase()
    brand_id = _resolve_brand_id(sb, org_id, body.brand_id)
    scheduled_agent_id = insert_scheduled_agent(body.spec, brand_id=brand_id, org_id=org_id)
    return {"scheduled_agent_id": scheduled_agent_id}


@router.get("/agents")
async def list_agents(org_id: OrgId) -> list[dict]:
    sb = get_supabase()
    return (
        sb.table("scheduled_agents")
        .select("*")
        .eq("org_id", org_id)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )


@router.post("/runs")
async def trigger_run(
    body: RunAgentRequest,
    org_id: OrgId,
    background_tasks: BackgroundTasks,
) -> dict:
    """Start one cognition pass in the background, return run_id immediately.

    We open the live_runs row synchronously so the web app can subscribe to
    Realtime on `agent_messages.run_id` immediately. The actual Strategist /
    Critic / Publisher work happens in the background task.
    """
    row = get_scheduled_agent(body.scheduled_agent_id)
    if not row or row["org_id"] != org_id:
        raise HTTPException(status_code=404, detail="Scheduled agent not found")

    # Pre-allocate the run so the UI can subscribe immediately.
    channel = (row.get("owns_channels") or [None])[0]
    run_id = start_run(body.scheduled_agent_id, channel=channel)

    async def _runner():
        try:
            await run_now(body.scheduled_agent_id, run_id=run_id)
        except Exception as exc:
            logger.exception("Background run failed for agent %s: %s", body.scheduled_agent_id, exc)

    background_tasks.add_task(_runner)
    return {"run_id": run_id, "scheduled_agent_id": body.scheduled_agent_id}
