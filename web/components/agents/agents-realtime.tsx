"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AgentsRealtimeProps {
  orgId: string | null;
}

/** Subscribes to `scheduled_agents` changes for the current org and triggers
 * `router.refresh()` so the server-rendered grid re-fetches in place.
 *
 * Renders nothing — just a side effect host. */
export function AgentsRealtime({ orgId }: AgentsRealtimeProps) {
  const router = useRouter();

  useEffect(() => {
    if (!orgId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`scheduled_agents:${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scheduled_agents",
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orgId, router]);

  return null;
}
