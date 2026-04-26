"use client";

import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEWS = ["Day", "Week", "Month"] as const;

export function CalendarToolbar() {
  return (
    <div className="flex items-center gap-2 flex-wrap pb-4">
      <span className="text-[12px] font-mono text-ink-3">
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
