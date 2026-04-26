"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/current-org";
import { startOfWeek } from "@/lib/utils";

/**
 * Seed the current org with the Lumen Coffee demo brand:
 * 1 brand, 7 content slots (one rejected to demo the critic),
 * 3 cognition agents (one disabled), 1 live_run with 6 events showing
 * the strategist→critic rejection→revision→approval→publish beat.
 *
 * Idempotent: if the org already has a brand, this is a no-op.
 */
export async function seedDemoBrand(): Promise<{
  brandId: string;
  alreadySeeded: boolean;
}> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No org_id — Auth Hook may not be enabled");

  // Idempotency check
  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .eq("org_id", orgId)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return { brandId: existing.id as string, alreadySeeded: true };
  }

  const brandKit = {
    brand_id: crypto.randomUUID(),
    org_id: orgId,
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

  const { data: brandRow, error: brandErr } = await supabase
    .from("brands")
    .insert({
      org_id: orgId,
      name: "Lumen Coffee",
      brand_kit: brandKit,
      logo_url: null,
      source_pdfs: [],
      social_links: {
        linkedin: "https://linkedin.com/company/lumen-coffee",
        x: "https://x.com/lumencoffee",
        instagram: "https://instagram.com/lumen.coffee",
      },
    })
    .select("id")
    .single();

  if (brandErr || !brandRow) throw new Error(brandErr?.message ?? "brand insert failed");
  const brandId = brandRow.id as string;
  const slateId = crypto.randomUUID();

  const slots = [
    {
      caption:
        "Every morning deserves a moment of ritual. Our single-origin Ethiopian pour-over brings you there.",
      image_prompt:
        "Artisan coffee pour-over in warm morning light, steam rising, minimalist cafe aesthetic",
      platform: "linkedin",
      status: "approved",
      day_offset: 0,
      hour: 9,
      scores: [
        { axis: "Brand Voice Alignment", score: 4.5, reasoning: "Captures lumen's warm, artisan tone" },
        { axis: "Visual Coherence", score: 4.0, reasoning: "Pour-over imagery aligns with brand aesthetic" },
        { axis: "Platform Fit", score: 4.2, reasoning: "Professional tone suitable for LinkedIn" },
        { axis: "Audience Relevance", score: 4.3, reasoning: "Appeals to specialty coffee enthusiasts" },
        { axis: "Originality", score: 4.0, reasoning: "Ritual angle is fresh" },
      ],
      summary: "Strong brand alignment with engaging ritual narrative.",
      avg: 4.2,
    },
    {
      caption:
        "Behind the beans: Marco shares why he chose a light roast for this week's blend. Thread below.",
      image_prompt:
        "Coffee roaster working with beans in artisan roastery, warm industrial lighting",
      platform: "x",
      status: "approved",
      day_offset: 0,
      hour: 12,
      scores: [
        { axis: "Brand Voice Alignment", score: 3.8, reasoning: "Good behind-the-scenes approach" },
        { axis: "Visual Coherence", score: 3.9, reasoning: "Roastery setting fits brand" },
        { axis: "Platform Fit", score: 4.0, reasoning: "Thread format works well on X" },
        { axis: "Audience Relevance", score: 3.7, reasoning: "Niche but engaged audience" },
        { axis: "Originality", score: 3.6, reasoning: "Behind-the-scenes is common but well-executed" },
      ],
      summary: "Solid behind-the-scenes content with good platform fit.",
      avg: 3.8,
    },
    {
      caption:
        "Start your day right with great coffee! Buy now and get 10% off! #coffee #morning",
      image_prompt: "Generic coffee cup on white background with sale text overlay",
      platform: "instagram",
      status: "rejected",
      day_offset: 1,
      hour: 8,
      scores: [
        { axis: "Brand Voice Alignment", score: 3.0, reasoning: "Too salesy, doesn't match lumen's artisan positioning" },
        { axis: "Visual Coherence", score: 2.8, reasoning: "Generic stock-photo feel contradicts brand aesthetic" },
        { axis: "Platform Fit", score: 3.5, reasoning: "IG-appropriate but hashtag-heavy" },
        { axis: "Audience Relevance", score: 3.4, reasoning: "Discount angle undercuts premium positioning" },
        { axis: "Originality", score: 3.3, reasoning: "Generic, could be any coffee brand" },
      ],
      summary:
        "Caption is too generic and salesy. Doesn't reflect lumen's artisan positioning. Discount angle undercuts the premium brand image.",
      avg: 3.2,
      // recorded H-3: paste the real LinkedIn permalink captured at H-3 here.
      // Demo path: clicking this rejected slot in the modal then "Publish" surfaces this URL.
      publish_result: {
        success: true,
        permalink:
          "https://www.linkedin.com/feed/update/urn:li:activity:0000000000000000000/",
        error: null,
        at: "RECORDED_AT_H_MINUS_3",
      },
    },
    {
      caption:
        "Coffee is a conversation starter. Our new downtown cafe was designed to feel like your living room, but better.",
      image_prompt:
        "Cozy modern cafe interior with warm lighting, people having conversations over coffee",
      platform: "linkedin",
      status: "approved",
      day_offset: 1,
      hour: 10,
      scores: [
        { axis: "Brand Voice Alignment", score: 4.2, reasoning: "Warm and inviting, on-brand" },
        { axis: "Visual Coherence", score: 4.0, reasoning: "Cafe interior reinforces community feel" },
        { axis: "Platform Fit", score: 4.1, reasoning: "Business-casual tone for LinkedIn" },
        { axis: "Audience Relevance", score: 4.0, reasoning: "Resonates with urban professionals" },
        { axis: "Originality", score: 4.2, reasoning: "'Living room but better' is a nice hook" },
      ],
      summary: "Strong community-focused message with good LinkedIn fit.",
      avg: 4.1,
    },
    {
      caption:
        "Cold brew season is here. 18 hours of patience for one sip of perfection. Available at all locations starting Monday.",
      image_prompt:
        "Cold brew coffee being poured into glass with ice, condensation on glass, summer light",
      platform: "x",
      status: "approved",
      day_offset: 2,
      hour: 11,
      scores: [
        { axis: "Brand Voice Alignment", score: 4.6, reasoning: "Poetic and craft-focused, peak lumen voice" },
        { axis: "Visual Coherence", score: 4.5, reasoning: "Cold brew pour is visually striking" },
        { axis: "Platform Fit", score: 4.4, reasoning: "Concise, punchy — perfect for X" },
        { axis: "Audience Relevance", score: 4.5, reasoning: "Seasonal excitement drives engagement" },
        { axis: "Originality", score: 4.5, reasoning: "'18 hours of patience' is a memorable line" },
      ],
      summary: "Excellent craft-forward messaging. Top-performing slot.",
      avg: 4.5,
    },
    {
      caption:
        "Meet the farmers who make your morning possible. This month's spotlight: the Guji cooperative in southern Ethiopia.",
      image_prompt:
        "Ethiopian coffee farmers in lush green coffee plantation, warm documentary style",
      platform: "linkedin",
      status: "approved",
      day_offset: 2,
      hour: 9,
      scores: [
        { axis: "Brand Voice Alignment", score: 4.3, reasoning: "Thoughtful, educational — on-brand" },
        { axis: "Visual Coherence", score: 4.1, reasoning: "Documentary style suits the story" },
        { axis: "Platform Fit", score: 4.2, reasoning: "LinkedIn audience appreciates supply chain stories" },
        { axis: "Audience Relevance", score: 4.0, reasoning: "Appeals to ethically-minded consumers" },
        { axis: "Originality", score: 4.4, reasoning: "Farm-to-cup narrative with specific detail" },
      ],
      summary: "Strong ethical narrative with specific sourcing details.",
      avg: 4.2,
    },
    {
      // H-3 demo path: this is the slot the rejected→revised beat lands on.
      // Real LinkedIn permalink captured at H-3 and pasted into publish_result.
      caption:
        "Sunday slow-down. No rush, no to-do list. Just you and a perfectly brewed cup. What are you sipping?",
      image_prompt:
        "Peaceful Sunday morning scene, person relaxing with coffee by a window, soft natural light",
      platform: "instagram",
      status: "approved",
      day_offset: 3,
      hour: 10,
      scores: [
        { axis: "Brand Voice Alignment", score: 4.1, reasoning: "Relaxed, inviting — very lumen" },
        { axis: "Visual Coherence", score: 4.0, reasoning: "Cozy window scene matches brand mood" },
        { axis: "Platform Fit", score: 4.3, reasoning: "Engagement question drives IG comments" },
        { axis: "Audience Relevance", score: 3.9, reasoning: "Lifestyle content resonates broadly" },
        { axis: "Originality", score: 3.7, reasoning: "Sunday coffee is common but well-executed" },
      ],
      summary: "Good lifestyle content with strong engagement hook.",
      avg: 4.0,
    },
  ];

  const startMonday = startOfWeek(new Date());
  const slotInserts = slots.map((s, idx) => {
    const scheduled = new Date(startMonday);
    scheduled.setDate(scheduled.getDate() + s.day_offset);
    scheduled.setHours(s.hour, 0, 0, 0);
    return {
      org_id: orgId,
      brand_id: brandId,
      slate_id: slateId,
      slot_number: idx + 1,
      caption: s.caption,
      image_prompt: s.image_prompt,
      platform: s.platform,
      status: s.status,
      critic_scores: { scores: s.scores, average: s.avg, summary: s.summary },
      publish_result:
        "publish_result" in s ? (s as { publish_result: unknown }).publish_result : null,
      idempotency_key: `${brandId}-${slateId}-${idx + 1}`,
      scheduled_for: scheduled.toISOString(),
    };
  });

  const agentRows = [
    {
      slug: "friday-reflection",
      display_name: "Friday Reflection",
      role_line: "weekly · Fri 17:00 PT",
      avatar_letter: "F",
      description:
        "Long-form reflection post each Friday afternoon. Pulls from the week's brewing notes; leans honest over polished.",
      cadence: "weekly · Fri 17:00 PT",
      owns_channels: ["linkedin", "x"],
      tools: [
        "scheduler-uagent",
        "brand-voice-uagent",
        "critic-uagent",
        "channel-router-uagent",
      ],
      voice_traits: ["honest", "calm", "literary"],
      status: "running",
      health: "ok",
      last_latency_ms: 42,
      runs_total: 14,
    },
    {
      slug: "weekday-teaser",
      display_name: "Weekday Teaser",
      role_line: "daily · 09:00 PT weekdays",
      avatar_letter: "W",
      description:
        "Short morning carousel teasing the day's special. Two-line caption, one image, one channel.",
      cadence: "daily · 09:00 PT (Mon–Fri)",
      owns_channels: ["instagram", "x"],
      tools: ["scheduler-uagent", "asset-finder-uagent", "channel-router-uagent"],
      voice_traits: ["punchy", "warm"],
      status: "running",
      health: "ok",
      last_latency_ms: 38,
      runs_total: 56,
    },
    {
      slug: "monthly-deep-dive",
      display_name: "Monthly Deep Dive",
      role_line: "monthly · 1st @ 10:00",
      avatar_letter: "M",
      description:
        "Long-form supply-chain story once a month. Currently paused while we wait on farmer interview transcripts.",
      cadence: "monthly · 1st @ 10:00 PT",
      owns_channels: ["linkedin"],
      tools: ["research-uagent", "brand-voice-uagent", "critic-uagent"],
      voice_traits: ["thoughtful", "documentary"],
      status: "disabled",
      health: "off",
      last_latency_ms: null,
      runs_total: 3,
    },
  ];

  const [
    { data: insertedSlots, error: slotsErr },
    { data: agentInsertResult, error: agentsErr },
  ] = await Promise.all([
    supabase
      .from("content_slots")
      .insert(slotInserts)
      .select("id, slot_number"),
    supabase
      .from("scheduled_agents")
      .insert(
        agentRows.map((a) => ({
          ...a,
          org_id: orgId,
          brand_id: brandId,
        }))
      )
      .select("id, slug"),
  ]);
  if (slotsErr) throw new Error(slotsErr.message);
  if (agentsErr) throw new Error(agentsErr.message);
  const fridayAgent = agentInsertResult?.find((a) => a.slug === "friday-reflection");

  const rejectedSlot = insertedSlots?.find((s) => s.slot_number === 3);
  const { data: runRow, error: runErr } = await supabase
    .from("live_runs")
    .insert({
      org_id: orgId,
      scheduled_agent_id: fridayAgent?.id ?? null,
      slot_id: rejectedSlot?.id ?? null,
      run_number: 14,
      channel: "instagram",
      started_at: new Date(Date.now() - 4 * 60_000).toISOString(),
      finished_at: new Date(Date.now() - 30_000).toISOString(),
      tokens_used: 2400,
      cost_estimate_cents: 2,
      status: "approved",
    })
    .select("id")
    .single();
  if (runErr || !runRow) throw new Error(runErr?.message ?? "run insert failed");
  const runId = runRow.id as string;

  const baseTs = Date.now() - 4 * 60_000;
  const events = [
    {
      from_agent: "strategist",
      to_agent: "critic",
      envelope_type: "slate_proposal",
      event_kind: "proposal",
      sequence_number: 1,
      title: "Draft v1 proposed · slot 3 (instagram)",
      body: "Strategist drafted a discount-led caption to drive morning traffic.",
      quote:
        "Start your day right with great coffee! Buy now and get 10% off! #coffee #morning",
      ts_offset_s: 0,
      payload: { slate_id: slateId, slot_number: 3 },
    },
    {
      from_agent: "critic",
      to_agent: "strategist",
      envelope_type: "rejection_notice",
      event_kind: "critique",
      sequence_number: 2,
      title: "Tone flagged — too marketing, not honest enough",
      body: "Critic scored 5 axes. Brand voice and visual coherence below threshold.",
      quote: null,
      ts_offset_s: 12,
      payload: {
        scores: [
          { axis: "voice", score: 3.0, max: 5 },
          { axis: "visual", score: 2.8, max: 5 },
          { axis: "platform", score: 3.5, max: 5 },
          { axis: "audience", score: 3.4, max: 5 },
          { axis: "originality", score: 3.3, max: 5 },
        ],
      },
    },
    {
      from_agent: "critic",
      to_agent: "strategist",
      envelope_type: "verdict",
      event_kind: "verdict",
      sequence_number: 3,
      title: "Critic verdict",
      body: "Average 3.2/5 — below 3.5 threshold. Returning to strategist for a rewrite.",
      quote: null,
      ts_offset_s: 14,
      verdict_label: "rejected",
      verdict_score: 3.2,
      payload: { average: 3.2 },
    },
    {
      from_agent: "strategist",
      to_agent: "critic",
      envelope_type: "slate_revision",
      event_kind: "revision",
      sequence_number: 4,
      title: "Draft v2 proposed",
      body: "Strategist re-drafted around the brand's slow-rituals voice — no discount, no urgency.",
      quote:
        "Sunday slow-down. No rush, no to-do list. Just you and a perfectly brewed cup. What are you sipping?",
      ts_offset_s: 38,
      payload: { slate_id: slateId, slot_number: 3, revision: 2 },
    },
    {
      from_agent: "critic",
      to_agent: "publisher",
      envelope_type: "verdict",
      event_kind: "verdict",
      sequence_number: 5,
      title: "Critic verdict",
      body: "Average 4.4/5 — strong improvement on voice and originality. Approved for publish.",
      quote: null,
      ts_offset_s: 49,
      verdict_label: "approved",
      verdict_score: 4.4,
      payload: { average: 4.4 },
    },
    {
      from_agent: "publisher",
      to_agent: "ledger",
      envelope_type: "publish_result",
      event_kind: "publish",
      sequence_number: 6,
      title: "Staging to channel-router",
      body: "Publisher staged to instagram queue · awaits final user approval.",
      quote: null,
      ts_offset_s: 62,
      payload: { staged_at: new Date().toISOString(), channel: "instagram" },
    },
  ];

  const { error: msgsErr } = await supabase.from("agent_messages").insert(
    events.map((e) => ({
      org_id: orgId,
      run_id: runId,
      from_agent: e.from_agent,
      to_agent: e.to_agent,
      envelope_type: e.envelope_type,
      event_kind: e.event_kind,
      sequence_number: e.sequence_number,
      title: e.title,
      body: e.body,
      quote: e.quote,
      verdict_label: e.verdict_label ?? null,
      verdict_score: e.verdict_score ?? null,
      payload: e.payload,
      signature: `sig-${e.sequence_number}-${Math.random().toString(16).slice(2, 8)}`,
      created_at: new Date(baseTs + e.ts_offset_s * 1000).toISOString(),
    }))
  );
  if (msgsErr) throw new Error(msgsErr.message);

  return { brandId, alreadySeeded: false };
}

