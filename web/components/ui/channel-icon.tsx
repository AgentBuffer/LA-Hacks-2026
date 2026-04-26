import { cn } from "@/lib/utils";

export type ChannelPlatform = "linkedin" | "x" | "instagram" | "tiktok" | "youtube";

interface ChannelIconProps {
  platform: ChannelPlatform | string;
  className?: string;
  size?: number;
}

const PALETTE: Record<ChannelPlatform, string> = {
  linkedin: "oklch(48% 0.13 240)",
  x: "oklch(20% 0.01 70)",
  instagram: "oklch(60% 0.18 25)",
  tiktok: "oklch(70% 0.15 200)",
  youtube: "oklch(58% 0.20 25)",
};

const LABEL: Record<ChannelPlatform, string> = {
  linkedin: "in",
  x: "𝕏",
  instagram: "ig",
  tiktok: "T",
  youtube: "▶",
};

export function ChannelIcon({ platform, className, size = 14 }: ChannelIconProps) {
  const key = (platform.toLowerCase() as ChannelPlatform) in PALETTE
    ? (platform.toLowerCase() as ChannelPlatform)
    : "x";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-sm font-mono font-semibold leading-none text-white",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, size - 6),
        background: PALETTE[key],
      }}
      aria-label={key}
    >
      {LABEL[key]}
    </span>
  );
}
