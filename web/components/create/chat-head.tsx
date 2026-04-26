"use client";

import { AgentAvatar } from "@/components/ui/agent-avatar";
import { PulseDot } from "@/components/ui/pulse-dot";

export function ChatHead() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line bg-paper-2">
      <AgentAvatar letter="M" size="md" tone="ink" />
      <div className="min-w-0 flex flex-col gap-px">
        <div className="font-sans font-semibold text-[13.5px] text-ink leading-tight">
          Main
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-ink-3">
          <PulseDot tone="ok" />
          <span>routes through ASI:One</span>
        </div>
      </div>
    </div>
  );
}
