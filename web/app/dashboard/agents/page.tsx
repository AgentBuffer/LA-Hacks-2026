import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { AgentsGrid } from "@/components/agents/agents-grid";
import { getScheduledAgentsForCurrentBrand } from "@/actions/agents";

export default async function AgentsPage() {
  const agents = await getScheduledAgentsForCurrentBrand();
  const count = agents.length;
  const subtitle = `${count} agent${count === 1 ? "" : "s"} · last redeployed 4d ago · all signing with brand_kit/lumen.pem`;

  return (
    <>
      <Topbar
        title="Agents"
        subtitle={subtitle}
        rightSlot={
          <Link href="/dashboard/create">
            <Button variant="primary" size="sm">
              + Hire agent
            </Button>
          </Link>
        }
      />
      <div className="px-7 py-6">
        <AgentsGrid agents={agents} />
      </div>
    </>
  );
}
