import { cn } from "@/lib/utils";

interface AgentAvatarProps {
  letter: string;
  size?: "xs" | "sm" | "md";
  tone?: "default" | "ink";
  className?: string;
}

export function AgentAvatar({
  letter,
  size = "md",
  tone = "default",
  className,
}: AgentAvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-mono font-semibold border-[1.2px]",
        {
          "h-5 w-5 text-[10px]": size === "xs",
          "h-6 w-6 text-[11px]": size === "sm",
          "h-9 w-9 text-[14px]": size === "md",
        },
        tone === "default" && "border-ink-2 bg-paper text-ink",
        tone === "ink" && "border-ink bg-ink text-paper",
        className
      )}
    >
      {letter.charAt(0).toUpperCase()}
    </span>
  );
}
