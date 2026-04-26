# Create-Flow Rewire Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scripted theater on `/dashboard/create` with a real multi-turn ASI:One chat that drives a live spec rail, plus an Edit-existing-agent extension on `/dashboard/agents`.

**Architecture:** The chat client calls the existing `POST /api/spec/converse` gateway endpoint each turn, renders the LLM's actual reply text, and replaces local spec state with the returned spec object. The spec rail re-renders from that state, pulsing the field that changed since the previous response. A new gateway PATCH route enables editing existing agents through the same chat, seeded by query param.

**Tech Stack:** Next.js 15 (App Router), TypeScript strict, FastAPI, Pydantic, Supabase service-role client.

**Spec:** `docs/superpowers/specs/2026-04-25-create-flow-rewire-design.md`

**Hackathon note:** No automated tests are added — verification is manual against a live gateway as the spec dictates. Each task ends in a commit.

---

## File map

**Backend (Python):**
- Modify `AgentBuffer-team/services/shared/db.py` — add `update_scheduled_agent`
- Modify `AgentBuffer-team/gateway/routes/agents.py` — add `GET /agents/{id}` and `PATCH /agents/{id}`

**Frontend (TypeScript):**
- Modify `web/lib/gateway.ts` — add `getAgent`, `updateAgent`
- Modify `web/components/create/scripted-flow.tsx` — strip to types only
- Modify `web/components/create/create-view.tsx` — rewrite as real multi-turn
- Modify `web/components/create/spec-rail.tsx` — rewrite to render from live spec
- Modify `web/components/create/chat-head.tsx` — drop fake address
- Modify `web/components/create/chat-message.tsx` — drop fake `viaAgent` rendering for honesty
- Modify `web/components/create/chat-container.tsx` — accept simpler chips prop
- Modify `web/components/agents/agent-card.tsx` — add Edit button
- Modify `web/app/dashboard/create/page.tsx` — accept `searchParams`

---

## Task 1: Add `update_scheduled_agent` DB helper

**Files:**
- Modify: `AgentBuffer-team/services/shared/db.py` (append after `insert_scheduled_agent`)

- [ ] **Step 1: Add the helper function**

Append after `insert_scheduled_agent` (line 345):

```python
ALLOWED_AGENT_PATCH_FIELDS = {
    "display_name",
    "role_line",
    "description",
    "cadence",
    "avatar_letter",
    "owns_channels",
    "tools",
    "voice_traits",
}


def update_scheduled_agent(scheduled_agent_id: str, patch: dict, org_id: str) -> dict:
    """Update an existing scheduled_agents row with the allowed subset of `patch`.

    Enforces org isolation: returns the row only if it belongs to `org_id`.
    Raises ValueError if no row matches or the patch ends up empty.
    """
    sb = get_supabase()
    safe = {k: v for k, v in patch.items() if k in ALLOWED_AGENT_PATCH_FIELDS}
    if not safe:
        raise ValueError("Patch contained no allowed fields")

    result = (
        sb.table("scheduled_agents")
        .update(safe)
        .eq("id", scheduled_agent_id)
        .eq("org_id", org_id)
        .execute()
        .data
    )
    if not result:
        raise ValueError(f"Scheduled agent {scheduled_agent_id} not found for org {org_id}")
    return result[0]
```

- [ ] **Step 2: Commit**

```bash
git add AgentBuffer-team/services/shared/db.py
git commit -m "feat(db): add update_scheduled_agent helper for edit flow"
```

---

## Task 2: Add gateway `GET /agents/{id}` and `PATCH /agents/{id}` routes

**Files:**
- Modify: `AgentBuffer-team/gateway/routes/agents.py`

- [ ] **Step 1: Add the routes**

At the top of the file, extend the imports:

```python
from services.shared.db import (
    get_brand_kit,
    get_scheduled_agent,
    insert_scheduled_agent,
    start_run,
    update_scheduled_agent,
)
```

Add a request model after `RunAgentRequest` (around line 84):

```python
class UpdateAgentRequest(BaseModel):
    patch: dict
```

Append two new routes at the end of the file:

```python
@router.get("/agents/{scheduled_agent_id}")
async def get_agent(scheduled_agent_id: str, org_id: OrgId) -> dict:
    """Return one scheduled_agents row, scoped to org."""
    try:
        row = get_scheduled_agent(scheduled_agent_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    if row["org_id"] != org_id:
        raise HTTPException(status_code=404, detail="Scheduled agent not found")
    return row


@router.patch("/agents/{scheduled_agent_id}")
async def update_agent(
    scheduled_agent_id: str,
    body: UpdateAgentRequest,
    org_id: OrgId,
) -> dict:
    """Patch the editable subset of a scheduled_agents row."""
    try:
        return update_scheduled_agent(scheduled_agent_id, body.patch, org_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
```

- [ ] **Step 2: Smoke-test the route exists**

Run:

```bash
cd "/Users/remiel/LA Hacks 2026/AgentBuffer-team" && uv run python -c "from gateway.routes.agents import router; print([r.path for r in router.routes])"
```

Expected: list includes `/api/agents/{scheduled_agent_id}` (PATCH and GET methods).

- [ ] **Step 3: Commit**

```bash
git add AgentBuffer-team/gateway/routes/agents.py
git commit -m "feat(gateway): add GET and PATCH /api/agents/{id} for edit flow"
```

---

## Task 3: Add web gateway client helpers

**Files:**
- Modify: `web/lib/gateway.ts`

- [ ] **Step 1: Append helpers**

Add at the bottom of the file (after `triggerPublish`):

```typescript
export interface ScheduledAgentRow {
  id: string;
  org_id: string;
  brand_id: string;
  slug: string;
  display_name: string;
  role_line: string;
  description: string | null;
  cadence: string;
  channel?: string;
  avatar_letter: string;
  owns_channels: string[];
  tools: string[];
  voice_traits: string[];
  status: string;
  health: string;
  runs_total: number;
  next_run_at: string | null;
  last_latency_ms: number | null;
}

export async function getAgent(id: string): Promise<ScheduledAgentRow> {
  return gatewayFetch(`/api/agents/${id}`);
}

export async function updateAgent(
  id: string,
  patch: Record<string, unknown>
): Promise<ScheduledAgentRow> {
  return gatewayFetch(`/api/agents/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ patch }),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add web/lib/gateway.ts
git commit -m "feat(web): add getAgent + updateAgent gateway helpers"
```

---

## Task 4: Strip `scripted-flow.tsx` to types only

**Files:**
- Modify: `web/components/create/scripted-flow.tsx`

- [ ] **Step 1: Replace the file contents**

Replace the entire file with:

```typescript
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
```

- [ ] **Step 2: Verify nothing else still imports the deleted constants**

Run:

```bash
grep -rn "SCRIPTED_USER_MESSAGE\|SPEC_REVEAL\|QUICK_CHIPS\|PIPELINE_STEPS\|viaAgent" "/Users/remiel/LA Hacks 2026/web/" --include="*.tsx" --include="*.ts"
```

Expected: matches only inside files that will be edited in later tasks (`create-view.tsx`, `spec-rail.tsx`, `chat-message.tsx`, `chat-container.tsx`). If any other file matches, surface it before continuing.

- [ ] **Step 3: Commit**

```bash
git add web/components/create/scripted-flow.tsx
git commit -m "refactor(create): strip scripted-flow constants down to types"
```

---

## Task 5: Rewrite `create-view.tsx` for real multi-turn chat

**Files:**
- Modify: `web/components/create/create-view.tsx`

- [ ] **Step 1: Replace the file contents**

Replace the entire file with:

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChatContainer } from "./chat-container";
import { SpecRail } from "./spec-rail";
import type { ChatMessage } from "./scripted-flow";
import {
  converseSpec,
  createCognitionAgent,
  gatewayFetch,
  getAgent,
  updateAgent,
} from "@/lib/gateway";

type Spec = Record<string, unknown>;

interface BrandRow {
  brand_id: string;
}

interface CreateViewProps {
  editingId?: string;
}

function nowStamp() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function preambleMessage(): ChatMessage {
  return {
    id: "preamble",
    role: "main",
    ts: nowStamp(),
    body: (
      <>
        Hey — I&apos;m <strong>Main</strong>. Describe a recurring agent you
        want to hire and I&apos;ll draft the spec on the right. I&apos;ll ask a
        follow-up if anything&apos;s vague.
      </>
    ),
  };
}

function editingPreamble(spec: Spec): ChatMessage {
  return {
    id: "preamble-edit",
    role: "main",
    ts: nowStamp(),
    body: (
      <>
        Editing <strong>{String(spec.display_name ?? "this agent")}</strong> —
        tell me what should change. I&apos;ll merge it into the spec on the
        right and you can save when ready.
      </>
    ),
  };
}

function changedKeys(prev: Spec | null, next: Spec): Set<string> {
  if (!prev) return new Set(Object.keys(next));
  const out = new Set<string>();
  for (const k of Object.keys(next)) {
    if (JSON.stringify(prev[k]) !== JSON.stringify(next[k])) out.add(k);
  }
  return out;
}

function chipsFor(spec: Spec | null, done: boolean): string[] {
  if (!spec) return [];
  if (done) return [];
  const missing: string[] = [];
  if (!spec.cadence || String(spec.cadence).length < 3) {
    missing.push("cadence: weekly", "cadence: daily", "cadence: every 3 days");
  }
  if (!spec.channel || !String(spec.channel)) {
    missing.push("channel: linkedin", "channel: x", "channel: instagram");
  }
  const traits = Array.isArray(spec.voice_traits) ? spec.voice_traits : [];
  if (traits.length < 2) missing.push("voice: thoughtful", "voice: confident");
  return missing.slice(0, 4);
}

export function CreateView({ editingId }: CreateViewProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([preambleMessage()]);
  const [spec, setSpec] = useState<Spec | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [pulsedKeys, setPulsedKeys] = useState<Set<string>>(new Set());
  const pulseTimer = useRef<number | null>(null);

  const append = useCallback((m: ChatMessage) => {
    setMessages((prev) => [...prev, m]);
  }, []);

  // Resolve org's first brand for the gateway call.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const brands = await gatewayFetch<BrandRow[]>("/api/brands");
        if (!cancelled && brands.length > 0) setBrandId(brands[0].brand_id);
      } catch (err) {
        console.warn("Could not resolve brand_id from gateway", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Seed editing state from URL.
  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await getAgent(editingId);
        if (cancelled) return;
        const seeded: Spec = {
          display_name: row.display_name,
          role_line: row.role_line,
          description: row.description ?? "",
          cadence: row.cadence,
          channel: row.owns_channels?.[0] ?? "",
          owns_channels: row.owns_channels ?? [],
          voice_traits: row.voice_traits ?? [],
          tools: row.tools ?? [],
          avatar_letter: row.avatar_letter,
          slug: row.slug,
        };
        setSpec(seeded);
        setDone(true);
        setMessages([editingPreamble(seeded)]);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not load that agent",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId]);

  const triggerPulse = useCallback((keys: Set<string>) => {
    setPulsedKeys(keys);
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(
      () => setPulsedKeys(new Set()),
      900,
    );
  }, []);

  useEffect(() => {
    return () => {
      if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    };
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;
      append({
        id: `u-${Date.now()}`,
        role: "user",
        ts: nowStamp(),
        body: trimmed,
      });
      setInputValue("");
      setPending(true);
      try {
        const resp = await converseSpec(trimmed, spec, brandId ?? "");
        const nextSpec = resp.spec as Spec;
        triggerPulse(changedKeys(spec, nextSpec));
        setSpec(nextSpec);
        setDone(resp.done);
        append({
          id: `m-${Date.now()}`,
          role: "main",
          ts: nowStamp(),
          body: resp.message,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "spec service unavailable";
        append({
          id: `e-${Date.now()}`,
          role: "main",
          ts: nowStamp(),
          body: <>spec service unavailable — {msg}</>,
        });
      } finally {
        setPending(false);
      }
    },
    [append, brandId, pending, spec, triggerPulse],
  );

  const handleSend = useCallback(() => {
    void send(inputValue);
  }, [inputValue, send]);

  const handleChipClick = useCallback(
    (chip: string) => {
      void send(chip);
    },
    [send],
  );

  const handleReset = useCallback(() => {
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    setMessages([editingId && spec ? editingPreamble(spec) : preambleMessage()]);
    setSpec(editingId ? spec : null);
    setDone(!!editingId);
    setInputValue("");
    setPulsedKeys(new Set());
  }, [editingId, spec]);

  const handleHire = useCallback(async () => {
    if (!spec || !brandId || pending) return;
    setPending(true);
    try {
      if (editingId) {
        await updateAgent(editingId, spec);
        toast.success("Agent updated.");
      } else {
        await createCognitionAgent(spec, brandId);
        toast.success("Agent hired — supervisor picks it up within 30s.");
      }
      router.push("/dashboard/agents");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setPending(false);
    }
  }, [brandId, editingId, pending, router, spec]);

  const chips = chipsFor(spec, done);

  return (
    <>
      <style>{`
        @keyframes ab-fade-in {
          0%   { opacity: 0; transform: translateY(2px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ab-spec-pulse {
          0%   { background-color: var(--brand-soft); }
          100% { background-color: transparent; }
        }
      `}</style>
      <div className="px-7 py-6 grid grid-cols-[1fr_360px] gap-5">
        <ChatContainer
          messages={messages}
          chips={chips.length > 0 ? chips : null}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          onReset={handleReset}
          onChipClick={handleChipClick}
          pending={pending}
        />
        <SpecRail
          spec={spec}
          done={done}
          pulsedKeys={pulsedKeys}
          editing={!!editingId}
          onSave={handleHire}
          saveDisabled={!spec || !brandId || pending}
          saving={pending}
        />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/create/create-view.tsx
git commit -m "feat(create): real multi-turn chat using converseSpec, drops scripted theater"
```

---

## Task 6: Rewrite `spec-rail.tsx` to render from live spec

**Files:**
- Modify: `web/components/create/spec-rail.tsx`

- [ ] **Step 1: Replace the file contents**

Replace the entire file with:

```typescript
"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PulseDot } from "@/components/ui/pulse-dot";
import { cn } from "@/lib/utils";
import { SPEC_ROWS } from "./scripted-flow";

type Spec = Record<string, unknown>;

function renderValue(key: string, raw: unknown): string {
  if (raw == null) return "";
  if (Array.isArray(raw)) return raw.map(String).join(" · ");
  if (key === "channel" && typeof raw === "string") return raw;
  return String(raw);
}

interface SpecRailProps {
  spec: Spec | null;
  done: boolean;
  pulsedKeys: Set<string>;
  editing: boolean;
  onSave: () => void;
  saveDisabled: boolean;
  saving: boolean;
}

export function SpecRail({
  spec,
  done,
  pulsedKeys,
  editing,
  onSave,
  saveDisabled,
  saving,
}: SpecRailProps) {
  const filledCount = spec
    ? SPEC_ROWS.filter((r) => {
        const v = spec[r.key];
        if (v == null) return false;
        if (Array.isArray(v)) return v.length > 0;
        return String(v).length > 0;
      }).length
    : 0;

  return (
    <aside
      className="flex flex-col gap-3 sticky"
      style={{ top: 84, alignSelf: "start" }}
    >
      <Card>
        <CardHeader className="flex items-center gap-2">
          <PulseDot tone={done ? "ok" : "warn"} />
          <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-ink-2">
            Spec · {done ? "ready" : "drafting"}
          </span>
          <span className="ml-auto font-mono text-[9.5px] text-ink-3">
            {filledCount}/{SPEC_ROWS.length}
          </span>
        </CardHeader>
        <CardContent className="py-1">
          {SPEC_ROWS.map((row) => {
            const value = spec ? renderValue(row.key, spec[row.key]) : "";
            const filled = value.length > 0;
            const pulsing = pulsedKeys.has(row.key);
            return (
              <div
                key={row.key}
                className="grid grid-cols-[80px_1fr] gap-x-2 items-baseline py-2 px-1 border-b border-line last:border-b-0"
              >
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                  {row.label}
                </span>
                {filled ? (
                  <span
                    className="font-sans text-[11.5px] text-ink leading-snug"
                    style={
                      pulsing
                        ? { animation: "ab-spec-pulse 800ms ease-out both" }
                        : undefined
                    }
                  >
                    {value}
                  </span>
                ) : (
                  <span className="font-mono text-[11px] text-ink-3">—</span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={onSave}
        disabled={saveDisabled || (!editing && !done)}
        className={cn("w-full", done && "shadow-1")}
      >
        {saving
          ? "Saving…"
          : editing
            ? "Save changes"
            : done
              ? "Hire this agent →"
              : "Keep refining…"}
      </Button>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/create/spec-rail.tsx
git commit -m "feat(create): render spec rail from live spec instead of scripted reveal"
```

---

## Task 7: Drop fake address from `chat-head.tsx`

**Files:**
- Modify: `web/components/create/chat-head.tsx`

- [ ] **Step 1: Replace the file contents**

```typescript
"use client";

import { AgentAvatar } from "@/components/ui/agent-avatar";
import { PulseDot } from "@/components/ui/pulse-dot";

export function ChatHead() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line bg-paper-2">
      <AgentAvatar letter="M" size="md" tone="ink" />
      <div className="min-w-0 flex flex-col gap-px">
        <div className="font-sans font-semibold text-[13.5px] text-ink leading-tight">
          Main
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-ink-3">
          <PulseDot tone="ok" />
          <span>routes through ASI:One</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/create/chat-head.tsx
git commit -m "fix(create): drop fake agent address from chat header"
```

---

## Task 8: Drop `viaAgent` from `chat-message.tsx`

**Files:**
- Modify: `web/components/create/chat-message.tsx`

- [ ] **Step 1: Replace the file contents**

```typescript
"use client";

import type { ReactNode } from "react";
import { AgentAvatar } from "@/components/ui/agent-avatar";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "main";
  ts: string;
  body: ReactNode;
}

export function ChatMessage({ role, ts, body }: ChatMessageProps) {
  const isMain = role === "main";
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 max-w-full",
        !isMain && "flex-row-reverse",
      )}
      style={{ animation: "ab-fade-in 320ms ease both" }}
    >
      <AgentAvatar
        letter={isMain ? "M" : "U"}
        size="xs"
        tone={isMain ? "ink" : "default"}
      />
      <div
        className={cn(
          "border border-line rounded-md px-3 py-2.5 max-w-[88%]",
          isMain ? "bg-paper" : "bg-paper-2",
        )}
      >
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3 mb-1">
          {isMain ? "main" : "you"} · {ts}
        </div>
        <div className="font-sans text-[12.5px] leading-[1.55] text-ink-2 [&_strong]:text-ink [&_strong]:font-semibold">
          {body}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/create/chat-message.tsx
git commit -m "fix(create): drop fake @uagent attribution from chat bubbles"
```

---

## Task 9: Update `chat-container.tsx` to pass `pending` and ditch `viaAgent` prop

**Files:**
- Modify: `web/components/create/chat-container.tsx`

- [ ] **Step 1: Replace the file contents**

```typescript
"use client";

import { useEffect, useRef } from "react";
import { ChatHead } from "./chat-head";
import { ChatMessage } from "./chat-message";
import { ChatChips } from "./chat-chips";
import { Composer } from "./composer";
import type { ChatMessage as ChatMessageType } from "./scripted-flow";

interface ChatContainerProps {
  messages: ChatMessageType[];
  chips: string[] | null;
  inputValue: string;
  pending: boolean;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onReset: () => void;
  onChipClick: (chip: string) => void;
}

export function ChatContainer({
  messages,
  chips,
  inputValue,
  pending,
  onInputChange,
  onSend,
  onReset,
  onChipClick,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, chips, pending]);

  return (
    <div
      className="flex flex-col bg-paper rounded-lg overflow-hidden"
      style={{
        border: "1.2px solid var(--ink-2)",
        minHeight: 540,
        maxHeight: 600,
      }}
    >
      <ChatHead />
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3.5"
      >
        {messages.map((m) => (
          <ChatMessage key={m.id} role={m.role} ts={m.ts} body={m.body} />
        ))}
        {pending && (
          <div
            className="self-start font-mono text-[10.5px] text-ink-3 px-2 py-1"
            style={{ animation: "ab-fade-in 240ms ease both" }}
          >
            ⋯ thinking
          </div>
        )}
      </div>
      {chips && chips.length > 0 && (
        <ChatChips chips={chips} onChipClick={onChipClick} />
      )}
      <Composer
        value={inputValue}
        onChange={onInputChange}
        onSend={onSend}
        onReset={onReset}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/components/create/chat-container.tsx
git commit -m "feat(create): chat container shows real thinking indicator and drops viaAgent"
```

---

## Task 10: Accept `editingId` from URL on the Create page

**Files:**
- Modify: `web/app/dashboard/create/page.tsx`

The existing page is a `"use client"` component that wraps `<Topbar />` and `<CreateView />`. Keep it client-side and read the query param via `useSearchParams()` rather than restructuring to a server component (the warning in `web/AGENTS.md` cautions that this Next.js may diverge from training-data defaults; the safe move is to make the smallest change that works).

- [ ] **Step 1: Replace the file contents**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add web/app/dashboard/create/page.tsx
git commit -m "feat(create): forward ?edit=<id> query param to CreateView"
```

---

## Task 11: Add Edit button to `agent-card.tsx`

**Files:**
- Modify: `web/components/agents/agent-card.tsx`

- [ ] **Step 1: Add a `Link` import and an Edit button next to `RunNowButton`**

At the top of the file, add:

```typescript
import Link from "next/link";
```

Find the footer section (around line 110) where `RunNowButton` and "runs" count live:

```tsx
            <RunNowButton scheduledAgentId={agent.id} disabled={isDisabled} />
            <span className="font-mono text-[10px] text-ink-3">
              {agent.runs_total} runs
            </span>
```

Replace with:

```tsx
            <RunNowButton scheduledAgentId={agent.id} disabled={isDisabled} />
            <Link
              href={`/dashboard/create?edit=${agent.id}`}
              className="font-mono text-[10px] text-ink-3 hover:text-ink underline-offset-2 hover:underline"
            >
              edit
            </Link>
            <span className="font-mono text-[10px] text-ink-3">
              {agent.runs_total} runs
            </span>
```

- [ ] **Step 2: Commit**

```bash
git add web/components/agents/agent-card.tsx
git commit -m "feat(agents): add Edit link on agent card to /dashboard/create?edit=<id>"
```

---

## Task 12: Manual verification

**Files:** none

Run a local stack — `pnpm dev` for web, the gateway via its existing entrypoint with `ASI_ONE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` set.

- [ ] **Step 1: Type-check the web app**

```bash
cd "/Users/remiel/LA Hacks 2026/web" && pnpm tsc --noEmit
```

Expected: no errors. If type errors appear, fix them in the offending file and re-run.

- [ ] **Step 2: Real chat smoke test**

Open `http://localhost:3000/dashboard/create`. Type:

> weekly LinkedIn agent that shares a Friday reflection on craft

Expect: reply text comes from the LLM (not the fixed "Drafted a … post for …" template). Spec rail fills with display_name, role, cadence=weekly, channel=linkedin, voice traits, tools. The "thinking ⋯" indicator appears between turns.

- [ ] **Step 3: Refine smoke test**

Reply:

> make it twice a week instead

Expect: cadence row updates and pulses. Other rows unchanged unless the LLM legitimately re-derived them.

- [ ] **Step 4: Hire smoke test**

When the spec rail says "ready", click "Hire this agent →". Expect: toast success, navigation to `/dashboard/agents`, new card visible (it may take up to 30s for the supervisor to register the uAgent — the row appears immediately).

- [ ] **Step 5: Edit smoke test**

On `/dashboard/agents`, click the new card's "edit" link. Expect: returns to `/dashboard/create?edit=<id>`, header preamble reads "Editing **<display_name>** —", spec rail is fully populated, button reads "Save changes". Type:

> change cadence to daily

Expect: cadence updates and pulses. Click "Save changes" → toast success → returns to `/dashboard/agents` with cadence updated on the card.

- [ ] **Step 6: Error smoke test**

Stop the gateway (or unset `ASI_ONE_API_KEY` and restart it). On `/dashboard/create` type any prompt. Expect: a single bubble that reads "spec service unavailable — Gateway 500: …" or similar. **No** scripted coffee-pour content. No silent fallback.

- [ ] **Step 7: If anything failed, file follow-ups**

If a step failed and the cause is in scope (e.g. a typo in the rewrite), fix in place and re-run. If the cause is out of scope (e.g. supervisor not picking up the new row in 30s), surface it to the user — don't bandage.

- [ ] **Step 8: Final commit if any fixes were needed**

```bash
git add -A && git commit -m "fix(create): manual-verification followups"
```

(Skip if step 7 produced no diffs.)
