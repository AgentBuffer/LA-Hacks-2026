"use client";

import { useMemo, useState } from "react";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CalendarGrid } from "@/components/calendar/calendar-grid";
import { InlinePublishModal } from "@/components/calendar/inline-publish-modal";
import { RankBar } from "@/components/calendar/rank-bar";
import type { SlotRow } from "@/actions/slots";

interface CalendarViewProps {
  slots: SlotRow[];
}

export function CalendarView({ slots }: CalendarViewProps) {
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [ranks, setRanks] = useState<Record<string, number>>({});
  const selectedSlot = slots.find((s) => s.id === selectedSlotId) ?? null;

  const rankableSlotIds = useMemo(
    () =>
      slots
        .filter((s) => s.status === "approved" || s.status === "published")
        .map((s) => s.id),
    [slots]
  );

  return (
    <div className="p-7 flex flex-col">
      <CalendarToolbar />
      <RankBar slotIds={rankableSlotIds} ranks={ranks} onRanks={setRanks} />
      <CalendarGrid slots={slots} onSelectSlot={setSelectedSlotId} ranks={ranks} />
      {selectedSlot && (
        <InlinePublishModal
          slot={selectedSlot}
          onClose={() => setSelectedSlotId(null)}
        />
      )}
    </div>
  );
}
