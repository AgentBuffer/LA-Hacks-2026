"use client";

import Link from "next/link";
import { ChevronDown, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEWS = ["Day", "Week", "Month"] as const;

interface CalendarToolbarProps {
  weekLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  isCurrentWeek: boolean;
}

export function CalendarToolbar({
  weekLabel,
  onPrev,
  onNext,
  onToday,
  isCurrentWeek,
}: CalendarToolbarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap pb-4">
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          className="grid place-items-center w-7 h-7 rounded-md border border-line bg-paper text-ink-2 hover:bg-bg-2"
          aria-label="Previous week"
        >
          <ChevronLeft size={13} />
        </button>
        <button
          type="button"
          onClick={onToday}
          disabled={isCurrentWeek}
          className={cn(
            "h-7 px-2.5 rounded-md border border-line bg-paper text-[11px] font-mono",
            isCurrentWeek
              ? "text-ink-3 cursor-not-allowed"
              : "text-ink-2 hover:bg-bg-2"
          )}
        >
          today
        </button>
        <button
          type="button"
          onClick={onNext}
          className="grid place-items-center w-7 h-7 rounded-md border border-line bg-paper text-ink-2 hover:bg-bg-2"
          aria-label="Next week"
        >
          <ChevronRight size={13} />
        </button>
      </div>

      <span className="text-[12.5px] font-serif font-semibold text-ink tabular-nums">
        {weekLabel}
      </span>

      <span className="text-[11px] font-mono text-ink-3 ml-1">
        America/Los_Angeles
      </span>

      <button
        type="button"
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-line bg-paper text-[12px] text-ink-2 hover:bg-bg-2 cursor-pointer"
      >
        All channels
        <ChevronDown size={12} className="text-ink-3" />
      </button>

      <div className="flex-1" />

      <div className="inline-flex bg-paper border border-line rounded-md overflow-hidden">
        {VIEWS.map((v) => {
          const active = v === "Week";
          return (
            <button
              key={v}
              type="button"
              disabled={!active}
              className={cn(
                "px-3.5 py-1.5 text-[12px] font-medium",
                active
                  ? "bg-brand-soft text-brand-ink cursor-default"
                  : "text-ink-3/60 cursor-not-allowed"
              )}
            >
              {v}
            </button>
          );
        })}
      </div>

      <Link
        href="/dashboard/create"
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-ink text-paper text-[12.5px] font-semibold border border-ink hover:bg-ink-2 transition-colors"
      >
        <Plus size={13} />
        Create Post
      </Link>
    </div>
  );
}
