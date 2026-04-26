"""Manually trigger one cognition pass — used by the web app's '▶ Run now' button."""

from __future__ import annotations

import asyncio
import logging

from services.cognition.factory import run_once
from services.shared.db import get_scheduled_agent

logger = logging.getLogger(__name__)


async def run_now(scheduled_agent_id: str, run_id: str | None = None) -> str:
    """Execute one strategist→critic→publisher pass for a single agent.

    Returns the run_id so the caller can redirect users to /dashboard/live
    and stream events from `agent_messages` filtered on it. If `run_id` is
    provided (e.g., gateway pre-allocated for immediate Realtime subscribe),
    we reuse it.
    """
    row = get_scheduled_agent(scheduled_agent_id)
    recipe = {
        "display_name": row.get("display_name"),
        "role_line": row.get("role_line"),
        "cadence": row.get("cadence"),
        "owns_channels": row.get("owns_channels") or [],
        "voice_traits": row.get("voice_traits") or [],
        "tools": row.get("tools") or [],
        "description": row.get("description"),
        "channel": (row.get("owns_channels") or [None])[0],
    }
    import uuid
    slate_id = str(uuid.uuid4())
    return await run_once(
        scheduled_agent_id=row["id"],
        brand_id=row["brand_id"],
        org_id=row["org_id"],
        recipe=recipe,
        slate_id=slate_id,
        run_id=run_id,
    )


def run_now_sync(scheduled_agent_id: str) -> str:
    """Sync wrapper — for use from non-async contexts (rare)."""
    return asyncio.run(run_now(scheduled_agent_id))


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("usage: python -m services.cognition.run_now <scheduled_agent_id>")
        sys.exit(1)
    rid = run_now_sync(sys.argv[1])
    print(f"run_id={rid}")
