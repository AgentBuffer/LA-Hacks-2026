"""Agent-message feed — real queries against agent_messages joined to live_runs."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from gateway.auth import OrgId
from gateway.db import get_supabase

router = APIRouter(prefix="/api", tags=["messages"])


@router.get("/messages")
async def list_messages(
    org_id: OrgId,
    run_id: str | None = Query(default=None, description="Filter to one live_runs row"),
    limit: int = Query(default=200, ge=1, le=1000),
) -> list[dict]:
    """Return agent_messages, optionally for one run, ordered by sequence."""
    sb = get_supabase()

    if run_id:
        run = (
            sb.table("live_runs")
            .select("id, org_id")
            .eq("id", run_id)
            .limit(1)
            .execute()
            .data
        )
        if not run or run[0]["org_id"] != org_id:
            raise HTTPException(status_code=404, detail="Run not found")
        rows = (
            sb.table("agent_messages")
            .select("*")
            .eq("run_id", run_id)
            .order("sequence_number", desc=False)
            .limit(limit)
            .execute()
            .data
            or []
        )
    else:
        rows = (
            sb.table("agent_messages")
            .select("*")
            .eq("org_id", org_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
            .data
            or []
        )

    return rows
