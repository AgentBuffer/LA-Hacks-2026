"use client";

import { Topbar } from "@/components/layout/topbar";
import { CreateView } from "@/components/create/create-view";

export default function CreatePage() {
  return (
    <>
      <Topbar
        title="Create — the brain"
        subtitle="describe the post you want · agents will build the spec on the right"
      />
      <CreateView />
    </>
  );
}
