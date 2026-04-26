import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/ui/brand-mark";
import { AgentAvatar } from "@/components/ui/agent-avatar";
import { Verdict } from "@/components/ui/verdict";
import { Calendar, Sparkles, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <MarketingNav />
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
      <MarketingFooter />
    </div>
  );
}

function MarketingNav() {
  return (
    <nav className="flex items-center justify-between px-7 py-4 border-b border-line bg-paper">
      <Link href="/" className="flex items-center gap-2.5 no-underline">
        <BrandMark size="sm" />
        <span className="font-semibold text-[14px] text-ink tracking-[-0.01em]">
          MediaFlow
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

function Hero() {
  return (
    <section className="px-7 pt-20 pb-24 max-w-[1100px] mx-auto text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-line bg-brand-soft text-brand-ink mb-8">
        <Sparkles size={12} />
        <span className="font-mono text-[10.5px] uppercase tracking-wider">
          built at LA Hacks 2026
        </span>
      </div>
      <h1 className="font-serif font-semibold text-[40px] md:text-[64px] leading-[1.05] tracking-[-0.02em] text-ink max-w-[900px] mx-auto">
        Hire AI agents that run your brand.
      </h1>
      <p className="mt-6 text-[18px] text-ink-2 leading-[1.55] max-w-[640px] mx-auto">
        Onboard your brand once. Spawn AI agents that wake up on schedule,
        generate on-brand content, and post — while a critic agent rejects
        anything off-voice.
      </p>
      <div className="mt-10 flex items-center justify-center gap-3">
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
      <div className="mt-6">
        <a
          href="#critic"
          className="font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-ink no-underline"
        >
          watch the Critic reject a post →
        </a>
      </div>
    </section>
  );
}

function ProductPeek() {
  return (
    <section id="product" className="px-7 py-20 border-t border-line bg-bg">
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
            alt="MediaFlow dashboard showing the weekly calendar with scheduled posts and three active agents"
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

function HowItWorks() {
  const steps = [
    {
      icon: Sparkles,
      label: "Onboard your brand",
      body: "Drop a URL, brand-kit PDF, and recent socials. Claude extracts voice, palette, and banned terms.",
    },
    {
      icon: Calendar,
      label: "Spawn cognition agents",
      body: 'Describe a recurring post in one sentence — "Friday reflection at 5pm" — and the agent appears on your calendar.',
    },
    {
      icon: ShieldCheck,
      label: "Critic gates every post",
      body: "A 5-axis rubric must pass before anything ships. Weak drafts get bounced; you keep the final approval.",
    },
  ];

  return (
    <section className="px-7 py-16 border-t border-line bg-paper">
      <div className="max-w-[1100px] mx-auto">
        <div className="text-center mb-12">
          <div className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3 mb-3">
            how it works
          </div>
          <h2 className="font-serif font-semibold text-[32px] leading-tight text-ink">
            Three agents. One brand. No posting on your day off.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="border-[1.2px] border-ink-2 rounded-[var(--r-lg)] bg-paper p-5"
              >
                <div className="h-8 w-8 rounded-md grid place-items-center bg-brand-soft text-brand-ink mb-3">
                  <Icon size={16} strokeWidth={1.7} />
                </div>
                <div className="font-semibold text-[13px] text-ink mb-1.5">
                  {s.label}
                </div>
                <p className="text-[12.5px] text-ink-2 leading-[1.55]">
                  {s.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

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

function CriticInAction() {
  const rubric = [
    { axis: "Voice fidelity", score: 0.42 },
    { axis: "Brand vocabulary", score: 0.61 },
    { axis: "Channel fit", score: 0.78 },
    { axis: "Visual coherence", score: 0.55 },
    { axis: "Banned-term check", score: 0.30 },
  ];

  return (
    <section id="critic" className="px-7 py-20 border-t border-line bg-paper">
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
    <section id="sponsors" className="px-7 py-20 border-t border-line bg-bg">
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

function Faq() {
  const items = [
    {
      q: "Can I post to Instagram?",
      a: "We queue Instagram drafts for review but don't auto-publish — Meta's Graph API needs a 24-hour app review we couldn't get during the hackathon. LinkedIn and X publish live.",
    },
    {
      q: "Who owns the content?",
      a: "You do. MediaFlow drafts and posts on your behalf; nothing is reused or trained on.",
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

function MarketingFooter() {
  return (
    <footer className="px-7 py-8 border-t border-line bg-paper">
      <div className="max-w-[1100px] mx-auto flex items-center justify-between text-[11.5px] text-ink-3 font-mono">
        <span>© 2026 MediaFlow · LA Hacks 2026</span>
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
