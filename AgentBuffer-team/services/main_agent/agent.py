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


CONVERSE_SYSTEM_PROMPT = """\
You are an intake assistant for AgentBuffer, refining a recurring brand-agent spec via conversation.

Each turn you receive:
- The current spec (may be null on the first turn)
- The user's latest message
- The brand context

Respond with strict JSON containing:
- spec: the FULL updated spec — keys: display_name, slug, role_line, cadence, channel, voice_traits, description, tools, avatar_letter, owns_channels
- message: a short reply (1-2 sentences) — either a clarifying question if information is missing/vague, or a confirmation summary if the spec is solid
- done: true ONLY if the spec is complete, specific, and ready to hire; false if you need more info from the user

Required for done=true:
- cadence is specific ("weekly", "daily", "every 3 days" — not "sometimes")
- channel is one of: linkedin, x, instagram, tiktok, youtube, bluesky
- voice_traits has at least 2 entries
- description is more than 10 chars and specific to this agent's job
- display_name is more than 2 chars

When refining, preserve existing fields unless the user explicitly changes them.
Use brand voice/tone where the user is vague.
Ask at most one clarifying question per turn — focus on the most important gap.
Output ONLY the JSON object, no markdown, no commentary.\
"""


def _backfill_spec(spec: dict) -> dict:
    """Apply the same defaults extract_spec uses, idempotently."""
    spec = dict(spec or {})
    spec.setdefault("display_name", "New Agent")
    spec["slug"] = _slugify(spec.get("slug") or spec.get("display_name", "agent"))
    spec.setdefault("cadence", "weekly")
    spec.setdefault("channel", "linkedin")
    spec.setdefault("voice_traits", [])
    spec.setdefault("description", spec.get("role_line", ""))
    spec.setdefault("tools", ["strategist", "critic", "publisher"])
    spec.setdefault("avatar_letter", spec["display_name"][:1].upper())
    spec.setdefault("role_line", spec.get("description", "")[:120])
    if not spec.get("owns_channels"):
        spec["owns_channels"] = [spec["channel"]] if spec.get("channel") else []
    return spec


def converse_with_main_agent(
    message: str,
    current_spec: dict | None,
    brand_kit: dict,
) -> dict:
    """Multi-turn refine. Returns {spec, message, done}.

    Either drafts a new spec from a free-form prompt (current_spec=None) or
    merges the user's message into an existing spec, asking a clarifying
    question if the spec still has gaps.
    """
    client = _get_client()
    brand_block = (
        f"Brand: {brand_kit.get('name', 'unknown')}\n"
        f"Industry: {brand_kit.get('industry', '')}\n"
        f"Voice: {brand_kit.get('voice_description', '')}\n"
        f"Audience: {brand_kit.get('target_audience', '')}\n"
        f"Tagline: {brand_kit.get('tagline', '')}"
    )
    spec_block = json.dumps(current_spec, indent=2) if current_spec else "null"
    resp = client.chat.completions.create(
        model=ASI_ONE_MODEL,
        messages=[
            {"role": "system", "content": CONVERSE_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"{brand_block}\n\n"
                    f"Current spec:\n{spec_block}\n\n"
                    f"User message:\n{message}"
                ),
            },
        ],
        max_tokens=700,
    )
    raw = resp.choices[0].message.content or "{}"
    try:
        parsed = json.loads(_clean(raw))
    except json.JSONDecodeError:
        return {
            "spec": _backfill_spec(current_spec or {}),
            "message": (
                "I couldn't parse my own draft just now — can you say more about "
                "the cadence and channel you have in mind?"
            ),
            "done": False,
        }

    spec = _backfill_spec(parsed.get("spec") or current_spec or {})
    return {
        "spec": spec,
        "message": parsed.get("message") or "Spec updated.",
        "done": bool(parsed.get("done", False)),
    }


# ── Agentverse agent setup ──

agent = Agent(
    name="AgentBuffer-Main",
    seed=MAIN_SEED,
    port=MAIN_PORT,
    mailbox=True,
    publish_agent_details=True,
)

protocol = Protocol(spec=chat_protocol_spec)


def _fmt_spec_preview(spec: dict) -> str:
    """Render a spec dict as a human preview for the chat reply."""
    voice = ", ".join(spec.get("voice_traits") or []) or "—"
    channels = ", ".join(spec.get("owns_channels") or [spec.get("channel", "—")])
    return (
        f"📌 **{spec.get('display_name', 'New Agent')}** "
        f"({spec.get('cadence', 'weekly')})\n"
        f"• role: {spec.get('role_line', '—')}\n"
        f"• voice: {voice}\n"
        f"• publishes to: {channels}\n"
        f"• tools: {', '.join(spec.get('tools') or ['strategist', 'critic', 'publisher'])}\n\n"
        f"To hire this agent, confirm in the dashboard's Agents tab "
        f"(`/dashboard/agents`) — the spec is ready."
    )


def _looks_like_hire_intent(text: str) -> bool:
    if not text:
        return False
    t = text.lower()
    return any(
        kw in t
        for kw in (
            "hire",
            "create",
            "build",
            "spawn",
            "make",
            "set up",
            "schedule",
            "agent that",
            "post",
            "publish",
            "every",
            "weekly",
            "daily",
        )
    )


@protocol.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    await ctx.send(
        sender,
        ChatAcknowledgement(
            timestamp=datetime.now(tz=timezone.utc),
            acknowledged_msg_id=msg.msg_id,
        ),
    )

    text = "".join(item.text for item in msg.content if isinstance(item, TextContent)).strip()

    if not text:
        reply = (
            "Hi — I'm AgentBuffer Main. Tell me what kind of recurring agent you want "
            "to hire (e.g. \"weekly LinkedIn agent that shares a Friday reflection on craft\") "
            "and I'll draft the spec for you."
        )
    elif _looks_like_hire_intent(text):
        try:
            # Without org/brand context in the chat envelope, we draft against
            # an empty brand_kit; the dashboard Hire flow refines it with the
            # real brand context server-side.
            spec = extract_spec(text, brand_kit={})
            reply = (
                "Here's a draft spec from your description:\n\n"
                + _fmt_spec_preview(spec)
            )
        except Exception as exc:
            logger.exception("extract_spec failed in chat: %s", exc)
            reply = (
                "I couldn't parse that into a spec right now — try rephrasing with a "
                "cadence (weekly/daily), a channel (linkedin/x/instagram), and the "
                "kind of content you want."
            )
    else:
        reply = (
            "I'm AgentBuffer Main — I draft and spawn recurring brand agents. "
            "Describe what you want (cadence + channel + voice) and I'll turn it "
            "into a spec. Example: \"daily X agent that shares one practical "
            "engineering tip in our voice.\""
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
