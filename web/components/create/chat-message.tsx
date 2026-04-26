"use client";

import type { ReactNode } from "react";
import { AgentAvatar } from "@/components/ui/agent-avatar";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "main";
  ts: string;
  body: ReactNode;
}

export function ChatMessage({ role, ts, body }: ChatMessageProps) {
  const isMain = role === "main";
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 max-w-full",
        !isMain && "flex-row-reverse",
      )}
      style={{ animation: "ab-fade-in 320ms ease both" }}
    >
      <AgentAvatar
        letter={isMain ? "M" : "U"}
        size="xs"
        tone={isMain ? "ink" : "default"}
      />
      <div
        className={cn(
          "border border-line rounded-md px-3 py-2.5 max-w-[88%]",
          isMain ? "bg-paper" : "bg-paper-2",
        )}
      >
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3 mb-1">
          {isMain ? "main" : "you"} · {ts}
        </div>
        <div className="font-sans text-[12.5px] leading-[1.55] text-ink-2 [&_strong]:text-ink [&_strong]:font-semibold">
          {body}
        </div>
      </div>
    </div>
  );
}
