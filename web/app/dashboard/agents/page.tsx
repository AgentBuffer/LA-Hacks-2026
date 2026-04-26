import { Topbar } from "@/components/layout/topbar";
import { AgentsGrid } from "@/components/agents/agents-grid";
import { AgentsRealtime } from "@/components/agents/agents-realtime";
import { HireChatPanel } from "@/components/agents/hire-chat-panel";
import {
  getScheduledAgentsForCurrentBrand,
  getBrandSummaryForCurrentOrg,
} from "@/actions/agents";
import { getCurrentOrgId } from "@/lib/supabase/current-org";

export default async function AgentsPage() {
  const [agents, brand, orgId] = await Promise.all([
    getScheduledAgentsForCurrentBrand(),
    getBrandSummaryForCurrentOrg(),
    getCurrentOrgId(),
  ]);
  const count = agents.length;
  const subtitle = brand
    ? `${count} agent${count === 1 ? "" : "s"} · ${brand.name}${
        brand.industry ? ` · ${brand.industry}` : ""
      }`
    : `${count} agent${count === 1 ? "" : "s"} · onboard a brand to hire`;

  return (
    <>
      <Topbar title="Agents" subtitle={subtitle} />
      <AgentsRealtime orgId={orgId} />
      <div className="px-7 py-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div>
          <AgentsGrid agents={agents} />
        </div>
        <aside className="xl:sticky xl:top-[68px] xl:self-start">
          <HireChatPanel brand={brand} />
        </aside>
      </div>
    </>
  );
}
