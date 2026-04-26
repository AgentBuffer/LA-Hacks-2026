"""Build a uAgent for one row in the `scheduled_agents` table.

Each cognition agent runs the strategist → critic → publisher single-slot
pipeline on its declared cadence, persisting events into Supabase so the
web app's Live screen can stream them.
"""

from __future__ import annotations

import logging
import os
import re
import uuid
from typing import Any

from uagents import Agent, Context

from services.cognition.parse_cadence import parse_cadence
from services.critic.agent import critique_one
from services.publisher.agent import publish_one
from services.shared.db import (
    finish_run,
    get_brand_kit,
    insert_slot,
    log_event,
    start_run,
    update_next_run_at,
    update_slot_publish,
)
from services.strategist.agent import propose_one

logger = logging.getLogger(__name__)


def _slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9-]+", "-", s.lower()).strip("-") or "agent"


def make_cognition_agent(row: dict[str, Any]) -> Agent:
    """Build a uAgent bound to one scheduled_agents row.

    The seed is deterministic on the row id so the Agentverse address stays
    stable across restarts. The on_interval handler runs the full
    propose→critique→revise→publish pipeline once per cadence tick.
    """
    sched_id = row["id"]
    brand_id = row["brand_id"]
    org_id = row["org_id"]
    seed = f"agentbuffer-cog-{sched_id}"
    name = f"AgentBuffer-Cognition-{_slugify(row.get('display_name', sched_id[:8]))}"
    period = parse_cadence(row.get("cadence"))

    agent = Agent(
        name=name,
        seed=seed,
        mailbox=True,
        publish_agent_details=True,
    )

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
    # slate_id is generated per-tick (not at agent build time) so each run lands
    # on its own slate row. content_slots.slate_id is a UUID column.
    async def _tick(ctx: Context) -> None:
        await run_once(sched_id, brand_id, org_id, recipe, str(uuid.uuid4()))

    agent.on_interval(period=period)(_tick)

    logger.info(
        "Cognition agent built: name=%s seed=%s period=%ds brand=%s",
        name, seed, period, brand_id,
    )
    return agent


async def run_once(
    scheduled_agent_id: str,
    brand_id: str,
    org_id: str,
    recipe: dict[str, Any],
    slate_id: str,
    run_id: str | None = None,
) -> str:
    """Execute one strategist→critic→(revise)→publisher pass.

    Returns the run_id. Persists every step to Supabase so the Live screen
    streams it. Forces an approval after one revision per the cognition path
    spec (the slate-level Critic still hard-rejects in head_agent runs).

    If `run_id` is provided, it is reused (caller has already created the
    live_runs row, e.g., the gateway pre-allocates so the UI can subscribe).
    """
    try:
        brand_kit = get_brand_kit(brand_id)
    except ValueError as exc:
        logger.error("Cognition run aborted — brand kit missing: %s", exc)
        if run_id is not None:
            finish_run(run_id, status="failed")
        raise
    if not brand_kit.get("voice_description") and not brand_kit.get("tone"):
        logger.warning(
            "Brand %s has no voice_description or tone — cognition will fall back to defaults",
            brand_id,
        )
    channel = recipe.get("channel") or (recipe.get("owns_channels") or [None])[0]

    if run_id is None:
        run_id = start_run(scheduled_agent_id, channel=channel)
    seq = 0

    def _log(**kwargs):
        nonlocal seq
        seq += 1
        return log_event(run_id, sequence_number=seq, **kwargs)

    try:
        # 1. Strategist proposes
        slot = propose_one(brand_kit, recipe)
        _log(
            from_agent="strategist",
            to_agent="critic",
            envelope_type="proposal",
            event_kind="proposal",
            title=f"Proposed: {slot.platform.value}",
            body=slot.caption[:200],
            quote=slot.caption,
            payload={"image_prompt": slot.image_prompt, "platform": slot.platform.value},
        )

        # 2. Critic scores
        verdict = critique_one(brand_kit, slot)
        _log(
            from_agent="critic",
            to_agent="strategist" if not verdict.approved else "publisher",
            envelope_type="verdict",
            event_kind="verdict",
            title="Approved" if verdict.approved else "Rejected",
            body=verdict.summary,
            verdict_label="approved" if verdict.approved else "rejected",
            verdict_score=verdict.average,
            payload={"scores": [s.model_dump() for s in verdict.scores]},
        )

        # 3. On rejection: revise once and force-approve
        if not verdict.approved:
            slot = propose_one(brand_kit, recipe, retry_with_critique=verdict.model_dump())
            _log(
                from_agent="strategist",
                to_agent="critic",
                envelope_type="revision",
                event_kind="revision",
                title="Revised proposal",
                body=slot.caption[:200],
                quote=slot.caption,
                payload={"image_prompt": slot.image_prompt, "platform": slot.platform.value},
            )
            verdict = critique_one(brand_kit, slot)
            verdict.approved = True  # cognition path: accept second pass
            verdict.summary = f"APPROVED on revision — {verdict.summary}"
            _log(
                from_agent="critic",
                to_agent="publisher",
                envelope_type="verdict",
                event_kind="verdict",
                title="Approved on revision",
                body=verdict.summary,
                verdict_label="approved",
                verdict_score=verdict.average,
                payload={"scores": [s.model_dump() for s in verdict.scores]},
            )

        # 4. Persist the slot
        slot_id = insert_slot(
            brand_id=brand_id,
            org_id=org_id,
            slate_id=slate_id,
            slot_number=1,
            caption=slot.caption,
            image_prompt=slot.image_prompt,
            platform=slot.platform.value,
            status="approved",
            scheduled_for=slot.scheduled_for,
            critic_scores={
                "average": verdict.average,
                "scores": [s.model_dump() for s in verdict.scores],
                "summary": verdict.summary,
            },
        )

        # 5. Publish
        result = await publish_one(slot, brand_id)
        update_slot_publish(slot_id, result.success, result.permalink, result.error)

        _log(
            from_agent="publisher",
            to_agent="critic",  # nominal recipient
            envelope_type="publish",
            event_kind="publish",
            title=f"{'Published' if result.success else 'Publish failed'} on {slot.platform.value}",
            body=result.permalink or result.error or "",
            payload={
                "permalink": result.permalink,
                "error": result.error,
                "success": result.success,
            },
        )

        finish_run(
            run_id,
            status="published" if result.success else "failed",
            slot_id=slot_id,
        )
        try:
            update_next_run_at(
                scheduled_agent_id,
                parse_cadence(recipe.get("cadence")),
            )
        except Exception as exc:
            logger.warning("Could not stamp next_run_at for %s: %s", scheduled_agent_id, exc)
    except Exception as exc:
        logger.exception("Cognition run failed: %s", exc)
        try:
            _log(
                from_agent="strategist",
                to_agent="critic",
                envelope_type="error",
                event_kind="note",
                title="Run failed",
                body=str(exc)[:500],
                payload={"error": str(exc)},
            )
            finish_run(run_id, status="failed")
        except Exception:
            pass
        raise

    return run_id
