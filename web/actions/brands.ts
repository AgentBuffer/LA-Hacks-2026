"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentOrgId } from "@/lib/supabase/current-org";
import { isDemoMode, DEMO_BRAND, DEMO_AGENTS } from "@/lib/demo";
import type { BrandKit } from "@/lib/types/models";

export async function getCurrentBrand(): Promise<{
  brand: BrandKit | null;
  agentCount: number;
}> {
  if (isDemoMode()) return { brand: DEMO_BRAND, agentCount: DEMO_AGENTS.length };
  const orgId = await getCurrentOrgId();
  if (!orgId) return { brand: null, agentCount: 0 };

  const supabase = await createClient();
  const [{ data: brandRow }, { count }, { data: orgRow }] = await Promise.all([
    supabase
      .from("brands")
      .select("id, brand_kit")
      .eq("org_id", orgId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("scheduled_agents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .maybeSingle(),
  ]);

  let brand = (brandRow?.brand_kit as BrandKit | undefined) ?? null;

  // Pre-onboarding: surface the org name from signup so the user sees their
  // chosen workspace label instead of "Untitled brand".
  if (!brand && orgRow?.name) {
    brand = {
      brand_id: "",
      org_id: orgId,
      name: orgRow.name as string,
      tagline: "",
      voice_description: "",
      target_audience: "",
      color_palette: [],
      logo_url: null,
      sample_captions: [],
      industry: "",
    };
  }

  return {
    brand,
    agentCount: count ?? 0,
  };
}

export async function createBrand(formData: FormData) {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No org_id — Auth Hook may not be enabled");

  const name = formData.get("name") as string;
  const industry = formData.get("industry") as string;
  const tagline = formData.get("tagline") as string;
  const target_audience = formData.get("target_audience") as string;
  const voice_description = formData.get("voice_description") as string;

  const brandKit: BrandKit = {
    brand_id: crypto.randomUUID(),
    org_id: orgId,
    name,
    tagline,
    voice_description,
    target_audience,
    color_palette: [],
    logo_url: null,
    sample_captions: [],
    industry,
  };

  const { data, error } = await supabase
    .from("brands")
    .insert({ org_id: orgId, name, brand_kit: brandKit })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export interface ExtractedBrandKitInput {
  name: string;
  industry: string;
  tagline: string;
  target_audience: string;
  voice_description: string;
  color_palette?: string[];
  logo_url?: string | null;
  sample_captions?: string[];
}

export async function saveExtractedBrandKit(
  input: ExtractedBrandKitInput
): Promise<BrandKit> {
  const supabase = await createClient();
  const orgId = await getCurrentOrgId();
  if (!orgId) throw new Error("No org_id — Auth Hook may not be enabled");

  // If a brand already exists, update the kit in place rather than inserting
  // a duplicate row. The signup flow calls extract once but a re-run shouldn't
  // proliferate brands.
  const { data: existing } = await supabase
    .from("brands")
    .select("id")
    .eq("org_id", orgId)
    .limit(1)
    .maybeSingle();

  const brandKit: BrandKit = {
    brand_id: existing?.id ?? crypto.randomUUID(),
    org_id: orgId,
    name: input.name,
    tagline: input.tagline,
    voice_description: input.voice_description,
    target_audience: input.target_audience,
    color_palette: input.color_palette ?? [],
    logo_url: input.logo_url ?? null,
    sample_captions: input.sample_captions ?? [],
    industry: input.industry,
  };

  if (existing) {
    const { error } = await supabase
      .from("brands")
      .update({ name: input.name, brand_kit: brandKit })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    brandKit.brand_id = existing.id as string;
  } else {
    const { data, error } = await supabase
      .from("brands")
      .insert({ org_id: orgId, name: input.name, brand_kit: brandKit })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    brandKit.brand_id = data.id as string;
  }

  return brandKit;
}
