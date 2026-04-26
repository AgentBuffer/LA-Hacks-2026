# Landing Page Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the public landing page at [web/app/page.tsx](../../../app/page.tsx) with 5 new sections (Product peek, Meet the three agents, Critic in action, Built with sponsor credits, FAQ, Final CTA), nav anchor links, OG metadata, and a footer addition — all in the existing editorial aesthetic, no new dependencies.

**Architecture:** Single-file expansion. New sections are inline function components in [web/app/page.tsx](../../../app/page.tsx) following the existing `Hero`/`HowItWorks`/`SponsorStrip` pattern. Two new static assets in `web/public/`. One metadata block in [web/app/layout.tsx](../../../app/layout.tsx). Reuse existing `Button`, `BrandMark`, `AgentAvatar`, `Verdict` components — no new shared components.

**Tech Stack:** Next.js 15 (App Router), Tailwind v4 with CSS tokens in [globals.css](../../../app/globals.css), TypeScript strict, lucide-react icons.

**IMPORTANT CAVEAT:** Per [web/AGENTS.md](../../../AGENTS.md), this Next.js may have breaking changes from training data. Before adding the `metadata` export in Task 1, briefly check `web/node_modules/next/dist/docs/` for any deprecation notes about Metadata API.

**Source spec:** [docs/superpowers/specs/2026-04-25-landing-page-expansion-design.md](../specs/2026-04-25-landing-page-expansion-design.md)

**Verification model:** This is a static marketing page with zero runtime logic — there are no unit tests to write. Verification per task is: (a) `pnpm dev` (or `npm run dev`) renders without console errors, (b) the new section appears, (c) `pnpm -C web build` (or `npm run build` from `web/`) passes when the plan completes. The repo is not a git repo, so "commit" steps are replaced with "Checkpoint: visually verify in browser."

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| [web/app/page.tsx](../../../app/page.tsx) | Modify | Add 5 new section components; modify `MarketingNav`, `MarketingFooter`; remove `SponsorStrip`; update `Home` to compose new order |
| [web/app/layout.tsx](../../../app/layout.tsx) | Modify | Expand `metadata` export with OG, Twitter, full title/description |
| [web/app/globals.css](../../../app/globals.css) | Modify | Add `scroll-behavior: smooth` on `html` |
| `web/public/og.png` | Create | 1200×630 OG image. Hand-composed: cream background, "AgentBuffer" wordmark, tagline. |
| `web/public/marketing/dashboard-peek.png` | Create | Dashboard screenshot exported from `/dashboard` at 1600px wide |

No other files are touched. No new dependencies, no new shared components.

---

## Task 1: Metadata + smooth-scroll groundwork

**Files:**
- Modify: [web/app/layout.tsx](../../../app/layout.tsx) (lines 27–30)
- Modify: [web/app/globals.css](../../../app/globals.css)

- [ ] **Step 1: Read Next.js Metadata docs in node_modules**

Run: `ls "/Users/remiel/LA Hacks 2026/web/node_modules/next/dist/docs/" 2>/dev/null | grep -i meta`

If a metadata-related doc exists, skim it for any deprecation notes. If nothing is returned, proceed — current Next.js 15 Metadata API matches what's already in [layout.tsx:27-30](../../../app/layout.tsx).

- [ ] **Step 2: Replace the `metadata` export in `layout.tsx`**

Replace lines 27–30 of [web/app/layout.tsx](../../../app/layout.tsx) with:

```tsx
export const metadata: Metadata = {
  title: {
    default: "AgentBuffer — Hire AI agents that run your brand",
    template: "%s · AgentBuffer",
  },
  description:
    "Onboard your brand once. Spawn AI agents that wake up on schedule, generate on-brand content, and post — while a Critic agent rejects anything off-voice.",
  openGraph: {
    title: "AgentBuffer — Hire AI agents that run your brand",
    description:
      "Spawn AI agents that wake up on schedule, generate on-brand content, and post — while a Critic agent rejects anything off-voice.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentBuffer — Hire AI agents that run your brand",
    description:
      "Spawn AI agents that wake up on schedule, generate on-brand content, and post — while a Critic agent rejects anything off-voice.",
    images: ["/og.png"],
  },
};
```

- [ ] **Step 3: Add smooth-scroll to globals.css**

Append to [web/app/globals.css](../../../app/globals.css) (after the existing `@keyframes ab-pulse` block):

```css
html {
  scroll-behavior: smooth;
}
```

- [ ] **Step 4: Verify dev server starts without errors**

Run from `web/`: `pnpm dev` (or `npm run dev`)

Expected: server starts on localhost:3000, no compile errors. Visit `/` and confirm tab title now shows "AgentBuffer — Hire AI agents that run your brand". View page source and confirm `<meta property="og:image" content="/og.png">` is present (image will 404 until Task 2 — that's fine).

- [ ] **Step 5: Checkpoint**

Stop the dev server. Note: "Metadata + smooth-scroll done."

---

## Task 2: Add OG image and dashboard screenshot assets

**Files:**
- Create: `web/public/og.png` (1200×630)
- Create: `web/public/marketing/dashboard-peek.png` (1600px wide)

- [ ] **Step 1: Create the marketing assets directory**

Run: `mkdir -p "/Users/remiel/LA Hacks 2026/web/public/marketing"`

- [ ] **Step 2: Generate the OG image**

Open Figma (or any design tool). Create a 1200×630 frame.
- Background: `#FAF8F4` (matches `--bg` cream)
- Centered: word "AgentBuffer" in Fraunces SemiBold 96px, color `#2A211A`
- Below, in JetBrains Mono 22px uppercase tracking-wider, color `#7A6B5C`: "HIRE AI AGENTS THAT RUN YOUR BRAND"
- Bottom-right corner, 32px padding, mono 14px: "lahacks 2026"

Export as PNG at 1× and save to `web/public/og.png`.

- [ ] **Step 3: Capture the dashboard screenshot**

Start dev server (`pnpm dev`). Sign in with a seeded account so the dashboard has agents and calendar posts visible. Navigate to `/dashboard`. Take a screenshot at viewport width 1600px (use browser dev tools device-toolbar to set viewport, or use `cmd+shift+4` on macOS after resizing). Crop tightly to the dashboard chrome (no browser UI). Save as `web/public/marketing/dashboard-peek.png`.

If the dashboard is empty (no seeded data), use the demo seed script first — check `web/actions/` or `services/` for a seeder.

- [ ] **Step 4: Verify both assets load**

Restart dev server. Open `http://localhost:3000/og.png` and `http://localhost:3000/marketing/dashboard-peek.png` in the browser. Both must render the images, not 404.

- [ ] **Step 5: Checkpoint**

Note: "Static assets in place."

---

## Task 3: Update MarketingNav with anchor links

**Files:**
- Modify: [web/app/page.tsx](../../../app/page.tsx) (lines 20–43, the `MarketingNav` function)

- [ ] **Step 1: Replace the `MarketingNav` function**

Replace lines 20–43 of [web/app/page.tsx](../../../app/page.tsx) with:

```tsx
function MarketingNav() {
  return (
    <nav className="flex items-center justify-between px-7 py-4 border-b border-line bg-paper">
      <Link href="/" className="flex items-center gap-2.5 no-underline">
        <BrandMark size="sm" />
        <span className="font-semibold text-[14px] text-ink tracking-[-0.01em]">
          AgentBuffer
        </span>
      </Link>
      <div className="hidden md:flex items-center gap-6 font-mono text-[11px] uppercase tracking-wider text-ink-2">
        <a href="#product" className="no-underline hover:text-ink">
          Product
        </a>
        <a href="#agents" className="no-underline hover:text-ink">
          Agents
        </a>
        <a href="#sponsors" className="no-underline hover:text-ink">
          Sponsors
        </a>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Sign in
          </Button>
        </Link>
        <Link href="/signup">
          <Button variant="primary" size="sm">
            Get started
          </Button>
        </Link>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Verify nav renders**

Reload `localhost:3000`. At desktop width (>768px), confirm three uppercase mono links appear between logo and buttons. At mobile width (<768px), confirm anchor links hide while logo + buttons remain.

Anchor clicks will jump to nothing yet (sections come in later tasks) — that's expected. No console errors.

- [ ] **Step 3: Checkpoint**

Note: "Nav anchors added."

---

## Task 4: Add Product Peek section + Hero link

**Files:**
- Modify: [web/app/page.tsx](../../../app/page.tsx) (the `Home` function lines 6–18, the `Hero` function lines 45–76, add new `ProductPeek` function)

- [ ] **Step 1: Add `Image` import to top of `page.tsx`**

Find line 1 of [web/app/page.tsx](../../../app/page.tsx). Add a new import line directly under the `import Link` line:

```tsx
import Image from "next/image";
```

- [ ] **Step 2: Add the `ProductPeek` component**

Add this new function anywhere in [web/app/page.tsx](../../../app/page.tsx) (e.g., immediately after the `Hero` function):

```tsx
function ProductPeek() {
  return (
    <section
      id="product"
      className="px-7 py-20 border-t border-line bg-bg"
    >
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-10">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3 mb-3">
            the product
          </div>
          <h2 className="font-serif font-semibold text-[32px] leading-tight text-ink">
            Your week, on autopilot.
          </h2>
          <p className="mt-3 text-[14px] text-ink-2 max-w-[520px] mx-auto">
            One calendar. Three agents. Every post drafted, critiqued, and
            queued before you wake up.
          </p>
        </div>
        <div className="border-[1.2px] border-ink-2 rounded-[var(--r-lg)] bg-paper p-2 overflow-hidden">
          <Image
            src="/marketing/dashboard-peek.png"
            alt="AgentBuffer dashboard showing the weekly calendar with scheduled posts and three active agents"
            width={1600}
            height={1000}
            className="w-full h-auto rounded-[10px]"
            priority
          />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Add the "watch the Critic reject" link to Hero**

In [web/app/page.tsx](../../../app/page.tsx), find the `Hero` function. After the closing `</div>` of the button row (currently line 73), and before the section's closing `</section>` (line 74), insert:

```tsx
<div className="mt-6">
  <a
    href="#critic"
    className="font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-ink no-underline"
  >
    watch the Critic reject a post →
  </a>
</div>
```

- [ ] **Step 4: Wire `ProductPeek` into `Home`**

In the `Home` function (lines 6–18 of [page.tsx](../../../app/page.tsx)), replace the `<main>` block so it reads:

```tsx
<main className="flex-1">
  <Hero />
  <ProductPeek />
  <HowItWorks />
  <SponsorStrip />
</main>
```

(Other sections will be added/swapped in later tasks. `SponsorStrip` is still here for now — it goes away in Task 7.)

- [ ] **Step 5: Verify in browser**

Reload `/`. Below the hero you should see: eyebrow "the product" → headline "Your week, on autopilot." → caption → bordered card holding the dashboard screenshot. Resize down to 375px — card scales, no horizontal scroll. Click the new hero link "watch the Critic reject a post →" — it scrolls to nothing yet (Critic section not built), no console error.

- [ ] **Step 6: Checkpoint**

Note: "Product peek live."

---

## Task 5: Add "Meet the three agents" section

**Files:**
- Modify: [web/app/page.tsx](../../../app/page.tsx) (add new component, wire into `Home`)

- [ ] **Step 1: Verify `AgentAvatar` is imported**

Open [web/app/page.tsx](../../../app/page.tsx). At the top of the file, add (if not already present) to the import block:

```tsx
import { AgentAvatar } from "@/components/ui/agent-avatar";
```

- [ ] **Step 2: Add the `MeetTheAgents` component**

Add this function in [web/app/page.tsx](../../../app/page.tsx) (e.g., after `HowItWorks`):

```tsx
function MeetTheAgents() {
  const agents = [
    {
      letter: "S",
      role: "Strategist",
      body: "Wakes on schedule, drafts on-brand posts. Powered by Fetch.ai uAgents on Agentverse.",
    },
    {
      letter: "C",
      role: "Critic",
      body: "Scores every draft against a 5-axis brand rubric. Rejects anything off-voice. Powered by Claude Sonnet 4.5.",
    },
    {
      letter: "P",
      role: "Publisher",
      body: "Hands approved posts to LinkedIn and X. Reliability subsystem co-built with Cognition Devin.",
    },
  ];

  return (
    <section id="agents" className="px-7 py-16 border-t border-line bg-bg">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-12">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3 mb-3">
            the cast
          </div>
          <h2 className="font-serif font-semibold text-[32px] leading-tight text-ink">
            Three agents. One brand.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agents.map((a) => (
            <div
              key={a.role}
              className="border-[1.2px] border-ink-2 rounded-[var(--r-lg)] bg-paper p-5"
            >
              <AgentAvatar letter={a.letter} size="md" tone="ink" />
              <div className="font-semibold text-[14px] text-ink mt-3 mb-1.5">
                {a.role}
              </div>
              <p className="text-[12.5px] text-ink-2 leading-[1.55]">{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Wire into `Home`**

Update the `<main>` block in `Home`:

```tsx
<main className="flex-1">
  <Hero />
  <ProductPeek />
  <HowItWorks />
  <MeetTheAgents />
  <SponsorStrip />
</main>
```

- [ ] **Step 4: Verify in browser**

Reload `/`. After "How it works" you should see the new "the cast" section with three cards, each with an ink-colored avatar (S, C, P). At <768px width, the grid should collapse to one column. Click the nav `Agents` link — page should smooth-scroll to this section.

- [ ] **Step 5: Checkpoint**

Note: "Meet the three agents live."

---

## Task 6: Add "Critic in action" section

**Files:**
- Modify: [web/app/page.tsx](../../../app/page.tsx) (add `Verdict` import, new component, wire into `Home`)

- [ ] **Step 1: Add `Verdict` import**

At the top of [web/app/page.tsx](../../../app/page.tsx), add to imports:

```tsx
import { Verdict } from "@/components/ui/verdict";
```

- [ ] **Step 2: Add the `CriticInAction` component**

Add this function in [web/app/page.tsx](../../../app/page.tsx):

```tsx
function CriticInAction() {
  const rubric = [
    { axis: "Voice fidelity", score: 0.42 },
    { axis: "Brand vocabulary", score: 0.61 },
    { axis: "Channel fit", score: 0.78 },
    { axis: "Visual coherence", score: 0.55 },
    { axis: "Banned-term check", score: 0.30 },
  ];

  return (
    <section
      id="critic"
      className="px-7 py-20 border-t border-line bg-paper"
    >
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-10">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3 mb-3">
            quality gate
          </div>
          <h2 className="font-serif font-semibold text-[32px] leading-tight text-ink">
            The Critic rejects what doesn&apos;t sound like you.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border-[1.2px] border-ink-2 rounded-[var(--r-lg)] bg-bg p-5">
            <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3 mb-2">
              draft from Strategist
            </div>
            <p className="text-[14px] text-ink leading-[1.55]">
              ☕ HUGE Friday vibes! Drop everything and grab one of our
              INSANE pumpkin lattes — only $4.99 today!! 🚀🔥 #blessed
              #coffeegoals
            </p>
          </div>
          <div className="border-[1.2px] border-ink-2 rounded-[var(--r-lg)] bg-bg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
                Critic verdict
              </div>
              <Verdict variant="rejected" score={0.53} />
            </div>
            <ul className="space-y-1.5">
              {rubric.map((r) => (
                <li
                  key={r.axis}
                  className="flex items-center justify-between text-[12.5px]"
                >
                  <span className="text-ink-2">{r.axis}</span>
                  <span
                    className={
                      r.score < 0.6
                        ? "font-mono text-ink"
                        : "font-mono text-ink-3"
                    }
                  >
                    {r.score.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[12px] text-ink-2 italic leading-[1.5]">
              Voice fidelity and banned-term checks below threshold —
              caps lock and rocket emoji aren&apos;t in your brand kit.
            </p>
          </div>
        </div>
        <p className="mt-6 text-center text-[12px] text-ink-3 font-mono">
          real rejection, real rubric · the Critic blocks ~1 in 4 drafts
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Wire into `Home`**

Update the `<main>` block:

```tsx
<main className="flex-1">
  <Hero />
  <ProductPeek />
  <HowItWorks />
  <MeetTheAgents />
  <CriticInAction />
  <SponsorStrip />
</main>
```

- [ ] **Step 4: Verify in browser**

Reload `/`. New section appears between agents and sponsors with two side-by-side cards (draft on left, verdict on right). Verdict pill should read "REJECTED · 0.5". On mobile, cards stack. Click hero "watch the Critic reject a post →" link — page now scrolls to this section.

- [ ] **Step 5: Checkpoint**

Note: "Critic in action live."

---

## Task 7: Replace SponsorStrip with "Built with" section

**Files:**
- Modify: [web/app/page.tsx](../../../app/page.tsx) (delete `SponsorStrip` function lines 134–161, add new `BuiltWith`, update `Home`)

- [ ] **Step 1: Delete the `SponsorStrip` function**

Remove the entire `SponsorStrip` function from [web/app/page.tsx](../../../app/page.tsx) (currently lines 134–161). Do not remove `MarketingFooter`.

- [ ] **Step 2: Add the `BuiltWith` component**

Add this function in [web/app/page.tsx](../../../app/page.tsx):

```tsx
function BuiltWith() {
  const integrations = [
    {
      name: "Fetch.ai",
      body: "Three uAgents (Strategist, Critic, Publisher) live on Agentverse, with a 30-line ASI:One natural-language ranker.",
    },
    {
      name: "Cognition / Devin",
      body: "Owns the Publisher reliability subsystem end-to-end — retries, dead-letter queue, circuit breaker.",
    },
    {
      name: "Google",
      body: "Nano Banana 2 for live image generation with same-seed iteration; Veo 3.1 for onboarding intro clips.",
    },
    {
      name: "Anthropic",
      body: "Claude Sonnet 4.5 powers brand extraction at onboarding and the Critic's 5-axis rubric.",
    },
    {
      name: "Cloudinary",
      body: "Server-side l_fetch brand-bar overlay via named transforms — never a Sharp post-pass.",
    },
    {
      name: "Supabase + Vercel",
      body: "Auth via Supabase Auth Hook, Postgres + Storage with RLS, Next.js 15 deployed on Vercel.",
    },
  ];

  return (
    <section
      id="sponsors"
      className="px-7 py-20 border-t border-line bg-bg"
    >
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center font-mono text-[10.5px] uppercase tracking-wider text-ink-3 mb-10">
          built with
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7">
          {integrations.map((i) => (
            <div key={i.name}>
              <div className="font-mono text-[11px] uppercase tracking-wider text-ink mb-1.5">
                {i.name}
              </div>
              <p className="text-[13px] text-ink-2 leading-[1.55]">{i.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Update `Home` to use `BuiltWith`**

Replace the `<main>` block:

```tsx
<main className="flex-1">
  <Hero />
  <ProductPeek />
  <HowItWorks />
  <MeetTheAgents />
  <CriticInAction />
  <BuiltWith />
</main>
```

(`SponsorStrip` reference is now gone.)

- [ ] **Step 4: Verify in browser**

Reload `/`. Old grayscale logo strip is gone. New "built with" section shows 6 integrations in a 2-col grid (1-col on mobile), each with sponsor name + one sentence. Click nav `Sponsors` → smooth-scrolls here.

- [ ] **Step 5: Checkpoint**

Note: "Built with section live, sponsor strip removed."

---

## Task 8: Add FAQ + Final CTA + Footer update

**Files:**
- Modify: [web/app/page.tsx](../../../app/page.tsx) (add `Faq` and `FinalCta` functions, update `MarketingFooter`, update `Home`)

- [ ] **Step 1: Add the `Faq` component**

Add this function in [web/app/page.tsx](../../../app/page.tsx):

```tsx
function Faq() {
  const items = [
    {
      q: "Can I post to Instagram?",
      a: "We queue Instagram drafts for review but don't auto-publish — Meta's Graph API needs a 24-hour app review we couldn't get during the hackathon. LinkedIn and X publish live.",
    },
    {
      q: "Who owns the content?",
      a: "You do. AgentBuffer drafts and posts on your behalf; nothing is reused or trained on.",
    },
    {
      q: "What happens if I don't like a draft?",
      a: "The Critic catches most off-voice drafts before you see them. For anything that slips through, you can reject from the calendar in one click.",
    },
  ];

  return (
    <section className="px-7 py-20 border-t border-line bg-paper">
      <div className="max-w-[760px] mx-auto">
        <div className="text-center mb-10">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3 mb-3">
            questions
          </div>
          <h2 className="font-serif font-semibold text-[32px] leading-tight text-ink">
            Things you&apos;ll probably ask.
          </h2>
        </div>
        <dl className="space-y-7">
          {items.map((it) => (
            <div key={it.q}>
              <dt className="font-semibold text-[14px] text-ink mb-1.5">
                {it.q}
              </dt>
              <dd className="text-[13px] text-ink-2 leading-[1.6]">{it.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add the `FinalCta` component**

Add this function:

```tsx
function FinalCta() {
  return (
    <section className="px-7 py-24 border-t border-line bg-bg">
      <div className="max-w-[720px] mx-auto text-center">
        <h2 className="font-serif font-semibold text-[36px] leading-[1.1] tracking-[-0.02em] text-ink">
          Hire your first agent in three minutes.
        </h2>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signup">
            <Button variant="primary" size="lg">
              Get started — free
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Update `MarketingFooter`**

Replace the `MarketingFooter` function (currently lines 163–177 of [page.tsx](../../../app/page.tsx)) with:

```tsx
function MarketingFooter() {
  return (
    <footer className="px-7 py-8 border-t border-line bg-paper">
      <div className="max-w-[1100px] mx-auto flex items-center justify-between text-[11.5px] text-ink-3 font-mono">
        <span>© 2026 AgentBuffer · LA Hacks 2026</span>
        <div className="flex items-center gap-5">
          <Link
            href="https://github.com"
            className="hover:text-ink-2 no-underline"
          >
            GitHub →
          </Link>
          <Link
            href="https://github.com"
            className="hover:text-ink-2 no-underline"
          >
            Design doc →
          </Link>
        </div>
      </div>
    </footer>
  );
}
```

(Both links go to `https://github.com` for now; replace with the actual repo URL and `DESIGN.md` permalink when the repo is public.)

- [ ] **Step 4: Wire `Faq` and `FinalCta` into `Home`**

Replace the `<main>` block:

```tsx
<main className="flex-1">
  <Hero />
  <ProductPeek />
  <HowItWorks />
  <MeetTheAgents />
  <CriticInAction />
  <BuiltWith />
  <Faq />
  <FinalCta />
</main>
```

- [ ] **Step 5: Verify in browser**

Reload `/`. Scroll to the bottom: "Things you'll probably ask." with 3 Q/A pairs → "Hire your first agent in three minutes." with two buttons → footer with GitHub + Design doc on the right. No console errors.

- [ ] **Step 6: Checkpoint**

Note: "FAQ, final CTA, footer done — page complete."

---

## Task 9: Final verification — build, responsive, content audit

**Files:** None modified.

- [ ] **Step 1: Run a production build**

Stop dev server. From `web/`, run: `pnpm build` (or `npm run build`)

Expected: completes with zero TypeScript errors and zero ESLint errors. Common failure modes:
- Unescaped apostrophes in JSX → use `&apos;` (already done in plan code).
- `<img>` instead of `next/image` lint warning → `Image` is already used for the dashboard peek.

If the build fails, fix the reported errors and re-run.

- [ ] **Step 2: Run preview server and walk the page**

Run: `pnpm start` (or `npm start`). Open `http://localhost:3000/`.

At desktop width 1440px, scroll top to bottom and confirm:
- Nav: anchor links visible, hover states work.
- Hero: unchanged + new "watch the Critic reject" link.
- Product peek: dashboard image renders (not broken).
- How it works: unchanged.
- Meet the three agents: 3 cards with avatars S/C/P.
- Critic in action: 2-col layout, REJECTED verdict pill visible.
- Built with: 6 integration entries, 2-col layout.
- FAQ: 3 entries.
- Final CTA: large headline + two buttons.
- Footer: GitHub + Design doc links.

Click each nav anchor — `Product` / `Agents` / `Sponsors` should smooth-scroll to the right section.

- [ ] **Step 3: Mobile responsive check**

Resize browser to 375px wide (or use device toolbar). Walk the page again. Confirm:
- Nav: anchor links hidden, logo + Sign in/Get started visible.
- All multi-column grids collapse to single column.
- No horizontal scroll anywhere.
- Hero headline scales down (Tailwind handles this via responsive classes already in `Hero`).

- [ ] **Step 4: OG image preview**

If a Vercel preview is available, paste the URL into `https://www.opengraph.xyz/`. Confirm the OG image renders and title/description match the spec.

If no preview, just curl the homepage and inspect `<head>`:
Run: `curl -s http://localhost:3000/ | grep -E '(og:|twitter:|<title>)'`

Expected output includes `og:image` `/og.png`, `og:title`, `twitter:card summary_large_image`, and `<title>AgentBuffer — Hire AI agents that run your brand</title>`.

- [ ] **Step 5: Content audit against the spec**

Open [docs/superpowers/specs/2026-04-25-landing-page-expansion-design.md](../specs/2026-04-25-landing-page-expansion-design.md). Read each "New sections — detailed" entry and confirm the rendered page matches:
- Eyebrow text matches (`the product`, `the cast`, `quality gate`, `built with`, `questions`).
- Sponsor names + integration sentences match exactly.
- FAQ Q/A pairs match.
- Headlines match.

Fix any divergence inline.

- [ ] **Step 6: Done**

Note: "Landing page expansion complete."

---

## Self-Review

Spec coverage check:
- Product peek section — Task 4 ✅
- Meet the three agents — Task 5 ✅
- Critic in action — Task 6 ✅
- Built with (replaces SponsorStrip) — Task 7 ✅
- FAQ — Task 8 ✅
- Final CTA — Task 8 ✅
- Nav anchor links + smooth scroll — Tasks 1 (CSS) + 3 (nav) ✅
- Metadata + OG image — Tasks 1 + 2 ✅
- Footer additions (GitHub, Design doc) — Task 8 ✅
- Hero "watch the Critic" link — Task 4 ✅
- Out-of-scope items (animations, dark mode, etc.) — none added ✅

Placeholder scan: searched the plan for "TBD", "TODO", "implement later", "appropriate error handling", "similar to" — none present. The two `https://github.com` placeholders in the footer are explicitly called out for the user to replace with the real URL when known.

Type/identifier consistency: `ProductPeek`, `MeetTheAgents`, `CriticInAction`, `BuiltWith`, `Faq`, `FinalCta` are referenced in `Home`'s `<main>` exactly as defined. `Image` import added once (Task 4). `AgentAvatar` import added once (Task 5). `Verdict` import added once (Task 6). All section `id` attributes (`#product`, `#agents`, `#critic`, `#sponsors`) match the nav anchor `href`s and the Hero "watch the Critic" link.

Devin copy soft-landed: spec called out a risk that "built with Cognition Devin" might be aspirational. Plan uses "co-built with Cognition Devin" in the agent card and "Owns the Publisher reliability subsystem end-to-end" in the sponsor section. Adjust further if Devin output doesn't land by H6.
