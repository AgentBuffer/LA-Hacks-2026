"use client";

import { useMemo, useState } from "react";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { InlinePublishModal } from "@/components/calendar/inline-publish-modal";
import { RankBar } from "@/components/calendar/rank-bar";
import { startOfWeek } from "@/lib/utils";
import type { SlotRow } from "@/actions/slots";
import type { ScheduledAgentRow } from "@/actions/agents";

interface CalendarViewProps {
  slots: SlotRow[];
  agents: ScheduledAgentRow[];
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function formatWeekLabel(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const monthFmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short" });
  if (sameMonth) {
    return `${monthFmt(start)} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${monthFmt(start)} ${start.getDate()} – ${monthFmt(end)} ${end.getDate()}, ${end.getFullYear()}`;
}

export function CalendarView({ slots, agents }: CalendarViewProps) {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [ranks, setRanks] = useState<Record<string, number>>({});
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date());
    return addDays(base, weekOffset * 7);
  }, [weekOffset]);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const weekSlots = useMemo(() => {
    const start = weekStart.getTime();
    const end = addDays(weekStart, 7).getTime();
    return slots.filter((s) => {
      if (!s.scheduled_for) return false;
      const t = new Date(s.scheduled_for).getTime();
      return t >= start && t < end;
    });
  }, [slots, weekStart]);

  const selectedSlot = weekSlots.find((s) => s.id === selectedSlotId) ?? null;

  const rankableSlotIds = useMemo(
    () =>
      weekSlots
        .filter((s) => s.status === "approved" || s.status === "published")
        .map((s) => s.id),
    [weekSlots]
  );

  return (
    <div className="p-7 flex flex-col">
      <CalendarToolbar
        weekLabel={formatWeekLabel(weekStart, weekEnd)}
        onPrev={() => setWeekOffset((n) => n - 1)}
        onNext={() => setWeekOffset((n) => n + 1)}
        onToday={() => setWeekOffset(0)}
        isCurrentWeek={weekOffset === 0}
      />
      <RankBar slotIds={rankableSlotIds} ranks={ranks} onRanks={setRanks} />
      <CalendarGrid
        slots={weekSlots}
        agents={agents}
        weekStart={weekStart}
        onSelectSlot={setSelectedSlotId}
        ranks={ranks}
      />
      {selectedSlot && (
        <InlinePublishModal
          slot={selectedSlot}
          onClose={() => setSelectedSlotId(null)}
        />
      )}
    </div>
  );
}
