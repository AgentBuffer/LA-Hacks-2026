import { Topbar } from "@/components/layout/topbar";
import { PulseDot } from "@/components/ui/pulse-dot";
import { getSlotsForCurrentBrand } from "@/actions/slots";
import { getScheduledAgentsForCurrentBrand } from "@/actions/agents";
import { CalendarView } from "./calendar-view";

export default async function CalendarPage() {
  const [slots, agents] = await Promise.all([
    getSlotsForCurrentBrand(),
    getScheduledAgentsForCurrentBrand(),
  ]);
  const activeCount = agents.filter((a) => a.status !== "disabled").length;

  return (
    <>
      <Topbar
        title="Calendar"
        subtitle="brand calendar · slots + scheduled cognition runs"
        rightSlot={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-line bg-paper-2 text-[11px] font-mono text-ink-3">
            {activeCount > 0 ? (
              <PulseDot tone="ok" />
            ) : (
              <span className="inline-block w-[6px] h-[6px] rounded-full bg-ink-3" />
            )}
            {activeCount} agent{activeCount === 1 ? "" : "s"} · active
          </span>
        }
      />
      <CalendarView slots={slots} agents={agents} />
    </>
  );
}
