import type { ReactNode } from "react";

export interface SpecField {
  key: string;
  label: string;
  value: string;
  via: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "main";
  ts: string;
  body: ReactNode;
  viaAgent?: string;
}

export const SCRIPTED_USER_MESSAGE =
  "i want a friday afternoon tiktok of slow-mo coffee pours, quiet confident vibe";

export const SPEC_REVEAL: SpecField[] = [
  {
    key: "channel",
    label: "channel",
    value: "tiktok",
    via: "@channel-router-uagent",
  },
  {
    key: "scheduled",
    label: "scheduled",
    value: "Fri 15:00 PT · weekly",
    via: "@scheduler-uagent",
  },
  {
    key: "format",
    label: "format",
    value: "9:16 · 22s · single take",
    via: "@scheduler-uagent",
  },
  {
    key: "hook",
    label: "hook",
    value: "slow-mo oat cortado pour, hand-lettered date stamp",
    via: "@brand-voice-uagent",
  },
  {
    key: "voice",
    label: "voice",
    value: "quiet · confident · ≤12 words VO",
    via: "@brand-voice-uagent",
  },
  {
    key: "caption",
    label: "caption",
    value: "friday, in slow motion. ☕",
    via: "@strategist",
  },
  {
    key: "hashtags",
    label: "hashtags",
    value: "#oatmilk #slowcoffee #fridayfeels",
    via: "@critic-uagent",
  },
];

export const QUICK_CHIPS = [
  "make it shorter",
  "try IG instead",
  "add a caption",
  "push to next week",
  "show me alts",
];

export const PIPELINE_STEPS: { label: string; agent: string }[] = [
  { label: "propose", agent: "strategist" },
  { label: "critique", agent: "critic" },
  { label: "revise", agent: "strategist" },
  { label: "human review", agent: "you" },
  { label: "publish", agent: "publisher" },
];
