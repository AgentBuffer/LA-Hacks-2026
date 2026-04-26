"use client";

import { useSearchParams } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { CreateView } from "@/components/create/create-view";

export default function CreatePage() {
  const searchParams = useSearchParams();
  const editingId = searchParams.get("edit") ?? undefined;
  return (
    <>
      <Topbar
        title={editingId ? "Edit — the brain" : "Create — the brain"}
        subtitle={
          editingId
            ? "tell Main what to change · save when ready"
            : "describe a recurring agent · the spec fills in on the right"
        }
      />
      <CreateView editingId={editingId} />
    </>
  );
}
