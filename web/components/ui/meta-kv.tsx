import { cn } from "@/lib/utils";

interface MetaKVProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function MetaKV({ label, value, className }: MetaKVProps) {
  return (
    <div className={cn("grid grid-cols-[90px_1fr] gap-x-3 items-baseline", className)}>
      <span className="text-[11px] font-mono text-ink-3">{label}</span>
      <span className="text-[11px] font-medium text-ink">{value}</span>
    </div>
  );
}
