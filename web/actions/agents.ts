"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/current-org";
import { revalidatePath } from "next/cache";

export interface ScheduledAgentRow {
  id: string;
  slug: string;
  display_name: string;
  role_line: string;
  avatar_letter: string;
  description: string | null;
  cadence: string;
  owns_channels: string[];
  tools: string[];
  voice_traits: string[];
  status: "running" | "queued" | "paused" | "disabled";
  health: "ok" | "warn" | "off";
  last_latency_ms: number | null;
  runs_total: number;
}

export async function getScheduledAgentsForCurrentBrand(): Promise<
  ScheduledAgentRow[]
> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scheduled_agents")
    .select(
      "id, slug, display_name, role_line, avatar_letter, description, cadence, owns_channels, tools, voice_traits, status, health, last_latency_ms, runs_total"
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ScheduledAgentRow[];
}

export interface HireAgentInput {
  display_name: string;
  cadence: string;
  channel: string;
  voice_traits: string[];
  tools: string[];
  description: string;
  avatar_letter: string;
}

export async function hireAgent(input: HireAgentInput) {
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No org_id");
  const supabase = await createClient();

  // Need a brand_id to attach to
  const { data: brandRow } = await supabase
    .from("brands")
    .select("id")
    .eq("org_id", orgId)
    .limit(1)
    .maybeSingle();
  if (!brandRow) throw new Error("No brand — onboard first");

  const slug = input.display_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const { data, error } = await supabase
    .from("scheduled_agents")
    .insert({
      org_id: orgId,
      brand_id: brandRow.id,
      slug: `${slug}-${Date.now().toString(36)}`,
      display_name: input.display_name,
      role_line: input.cadence,
      cadence: input.cadence,
      avatar_letter: input.avatar_letter,
      description: input.description,
      owns_channels: [input.channel],
      tools: input.tools,
      voice_traits: input.voice_traits,
      status: "queued",
      health: "ok",
      runs_total: 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/agents");
  return { id: data.id as string };
}
