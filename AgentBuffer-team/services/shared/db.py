"""Service-role Supabase write adapter for the cognition path.

Used by services/cognition/* and services/main_agent/* to persist runs,
events, and slots. Uses the service-role key — never expose this in any
client-side bundle. Web app talks to Supabase with the anon key + JWT.
"""

from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

from supabase import Client, create_client


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sign(payload: dict) -> str:
    """Deterministic signature over the payload — not cryptographic, just a checksum.

    The schema's NOT NULL `signature` column predates the cognition path; we
    populate it so inserts succeed and so the column stays useful for tamper
    detection of payloads stored alongside.
    """
    canonical = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# live_runs
# ---------------------------------------------------------------------------


def start_run(scheduled_agent_id: str, channel: str | None = None) -> str:
    """Insert a `live_runs` row, returning the new run id.

    Looks up org_id and computes the next run_number from the agent.
    """
    sb = get_supabase()

    agent = (
        sb.table("scheduled_agents")
        .select("org_id, runs_total")
        .eq("id", scheduled_agent_id)
        .single()
        .execute()
        .data
    )
    org_id = agent["org_id"]
    run_number = (agent.get("runs_total") or 0) + 1

    inserted = (
        sb.table("live_runs")
        .insert(
            {
                "org_id": org_id,
                "scheduled_agent_id": scheduled_agent_id,
                "run_number": run_number,
                "channel": channel,
                "status": "running",
            }
        )
        .execute()
        .data[0]
    )

    sb.table("scheduled_agents").update(
        {
            "status": "running",
            "runs_total": run_number,
            "last_run_at": _now_iso(),
        }
    ).eq("id", scheduled_agent_id).execute()

    return inserted["id"]


def finish_run(
    run_id: str,
    status: str,
    slot_id: str | None = None,
    tokens_used: int | None = None,
    cost_estimate_cents: int | None = None,
) -> None:
    """Mark a run finished and propagate health to the parent agent."""
    sb = get_supabase()

    update: dict[str, Any] = {
        "status": status,
        "finished_at": _now_iso(),
    }
    if slot_id is not None:
        update["slot_id"] = slot_id
    if tokens_used is not None:
        update["tokens_used"] = tokens_used
    if cost_estimate_cents is not None:
        update["cost_estimate_cents"] = cost_estimate_cents

    run = (
        sb.table("live_runs")
        .update(update)
        .eq("id", run_id)
        .execute()
        .data[0]
    )

    if run.get("scheduled_agent_id"):
        sb.table("scheduled_agents").update(
            {"status": "queued", "health": "ok" if status != "failed" else "warn"}
        ).eq("id", run["scheduled_agent_id"]).execute()


# ---------------------------------------------------------------------------
# agent_messages (event log)
# ---------------------------------------------------------------------------


def log_event(
    run_id: str,
    *,
    sequence_number: int,
    from_agent: str,
    to_agent: str,
    envelope_type: str,
    event_kind: str,
    title: str | None = None,
    body: str | None = None,
    quote: str | None = None,
    verdict_label: str | None = None,
    verdict_score: float | None = None,
    payload: dict | None = None,
) -> str:
    """Insert an `agent_messages` row tagged with `run_id`.

    Auto-derives org_id from the run and signs the payload.
    """
    sb = get_supabase()

    run = (
        sb.table("live_runs")
        .select("org_id")
        .eq("id", run_id)
        .single()
        .execute()
        .data
    )

    payload = payload or {}
    row = {
        "org_id": run["org_id"],
        "run_id": run_id,
        "sequence_number": sequence_number,
        "from_agent": from_agent,
        "to_agent": to_agent,
        "envelope_type": envelope_type,
        "event_kind": event_kind,
        "title": title,
        "body": body,
        "quote": quote,
        "verdict_label": verdict_label,
        "verdict_score": verdict_score,
        "payload": payload,
        "signature": _sign(payload),
    }

    inserted = sb.table("agent_messages").insert(row).execute().data[0]
    return inserted["id"]


# ---------------------------------------------------------------------------
# content_slots
# ---------------------------------------------------------------------------


def insert_slot(
    *,
    brand_id: str,
    org_id: str,
    slate_id: str,
    slot_number: int,
    caption: str,
    image_prompt: str,
    platform: str,
    status: str,
    scheduled_for: datetime | str | None = None,
    critic_scores: dict | None = None,
    image_url: str | None = None,
) -> str:
    """Insert a `content_slots` row, returning the new slot id."""
    sb = get_supabase()

    if isinstance(scheduled_for, datetime):
        scheduled_for = scheduled_for.isoformat()

    row = {
        "brand_id": brand_id,
        "org_id": org_id,
        "slate_id": slate_id,
        "slot_number": slot_number,
        "caption": caption,
        "image_prompt": image_prompt,
        "platform": platform,
        "status": status,
        "scheduled_for": scheduled_for,
        "critic_scores": critic_scores,
        "image_url": image_url,
    }
    inserted = sb.table("content_slots").insert(row).execute().data[0]
    return inserted["id"]


def update_slot_publish(
    slot_id: str,
    success: bool,
    permalink: str | None = None,
    error: str | None = None,
) -> None:
    """Stamp a slot with its publish outcome."""
    sb = get_supabase()
    publish_result = {
        "success": success,
        "permalink": permalink,
        "error": error,
        "at": _now_iso(),
    }
    sb.table("content_slots").update(
        {
            "status": "published" if success else "failed",
            "publish_result": publish_result,
        }
    ).eq("id", slot_id).execute()


# ---------------------------------------------------------------------------
# brand kit
# ---------------------------------------------------------------------------


def get_brand_kit(brand_id: str) -> dict:
    """Return the brand_kit JSONB blob (plus name + logo) for a brand.

    Raises ValueError when no row matches — callers (gateway routes)
    should translate this into a 404. PGRST116 from `.single()` produces
    an opaque APIError; raising ValueError gives a clean translation point.
    """
    sb = get_supabase()
    rows = (
        sb.table("brands")
        .select("id, name, brand_kit, logo_url, social_links")
        .eq("id", brand_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise ValueError(f"Brand {brand_id} not found")
    row = rows[0]
    kit = row.get("brand_kit") or {}
    kit.setdefault("brand_id", row["id"])
    kit.setdefault("name", row["name"])
    if row.get("logo_url"):
        kit.setdefault("logo_url", row["logo_url"])
    if row.get("social_links"):
        kit.setdefault("social_links", row["social_links"])
    return kit


def get_scheduled_agent(scheduled_agent_id: str) -> dict:
    """Return a scheduled_agents row by id. Raises ValueError if missing."""
    sb = get_supabase()
    rows = (
        sb.table("scheduled_agents")
        .select("*")
        .eq("id", scheduled_agent_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise ValueError(f"Scheduled agent {scheduled_agent_id} not found")
    return rows[0]


def list_scheduled_agents() -> list[dict]:
    """Return every scheduled_agents row (used by the Bureau on boot)."""
    sb = get_supabase()
    return (
        sb.table("scheduled_agents")
        .select("*")
        .execute()
        .data
        or []
    )


def insert_scheduled_agent(spec: dict, brand_id: str, org_id: str) -> str:
    """Insert a scheduled_agents row from a Main-agent spec dict."""
    sb = get_supabase()
    row = {
        "org_id": org_id,
        "brand_id": brand_id,
        "slug": spec["slug"],
        "display_name": spec["display_name"],
        "role_line": spec.get("role_line", spec.get("description", "")[:120]),
        "cadence": spec["cadence"],
        "avatar_letter": spec.get("avatar_letter", spec["display_name"][:1].upper()),
        "description": spec.get("description"),
        "owns_channels": spec.get("owns_channels", [spec.get("channel")] if spec.get("channel") else []),
        "tools": spec.get("tools", []),
        "voice_traits": spec.get("voice_traits", []),
    }
    inserted = sb.table("scheduled_agents").insert(row).execute().data[0]
    return inserted["id"]


def get_platform_connection(brand_id: str, platform: str) -> dict | None:
    """Return the platform_connections row for a brand+platform, or None."""
    sb = get_supabase()
    rows = (
        sb.table("platform_connections")
        .select("*")
        .eq("brand_id", brand_id)
        .eq("platform", platform)
        .limit(1)
        .execute()
        .data
    )
    return rows[0] if rows else None
