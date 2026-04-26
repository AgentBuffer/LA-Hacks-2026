"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PulseDot } from "@/components/ui/pulse-dot";
import { cn } from "@/lib/utils";
import { SPEC_ROWS } from "./scripted-flow";

type Spec = Record<string, unknown>;

function renderValue(key: string, raw: unknown): string {
  if (raw == null) return "";
  if (Array.isArray(raw)) return raw.map(String).join(" · ");
  if (key === "channel" && typeof raw === "string") return raw;
  return String(raw);
}

interface SpecRailProps {
  spec: Spec | null;
  done: boolean;
  pulsedKeys: Set<string>;
  editing: boolean;
  onSave: () => void;
  saveDisabled: boolean;
  saving: boolean;
}

export function SpecRail({
  spec,
  done,
  pulsedKeys,
  editing,
  onSave,
  saveDisabled,
  saving,
}: SpecRailProps) {
  const filledCount = spec
    ? SPEC_ROWS.filter((r) => {
        const v = spec[r.key];
        if (v == null) return false;
        if (Array.isArray(v)) return v.length > 0;
        return String(v).length > 0;
      }).length
    : 0;

  return (
    <aside
      className="flex flex-col gap-3 sticky"
      style={{ top: 84, alignSelf: "start" }}
    >
      <Card>
        <CardHeader className="flex items-center gap-2">
          <PulseDot tone="ok" />
          <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-ink-2">
            Spec · {done ? "ready" : "drafting"}
          </span>
          <span className="ml-auto font-mono text-[9.5px] text-ink-3">
            {filledCount}/{SPEC_ROWS.length}
          </span>
        </CardHeader>
        <CardContent className="py-1">
          {SPEC_ROWS.map((row) => {
            const value = spec ? renderValue(row.key, spec[row.key]) : "";
            const filled = value.length > 0;
            const pulsing = pulsedKeys.has(row.key);
            return (
              <div
                key={row.key}
                className="grid grid-cols-[80px_1fr] gap-x-2 items-baseline py-2 px-1 border-b border-line last:border-b-0"
              >
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                  {row.label}
                </span>
                {filled ? (
                  <span
                    className="font-sans text-[11.5px] text-ink leading-snug"
                    style={
                      pulsing
                        ? { animation: "ab-spec-pulse 800ms ease-out both" }
                        : undefined
                    }
                  >
                    {value}
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-ink-3">—</span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={onSave}
        disabled={saveDisabled || (!editing && !done)}
        className={cn("w-full", done && "shadow-1")}
      >
        {saving
          ? "Saving…"
          : editing
            ? "Save changes"
            : done
              ? "Hire this agent →"
              : "Keep refining…"}
      </Button>
    </aside>
  );
}
