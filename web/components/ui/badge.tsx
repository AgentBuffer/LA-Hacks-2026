import { cn } from "@/lib/utils";
import type { SlotStatus } from "@/lib/types/models";

interface BadgeProps {
  variant?: SlotStatus | "default";
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-mono uppercase tracking-wider",
        {
          "border-line text-ink-2": variant === "default",
          "border-line text-ink-3": variant === "draft",
          "border-running text-running bg-running-soft": variant === "proposed",
          "border-crit text-crit bg-crit-soft border-dashed": variant === "rejected",
          "border-ok text-ok bg-ok-soft": variant === "approved",
          "border-ink text-ink": variant === "published",
          "border-crit text-crit": variant === "failed",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
