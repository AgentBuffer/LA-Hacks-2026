/**
 * Demo mode: when NEXT_PUBLIC_SUPABASE_URL is not set, return mock data
 * so the full UI renders without a database connection.
 */

import type { BrandKit } from "@/lib/types/models";

export function isDemoMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export const DEMO_ORG_ID = "demo-org-001";

export const DEMO_BRAND: BrandKit = {
  brand_id: "demo-brand-001",
  org_id: DEMO_ORG_ID,
  name: "Lumen Coffee",
  tagline: "Light up your morning",
  voice_description:
    "Warm, artisan, approachable. Slow rituals over loud claims. We speak like a knowledgeable barista who genuinely loves their craft.",
  target_audience:
    "Urban professionals aged 25-40 who appreciate specialty coffee",
  color_palette: ["#7C9F3F", "#E8E2D4", "#2C2419"],
  logo_url: null,
  sample_captions: [
    "Every cup tells a story. Today's single-origin from Ethiopia has notes of blueberry and dark chocolate.",
    "18 hours of patience for one sip of perfection.",
  ],
  industry: "Coffee & Beverage",
};

function weekStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dayIdx = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayIdx);
  return d;
}

function dayISO(offset: number, hour: number): string {
  const d = weekStart();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const DEMO_AGENTS = [
  {
    id: "agent-001",
    slug: "morning-ritual-daily",
    display_name: "Morning Ritual",
    role_line: "daily · linkedin",
    avatar_letter: "M",
    description:
      "Shares a daily morning coffee ritual post with warm, artisan imagery. Focuses on pour-over methods and seasonal single-origins.",
    cadence: "daily",
    owns_channels: ["linkedin", "x"],
    tools: ["image_creator", "search", "brand_voice"],
    voice_traits: ["warm", "artisan", "knowledgeable"],
    status: "running" as const,
    health: "ok" as const,
    last_latency_ms: 1240,
    runs_total: 14,
    last_run_at: new Date(Date.now() - 3600_000).toISOString(),
    next_run_at: new Date(Date.now() + 43200_000).toISOString(),
  },
  {
    id: "agent-002",
    slug: "behind-beans-weekly",
    display_name: "Behind the Beans",
    role_line: "weekly · x",
    avatar_letter: "B",
    description:
      "Weekly deep-dive thread on X about sourcing, roasting, and the people behind each blend. Thread format with 4-6 posts.",
    cadence: "weekly",
    owns_channels: ["x"],
    tools: ["search", "thread_composer"],
    voice_traits: ["curious", "storytelling", "authentic"],
    status: "running" as const,
    health: "ok" as const,
    last_latency_ms: 2100,
    runs_total: 3,
    last_run_at: new Date(Date.now() - 86400_000 * 2).toISOString(),
    next_run_at: new Date(Date.now() + 86400_000 * 5).toISOString(),
  },
  {
    id: "agent-003",
    slug: "weekend-vibes-biweekly",
    display_name: "Weekend Vibes",
    role_line: "biweekly · instagram",
    avatar_letter: "W",
    description:
      "Curates weekend coffee moments for Instagram — latte art, cozy café scenes, and community highlights.",
    cadence: "biweekly",
    owns_channels: ["instagram"],
    tools: ["image_creator", "carousel_creator"],
    voice_traits: ["relaxed", "visual", "community"],
    status: "queued" as const,
    health: "ok" as const,
    last_latency_ms: 980,
    runs_total: 6,
    last_run_at: new Date(Date.now() - 86400_000 * 3).toISOString(),
    next_run_at: new Date(Date.now() + 86400_000 * 11).toISOString(),
  },
  {
    id: "agent-004",
    slug: "espresso-tips-disabled",
    display_name: "Espresso Tips",
    role_line: "daily · tiktok",
    avatar_letter: "E",
    description: null,
    cadence: "daily",
    owns_channels: ["tiktok"],
    tools: ["video_creator"],
    voice_traits: ["punchy", "educational"],
    status: "disabled" as const,
    health: "off" as const,
    last_latency_ms: null,
    runs_total: 0,
    last_run_at: null,
    next_run_at: null,
  },
];

export const DEMO_SLOTS = [
  {
    id: "slot-001",
    slot_number: 1,
    caption:
      "Every morning deserves a moment of ritual. Our single-origin Ethiopian pour-over brings you there.",
    image_prompt:
      "Artisan coffee pour-over in warm morning light, steam rising, minimalist cafe aesthetic",
    image_url: null,
    platform: "linkedin",
    status: "approved" as const,
    scheduled_for: dayISO(0, 9),
    critic_scores: {
      scores: [
        { axis: "Brand Voice Alignment", score: 4.5, reasoning: "Captures lumen's warm, artisan tone" },
        { axis: "Visual Coherence", score: 4.0, reasoning: "Pour-over imagery aligns with brand" },
        { axis: "Platform Fit", score: 4.2, reasoning: "Professional tone for LinkedIn" },
        { axis: "Audience Relevance", score: 4.3, reasoning: "Appeals to coffee enthusiasts" },
        { axis: "Originality", score: 4.0, reasoning: "Ritual angle is fresh" },
      ],
      average: 4.2,
      summary: "Strong brand alignment with engaging ritual narrative.",
    },
    publish_result: null,
    brand_id: "demo-brand-001",
  },
  {
    id: "slot-002",
    slot_number: 2,
    caption:
      "Behind the beans: Marco shares why he chose a light roast for this week's blend. Thread below.",
    image_prompt:
      "Coffee roaster working with beans in artisan roastery, warm industrial lighting",
    image_url: null,
    platform: "x",
    status: "approved" as const,
    scheduled_for: dayISO(0, 12),
    critic_scores: {
      scores: [
        { axis: "Brand Voice Alignment", score: 3.8, reasoning: "Good behind-the-scenes approach" },
        { axis: "Visual Coherence", score: 3.9, reasoning: "Roastery setting fits brand" },
        { axis: "Platform Fit", score: 4.0, reasoning: "Thread format works well on X" },
        { axis: "Audience Relevance", score: 3.7, reasoning: "Niche but engaged audience" },
        { axis: "Originality", score: 3.6, reasoning: "Well-executed BTS content" },
      ],
      average: 3.8,
      summary: "Solid behind-the-scenes content with good platform fit.",
    },
    publish_result: null,
    brand_id: "demo-brand-001",
  },
  {
    id: "slot-003",
    slot_number: 3,
    caption:
      "Start your day right with great coffee! Buy now and get 10% off! #coffee #morning",
    image_prompt: "Generic coffee cup on white background with sale text overlay",
    image_url: null,
    platform: "instagram",
    status: "rejected" as const,
    scheduled_for: dayISO(1, 8),
    critic_scores: {
      scores: [
        { axis: "Brand Voice Alignment", score: 3.0, reasoning: "Too salesy, doesn't match lumen's artisan positioning" },
        { axis: "Visual Coherence", score: 2.8, reasoning: "Generic stock-photo feel contradicts brand aesthetic" },
        { axis: "Platform Fit", score: 3.5, reasoning: "IG-appropriate but hashtag-heavy" },
        { axis: "Audience Relevance", score: 3.2, reasoning: "Discount framing misaligned with premium audience" },
        { axis: "Originality", score: 2.0, reasoning: "Boilerplate promo copy" },
      ],
      average: 2.9,
      summary: "Rejected: generic promotional tone contradicts brand voice.",
    },
    publish_result: null,
    brand_id: "demo-brand-001",
  },
  {
    id: "slot-004",
    slot_number: 4,
    caption:
      "The art of patience: 18 hours of cold brew, one sip of perfection. What's your slow ritual?",
    image_prompt:
      "Cold brew coffee dripping slowly through glass tower, dramatic shadows, artisan cafe",
    image_url: null,
    platform: "linkedin",
    status: "approved" as const,
    scheduled_for: dayISO(2, 9),
    critic_scores: {
      scores: [
        { axis: "Brand Voice Alignment", score: 4.7, reasoning: "Perfectly captures slow-ritual ethos" },
        { axis: "Visual Coherence", score: 4.5, reasoning: "Cold brew tower is visually compelling" },
        { axis: "Platform Fit", score: 4.1, reasoning: "Engaging question format for LinkedIn" },
        { axis: "Audience Relevance", score: 4.4, reasoning: "Strong resonance with specialty coffee audience" },
        { axis: "Originality", score: 4.3, reasoning: "Patience framing is distinctive" },
      ],
      average: 4.4,
      summary: "Excellent brand voice alignment. Top-performing draft.",
    },
    publish_result: null,
    brand_id: "demo-brand-001",
  },
  {
    id: "slot-005",
    slot_number: 5,
    caption:
      "Weekend latte art challenge: tag us with your best rosetta. Top 3 get a free bag of our new Guatemala lot.",
    image_prompt:
      "Beautiful latte art rosetta from above, warm cafe lighting, rustic wooden counter",
    image_url: null,
    platform: "instagram",
    status: "approved" as const,
    scheduled_for: dayISO(4, 10),
    critic_scores: {
      scores: [
        { axis: "Brand Voice Alignment", score: 3.9, reasoning: "Community-forward, on brand" },
        { axis: "Visual Coherence", score: 4.2, reasoning: "Latte art is visually strong" },
        { axis: "Platform Fit", score: 4.5, reasoning: "UGC challenge format ideal for IG" },
        { axis: "Audience Relevance", score: 4.0, reasoning: "Engages home barista community" },
        { axis: "Originality", score: 3.8, reasoning: "Challenge format is popular but well-adapted" },
      ],
      average: 4.08,
      summary: "Strong community engagement play with good visual potential.",
    },
    publish_result: null,
    brand_id: "demo-brand-001",
  },
  {
    id: "slot-006",
    slot_number: 6,
    caption:
      "From seed to cup: this week we're tasting notes of blackberry jam and toasted walnut from our new Rwandan lot.",
    image_prompt:
      "Coffee cherries on branch with soft bokeh, transitioning to roasted beans in ceramic bowl",
    image_url: null,
    platform: "x",
    status: "published" as const,
    scheduled_for: dayISO(5, 14),
    critic_scores: {
      scores: [
        { axis: "Brand Voice Alignment", score: 4.3, reasoning: "Knowledgeable and specific" },
        { axis: "Visual Coherence", score: 4.1, reasoning: "Farm-to-cup visual narrative" },
        { axis: "Platform Fit", score: 3.9, reasoning: "Tasting notes thread potential on X" },
        { axis: "Audience Relevance", score: 4.2, reasoning: "Specialty coffee audience loves origin stories" },
        { axis: "Originality", score: 4.0, reasoning: "Specific tasting notes add authenticity" },
      ],
      average: 4.1,
      summary: "Published: authentic origin story with strong tasting notes.",
    },
    publish_result: { permalinks: [{ platform: "x", url: "https://x.com/lumencoffee/status/123" }], published_at: dayISO(5, 14) },
    brand_id: "demo-brand-001",
  },
  {
    id: "slot-007",
    slot_number: 7,
    caption:
      "Sunday slow-down: the sound of the grinder, the smell of fresh grounds, the first warm sip. Some rituals are worth protecting.",
    image_prompt:
      "Cozy Sunday morning coffee scene, person holding ceramic mug by window, golden hour light",
    image_url: null,
    platform: "linkedin",
    status: "draft" as const,
    scheduled_for: dayISO(6, 8),
    critic_scores: null,
    publish_result: null,
    brand_id: "demo-brand-001",
  },
];

const baseTime = new Date();
function evtTime(minutesAgo: number): string {
  return new Date(baseTime.getTime() - minutesAgo * 60000).toISOString();
}

export const DEMO_LIVE_RUN = {
  id: "run-001",
  run_number: 7,
  channel: "linkedin",
  started_at: evtTime(12),
  finished_at: evtTime(2),
  tokens_used: 3420,
  cost_estimate_cents: 8,
  status: "completed",
  scheduled_agent_id: "agent-001",
  slot_id: "slot-001",
  agent_display_name: "Morning Ritual",
  events: [
    {
      id: "evt-001",
      sequence_number: 1,
      from_agent: "strategist",
      to_agent: "critic",
      envelope_type: "proposal",
      event_kind: "proposal" as const,
      title: "Draft proposed for LinkedIn",
      body: "Generated morning ritual post targeting urban professionals. Pour-over focus with Ethiopian single-origin angle.",
      quote:
        "Every morning deserves a moment of ritual. Our single-origin Ethiopian pour-over brings you there.",
      verdict_label: null,
      verdict_score: null,
      payload: null,
      signature: "sig-strategist-001",
      created_at: evtTime(11),
    },
    {
      id: "evt-002",
      sequence_number: 2,
      from_agent: "critic",
      to_agent: "strategist",
      envelope_type: "critique",
      event_kind: "critique" as const,
      title: "5-axis rubric evaluation",
      body: "Evaluating draft against brand voice, visual coherence, platform fit, audience relevance, and originality.",
      quote: null,
      verdict_label: null,
      verdict_score: null,
      payload: {
        scores: {
          brand: 4.5,
          specificity: 4.0,
          hook: 4.2,
          clarity: 4.3,
          cta: 4.0,
        },
      },
      signature: "sig-critic-001",
      created_at: evtTime(10),
    },
    {
      id: "evt-003",
      sequence_number: 3,
      from_agent: "critic",
      to_agent: "publisher",
      envelope_type: "verdict",
      event_kind: "verdict" as const,
      title: "Verdict: approved",
      body: "Draft passes all 5 axes above threshold (3.5). Average score: 4.2/5. Forwarding to Publisher.",
      quote: null,
      verdict_label: "approved" as const,
      verdict_score: 4.2,
      payload: null,
      signature: "sig-critic-002",
      created_at: evtTime(9),
    },
    {
      id: "evt-004",
      sequence_number: 4,
      from_agent: "publisher",
      to_agent: "system",
      envelope_type: "publish",
      event_kind: "publish" as const,
      title: "Published to LinkedIn",
      body: "Post successfully published to LinkedIn company page. Permalink saved to content_slots.",
      quote: null,
      verdict_label: null,
      verdict_score: null,
      payload: null,
      signature: "sig-publisher-001",
      created_at: evtTime(8),
    },
    {
      id: "evt-005",
      sequence_number: 5,
      from_agent: "strategist",
      to_agent: "critic",
      envelope_type: "proposal",
      event_kind: "proposal" as const,
      title: "Draft #2 proposed for X",
      body: "Behind-the-beans thread about Marco's light roast selection process.",
      quote:
        "Behind the beans: Marco shares why he chose a light roast for this week's blend. Thread below.",
      verdict_label: null,
      verdict_score: null,
      payload: null,
      signature: "sig-strategist-002",
      created_at: evtTime(6),
    },
    {
      id: "evt-006",
      sequence_number: 6,
      from_agent: "critic",
      to_agent: "strategist",
      envelope_type: "verdict",
      event_kind: "verdict" as const,
      title: "Verdict: approved (borderline)",
      body: "Passes with average 3.8/5. Specificity axis at 3.6 — close to threshold. Recommend more concrete details in future threads.",
      quote: null,
      verdict_label: "approved" as const,
      verdict_score: 3.8,
      payload: {
        scores: {
          brand: 3.8,
          specificity: 3.6,
          hook: 4.0,
          clarity: 3.9,
          cta: 3.7,
        },
      },
      signature: "sig-critic-003",
      created_at: evtTime(5),
    },
  ],
};
