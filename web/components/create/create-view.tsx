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
        const msg =
          err instanceof Error ? err.message : "spec service unavailable";
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
    setMessages([
      editingId && spec ? editingPreamble(spec) : preambleMessage(),
    ]);
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
