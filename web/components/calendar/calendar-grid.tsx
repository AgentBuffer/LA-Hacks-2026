"use client";

import { useMemo } from "react";
import { CalendarDay } from "./calendar-day";
import type { SlotRow } from "@/actions/slots";
import type { ScheduledAgentRow } from "@/actions/agents";

interface CalendarGridProps {
  slots: SlotRow[];
  agents: ScheduledAgentRow[];
  weekStart: Date;
  onSelectSlot: (slotId: string) => void;
  ranks?: Record<string, number>;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface AgentRunMarker {
  agentId: string;
  displayName: string;
  avatarLetter: string;
  cadence: string;
}

export function CalendarGrid({
  slots,
  agents,
  weekStart,
  onSelectSlot,
  ranks,
}: CalendarGridProps) {
  const days = useMemo(() => {
    const today = new Date();

    // Pre-bucket agent next-run markers by day (only those falling in this week).
    const weekStartMs = weekStart.getTime();
    const weekEndMs = weekStartMs + 7 * 86400_000;
    const agentRunsByDay = new Map<number, AgentRunMarker[]>();
    for (const a of agents) {
      if (!a.next_run_at) continue;
      const t = new Date(a.next_run_at).getTime();
      if (t < weekStartMs || t >= weekEndMs) continue;
      const dateKey = new Date(a.next_run_at);
      dateKey.setHours(0, 0, 0, 0);
      const k = dateKey.getTime();
      const marker: AgentRunMarker = {
        agentId: a.id,
        displayName: a.display_name,
        avatarLetter: a.avatar_letter,
        cadence: a.cadence,
      };
      const list = agentRunsByDay.get(k) ?? [];
      list.push(marker);
      agentRunsByDay.set(k, list);
    }

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const daySlots = slots
        .filter((s) => s.scheduled_for && sameDay(new Date(s.scheduled_for), d))
        .sort(
          (a, b) =>
            new Date(a.scheduled_for as string).getTime() -
            new Date(b.scheduled_for as string).getTime()
        );
      const key = new Date(d);
      key.setHours(0, 0, 0, 0);
      return {
        date: d,
        name: DAY_NAMES[i],
        number: d.getDate(),
        isToday: sameDay(d, today),
        slots: daySlots,
        agentRuns: agentRunsByDay.get(key.getTime()) ?? [],
      };
    });
  }, [slots, agents, weekStart]);

  return (
    <div className="grid grid-cols-7 bg-paper border border-line rounded-lg overflow-hidden shadow-1">
      {days.map((day) => (
        <CalendarDay
          key={day.date.toISOString()}
          dayName={day.name}
          dayNumber={day.number}
          isToday={day.isToday}
          slots={day.slots}
          agentRuns={day.agentRuns}
          onSelectSlot={onSelectSlot}
          ranks={ranks}
        />
      ))}
    </div>
  );
}
