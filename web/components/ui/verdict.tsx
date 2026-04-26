import { cn } from "@/lib/utils";

interface VerdictProps {
  variant: "approved" | "rejected";
  score?: number;
  className?: string;
}

export function Verdict({ variant, score, className }: VerdictProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border-[1.2px] border-ink text-ink",
        variant === "rejected" && "border-dashed",
        className
      )}
    >
      {variant}
      {score !== undefined && <span className="text-ink-2">· {score.toFixed(1)}</span>}
    </span>
  );
}
