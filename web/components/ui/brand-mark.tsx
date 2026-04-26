import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const SIZE_CLS: Record<Size, string> = {
  sm: "h-7 w-7 text-[13px]",
  md: "h-8 w-8 text-[14px]",
  lg: "h-10 w-10 text-[15px]",
};

interface BrandMarkProps {
  size?: Size;
  className?: string;
}

export function BrandMark({ size = "sm", className }: BrandMarkProps) {
  return (
    <span
      className={cn(
        "rounded-lg grid place-items-center text-paper font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,.06)]",
        SIZE_CLS[size],
        className
      )}
      style={{
        background:
          "linear-gradient(135deg, var(--brand) 0%, oklch(60% 0.16 35) 100%)",
      }}
    >
      ⌗
    </span>
  );
}
