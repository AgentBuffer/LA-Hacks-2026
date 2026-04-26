import { AgentAvatar } from "@/components/ui/agent-avatar";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";
import type { ScheduledAgentRow } from "@/actions/agents";
import { RunNowButton } from "@/components/agents/run-now-button";

interface AgentCardProps {
  agent: ScheduledAgentRow;
}

const TOOL_CAP = 6;

const dotByHealth: Record<ScheduledAgentRow["health"], string> = {
  ok: "bg-ok",
  warn: "bg-yellow-500",
  off: "bg-ink-3",
};

export function AgentCard({ agent }: AgentCardProps) {
  const isDisabled = agent.status === "disabled";
  const visibleTools = agent.tools.slice(0, TOOL_CAP);
  const overflowCount = Math.max(0, agent.tools.length - TOOL_CAP);

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg bg-paper p-3.5 min-h-[240px]",
        "border-[1.2px] border-line-2",
        isDisabled && "opacity-55"
      )}
    >
      {/* Top row */}
      <div className="flex items-start gap-2.5">
        <AgentAvatar letter={agent.avatar_letter} size="md" tone="ink" />
        <div className="flex-1 min-w-0">
          <div className="font-sans font-semibold text-[14px] text-ink leading-tight tracking-[-0.005em] truncate">
            {agent.display_name}
          </div>
          <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.04em] text-ink-3 truncate">
            {agent.role_line}
          </div>
        </div>
        <div className="font-mono text-[11px] text-ink-3 tabular-nums whitespace-nowrap">
          {agent.last_latency_ms != null ? `${agent.last_latency_ms} ms` : "—"}
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <p
          className="mt-3 font-sans text-[11.5px] leading-[1.5] text-ink-2 line-clamp-3"
        >
          {agent.description}
        </p>
      )}

      {/* Tools row */}
      {agent.tools.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {visibleTools.map((tool) => (
            <Tag key={tool} size="sm">
              {tool}
            </Tag>
          ))}
          {overflowCount > 0 && (
            <Tag size="sm" variant="soft">
              +{overflowCount} more
            </Tag>
          )}
        </div>
      )}

      {/* Channels row */}
      {agent.owns_channels.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-ink-3">
            publishes to
          </span>
          <div className="flex gap-1">
            {agent.owns_channels.map((ch) => (
              <ChannelIcon key={ch} platform={ch} size={12} />
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-2 border-t border-dashed border-ink-3 flex items-center justify-between gap-2">
        {isDisabled ? (
          <span className="font-mono text-[10px] text-ink-3">
            off · last run 11d ago
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-block w-[6px] h-[6px] rounded-full",
                dotByHealth[agent.health]
              )}
            />
            <span className="font-mono text-[10px] text-ink-3">
              {agent.health}
              {" · "}
              {agent.last_latency_ms != null ? agent.last_latency_ms : "—"} ms
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <RunNowButton scheduledAgentId={agent.id} disabled={isDisabled} />
          <span className="font-mono text-[10px] text-ink-3">
            {agent.runs_total} runs
          </span>
        </div>
      </div>
    </div>
  );
}
