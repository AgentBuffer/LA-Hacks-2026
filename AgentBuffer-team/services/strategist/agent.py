"""Strategist uAgent — generates weekly content slates using an LLM.

Receives a BrandKit + MarketingAnalysis from the Head Agent and returns
a 7-slot Slate with platform-optimized captions and image/video prompts.

Can operate as:
  1. A standalone Agentverse agent (via Chat Protocol)
  2. An inline function called by the Head Agent (generate_slate)
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timedelta, timezone
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

from services.shared.models import (
    BrandKit,
    ContentSlot,
    MarketingAnalysis,
    Platform,
    Slate,
)

logger = logging.getLogger(__name__)

ASI_ONE_API_KEY = os.environ.get("ASI_ONE_API_KEY", "")
ASI_ONE_BASE_URL = os.environ.get("ASI_ONE_BASE_URL", "https://api.asi1.ai/v1")
ASI_ONE_MODEL = os.environ.get("ASI_ONE_MODEL", "asi1")
STRATEGIST_SEED = os.environ.get("STRATEGIST_SEED", "agentbuffer-strategist-seed-v1")
STRATEGIST_PORT = int(os.environ.get("STRATEGIST_PORT", "8002"))

# -- Tone-value-to-descriptor mappings ----------------------------------------

_TONE_DESCRIPTORS: dict[str, list[tuple[int, str]]] = {
    "formality": [
        (33, "casual and conversational"),
        (66, "balanced"),
        (100, "professional and formal"),
    ],
    "humor": [
        (33, "earnest and sincere"),
        (66, "lightly playful"),
        (100, "witty and humorous"),
    ],
    "boldness": [
        (33, "understated"),
        (66, "confident"),
        (100, "bold and direct"),
    ],
    "warmth": [
        (33, "informational"),
        (66, "friendly"),
        (100, "warm and personal"),
    ],
}


def _describe_tone(dimension: str, value: int) -> str:
    for threshold, label in _TONE_DESCRIPTORS.get(dimension, []):
        if value <= threshold:
            return label
    return "balanced"


def _build_tone_block(brand: BrandKit) -> str:
    """Build a natural-language tone description from the BrandKit."""
    tone = brand.tone
    lines = [
        f"- Formality: {_describe_tone('formality', tone.formality)} ({tone.formality}/100)",
        f"- Humor: {_describe_tone('humor', tone.humor)} ({tone.humor}/100)",
        f"- Boldness: {_describe_tone('boldness', tone.boldness)} ({tone.boldness}/100)",
        f"- Warmth: {_describe_tone('warmth', tone.warmth)} ({tone.warmth}/100)",
    ]
    if brand.personality_keywords:
        kw = ", ".join(brand.personality_keywords)
        lines.append(f"- Personality keywords to reflect: {kw}")
    return "\n".join(lines)


def _build_reference_block(brand: BrandKit) -> str:
    """Format reference posts as exemplars for the LLM."""
    if not brand.reference_posts:
        return ""
    header = (
        "The following posts represent ideal on-brand content for this brand. "
        "Match their tone, style, and voice."
    )
    posts = []
    for p in brand.reference_posts:
        posts.append(f"  [{p.platform.value.upper()}] {p.text}")
    return f"{header}\n" + "\n".join(posts)


SINGLE_SLOT_SYSTEM_PROMPT = """\
You are a content strategist AI for a recurring autonomous brand agent.
Given a brand profile and a recipe describing this agent's role, generate exactly 1 content slot \
for the agent's next post.

Return valid JSON — a single object:
{
  "caption": "The full post caption in the brand's voice",
  "image_prompt": "A detailed visual description for AI image/video generation",
  "platform": "one of: linkedin, x, instagram, tiktok, youtube"
}

Rules:
- Caption MUST be in the brand's voice and tone
- Match the agent recipe (cadence, voice traits, owns_channels) — if a channel is specified, use it
- Image prompt should be vivid, detailed, and brand-aligned
- If a previous critique is provided, address its specific feedback in this revision

Respond ONLY with the JSON object, no markdown fences or extra text.\
"""


SLATE_SYSTEM_PROMPT = """\
You are a content strategist AI. Given a brand profile and marketing analysis, generate exactly 7 \
content slots for one week of social media content.

Return valid JSON — an array of 7 objects, each with:
{
  "slot_number": 1,
  "caption": "The full post caption in the brand's voice",
  "image_prompt": "A detailed visual description for AI image/video generation",
  "platform": "one of: linkedin, x, instagram, tiktok, youtube"
}

Rules:
- Spread content across the recommended platforms (don't put all on one platform)
- Captions must be in the brand's voice and tone
- Image prompts should be vivid, detailed, and brand-aligned
- Each slot should cover a different content theme from the analysis
- Slot numbers go from 1 to 7 (Monday to Sunday)
- Make at least one slot intentionally weaker/more generic so the Critic has something to reject
- If a tone profile is provided, strictly follow the tone descriptors in every caption
- If reference posts are provided, use them as exemplars for voice and style

Respond ONLY with the JSON array, no markdown fences or extra text.\
"""


def _get_client() -> OpenAI:
    return OpenAI(base_url=ASI_ONE_BASE_URL, api_key=ASI_ONE_API_KEY)


def _clean_json_response(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [ln for ln in lines if not ln.strip().startswith("```")]
        text = "\n".join(lines)
    return text.strip()


def generate_slate(brand: BrandKit, analysis: MarketingAnalysis) -> Slate:
    """Generate a 7-day content slate using the LLM."""
    client = _get_client()

    tone_block = _build_tone_block(brand)
    ref_block = _build_reference_block(brand)

    context = (
        f"Brand: {brand.name}\n"
        f"Industry: {brand.industry}\n"
        f"Tagline: {brand.tagline}\n"
        f"Voice: {brand.voice_description}\n"
        f"Target Audience: {brand.target_audience}\n\n"
        f"Tone Profile:\n{tone_block}\n\n"
        + (f"Reference Posts:\n{ref_block}\n\n" if ref_block else "")
        + f"Marketing Analysis:\n"
        f"Positioning: {analysis.competitive_positioning}\n"
        f"Key Differentiators: {', '.join(analysis.key_differentiators)}\n"
        f"Audience Insights: {analysis.target_audience_insights}\n"
        f"Recommended Platforms: {', '.join(p.value for p in analysis.recommended_platforms)}\n"
        f"Content Themes: {', '.join(analysis.content_themes)}\n"
        f"Tone: {analysis.tone_guidelines}\n"
        f"Cadence: {analysis.weekly_cadence}\n"
    )

    resp = client.chat.completions.create(
        model=ASI_ONE_MODEL,
        messages=[
            {"role": "system", "content": SLATE_SYSTEM_PROMPT},
            {"role": "user", "content": context},
        ],
        max_tokens=4096,
    )

    raw = resp.choices[0].message.content or "[]"
    slots_data = json.loads(_clean_json_response(raw))

    now = datetime.now(tz=timezone.utc)
    next_monday = now + timedelta(days=(7 - now.weekday()) % 7 or 7)

    slots = []
    for i, slot_data in enumerate(slots_data[:7]):
        platform_str = slot_data.get("platform", "instagram")
        try:
            platform = Platform(platform_str)
        except ValueError:
            platform = Platform.INSTAGRAM

        scheduled = next_monday + timedelta(days=i, hours=9)

        slots.append(
            ContentSlot(
                slot_id=f"slot-{uuid4().hex[:8]}",
                slot_number=slot_data.get("slot_number", i + 1),
                caption=slot_data.get("caption", ""),
                image_prompt=slot_data.get("image_prompt", ""),
                platform=platform,
                scheduled_for=scheduled,
                status="proposed",
            )
        )

    slate_id = f"slate-{uuid4().hex[:8]}"
    return Slate(
        slate_id=slate_id,
        brand_id=brand.brand_id,
        org_id=brand.org_id,
        slots=slots,
        generation_context=f"Generated by Strategist for {brand.name}",
    )


# ── Single-slot helper for the Cognition path ──


def _coerce_brand(brand_kit: dict | BrandKit) -> BrandKit:
    if isinstance(brand_kit, BrandKit):
        return brand_kit
    # Fill required fields with sane defaults so the LLM prompt builds.
    payload = dict(brand_kit)
    payload.setdefault("brand_id", payload.get("id", "unknown"))
    payload.setdefault("org_id", "unknown")
    payload.setdefault("name", payload.get("name", "Brand"))
    payload.setdefault("tagline", payload.get("tagline", ""))
    payload.setdefault("voice_description", payload.get("voice_description", ""))
    payload.setdefault("target_audience", payload.get("target_audience", ""))
    payload.setdefault("color_palette", payload.get("color_palette", []))
    payload.setdefault("sample_captions", payload.get("sample_captions", []))
    payload.setdefault("industry", payload.get("industry", ""))
    return BrandKit(**payload)


def propose_one(
    brand_kit: dict | BrandKit,
    recipe: dict,
    retry_with_critique: dict | None = None,
) -> ContentSlot:
    """Generate exactly one ContentSlot for a cognition agent's interval tick.

    Args:
        brand_kit: Brand profile (dict from `get_brand_kit()` or a BrandKit).
        recipe: dict with optional keys: display_name, role_line, cadence,
            owns_channels, voice_traits, description, channel.
        retry_with_critique: Optional CriticVerdict-shaped dict from a prior
            rejection — appended to the prompt so the LLM addresses feedback.
    """
    brand = _coerce_brand(brand_kit)
    client = _get_client()
    tone_block = _build_tone_block(brand)
    ref_block = _build_reference_block(brand)

    channels = recipe.get("owns_channels") or ([recipe["channel"]] if recipe.get("channel") else [])
    channel_line = (
        f"Preferred platform(s): {', '.join(channels)}\n" if channels else ""
    )

    voice_traits = recipe.get("voice_traits") or []
    traits_line = (
        f"Voice traits to emphasize: {', '.join(voice_traits)}\n" if voice_traits else ""
    )

    critique_block = ""
    if retry_with_critique:
        critique_block = (
            "Previous attempt was rejected by the Critic. Address this feedback:\n"
            f"- Summary: {retry_with_critique.get('summary', '')}\n"
            f"- Average score: {retry_with_critique.get('average', 'n/a')}\n"
        )
        for s in retry_with_critique.get("scores", []):
            critique_block += f"- {s.get('axis', '?')}: {s.get('reasoning', '')}\n"

    context = (
        f"Brand: {brand.name}\n"
        f"Industry: {brand.industry}\n"
        f"Tagline: {brand.tagline}\n"
        f"Voice: {brand.voice_description}\n"
        f"Target Audience: {brand.target_audience}\n\n"
        f"Tone Profile:\n{tone_block}\n\n"
        + (f"Reference Posts:\n{ref_block}\n\n" if ref_block else "")
        + f"Agent Recipe:\n"
        f"- Role: {recipe.get('role_line') or recipe.get('display_name', 'Recurring agent')}\n"
        f"- Cadence: {recipe.get('cadence', 'weekly')}\n"
        f"- Description: {recipe.get('description', '')}\n"
        f"{traits_line}{channel_line}\n"
        + (critique_block + "\n" if critique_block else "")
    )

    resp = client.chat.completions.create(
        model=ASI_ONE_MODEL,
        messages=[
            {"role": "system", "content": SINGLE_SLOT_SYSTEM_PROMPT},
            {"role": "user", "content": context},
        ],
        max_tokens=1024,
    )

    raw = resp.choices[0].message.content or "{}"
    data = json.loads(_clean_json_response(raw))

    platform_str = data.get("platform") or (channels[0] if channels else "instagram")
    try:
        platform = Platform(platform_str)
    except ValueError:
        platform = Platform.INSTAGRAM

    scheduled = datetime.now(tz=timezone.utc) + timedelta(hours=1)

    return ContentSlot(
        slot_id=f"slot-{uuid4().hex[:8]}",
        slot_number=1,
        caption=data.get("caption", ""),
        image_prompt=data.get("image_prompt", ""),
        platform=platform,
        scheduled_for=scheduled,
        status="proposed",
    )


# ── Agentverse agent setup ──

agent = Agent(
    name="AgentBuffer-Strategist",
    seed=STRATEGIST_SEED,
    port=STRATEGIST_PORT,
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

    text = ""
    for item in msg.content:
        if isinstance(item, TextContent):
            text += item.text

    # Check if this is a request from the Head Agent
    if text.startswith("[STRATEGIST_REQUEST:"):
        prefix_end = text.index("]")
        session_id = text[len("[STRATEGIST_REQUEST:") : prefix_end]
        payload_text = text[prefix_end + 1 :].strip()

        try:
            payload = json.loads(payload_text)
            brand = BrandKit(**payload["brand"])
            analysis = MarketingAnalysis(**payload["analysis"])
            slate = generate_slate(brand, analysis)

            reply_text = f"[STRATEGIST_REPLY:{session_id}]\n{slate.json()}"
            await ctx.send(
                sender,
                ChatMessage(
                    timestamp=datetime.now(tz=timezone.utc),
                    msg_id=uuid4(),
                    content=[TextContent(type="text", text=reply_text)],
                ),
            )
        except Exception as exc:
            logger.error("Strategist processing failed: %s", exc)
            await ctx.send(
                sender,
                ChatMessage(
                    timestamp=datetime.now(tz=timezone.utc),
                    msg_id=uuid4(),
                    content=[
                        TextContent(
                            type="text",
                            text=f"[STRATEGIST_REPLY:{session_id}]\n"
                            + json.dumps({"error": str(exc)}),
                        ),
                        EndSessionContent(type="end-session"),
                    ],
                ),
            )
    else:
        # Direct user interaction — generate slate from free-form text
        await ctx.send(
            sender,
            ChatMessage(
                timestamp=datetime.now(tz=timezone.utc),
                msg_id=uuid4(),
                content=[
                    TextContent(
                        type="text",
                        text=(
                            "I'm the AgentBuffer Strategist. I generate content plans "
                            "when dispatched by the Marketing Director. "
                            "Please chat with the main AgentBuffer agent instead."
                        ),
                    ),
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
