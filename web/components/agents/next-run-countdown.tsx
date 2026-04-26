"use client";

import { useEffect, useState } from "react";

interface NextRunCountdownProps {
  nextRunAt: string | null;
  cadence: string;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "due now";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function NextRunCountdown({ nextRunAt, cadence }: NextRunCountdownProps) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!nextRunAt) {
    return (
      <span className="font-mono text-[10px] text-ink-3">
        every {cadence} · awaiting first run
      </span>
    );
  }
  const target = new Date(nextRunAt).getTime();
  const remaining = target - now;
  return (
    <span className="font-mono text-[10px] text-ink-3 tabular-nums">
      next run in {formatRemaining(remaining)} · {cadence}
    </span>
  );
}
