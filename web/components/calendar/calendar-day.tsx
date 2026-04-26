"use client";

import { PostCard } from "./post-card";
import { cn } from "@/lib/utils";
import type { SlotRow } from "@/actions/slots";

interface CalendarDayProps {
  dayName: string; // "Mon"
  dayNumber: number; // 21
  isToday: boolean;
  slots: SlotRow[];
  onSelectSlot: (slotId: string) => void;
  ranks?: Record<string, number>;
}

export function CalendarDay({
  dayName,
  dayNumber,
  isToday,
  slots,
  onSelectSlot,
  ranks,
}: CalendarDayProps) {
  return (
    <div
      className={cn(
        "flex flex-col min-w-0 border-r border-line last:border-r-0",
        isToday && "bg-[oklch(97%_0.02_70)]"
      )}
    >
      <div className="px-2 py-2.5 bg-paper-2 border-b border-ink-2 flex items-baseline justify-between">
        <span
          className={cn(
            "text-[10.5px] font-mono uppercase tracking-wider font-semibold",
            isToday ? "text-brand-ink" : "text-ink"
          )}
        >
          {dayName}
        </span>
        <span
          className={cn(
            "text-[12px] font-mono tabular-nums font-semibold",
            isToday ? "text-brand-ink" : "text-ink-2"
          )}
        >
          {dayNumber}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 p-2 min-h-[180px]">
        {slots.length === 0 ? (
          <div className="text-[10.5px] font-mono text-ink-3/60 italic px-1 py-2">
            no posts
          </div>
        ) : (
          slots.map((s) => (
            <PostCard
              key={s.id}
              slot={s}
              onClick={() => onSelectSlot(s.id)}
              rank={ranks?.[s.id]}
            />
          ))
        )}
      </div>
    </div>
  );
}
