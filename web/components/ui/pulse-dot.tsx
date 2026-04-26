import { cn } from "@/lib/utils";

interface PulseDotProps {
  tone?: "ok" | "crit";
  size?: number;
  durationMs?: number;
  className?: string;
}

export function PulseDot({
  tone = "ok",
  size = 6,
  durationMs = 1600,
  className,
}: PulseDotProps) {
  return (
    <span
      className={cn(
        "inline-block rounded-full",
        tone === "ok" ? "bg-ok" : "bg-crit",
        className
      )}
      style={{
        width: size,
        height: size,
        animation: `ab-pulse ${durationMs}ms ease-in-out infinite`,
      }}
    />
  );
}
