import { Topbar } from "@/components/layout/topbar";
import { PulseDot } from "@/components/ui/pulse-dot";
import { getSlotsForCurrentBrand } from "@/actions/slots";
import { CalendarView } from "./calendar-view";

function HirePill() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-line bg-paper-2 text-[11px] font-mono text-ink-3">
      <PulseDot tone="ok" />
      3 agents · hired
    </span>
  );
}

export default async function CalendarPage() {
  const slots = await getSlotsForCurrentBrand();

  return (
    <>
      <Topbar
        title="Calendar"
        subtitle="Apr 20 — Apr 26, 2026"
        rightSlot={<HirePill />}
      />
      <CalendarView slots={slots} />
    </>
  );
}
