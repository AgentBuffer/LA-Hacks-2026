"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { rankSlots } from "@/lib/gateway";
import { cn } from "@/lib/utils";
import { PulseDot } from "@/components/ui/pulse-dot";

interface RankBarProps {
  slotIds: string[];
  ranks: Record<string, number>;
  onRanks: (next: Record<string, number>) => void;
}

export function RankBar({ slotIds, ranks, onRanks }: RankBarProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (pending || slotIds.length === 0) return;
    setPending(true);
    setError(null);
    try {
      const out = await rankSlots(slotIds);
      const next: Record<string, number> = {};
      for (const r of out.slice(0, 2)) {
        if (r?.slot_id && typeof r.rank === "number") next[r.slot_id] = r.rank;
      }
      onRanks(next);
    } catch (err) {
      console.error("rankSlots failed", err);
      setError(err instanceof Error ? err.message : "Rank failed");
    } finally {
      setPending(false);
    }
  }

  const ranked = Object.keys(ranks).length;

  return (
    <div className="flex items-center justify-between pb-3">
      <div className="flex items-center gap-2 text-[11px] font-mono text-ink-3">
        {ranked > 0 ? (
          <>
            <PulseDot tone="ok" />
            <span>top {ranked} ranked by ASI:One</span>
          </>
        ) : error ? (
          <span className="text-crit">{error}</span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || slotIds.length === 0}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md",
          "border border-line bg-paper text-[12px] font-medium text-ink-2",
          "hover:bg-brand-soft transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        <Sparkles size={13} />
        {pending ? "Ranking…" : "Rank with ASI:One"}
      </button>
    </div>
  );
}
