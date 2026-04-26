import { createClient } from "@/lib/supabase/client";

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8000";

async function authHeader(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

export async function gatewayFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = { ...(await authHeader()), ...(init.headers ?? {}) };
  const res = await fetch(`${GATEWAY_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gateway ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function extractSpec(prompt: string, brandId: string) {
  return gatewayFetch<Record<string, unknown>>("/api/spec/extract", {
    method: "POST",
    body: JSON.stringify({ prompt, brand_id: brandId }),
  });
}

export async function createCognitionAgent(
  spec: Record<string, unknown>,
  brandId: string
): Promise<{ scheduled_agent_id: string }> {
  return gatewayFetch("/api/agents", {
    method: "POST",
    body: JSON.stringify({ spec, brand_id: brandId }),
  });
}

export async function triggerRun(
  scheduledAgentId: string
): Promise<{ run_id: string; scheduled_agent_id: string }> {
  return gatewayFetch("/api/runs", {
    method: "POST",
    body: JSON.stringify({ scheduled_agent_id: scheduledAgentId }),
  });
}

export async function rankSlots(
  slotIds: string[]
): Promise<Array<{ slot_id: string; rank: number; reasoning: string }>> {
  return gatewayFetch("/api/rank-slots", {
    method: "POST",
    body: JSON.stringify({ slot_ids: slotIds }),
  });
}

export async function triggerPublish(slotIds: string[]) {
  return gatewayFetch<unknown[]>("/api/trigger-publish", {
    method: "POST",
    body: JSON.stringify({ slot_ids: slotIds }),
  });
}
