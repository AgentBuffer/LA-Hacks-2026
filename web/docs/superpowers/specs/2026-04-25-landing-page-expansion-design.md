# Landing Page Expansion — Design Spec

**Date:** 2026-04-25
**Status:** Draft, pending review
**Owner:** web team
**File touched primarily:** [web/app/page.tsx](../../../app/page.tsx)
**Demo deadline:** 2026-04-26 (Sunday)

## Goal

Expand the public landing page so a sponsor judge skimming for ~30 seconds can answer:

1. **What is AgentBuffer?** (already covered by current hero)
2. **What does the product actually look like?** (NEW — a real product visual)
3. **How are sponsor technologies used here, specifically?** (NEW — replace logo strip with one-sentence integration credits)
4. **Is there evidence this works?** (NEW — show the Critic rejecting a draft)

A secondary audience is a non-judge visitor who might sign up. The hero CTA already serves them; the new sections should reinforce, not distract.

## Non-goals

- No redesign of the existing hero, nav, or footer (keep editorial aesthetic intact).
- No dark mode, pricing page, separate `/about` route, blog, signup form on landing, testimonials, or interactive product tour.
- No new brand visuals beyond the OG image and one Critic-in-action artifact.
- No copy changes to the existing 3-step "How it works" section.

## Final page structure

```
Nav                   (existing, + anchor links: Product · Agents · Sponsors)
Hero                  (existing, + small "watch the Critic reject a post →" link)
Product peek          NEW
How it works          (existing, unchanged)
Meet the three agents NEW
Critic in action      NEW
Built with            REPLACES current SponsorStrip
FAQ                   NEW (3 questions)
Final CTA             NEW
Footer                (existing, + GitHub and design-doc links)
```

Sections render top-to-bottom inside `<main>`. Each new section is a self-contained function component in [web/app/page.tsx](../../../app/page.tsx), matching the existing `Hero`/`HowItWorks`/`SponsorStrip` pattern.

## New sections — detailed

### Product peek

- **Purpose:** give the page a real product visual above the fold-2 line.
- **Content:** one captioned screenshot of the dashboard with the calendar + agents grid visible. Caption: "Your week, on autopilot."
- **Asset:** static PNG at `web/public/marketing/dashboard-peek.png` (export from the running dashboard at 1600px wide; downscale via Next/Image).
- **Layout:** centered, max-width 1100px, paper background, 1.2px ink-2 border, radius `--r-lg`. No animation in v1.
- **Eyebrow text (font-mono, uppercase):** `the product`.
- **Headline (font-serif, ~28px):** "Your week, on autopilot."

### Meet the three agents

- **Purpose:** make the multi-agent topology visible and credit Fetch.ai and Anthropic in a load-bearing way.
- **Content:** three cards in a 3-col grid, matching the visual style of the existing `HowItWorks` cards.
  - **Strategist** — "Wakes on schedule, drafts on-brand posts. Powered by Fetch.ai uAgents on Agentverse."
  - **Critic** — "Scores every draft against a 5-axis brand rubric. Rejects anything off-voice. Powered by Claude Sonnet 4.5."
  - **Publisher** — "Hands approved posts to LinkedIn and X. Reliability subsystem built with Cognition Devin."
- **Visual:** each card uses the existing `AgentAvatar` component (or a brand-mark variant) at the top, role label, body copy. No tech logos inside cards — sponsor names are in body copy text only.
- **Eyebrow:** `the cast`. **Headline:** "Three agents. One brand."

### Critic in action

- **Purpose:** show evidence the Critic actually rejects something.
- **Content:** a single panel showing a draft post on the left and a Critic verdict on the right (`Verdict` component already exists at [web/components/ui/verdict.tsx](../../../components/ui/verdict.tsx)). Verdict shows REJECTED with a rubric breakdown. Below: one-line caption "Real rejection, real rubric. The Critic blocks ~1 in 4 drafts."
- **Asset:** hardcoded mock data (one rejected draft + verdict object) — no live agent call from the marketing page. Keep as static layout to avoid runtime dependency on the gateway.
- **Visual:** two-col grid, paper card, ink-2 border, same radius. Mobile fallback: stack.
- **Eyebrow:** `quality gate`. **Headline:** "The Critic rejects what doesn't sound like you."

### Built with (replaces SponsorStrip)

- **Purpose:** sponsor judges read this section first. Replace logo wall with specific integration credits.
- **Content:** 2-col grid, 6 rows. Each row: sponsor name (font-mono, uppercase, 11px) + one-sentence integration credit (text-ink-2, 13px).
  - **Fetch.ai** — Three uAgents (Strategist, Critic, Publisher) live on Agentverse, with a 30-line ASI:One natural-language ranker.
  - **Cognition / Devin** — Owns the Publisher reliability subsystem end-to-end (retries, dead-letter queue, circuit breaker).
  - **Google** — Nano Banana 2 for live image generation with same-seed iteration; Veo 3.1 for onboarding intro clips.
  - **Anthropic** — Claude Sonnet 4.5 powers brand extraction at onboarding and the Critic's 5-axis rubric.
  - **Cloudinary** — Server-side `l_fetch` brand-bar overlay via named transforms.
  - **Supabase + Vercel** — Auth via Supabase Auth Hook, Postgres + Storage with RLS, Next.js 15 on Vercel.
- **Eyebrow:** `built with`. **Headline:** none (eyebrow only — keep section calm).
- **Drop the previous grayscale logo strip entirely.**

### FAQ

- **Purpose:** preempt the three questions a curious viewer asks.
- **Content:** 3 Q/A pairs as a simple unstyled definition list. No accordion (avoid JS).
  - **Can I post to Instagram?** "We queue IG drafts for review but don't auto-publish — Meta's Graph API needs a 24-hour app review we couldn't get during the hackathon. LinkedIn and X publish live."
  - **Who owns the content?** "You do. AgentBuffer drafts and posts on your behalf; nothing is reused or trained on."
  - **What happens if I don't like a draft?** "The Critic catches most off-voice drafts before you see them. For anything that slips through, you can reject from the calendar in one click."
- **Eyebrow:** `questions`. **Headline:** "Things you'll probably ask."

### Final CTA

- **Purpose:** restate the primary action after the longer scroll.
- **Content:** one centered line "Hire your first agent in three minutes." + primary button → `/signup` + outline button → `/login`.
- **Visual:** matches hero CTA spacing, no background tint.

## Nav changes

- Add anchor links to nav: `Product`, `Agents`, `Sponsors`. Smooth-scroll via `scroll-behavior: smooth` on `html` (already standard CSS — no JS).
- On viewports `<768px`, hide anchor links; keep Sign in / Get started.
- Each new section gets a stable `id` for the anchor (`#product`, `#agents`, `#sponsors`).

## Metadata and OG image

- Add `metadata` export in [web/app/layout.tsx](../../../app/layout.tsx):
  - `title`: "AgentBuffer — Hire AI agents that run your brand"
  - `description`: "Onboard your brand once. Spawn AI agents that wake up on schedule, generate on-brand content, and post — while a Critic agent rejects anything off-voice."
  - `openGraph.images`: `/og.png`
  - `twitter.card`: `summary_large_image`
- Add static OG image at `web/public/og.png` (1200×630). Hand-composed in design tool — wordmark + tagline on cream background. Falls within existing brand palette.

## Footer changes

- Add right-aligned links: `GitHub →` (existing), `Design doc →` (links to repo `DESIGN.md`).
- No layout changes otherwise.

## Component reuse

| Need | Existing component | Source |
|---|---|---|
| Buttons | `Button` (primary/outline/ghost, size sm/lg) | [components/ui/button.tsx](../../../components/ui/button.tsx) |
| Brand mark | `BrandMark` | [components/ui/brand-mark.tsx](../../../components/ui/brand-mark.tsx) |
| Agent avatar | `AgentAvatar` | [components/ui/agent-avatar.tsx](../../../components/ui/agent-avatar.tsx) |
| Critic verdict panel | `Verdict` | [components/ui/verdict.tsx](../../../components/ui/verdict.tsx) |

No new shared components are needed. Section components live inline in [page.tsx](../../../app/page.tsx) following the existing pattern.

## Visual system

All new sections use the existing tokens defined in [web/app/globals.css](../../../app/globals.css):

- Backgrounds alternate `bg-bg` and `bg-paper` to give vertical rhythm (same alternation pattern the page already uses).
- Eyebrow text: `font-mono text-[10.5px] uppercase tracking-wider text-ink-3`.
- Headlines: `font-serif font-semibold text-[28-32px] tracking-[-0.02em] text-ink`.
- Body: `text-[12.5-14px] text-ink-2 leading-[1.55]`.
- Cards: `border-[1.2px] border-ink-2 rounded-[var(--r-lg)] bg-paper p-5`.
- Section padding: `px-7 py-16` with `max-w-[1100px] mx-auto`.

No new colors, fonts, shadows, or radii. No animation libraries. No new dependencies.

## Responsive behavior

- 3-col grids (`Meet the three agents`, current `HowItWorks`) collapse to 1-col under 768px (`grid-cols-1 md:grid-cols-3`).
- 2-col grids (`Built with`, `Critic in action`) collapse to 1-col under 640px.
- Hero font-size scales down (`text-[40px] md:text-[64px]`).
- Nav anchor links hidden under 768px.

Tailwind handles all breakpoints; no custom media queries.

## Out of scope (explicit)

- Animations, scroll-triggered effects, lottie, parallax.
- Live agent calls from the marketing page (Critic-in-action section is static mock data).
- A/B testing, analytics, conversion tracking.
- Dark mode toggle.
- Localization.
- Any new shared component in `components/ui`.
- Any change to dashboard, onboarding, or auth routes.

## Testing / verification

- Visual: run `pnpm dev` (or `npm run dev`), open `/`, scroll through all sections at 1440px and 375px viewports. Confirm no layout breaks, no horizontal scroll on mobile.
- Type/lint: `pnpm -C web build` (or equivalent) passes with zero TS errors.
- OG: validate at https://www.opengraph.xyz once deployed (or paste a Vercel preview URL).
- Anchor links: clicking nav `Product` / `Agents` / `Sponsors` smooth-scrolls to correct section.

No new automated tests — this is a static marketing page with no logic.

## Risk and rollback

- Risk: new copy contradicts the demo narrative. Mitigation: each sponsor sentence is copied verbatim from [CLAUDE.md](../../../../CLAUDE.md) decisions log, so it stays consistent with what's actually built.
- Risk: dashboard screenshot becomes stale before demo. Mitigation: re-export at H-3 alongside the demo dry-run.
- Rollback: single-file change to [page.tsx](../../../app/page.tsx) plus two new files in `public/`. Revert is one git revert.

## Build estimate

- Sections + nav anchors + footer: ~3 hours one engineer.
- OG image + dashboard screenshot: ~1 hour.
- Metadata export: ~15 minutes.
- Total: ~half a day.
