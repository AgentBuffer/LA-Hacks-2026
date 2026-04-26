"use server";

import { createClient } from "@/lib/supabase/server";
import type { SlotStatus } from "@/lib/types/models";

export async function updateSlotStatus(slotId: string, status: SlotStatus) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("content_slots")
    .update({ status })
    .eq("id", slotId);

  if (error) throw new Error(error.message);
}
