import { AgentCard } from "@/components/agents/agent-card";
import { AgentCardAddTile } from "@/components/agents/agent-card-add-tile";
import type { ScheduledAgentRow } from "@/actions/agents";

interface AgentsGridProps {
  agents: ScheduledAgentRow[];
}

export function AgentsGrid({ agents }: AgentsGridProps) {
  if (agents.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3">
          <AgentCardAddTile large />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
      <AgentCardAddTile />
    </div>
  );
}
