import { cn } from "@/lib/utils";

interface TagProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  variant?: "default" | "soft";
  size?: "sm" | "md";
}

export function Tag({
  children,
  icon,
  className,
  variant = "default",
  size = "md",
}: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-mono",
        {
          "border-line text-ink-2 bg-paper": variant === "default",
          "border-line text-ink-2 bg-paper-2": variant === "soft",
        },
        {
          "px-1.5 py-0 text-[9.5px]": size === "sm",
          "px-2 py-0.5 text-[11px]": size === "md",
        },
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
