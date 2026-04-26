import type { ReactNode } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "main";
  ts: string;
  body: ReactNode;
}

export interface SpecRowDef {
  key: string;
  label: string;
}

// Spec keys rendered in the rail, in display order. Driven by the live
// `spec` returned by the LLM each turn — an entry is "revealed" iff the
// spec has that key with a non-empty value.
export const SPEC_ROWS: SpecRowDef[] = [
  { key: "display_name", label: "name" },
  { key: "role_line", label: "role" },
  { key: "cadence", label: "cadence" },
  { key: "channel", label: "channel" },
  { key: "voice_traits", label: "voice" },
  { key: "tools", label: "tools" },
];
