import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZE_CLS: Record<Size, string> = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

interface BrandMarkProps {
  size?: Size;
  className?: string;
}

export function BrandMark({ size = "sm", className }: BrandMarkProps) {
  return (
    <svg
      className={cn("shrink-0", SIZE_CLS[size], className)}
      viewBox="0 0 130 110"
      fill="none"
      strokeWidth="9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d="M14 60 Q14 14 38 14 Q60 14 60 37 Q60 14 82 14 Q106 14 106 60"
        stroke="var(--brand)"
      />
      <path
        d="M14 75 Q14 29 38 29 Q60 29 60 52 Q60 29 82 29 Q106 29 106 75"
        stroke="var(--ink)"
      />
      <path
        d="M14 90 Q14 44 38 44 Q60 44 60 67 Q60 44 82 44 Q106 44 106 90"
        stroke="var(--ink)"
      />
    </svg>
  );
}
