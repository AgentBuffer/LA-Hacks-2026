import { createClient } from "@/lib/supabase/server";
import { isDemoMode, DEMO_ORG_ID } from "@/lib/demo";

/**
 * Resolve the org_id for the signed-in user.
 *
 * The Custom Access Token Auth Hook (00005_auth_hook.sql) embeds org_id
 * into JWT app_metadata AND mirrors it into raw_user_meta_data so it's
 * available via both `user.app_metadata` and `user.user_metadata`.
 */
export async function getCurrentOrgId(): Promise<string | null> {
  if (isDemoMode()) return DEMO_ORG_ID;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const fromApp = (user.app_metadata as Record<string, unknown> | undefined)?.org_id;
  const fromUser = (user.user_metadata as Record<string, unknown> | undefined)?.org_id;
  return (fromApp ?? fromUser ?? null) as string | null;
}
