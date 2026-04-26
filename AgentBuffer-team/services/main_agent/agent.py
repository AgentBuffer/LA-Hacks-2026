"""Main uAgent — chats with users on the Create screen, spawns cognition agents.

Two responsibilities:
1. `extract_spec(prompt, brand_kit)` — convert a free-form user request into
   a JSON spec: {display_name, cadence, channel, voice_traits, description,
   tools, avatar_letter, slug, role_line}.
2. `register_cognition(spec, brand_id, org_id)` — insert into
   `scheduled_agents`, returning the new id.

Wrapped as a uAgent so it shows up on Agentverse alongside the helpers and
cognition agents. The web app calls these via the gateway (Phase 6).
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from uuid import uuid4

from openai import OpenAI
from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatAcknowledgement,
    ChatMessage,
    EndSessionContent,
    TextContent,
    chat_protocol_spec,
)

from services.shared.db import insert_scheduled_agent

logger = logging.getLogger(__name__)

ASI_ONE_API_KEY = os.environ.get("ASI_ONE_API_KEY", "")
ASI_ONE_BASE_URL = os.environ.get("ASI_ONE_BASE_URL", "https://api.asi1.ai/v1")
ASI_ONE_MODEL = os.environ.get("ASI_ONE_MODEL", "asi1")
MAIN_SEED = os.environ.get("MAIN_SEED", "agentbuffer-main-seed-v1")
MAIN_PORT = int(os.environ.get("MAIN_PORT", "8000"))


SPEC_SYSTEM_PROMPT = """\
You are an intake assistant for AgentBuffer. The user is hiring a recurring autonomous brand \
agent. Convert their free-form request into a strict JSON spec.

Required keys:
- display_name (string, e.g., "Friday Reflection")
- slug (lowercase, hyphenated, e.g., "friday-reflection")
- role_line (one short sentence describing what the agent does)
- cadence (one of: "weekly", "daily", "monthly", "every N days", "every N hours")
- channel (one of: "linkedin", "x", "instagram", "tiktok", "youtube", "bluesky")
- voice_traits (array of 1-4 short strings — e.g., ["thoughtful", "introspective"])
- description (1-2 sentence longer description)
- tools (array — typically ["strategist", "critic", "publisher"])
- avatar_letter (single uppercase letter)

Use the brand context provided to ground the voice. If the user is vague, fill sensible \
defaults grounded in the brand. Respond with ONLY the JSON object, no markdown.\
"""


def _get_client() -> OpenAI:
    return OpenAI(base_url=ASI_ONE_BASE_URL, api_key=ASI_ONE_API_KEY)


def _clean(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = [ln for ln in text.split("\n") if not ln.strip().startswith("```")]
        text = "\n".join(lines)
    return text.strip()


def _slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9-]+", "-", s.lower()).strip("-") or "agent"


def extract_spec(prompt: str, brand_kit: dict) -> dict:
    """Call ASI:One to parse a free-form hire request into a JSON spec."""
    client = _get_client()
    brand_block = (
        f"Brand: {brand_kit.get('name', 'unknown')}\n"
        f"Industry: {brand_kit.get('industry', '')}\n"
        f"Voice: {brand_kit.get('voice_description', '')}\n"
        f"Audience: {brand_kit.get('target_audience', '')}\n"
        f"Tagline: {brand_kit.get('tagline', '')}"
    )
    resp = client.chat.completions.create(
        model=ASI_ONE_MODEL,
        messages=[
            {"role": "system", "content": SPEC_SYSTEM_PROMPT},
            {"role": "user", "content": f"{brand_block}\n\nUser request:\n{prompt}"},
        ],
        max_tokens=512,
    )
    raw = resp.choices[0].message.content or "{}"
    spec = json.loads(_clean(raw))

    # Backfill / sanitize
    spec.setdefault("display_name", "New Agent")
    spec["slug"] = _slugify(spec.get("slug") or spec["display_name"])
    spec.setdefault("cadence", "weekly")
    spec.setdefault("channel", "linkedin")
    spec.setdefault("voice_traits", [])
    spec.setdefault("description", spec.get("role_line", ""))
    spec.setdefault("tools", ["strategist", "critic", "publisher"])
    spec.setdefault("avatar_letter", spec["display_name"][:1].upper())
    spec.setdefault("role_line", spec.get("description", "")[:120])
    spec.setdefault("owns_channels", [spec["channel"]])
    return spec


def register_cognition(spec: dict, brand_id: str, org_id: str) -> str:
    """Insert into scheduled_agents and return the new id."""
    return insert_scheduled_agent(spec, brand_id=brand_id, org_id=org_id)


# ── Agentverse agent setup ──

agent = Agent(
    name="AgentBuffer-Main",
    seed=MAIN_SEED,
    port=MAIN_PORT,
    mailbox=True,
    publish_agent_details=True,
)

protocol = Protocol(spec=chat_protocol_spec)


@protocol.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(
        sender,
        ChatAcknowledgement(
            timestamp=datetime.now(tz=timezone.utc),
            acknowledged_msg_id=msg.msg_id,
        ),
    )

    text = "".join(item.text for item in msg.content if isinstance(item, TextContent))
    reply = (
        "I'm AgentBuffer Main. Use the Create screen in the dashboard to hire a "
        "new recurring agent — describe what you want and I'll spawn it."
    )
    await ctx.send(
        sender,
        ChatMessage(
            timestamp=datetime.now(tz=timezone.utc),
            msg_id=uuid4(),
            content=[
                TextContent(type="text", text=reply),
                EndSessionContent(type="end-session"),
            ],
        ),
    )


@protocol.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass


agent.include(protocol, publish_manifest=True)


if __name__ == "__main__":
    agent.run()
