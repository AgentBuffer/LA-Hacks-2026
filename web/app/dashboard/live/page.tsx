import { Topbar } from "@/components/layout/topbar";
import { getLatestRunForBrand } from "@/actions/runs";
import { LiveView } from "./live-view";

export default async function LivePage() {
  const run = await getLatestRunForBrand();

  if (!run) {
    return (
      <>
        <Topbar title="Live agent stream" subtitle="no runs yet" live />
        <div className="p-7">
          <div className="rounded-lg border-[1.2px] border-line bg-paper px-6 py-10 text-center">
            <div className="font-serif text-[16px] text-ink">
              No runs yet
            </div>
            <div className="mt-2 text-[12px] text-ink-3 font-mono">
              your scheduled agents will populate this stream when they execute
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        title="Live agent stream"
        subtitle={`run #${run.run_number} · agent_messages ledger`}
        live
      />
      <LiveView run={run} />
    </>
  );
}
