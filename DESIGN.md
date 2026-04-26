# AgentBuffer — 1-Page Design Doc

> **Buffer for autonomous brand agents.** You hire AI agents, not write posts.

## The idea, in one paragraph
A user onboards their brand once (Q&A + PDFs + past videos + linked socials). The app spawns a small team of AI agents *tied to that brand* that wake up on a schedule, generate on-brand image/video/carousel content, run it past a Critic agent that **must reject** weak work, then auto-publish. One brand → its own agents → posts go out while you sleep.

## The agent topology (this is the whole product)
```
   ┌───────────┐   proposes   ┌──────────┐  approved   ┌──────────┐
   │STRATEGIST │ ───────────▶ │  CRITIC  │ ──────────▶ │PUBLISHER │
   │ (plans    │              │ (rejects │             │ (posts   │
   │  weekly   │ ◀─── try ────│  ≥1 per  │             │  via     │
   │  slate)   │     again    │  demo)   │             │  Ayrshare│
   └───────────┘              └──────────┘             └────┬─────┘
                                                            ▼
                                                  LinkedIn · X · IG-queued
```
3 Python uAgents on Fly + Agentverse. Every handoff writes a signed envelope to an `agent_messages` ledger we render live.

## 90-second demo (the only thing judges remember)
| Time | Beat | Sponsor moment |
|------|------|----------------|
| 0–20s | Onboard `lumen.coffee` → Claude extracts brand kit | **Anthropic** |
| 20–35s | Critic **rejects slot 3** at 3.2/5 with rubric on screen | **Fetch.ai** (multi-agent) |
| 35–55s | Re-plan → Nano Banana renders → Critic flags crop → same-seed regen fixes side-by-side | **Google** |
| 55–72s | ASI:One query highlights 2 slots → click "Publish" → pre-recorded permalink labeled `recorded H-3` → judge clicks LinkedIn URL | **Fetch.ai** (ASI:One) |
| 72–90s | Veo hero plays from Cloudinary + Agentverse deep links | **Google + Cloudinary** |

**Live Ayrshare publish = Q&A only.** Stage climax never depends on a third-party POST.

## Sponsor mix (~$10k EV)
| Sponsor | Prize | Win story |
|---|---|---|
| **Fetch.ai** | $4k + interview | 3 uAgents, adversarial Critic, ASI:One NL ranker (30 lines) |
| **Cognition (Devin)** | $2.5k + 1k ACUs + Windsurf Pro | Devin owns Publisher reliability *end-to-end* (idempotency, backoff, dead_letters, replay CLI, fault-injection harness — second session triggered by failing test from first) |
| **Google** | credits + prize | Nano Banana 2 with same-seed iteration on stage; Veo at onboarding (not live) |
| **Anthropic** | credits | Claude Sonnet 4.5 powers extraction + Critic rubric (visible failures, no rubber-stamp 4.6/5) |
| **Cloudinary** | React AI prize | `l_fetch` server-side brand-bar overlay + named transforms |
| **Supabase + Vercel + MLH** | hygiene | Auth Hook + RLS, deploy, "Best Use of AI" |

## Stack
```
apps/web         Next.js 15 + Vercel + server actions + Supabase Auth
services/        strategist · critic · publisher  (Python uAgents on Fly)
gateway          read-only FastAPI, forwards user JWT (no service-role in web)
data             Supabase Postgres + Storage + RLS on org_id
media            Nano Banana 2 (sync) · Veo (onboarding) · Cloudinary
publish          Ayrshare → team LinkedIn + personal X · IG "queued for review"
codegen          Pydantic → TS via datamodel-code-generator (CI)
```

## Hour-by-hour (36h, 3 eng + 1 PM)
- **H0–4** scaffold · Supabase + Auth Hook · Vercel · Ayrshare token · **Devin session #1** kicks off (Publisher subsystem)
- **H4–12** onboarding + Claude tool-use + slate schema + calendar
- **H12–18** Strategist + Critic uAgents + Chat Protocol envelope debugging (isolated)
- **H18–22** Publisher + FastAPI gateway · **HARD GATE H20: 3 agents on Agentverse**
- **H22–26** Nano Banana reference + same-seed + Cloudinary transforms
- **H26–30** ASI:One ranker · **Devin session #2** (fault injection) · Veo onboarding hero
- **H30–32** record per-segment backup video against staging
- **H32–34** 4 dry runs · **30-min slack between runs 2 and 3**
- **H34–35** Devpost + README + manifest polish
- **H35–36** submit with 30-min margin

## Risks → mitigations (memorize these for Q&A)
- **Ayrshare flake** → climax doesn't depend on it; pre-recorded permalink, live = Q&A B-path
- **X throttling** → pre-recorded permalink
- **Critic over-approves** → seeded rejection hard-coded in demo
- **Agentverse endpoint stale** → Fly **public hostnames**, no ngrok
- **JWT bypass** → gateway forwards user token only; service-role lint-banned in `apps/web`
- **RLS regression** → pgTAP cross-org test in CI **and** before each dry run
- **Schedule slip** → recorded backup video independent of live system

## Don't build (this list is sacred)
Direct TikTok/Meta/IG/LinkedIn/X Graph APIs · IG live-post claims (use the pill) · watermark stripping · live Veo · live Devin during demo · `auth.users` triggers · Clerk · Convex · BullMQ · pgvector · runtime RAG · TS↔Python codegen by hand · exact-hex matching · Sharp post-pass overlays · second seeded brand · admin panel · analytics · billing · Stripe · mobile · dark mode · settings page · email · team invites

## The 3 things that win us the prize
1. **Critic uAgent must reject something on stage** — proves multi-agent is real, not 3 function calls dressed up.
2. **Devin owns one whole subsystem** (Publisher reliability with fault-injection) — not 2 small chores. That's the artifact Cognition rewards.
3. **Pre-recorded Ayrshare permalink at climax, labeled honestly.** Live publish dies on stage; we don't bet on it.

---
*Full reasoning lineage: [reason/260424-sponsor-mix/](reason/260424-sponsor-mix/)*
