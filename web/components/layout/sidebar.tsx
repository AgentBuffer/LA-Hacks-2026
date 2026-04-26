"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Activity, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PulseDot } from "@/components/ui/pulse-dot";
import { BrandMark } from "@/components/ui/brand-mark";
import type { BrandKit } from "@/lib/types/models";

interface SidebarProps {
  brand: BrandKit | null;
  agentCount: number;
}

type NavItem = {
  href: string;
  label: string;
  icon: typeof Calendar;
  badge: string | "live" | null;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar, badge: "7" },
  { href: "/dashboard/live", label: "Live", icon: Activity, badge: "live" },
  { href: "/dashboard/agents", label: "Agents", icon: Users, badge: null },
  { href: "/dashboard/create", label: "Create", icon: Sparkles, badge: null },
];

export function Sidebar({ brand, agentCount }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="border-r border-line bg-paper px-[14px] pt-[18px] pb-6 flex flex-col gap-[14px] sticky top-0 h-screen">
      <div className="flex items-center gap-2.5 px-1.5 pb-3 border-b border-line">
        <BrandMark size="sm" />
        <div className="min-w-0">
          <div className="font-semibold tracking-[-0.01em] text-[13.5px] text-ink leading-tight">
            AgentBuffer
          </div>
          <div className="text-[11px] text-ink-3 mt-px font-mono">v0.1</div>
        </div>
      </div>

      {/* Brand / org switcher (static for v1; popover deferred) */}
      <div className="relative">
        <button
          type="button"
          className="w-full flex items-center gap-2.5 p-2 border border-line rounded-[var(--r)] bg-bg-2 text-left hover:bg-paper hover:border-line-2 hover:shadow-1 transition-colors cursor-pointer"
          aria-haspopup="listbox"
          aria-expanded="false"
          title="Switch brand"
        >
          <div
            className="h-7 w-7 shrink-0 rounded-md shadow-[inset_0_0_0_1px_rgba(0,0,0,.05)]"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, oklch(85% 0.08 60), oklch(55% 0.12 40))",
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[13px] text-ink leading-tight truncate">
              {brand?.name ?? "Untitled brand"}
            </div>
            <div className="font-mono text-[11px] text-ink-3 mt-1 truncate">
              brand_kit · {agentCount} agents
            </div>
          </div>
          <span className="w-[22px] h-[22px] grid place-items-center text-ink-3 rounded-md">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4.5l3 3 3-3" />
            </svg>
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-px mt-1.5">
        <div className="text-[10.5px] tracking-[0.1em] uppercase text-ink-3 px-2 pt-2.5 pb-1">
          Workspace
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2 py-[7px] rounded-md text-[13.5px] leading-none no-underline",
                isActive
                  ? "bg-brand-soft text-brand-ink font-semibold"
                  : "text-ink-2 hover:bg-bg-2 hover:text-ink"
              )}
            >
              <span className="w-4 h-4 inline-grid place-items-center opacity-85">
                <Icon size={16} strokeWidth={1.7} />
              </span>
              {item.label}
              {item.badge === "live" && (
                <span className="ml-auto inline-flex items-center">
                  <PulseDot tone="crit" durationMs={1400} />
                </span>
              )}
              {item.badge && item.badge !== "live" && (
                <span
                  className={cn(
                    "ml-auto text-[11px] font-mono",
                    isActive ? "text-brand-ink" : "text-ink-3"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        <div className="text-[10.5px] tracking-[0.1em] uppercase text-ink-3 px-2 pt-3 pb-1">
          Channels
        </div>
        <ChannelRow color="oklch(60% 0.13 240)" name="LinkedIn" status="ok" />
        <ChannelRow color="oklch(20% 0.01 70)" name="X" status="ok" />
        <ChannelRow color="oklch(60% 0.18 25)" name="Instagram" status="warn" />
      </nav>
    </aside>
  );
}

function ChannelRow({
  color,
  name,
  status,
}: {
  color: string;
  name: string;
  status: "ok" | "warn";
}) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-ink-3 text-[12.5px] leading-none">
      <span
        className="w-3.5 h-3.5 rounded-sm shrink-0"
        style={{ background: color }}
      />
      <span className="flex-1 text-ink-2">{name}</span>
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === "ok" ? "bg-ok" : "bg-crit"
        )}
      />
    </div>
  );
}
