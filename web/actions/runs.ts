"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/current-org";

export interface LiveEvent {
  id: string;
  sequence_number: number;
  from_agent: string;
  to_agent: string;
  envelope_type: string;
  event_kind: "proposal" | "critique" | "verdict" | "revision" | "publish" | "note" | null;
  title: string | null;
  body: string | null;
  quote: string | null;
  verdict_label: "approved" | "rejected" | null;
  verdict_score: number | null;
  payload: Record<string, unknown> | null;
  signature: string;
  created_at: string;
}

export interface LiveRun {
  id: string;
  run_number: number;
  channel: string | null;
  started_at: string;
  finished_at: string | null;
  tokens_used: number | null;
  cost_estimate_cents: number | null;
  status: string;
  scheduled_agent_id: string | null;
  slot_id: string | null;
  agent_display_name: string | null;
  events: LiveEvent[];
}

export async function getLatestRunForBrand(): Promise<LiveRun | null> {
  const orgId = await getCurrentOrgId();
  if (!orgId) return null;
  const supabase = await createClient();

  const { data: runs, error: runErr } = await supabase
    .from("live_runs")
    .select(
      "id, run_number, channel, started_at, finished_at, tokens_used, cost_estimate_cents, status, scheduled_agent_id, slot_id"
    )
    .eq("org_id", orgId)
    .order("started_at", { ascending: false })
    .limit(1);
  if (runErr) throw new Error(runErr.message);
  if (!runs || runs.length === 0) return null;
  const run = runs[0];

  const [{ data: events, error: evtErr }, agentRow] = await Promise.all([
    supabase
      .from("agent_messages")
      .select(
        "id, sequence_number, from_agent, to_agent, envelope_type, event_kind, title, body, quote, verdict_label, verdict_score, payload, signature, created_at"
      )
      .eq("run_id", run.id)
      .order("sequence_number", { ascending: true }),
    run.scheduled_agent_id
      ? supabase
          .from("scheduled_agents")
          .select("display_name")
          .eq("id", run.scheduled_agent_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (evtErr) throw new Error(evtErr.message);

  return {
    ...run,
    agent_display_name: (agentRow as { data: { display_name?: string } | null }).data?.display_name ?? null,
    events: (events ?? []) as LiveEvent[],
  };
}
