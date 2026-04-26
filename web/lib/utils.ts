import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const HATCH_BG =
  "repeating-linear-gradient(45deg, var(--paper-2) 0 8px, var(--paper) 8px 16px)";

export function aspectFor(platform: string): string {
  return platform === "instagram" || platform === "tiktok" ? "9:16" : "4:5";
}

export function formatClock(iso: string | null, withSeconds = false): string {
  if (!iso) return withSeconds ? "--:--:--" : "--:--";
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      ...(withSeconds ? { second: "2-digit" } : {}),
    });
  } catch {
    return withSeconds ? "--:--:--" : "--:--";
  }
}

/** Returns the Monday (00:00 local) of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayIdx = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayIdx);
  return d;
}
