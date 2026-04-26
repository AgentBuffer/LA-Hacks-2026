"use client";

import { Button } from "@/components/ui/button";
import { PulseDot } from "@/components/ui/pulse-dot";
import { RotateCcw } from "lucide-react";

interface LiveStreamHeadProps {
  slotId: string | null;
  runNumber: number;
  onReplay: () => void;
}

export function LiveStreamHead({
  slotId,
  runNumber,
  onReplay,
}: LiveStreamHeadProps) {
  const slotShort = slotId ? slotId.slice(0, 8) : "—";
  return (
    <div className="mb-4 flex items-end gap-4 flex-wrap">
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="text-[12px] font-mono text-ink-3">
          slot_id=<b className="text-ink-2">{slotShort}</b> · run #{runNumber}
        </div>
      </div>
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-crit-soft text-crit text-[11px] font-mono font-semibold uppercase tracking-wider">
        <PulseDot tone="crit" size={7} durationMs={1400} />
        Live
      </span>
      <div className="flex-1" />
      <Button variant="outline" size="sm" onClick={onReplay}>
        <RotateCcw size={11} />
        <span>Replay rejection beat</span>
      </Button>
    </div>
  );
}
