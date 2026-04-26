import type { LiveEvent, LiveRun } from "@/actions/runs";
import { Card, CardContent } from "@/components/ui/card";
import { MetaKV } from "@/components/ui/meta-kv";
import { AgentAvatar } from "@/components/ui/agent-avatar";
import { cn } from "@/lib/utils";

interface RightRailProps {
  run: LiveRun;
  events: LiveEvent[];
}

function relativeFromNow(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const seconds = Math.max(0, Math.floor((now - then) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "—";
  }
}

function formatCost(cents: number | null): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function shortId(id: string | null): string {
  if (!id) return "—";
  if (id.length <= 12) return id;
  return id.slice(0, 8) + "…";
}

interface PipelineState {
  propose: boolean;
  critique: boolean;
  revise: boolean;
  approve: boolean;
  publish: boolean;
}

function deriveSteps(events: LiveEvent[]): PipelineState {
  const state: PipelineState = {
    propose: false,
    critique: false,
    revise: false,
    approve: false,
    publish: false,
  };
  for (const evt of events) {
    switch (evt.event_kind) {
      case "proposal":
        state.propose = true;
        break;
      case "critique":
        state.critique = true;
        break;
      case "revision":
        state.revise = true;
        break;
      case "verdict":
        if (evt.verdict_label === "approved") state.approve = true;
        break;
      case "publish":
        state.publish = true;
        break;
    }
  }
  return state;
}

const STATIC_AGENTS: { letter: string; name: string; meta: string }[] = [
  { letter: "S", name: "Strategist", meta: "v2.1 · gpt-5" },
  { letter: "C", name: "Critic", meta: "v1.4 · claude" },
  { letter: "P", name: "Publisher", meta: "v1.0 · tool" },
];

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-mono font-semibold uppercase tracking-[0.08em] text-ink-3 mb-2.5">
      {children}
    </div>
  );
}

export function RightRail({ run, events }: RightRailProps) {
  const steps = deriveSteps(events);
  const stepRows: { key: keyof PipelineState; label: string }[] = [
    { key: "propose", label: "propose" },
    { key: "critique", label: "critique" },
    { key: "revise", label: "revise" },
    { key: "approve", label: "approve" },
    { key: "publish", label: "publish" },
  ];

  return (
    <aside
      className="flex flex-col gap-3"
      style={{ position: "sticky", top: 84, alignSelf: "flex-start" }}
    >
      <Card>
        <CardContent>
          <CardTitle>Run · meta</CardTitle>
          <div className="flex flex-col gap-1">
            <MetaKV label="slot_id" value={shortId(run.slot_id)} />
            <MetaKV label="run #" value={run.run_number} />
            <MetaKV label="channel" value={run.channel ?? "—"} />
            <MetaKV
              label="started"
              value={relativeFromNow(run.started_at)}
            />
            <MetaKV
              label="tokens"
              value={run.tokens_used != null ? run.tokens_used.toLocaleString() : "—"}
            />
            <MetaKV label="cost" value={formatCost(run.cost_estimate_cents)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardTitle>Pipeline · planned</CardTitle>
          <div className="flex flex-col gap-1.5">
            {stepRows.map((row) => {
              const done = steps[row.key];
              return (
                <div
                  key={row.key}
                  className="flex items-center gap-2.5 text-[12px]"
                >
                  <span
                    className={cn(
                      "inline-block",
                      done
                        ? "bg-ink border-ink"
                        : "bg-transparent border-line-2"
                    )}
                    style={{
                      width: 8,
                      height: 8,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderRadius: 2,
                    }}
                  />
                  <span
                    className={cn(
                      "font-mono",
                      done ? "text-ink-2" : "text-ink-3"
                    )}
                  >
                    {row.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardTitle>Agents on this run</CardTitle>
          <div className="flex flex-col gap-2">
            {STATIC_AGENTS.map((a) => (
              <div key={a.name} className="flex items-center gap-2.5">
                <AgentAvatar letter={a.letter} size="sm" />
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="text-[12px] font-medium text-ink">
                    {a.name}
                  </span>
                  <span className="text-[10.5px] font-mono text-ink-3 truncate">
                    {a.meta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
