"use client";

import { useMemo } from "react";
import { CalendarDay } from "./calendar-day";
import { startOfWeek } from "@/lib/utils";
import type { SlotRow } from "@/actions/slots";

interface CalendarGridProps {
  slots: SlotRow[];
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

export function CalendarGrid({ slots, onSelectSlot, ranks }: CalendarGridProps) {
  const days = useMemo(() => {
    const slotsWithDate = slots
      .filter((s) => s.scheduled_for)
      .map((s) => ({ slot: s, date: new Date(s.scheduled_for as string) }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const anchor = slotsWithDate[0]?.date ?? new Date();
    const weekStart = startOfWeek(anchor);
    const today = new Date();

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const daySlots = slotsWithDate
        .filter(({ date }) => sameDay(date, d))
        .map(({ slot }) => slot);
      return {
        date: d,
        name: DAY_NAMES[i],
        number: d.getDate(),
        isToday: sameDay(d, today),
        slots: daySlots,
      };
    });
  }, [slots]);

  return (
    <div className="grid grid-cols-7 bg-paper border border-line rounded-lg overflow-hidden shadow-1">
      {days.map((day) => (
        <CalendarDay
          key={day.date.toISOString()}
          dayName={day.name}
          dayNumber={day.number}
          isToday={day.isToday}
          slots={day.slots}
          onSelectSlot={onSelectSlot}
          ranks={ranks}
        />
      ))}
    </div>
  );
}
