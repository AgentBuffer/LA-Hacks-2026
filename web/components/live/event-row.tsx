import { memo } from "react";
import type { LiveEvent } from "@/actions/runs";
import { Tag } from "@/components/ui/tag";
import { Verdict } from "@/components/ui/verdict";
import { cn, formatClock } from "@/lib/utils";

interface EventRowProps {
  event: LiveEvent;
  isLast?: boolean;
}

const RUBRIC_LABELS: Record<string, string> = {
  brand: "BR",
  br: "BR",
  specificity: "SP",
  sp: "SP",
  hook: "HK",
  hk: "HK",
  clarity: "CL",
  cl: "CL",
  cta: "CTA",
};

function eventKindIcon(kind: LiveEvent["event_kind"], verdict?: LiveEvent["verdict_label"]): string {
  switch (kind) {
    case "proposal":
      return "📝";
    case "critique":
      return "🔍";
    case "verdict":
      return verdict === "approved" ? "✓" : "✗";
    case "revision":
      return "↻";
    case "publish":
      return "📤";
    case "note":
      return "·";
    default:
      return "•";
  }
}

function agentLabel(agent: string): string {
  if (!agent) return "—";
  return agent.toLowerCase();
}

interface RubricScore {
  axis: string;
  score: number;
}

function extractRubric(payload: LiveEvent["payload"]): RubricScore[] | null {
  if (!payload) return null;
  const scores = (payload as Record<string, unknown>).scores;
  if (!scores || typeof scores !== "object") return null;
  const out: RubricScore[] = [];
  for (const [axis, val] of Object.entries(scores as Record<string, unknown>)) {
    const num = typeof val === "number" ? val : Number(val);
    if (!Number.isFinite(num)) continue;
    out.push({ axis, score: num });
  }
  return out.length ? out : null;
}

function EventRowImpl({ event, isLast }: EventRowProps) {
  const ts = formatClock(event.created_at, true);
  const icon = eventKindIcon(event.event_kind, event.verdict_label);
  const rubric = extractRubric(event.payload);

  return (
    <div
      className={cn(
        "grid grid-cols-[110px_1fr] gap-3 py-3 px-1",
        !isLast && "border-b border-line border-dashed"
      )}
      style={{ animation: "ab-slide-in 250ms ease-out" }}
    >
      <div className="flex flex-col items-start gap-1">
        <span className="text-[10px] font-mono text-ink-3 leading-none">
          {ts}
        </span>
        <Tag size="sm">{agentLabel(event.from_agent)}</Tag>
      </div>

      <div className="flex flex-col gap-1.5 min-w-0">
        {event.title && (
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink leading-tight">
            <span aria-hidden className="text-[12px]">{icon}</span>
            <span className="truncate">{event.title}</span>
          </div>
        )}
        {event.body && (
          <div
            className="text-ink-2"
            style={{ fontSize: "11.5px", lineHeight: 1.55 }}
          >
            {event.body}
          </div>
        )}
        {event.quote && (
          <div
            className="bg-paper-2 italic text-ink-2 font-mono"
            style={{
              borderLeft: "2px solid var(--ink)",
              padding: "8px 10px",
              fontSize: "11px",
              lineHeight: 1.5,
              borderRadius: "0 6px 6px 0",
            }}
          >
            {event.quote}
          </div>
        )}
        {rubric && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
            {rubric.map(({ axis, score }) => {
              const label = RUBRIC_LABELS[axis.toLowerCase()] ?? axis.slice(0, 2).toUpperCase();
              const pct = Math.max(0, Math.min(100, (score / 5) * 100));
              const bad = score < 3.5;
              return (
                <div key={axis} className="flex items-center gap-1.5">
                  <span className="text-[9.5px] font-mono uppercase tracking-wider text-ink-3 w-6">
                    {label}
                  </span>
                  <div
                    className="bg-bg-2 rounded-full overflow-hidden"
                    style={{ width: 80, height: 4 }}
                  >
                    <div
                      className={cn(
                        "h-full",
                        bad ? "bg-crit" : "bg-ink-2"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-mono",
                      bad ? "text-crit" : "text-ink-2"
                    )}
                  >
                    {score.toFixed(1)}/5
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {event.verdict_label && (
          <div className="mt-1">
            <Verdict
              variant={event.verdict_label}
              score={event.verdict_score ?? undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export const EventRow = memo(EventRowImpl);
