"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/current-org";
import { isDemoMode, DEMO_SLOTS } from "@/lib/demo";
import type { SlotStatus } from "@/lib/types/models";

export interface SlotRow {
  id: string;
  slot_number: number;
  caption: string | null;
  image_prompt: string | null;
  image_url: string | null;
  platform: string;
  status: SlotStatus;
  scheduled_for: string | null;
  critic_scores: {
    scores?: { axis: string; score: number; reasoning: string }[];
    average?: number;
    summary?: string;
  } | null;
  publish_result: Record<string, unknown> | null;
  brand_id: string;
}

export async function getSlotsForCurrentBrand(): Promise<SlotRow[]> {
  if (isDemoMode()) return DEMO_SLOTS as SlotRow[];
  const orgId = await getCurrentOrgId();
  if (!orgId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_slots")
    .select(
      "id, slot_number, caption, image_prompt, image_url, platform, status, scheduled_for, critic_scores, publish_result, brand_id"
    )
    .eq("org_id", orgId)
    .order("slot_number", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as SlotRow[];
}

export async function markSlotPublished(
  slotId: string,
  permalinks: { platform: string; url: string }[]
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("content_slots")
    .update({
      status: "published",
      publish_result: { permalinks, published_at: new Date().toISOString() },
    })
    .eq("id", slotId);
  if (error) throw new Error(error.message);
}
