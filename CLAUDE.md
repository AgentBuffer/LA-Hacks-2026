# AgentBuffer — Project Context for Claude

This file is loaded into every Claude session in this directory. Keep it short and current. Add to it as decisions get made.

## What we're building

**AgentBuffer** — Buffer for autonomous brand agents. User onboards a brand once, then **hires recurring "cognition" agents** from the dashboard. Each cognition agent is a uAgent on Agentverse bound to one `scheduled_agents` row. On its declared cadence it runs a propose → critique → (revise) → publish pass through the shared **3 helper uAgents** (Strategist, Critic, Publisher). The Critic must reject weak work.

**Hackathon:** LA Hacks 2026 (UCLA). **Submission deadline:** Sunday 2026-04-26. **Team:** 3 eng + 1 PM. **Build window:** 36h.

The 1-page design doc is in [DESIGN.md](DESIGN.md). The reasoning lineage that produced the original plan is in [reason/260424-sponsor-mix/](reason/260424-sponsor-mix/). **The codebase has expanded past DESIGN.md** — this file is now the authoritative description of what's built.

## Agent topology (as built)

```
                ┌──────────────┐
   user chat ──▶│  head_agent  │──▶ INTAKE→ANALYSIS→STRATEGIZE→CRITIQUE→media→publish
   (ASI:One)    │ (orchestrator│         (one big run, full pipeline incl. media sub-agents)
                └──────────────┘

                ┌──────────────┐  ASI:One parses prompt → spec
   Create UI ──▶│  main_agent  │──▶ insert into scheduled_agents
                └──────────────┘

   for each scheduled_agents row:
     ┌──────────────┐ on_interval(cadence)  ┌─────────────┐  ┌────────┐  ┌──────────┐
     │ cognition_N  │──────────────────────▶│ Strategist  │─▶│ Critic │─▶│Publisher │
     │ (per-brand   │                       │  (helper)   │  │(helper)│  │ (helper) │
     │  uAgent)     │                       └─────────────┘  └────────┘  └──────────┘
     └──────────────┘
```

- **3 helpers** (`strategist`, `critic`, `publisher`) — long-lived uAgents, shared across all cognition agents.
- **Cognition agents** — built by `services/cognition/factory.py:make_cognition_agent(row)`; deterministic seed `agentbuffer-cog-{id}` keeps Agentverse addresses stable.
- **Bureau** (`services/cognition/bureau.py`) — single Fly process that registers helpers + main_agent + N cognition agents. **Currently loads `scheduled_agents` once at boot only**; new rows don't get a uAgent until restart (gap, see open questions).
- **Media sub-agents** (`image_creator`, `video_creator`, `carousel_creator`) — sit between Critic and Publisher in the **head_agent pipeline only**; the cognition recurring path doesn't run media generation today.
- **Design layer** (`design_director`, `design_specialists`) — planner + layout specialists.
- **Analytics** (`performance_harvester`) — Bureau-scheduled, daily; writes `perf:{brand_id}:{post_id}` to `ctx.storage`, consumed by head_agent before dispatch.
- **`▶ Run now`** — `services/cognition/run_now.py` triggers one immediate pass for a scheduled agent without waiting for cadence; web app calls it via the gateway.

## Sponsors targeted

- **Fetch.ai** ($4k EV) — primary anchor. 3 uAgents on Agentverse with adversarial Critic loop + 30-line ASI:One NL ranker.
- **Cognition / Devin** ($2.5k + 1k ACUs + Windsurf) — Devin owns Publisher reliability subsystem end-to-end.
- **Google** — Nano Banana 2 (live, with same-seed iteration) + Veo 3.1 (at onboarding only, never live).
- **Anthropic** — Claude Sonnet 4.5 for brand extraction + Critic rubric.
- **Cloudinary** — server-side `l_fetch` brand-bar overlay + named transforms.
- **Supabase + Vercel + MLH** — hygiene wins.

## Stack

| Layer | Choice |
|---|---|
| Web | Next.js 15 (App Router) + server actions on Vercel |
| Auth | Supabase Auth (NOT Clerk) |
| DB | Supabase Postgres + Storage + RLS via Auth Hook (NOT `auth.users` trigger) |
| Agent runtime | Python 3.12 uAgents on Fly.io / Railway, mailbox=True, public agent details |
| Orchestrators | `services/head_agent` (ASI:One chat), `services/main_agent` (Create-flow spec parser + spawner) |
| Helpers | `services/strategist`, `services/critic`, `services/publisher` |
| Cognition runtime | `services/cognition` — `factory.py`, `bureau.py`, `run_now.py`, `parse_cadence.py` |
| Media sub-agents | `services/image_creator` (Imagen), `services/video_creator` (Veo), `services/carousel_creator` |
| Design | `services/design_director`, `services/design_specialists` (layout) |
| Analytics | `services/performance_harvester` |
| Web↔agents | read-only FastAPI gateway (`gateway/`), forwards user JWT |
| Types | Pydantic → TS via `datamodel-code-generator` in CI |
| Media APIs | Nano Banana 2 (Gemini), Veo 3.1, Cloudinary, Imagen |
| Publishing | Direct platform APIs (LinkedIn, X, Instagram, TikTok, YouTube, Bluesky) via `services/publisher/adapters/*` |
| Repo | Monorepo with pnpm + uv. `AgentBuffer-team/` holds services + supabase + the original `apps/web/`; a second active web tree lives at repo root `web/` |

## Key data tables

- `scheduled_agents` — one row per hired cognition agent. Fields: `slug`, `display_name`, `cadence`, `owns_channels[]`, `voice_traits[]`, `tools[]`, `status`, `health`, `next_run_at`. RLS-isolated by `org_id` from JWT app_metadata. Migration: `00006_scheduled_agents.sql`.
- `live_runs` + `agent_messages` — the envelope ledger streamed to `/dashboard/live` via Supabase Realtime. `factory.run_once` writes one `agent_messages` row per pipeline step.
- `brands`, `brand_kits` — onboarding output (Claude Sonnet 4.5 extraction).
- `content_slots` — generated content rows; `slate_id` UUID groups slots from one run.
- `platform_connections` — per-brand OAuth tokens (access_token, refresh_token, token_expires_at, account_id) keyed by `(org_id, brand_id, platform)`. Loaded by Publisher to override env-var fallbacks before each adapter call.

## Banned / explicitly NOT building

IG live-post claims · watermark stripping · live Veo · live Devin during demo · `auth.users` triggers · Clerk · Convex · BullMQ · pgvector · runtime RAG · hand-mirrored TS types · exact-hex matching · Sharp post-pass overlays · second seeded brand · admin panel · analytics · billing · Stripe · mobile · dark mode · settings · email · team invites · multi-region · custom auth.

(Direct platform APIs — LinkedIn, X, Instagram, TikTok, YouTube, Bluesky — are now the sanctioned publish path. The publisher uses platform SDKs/REST directly, not Ayrshare.)

If a teammate suggests adding any of these, push back — they were debated and rejected in the reasoning lineage.

## Demo principles (non-negotiable)

1. **Critic uAgent must reject something on stage** (seeded if needed).
2. **Climax = ASI:One query + pre-recorded Ayrshare permalink labeled honestly** (`recorded H-3`). Live publish = Q&A B-path only.
3. **Veo never live during demo.** Generated at onboarding with visible render receipt.
4. **Devin output is bonus, not critical path.** Hand-written fallback ready by H6.
5. **Hard gate H20: 3 agents registered on Agentverse.**

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-04-24 | 3 uAgents (Strategist, Critic, Publisher) as shared helpers | Critic-must-reject makes multi-agent load-bearing for Fetch.ai prize |
| 2026-04-24 | Devin scoped to Publisher reliability subsystem end-to-end | Cognition rewards subsystem ownership, not 2 narrow tasks |
| 2026-04-24 | Veo at onboarding, not live in demo | 60–180s latency kills live demo |
| 2026-04-24 | Cloudinary `l_fetch` overlay (server-side), not Sharp post-pass | Avoids exact-hex matching ban |
| 2026-04-24 | Skip Clerk → Supabase Auth + Auth Hook | Avoids JWT-to-Postgres plumbing trap; `auth.users` trigger footguns |
| 2026-04-24 | Ayrshare to team's own LinkedIn + personal X | IG/TikTok need 24h+ app review |
| 2026-04-25 | Add `head_agent` (ASI:One orchestrator) on top of helpers | Gives users a single chat surface; routes through full media pipeline |
| 2026-04-25 | Add `main_agent` for Create-screen spec extraction | Free-form prompt → JSON spec → `scheduled_agents` insert via ASI:One |
| 2026-04-25 | One uAgent per `scheduled_agents` row (cognition pattern) | Each hired agent gets its own deterministic Agentverse address; cadence is `agent.on_interval(parse_cadence(row))` |
| 2026-04-25 | Cognition recurring path = single-slot propose→critique→(revise once, force-approve)→publish | Slate-level rejection stays in head_agent runs; cognition path is for steady drip content, not for the hard-reject demo beat |
| 2026-04-25 | Media sub-agents (image/video/carousel) only in head_agent pipeline | Cognition recurring runs stay fast; head_agent runs do the full media flex |
| 2026-04-25 | `performance_harvester` is Bureau-scheduled (daily) | Writes to `ctx.storage` keyed `perf:{brand_id}:{post_id}`; head_agent reads before strategist dispatch |
| 2026-04-25 | Add TikTok as a live publish target via direct TikTok Content Posting API (`/v2/post/publish/video/init/`) | Reverses the 2026-04-24 ban on direct TikTok API. Publisher already uses direct APIs for LinkedIn/X/Instagram/YouTube/Bluesky — TikTok matches that pattern via `services/publisher/adapters/tiktok.py` rather than going through Ayrshare. Onboarding now collects a TikTok URL alongside LinkedIn/X/IG. |

## Open questions

- [ ] **Two web trees exist**: `AgentBuffer-team/apps/web/` (locked-plan path, untouched since H0) and `web/` at repo root (active, last edited today). Which is canonical? One should be deleted before submission.
- [ ] **Bureau-boot-only registration**: `bureau.py` reads `scheduled_agents` once at startup. New rows from the Create flow don't get a uAgent until the Bureau restarts. Options: (A) watcher loop diffing every 30s, (B) restart on insert, (C) accept and rely on `run_now` for first-run. Leaning A.
- [ ] **head_agent vs main_agent overlap** — both can produce content plans. Is head_agent for one-off marketing-director runs and main_agent only for spawning recurring agents? Confirm and document the boundary.
- [ ] Final brand for the demo — `lumen.coffee` is the working choice; need real assets.
- [ ] Who runs the SchedulerClient script during the live Q&A B-path attempt?
- [ ] Devin session #1 ticket scope — exact PR boundary for Publisher reliability.
- [ ] Critic rubric — final 5 axes wording.

## How to help me when you're Claude in this repo

- **Read the code, not just DESIGN.md.** The codebase has expanded past the original 1-page design. When in doubt about topology, check `services/cognition/bureau.py` — that file is the source of truth for what runs in production.
- Default to the locked stack. Don't suggest Clerk, Convex, BullMQ, pgvector, or runtime RAG unless I explicitly ask why we ruled them out.
- The **3 helpers** (`strategist`, `critic`, `publisher`) are shared singletons. Don't suggest spawning them per-brand.
- Each **cognition agent** is per-brand and built from a `scheduled_agents` row. Use deterministic seeds (`agentbuffer-cog-{id}`) so addresses stay stable across restarts.
- The **head_agent** is the user-facing ASI:One chat orchestrator (full marketing-director run, with media). The **main_agent** parses Create-screen prompts into specs and inserts rows. Don't conflate them.
- Code style: TypeScript strict in `web/` (and `apps/web/`), Python 3.12 with Pydantic in `services/*`. No hand-mirroring types — codegen.
- For demo-day work, optimize for *honesty* over wow factor. Pre-recorded with disclosure beats live theater.
- Update this file when we lock new decisions. Don't ask permission — just add a row to the decisions log.
