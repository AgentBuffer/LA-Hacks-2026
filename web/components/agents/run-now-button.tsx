"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { triggerRun } from "@/lib/gateway";
import { cn } from "@/lib/utils";

interface RunNowButtonProps {
  scheduledAgentId: string;
  disabled?: boolean;
}

export function RunNowButton({ scheduledAgentId, disabled }: RunNowButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (disabled || pending) return;
    setPending(true);
    try {
      await triggerRun(scheduledAgentId);
      router.push("/dashboard/live");
    } catch (err) {
      console.error("triggerRun failed", err);
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || pending}
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.06em] px-2 py-1 rounded",
        "border border-line-2 hover:bg-brand-soft transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      {pending ? "running…" : "▶ run now"}
    </button>
  );
}
