# Rewire `/dashboard/create` to be a real chat

**Status:** approved 2026-04-25
**Scope:** AgentBuffer hire-an-agent flow at `/dashboard/create`, plus a
small edit-existing-agent extension on `/dashboard/agents`.
**Out of scope:** streaming responses, head_agent "marketing director"
general chat, pause/disable controls, full agent detail page.

## Problem

`/dashboard/create` is theater. The backend (`POST /api/spec/converse` →
`converse_with_main_agent` in `services/main_agent/agent.py`) is a real
multi-turn ASI:One loop that returns `{spec, message, done}` on every
turn. The frontend ignores it: it calls the single-shot `extractSpec`,
substitutes a hardcoded reply ("Drafted a {cadence} post for {channel}.
Spec on the right ↘"), and reveals a fixed `SPEC_REVEAL` constant
(TikTok coffee pours) on `setTimeout(200 + i*150)` timers regardless of
the LLM's actual output. Quick chips, asset preview, estimates card, and
the agent's address `agent1qfn…7m2z9p` are all hardcoded.

Symptom: typing "hello" returns the same coffee-pour spec as anything
else. The user called this out as fake.

## What good looks like

User opens `/dashboard/create`, types something real, gets a real LLM
reply that responds to their words. The spec rail fills in only with
fields the LLM actually produced, pulses the field that just changed,
and a Hire button appears the moment the LLM marks `done=true`. From
`/dashboard/agents`, an Edit button on each card reopens the same chat
seeded with that agent's current spec; saving PATCHes the row.

## Architecture

### Frontend

- `web/components/create/create-view.tsx` — replace single-shot
  `extractSpec` with multi-turn `converseSpec`. Track full message
  history in state. On each send: append user message, call converse,
  append the LLM's `message` text verbatim, replace `spec` state with
  the returned spec, mark `done`.
- `web/components/create/spec-rail.tsx` — drop dependency on
  `SPEC_REVEAL`. Render rows from a fixed schema of spec keys
  (`display_name`, `role_line`, `cadence`, `channel`, `voice_traits`,
  `tools`) using values from the live `spec` state. A row is
  "revealed" iff the spec has that key with a non-empty value. The row
  whose value changed since the previous response pulses for ~800ms.
- `web/components/create/scripted-flow.tsx` — keep only `ChatMessage`
  type and `PIPELINE_STEPS` (latter used post-hire only, if at all).
  Delete `SPEC_REVEAL`, `QUICK_CHIPS`, `SCRIPTED_USER_MESSAGE`.
- `web/components/create/chat-head.tsx` — drop the fake address
  `agent1qfn…7m2z9p`. Header reads "Main · routes through ASI:One".
- Drop `AssetCard` and `EstimatesCard` from the rail. Both show fake
  numbers and confuse the hire flow with content-creation.
- Quick chips become contextual: when `spec.cadence` is missing show
  cadence options; when `done=true` show only a single CTA-style chip
  "ready to hire ↓". When neither, show no chips. Driven by spec
  state, not a constant.
- Errors from `converseSpec` render in the chat as an assistant bubble
  ("spec service unavailable: $reason"). No silent fallback to a
  scripted reveal.

### Backend additions

- `POST /api/spec/converse` already exists. No changes.
- New `PATCH /api/agents/{id}` route in `gateway/routes/agents.py`:
  accepts a partial spec, validates `org_id` matches the row's
  `org_id`, updates allowed columns
  (`display_name`, `role_line`, `cadence`, `owns_channels`,
  `voice_traits`, `tools`, `description`, `avatar_letter`). Reuse the
  same Supabase service-role client as the insert path.
- New helper `update_scheduled_agent(id, patch, org_id)` in
  `services/shared/db.py`.

### Edit flow

- `web/components/agents/agent-card.tsx` — add an Edit button that
  navigates to `/dashboard/create?edit={id}`.
- `create-view.tsx` reads the `edit` query param. If present, fetch
  the row via gateway (`GET /api/agents/{id}` — verify it exists; if
  not, add it), seed `spec` and `messages` (with one synthetic
  assistant turn: "Editing **{display_name}** — what should change?"),
  and on Hire-equivalent action call PATCH instead of POST.

## Data flow (chat turn)

1. User types → `handleSend` appends `{role: "user", body: text}` to
   messages, sets `pending=true`.
2. Client calls `converseSpec(text, currentSpec, brandId)`.
3. Gateway forwards to `converse_with_main_agent`, which calls ASI:One,
   parses JSON, returns `{spec, message, done}`.
4. Client appends `{role: "main", body: response.message}`, replaces
   `spec` state with `response.spec`, sets `done=response.done`.
5. Spec rail re-renders from new spec; pulses any key whose value
   changed.

## Failure modes

- ASI:One creds missing → gateway returns 500. Render "spec service
  unavailable — check ASI_ONE_API_KEY in gateway env" in the bubble.
- LLM returns malformed JSON → backend already falls back to
  `_backfill_spec(current_spec)` and returns a clarifying-question
  message. Frontend treats this normally.
- No brand in DB → header shows "no brand yet — onboard first" and
  send is disabled. (Already true for hire-chat-panel; mirror it.)

## Files touched

- `web/components/create/create-view.tsx` — major rewrite
- `web/components/create/spec-rail.tsx` — major rewrite
- `web/components/create/scripted-flow.tsx` — strip to types only
- `web/components/create/chat-head.tsx` — minor
- `web/components/create/chat-chips.tsx` — minor (props change)
- `web/components/agents/agent-card.tsx` — add Edit button
- `AgentBuffer-team/gateway/routes/agents.py` — add PATCH + GET-by-id
- `AgentBuffer-team/services/shared/db.py` — add `update_scheduled_agent`
- `web/lib/gateway.ts` — add `getAgent`, `updateAgent` helpers

## Testing

Manual, against a live gateway with ASI_ONE_API_KEY set:

1. Open `/dashboard/create`, type "weekly LinkedIn agent that shares a
   Friday reflection on craft." → expect LLM reply that summarizes the
   draft and either asks a follow-up or sets `done=true`. Spec rail
   should fill with display_name, cadence=weekly, channel=linkedin,
   role_line, voice_traits.
2. Reply "make it twice a week instead" → cadence should change in spec
   rail and pulse.
3. When `done=true`, click Hire → row appears on `/dashboard/agents`
   within 30s (supervisor tick).
4. From `/dashboard/agents`, click Edit on the new card → returns to
   create view seeded with that agent's spec. Change cadence to daily,
   click Save → PATCH succeeds, card on `/dashboard/agents` updates.
5. With ASI_ONE_API_KEY unset, repeat (1) → expect a visible error
   bubble, not a silent fallback to coffee-pour content.

No automated tests added (hackathon timeline). Manual verification in
each PR step is the gate.
