"use client";

import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { PulseDot } from "@/components/ui/pulse-dot";
import { LogOut } from "lucide-react";

interface TopbarProps {
  title: string;
  subtitle?: React.ReactNode;
  live?: boolean;
  rightSlot?: React.ReactNode;
}

export function Topbar({ title, subtitle, live, rightSlot }: TopbarProps) {
  return (
    <header className="flex items-center gap-3.5 px-7 py-3.5 border-b border-line bg-paper sticky top-0 z-20">
      <div className="flex flex-col gap-px min-w-0">
        <div className="font-serif font-semibold text-[17px] tracking-[-0.01em] text-ink leading-[1.2] flex items-center gap-2.5">
          {title}
          {live && <PulseDot tone="crit" size={7} durationMs={1400} />}
        </div>
        {subtitle && (
          <div className="text-[11.5px] text-ink-3 font-mono">{subtitle}</div>
        )}
      </div>

      <div className="flex-1" />

      {rightSlot}

      <form action={signOut}>
        <Button variant="ghost" size="sm" type="submit">
          <LogOut size={12} />
          <span>Sign out</span>
        </Button>
      </form>
    </header>
  );
}
