import Link from "next/link";

interface AgentCardAddTileProps {
  large?: boolean;
}

export function AgentCardAddTile({ large = false }: AgentCardAddTileProps) {
  return (
    <Link
      href="/dashboard/create"
      className="group flex flex-col items-center justify-center gap-2 rounded-lg border-[1.2px] border-dashed border-ink-3 min-h-[240px] text-ink-3 hover:border-ink-2 hover:text-ink-2 transition-colors"
    >
      <span className="text-[24px] leading-none font-light">+</span>
      <span className="font-sans text-[12.5px] text-ink-2">
        Hire a new agent
      </span>
      {large && (
        <span className="mt-1 font-mono text-[10.5px] text-ink-3 text-center px-6">
          No agents yet · spawn one from a recipe
        </span>
      )}
    </Link>
  );
}
