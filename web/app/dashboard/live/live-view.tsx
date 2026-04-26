"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveEvent, LiveRun } from "@/actions/runs";
import { LiveStreamHead } from "@/components/live/live-stream-head";
import { EventList } from "@/components/live/event-list";
import { RightRail } from "@/components/live/right-rail";
import { createClient } from "@/lib/supabase/client";

interface LiveViewProps {
  run: LiveRun;
}

const REPLAY_SPLIT = 3; // first N events shown immediately on replay
const REPLAY_INTERVAL_MS = 700;

export function LiveView({ run }: LiveViewProps) {
  const [events, setEvents] = useState(run.events);
  const [replayKey, setReplayKey] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearPendingTimeouts = useCallback(() => {
    for (const t of timeoutsRef.current) clearTimeout(t);
    timeoutsRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearPendingTimeouts();
  }, [clearPendingTimeouts]);

  // Live tail: subscribe to agent_messages.run_id for real-time appends.
  useEffect(() => {
    if (!run.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`agent_messages:${run.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "agent_messages",
          filter: `run_id=eq.${run.id}`,
        },
        (payload) => {
          const next = payload.new as LiveEvent;
          setEvents((prev) => {
            if (prev.some((e) => e.id === next.id)) return prev;
            const last = prev[prev.length - 1];
            const inOrder =
              !last ||
              (next.sequence_number ?? 0) >= (last.sequence_number ?? 0);
            if (inOrder) return [...prev, next];
            return [...prev, next].sort(
              (a, b) => (a.sequence_number ?? 0) - (b.sequence_number ?? 0)
            );
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [run.id]);

  const handleReplay = useCallback(() => {
    clearPendingTimeouts();
    const all = run.events;
    const head = all.slice(0, REPLAY_SPLIT);
    setEvents(head);
    setReplayKey((k) => k + 1);

    const tail = all.slice(REPLAY_SPLIT);
    tail.forEach((_, idx) => {
      const t = setTimeout(() => {
        setEvents((prev) => [...prev, tail[idx]]);
      }, REPLAY_INTERVAL_MS * (idx + 1));
      timeoutsRef.current.push(t);
    });
  }, [run.events, clearPendingTimeouts]);

  return (
    <div className="p-7">
      <style>{`
        @keyframes ab-slide-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <LiveStreamHead
        slotId={run.slot_id}
        runNumber={run.run_number}
        onReplay={handleReplay}
      />
      <div className="grid grid-cols-[1fr_320px] gap-5">
        <EventList key={replayKey} events={events} />
        <RightRail run={run} events={events} />
      </div>
    </div>
  );
}
