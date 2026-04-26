"""Supervisor uAgent — runs cadence ticks for scheduled_agents added after Bureau boot.

The Bureau registers helpers + main_agent + cognition agents from a single
`list_scheduled_agents()` snapshot at startup. Rows inserted by the Create
flow after boot would otherwise sit idle until the next deploy. The
supervisor closes that gap: every 30s it checks `scheduled_agents` for rows
not present at boot and triggers `run_now` for any whose `next_run_at` has
elapsed (or that have never run).

Bureau-registered cognition agents continue to tick via their own
`on_interval` handlers; the supervisor skips those by id to avoid double
runs.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from uagents import Agent, Context

from services.cognition.parse_cadence import parse_cadence
from services.cognition.run_now import run_now
from services.shared.db import list_scheduled_agents

logger = logging.getLogger(__name__)

SUPERVISOR_SEED = os.environ.get(
    "COGNITION_SUPERVISOR_SEED", "agentbuffer-cog-supervisor-seed-v1"
)
SUPERVISOR_TICK_SECONDS = int(os.environ.get("COGNITION_SUPERVISOR_TICK", "30"))


def _parse_iso(s: str | None) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def _is_due(row: dict) -> bool:
    """Row is due if it has never run, OR next_run_at <= now,
    OR (no next_run_at but last_run_at + cadence <= now)."""
    now = datetime.now(timezone.utc)
    next_run_at = _parse_iso(row.get("next_run_at"))
    last_run_at = _parse_iso(row.get("last_run_at"))

    if next_run_at is not None:
        return next_run_at <= now
    if last_run_at is None:
        return True
    cadence = parse_cadence(row.get("cadence"))
    return (now - last_run_at).total_seconds() >= cadence


def build_supervisor(boot_registered_ids: set[str]) -> Agent:
    """Return a supervisor uAgent. `boot_registered_ids` is the set of
    scheduled_agents.id values already registered with the Bureau as their
    own cognition agents — the supervisor must NOT also fire those.
    """
    agent = Agent(
        name="AgentBuffer-Cognition-Supervisor",
        seed=SUPERVISOR_SEED,
        mailbox=True,
        publish_agent_details=True,
    )

    @agent.on_interval(period=SUPERVISOR_TICK_SECONDS)
    async def _tick(ctx: Context) -> None:
        try:
            rows = list_scheduled_agents()
        except Exception as exc:
            ctx.logger.warning("Supervisor: list_scheduled_agents failed: %s", exc)
            return

        new_rows = [r for r in rows if r["id"] not in boot_registered_ids]
        if not new_rows:
            return

        due = [r for r in new_rows if _is_due(r)]
        if not due:
            ctx.logger.debug(
                "Supervisor: %d post-boot rows tracked, %d due", len(new_rows), 0
            )
            return

        ctx.logger.info(
            "Supervisor: dispatching %d cognition runs (post-boot rows)", len(due)
        )
        for row in due:
            sched_id = row["id"]
            try:
                await run_now(sched_id)
            except Exception as exc:
                ctx.logger.exception(
                    "Supervisor: run_now failed for %s: %s", sched_id, exc
                )

    return agent
