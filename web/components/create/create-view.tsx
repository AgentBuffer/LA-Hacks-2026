"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatContainer } from "./chat-container";
import { SpecRail } from "./spec-rail";
import {
  QUICK_CHIPS,
  SCRIPTED_USER_MESSAGE,
  SPEC_REVEAL,
  type ChatMessage,
} from "./scripted-flow";
import { extractSpec, gatewayFetch } from "@/lib/gateway";

const PREAMBLE_MESSAGE: ChatMessage = {
  id: "preamble",
  role: "main",
  ts: "14:01",
  body: (
    <>
      Hey — I&apos;m <strong>Main</strong>, your @asi1-orchestrator. Describe
      the post you want and I&apos;ll route the brief through the right
      uAgents. The spec on the right fills in as my crew chimes in.
    </>
  ),
};

function nowStamp(offsetSec = 0) {
  const d = new Date();
  d.setSeconds(d.getSeconds() + offsetSec);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function specToOverrides(spec: Record<string, unknown>): Record<string, string> {
  const voice = Array.isArray(spec.voice_traits)
    ? (spec.voice_traits as string[]).join(" · ")
    : "";
  const tools = Array.isArray(spec.tools)
    ? (spec.tools as string[]).slice(0, 3).join(" ")
    : "";
  return {
    channel: String(spec.channel ?? ""),
    scheduled: String(spec.cadence ?? ""),
    format: String(spec.cadence ?? "auto"),
    hook: String(spec.role_line ?? spec.description ?? ""),
    voice,
    caption: String(spec.display_name ?? ""),
    hashtags: tools,
  };
}

interface BrandRow {
  brand_id: string;
}

export function CreateView() {
  const [messages, setMessages] = useState<ChatMessage[]>([PREAMBLE_MESSAGE]);
  const [revealedSpecKeys, setRevealedSpecKeys] = useState<Set<string>>(
    new Set()
  );
  const [lastRevealedKey, setLastRevealedKey] = useState<string | null>(null);
  const [pipelineStage, setPipelineStage] = useState(0);
  const [chipsVisible, setChipsVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [brandId, setBrandId] = useState<string | null>(null);
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);
  const [specOverrides, setSpecOverrides] = useState<Record<string, string>>({});
  const timeoutsRef = useRef<number[]>([]);

  const clearTimeouts = useCallback(() => {
    for (const id of timeoutsRef.current) {
      window.clearTimeout(id);
    }
    timeoutsRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearTimeouts();
  }, [clearTimeouts]);

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

  const append = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const revealSpec = useCallback((key: string) => {
    setRevealedSpecKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setLastRevealedKey(key);
  }, []);

  const runReal = useCallback(
    async (userText: string) => {
      clearTimeouts();
      setRevealedSpecKeys(new Set());
      setLastRevealedKey(null);
      setPipelineStage(0);
      setChipsVisible(false);
      setSpec(null);
      setSpecOverrides({});

      append({
        id: `u-${Date.now()}`,
        role: "user",
        ts: nowStamp(),
        body: userText,
      });

      const thinking: ChatMessage = {
        id: `m-think-${Date.now()}`,
        role: "main",
        ts: nowStamp(),
        viaAgent: "@asi1-orchestrator",
        body: "Routing through the strategist crew…",
      };
      append(thinking);

      const useScripted = () => {
        const revealOrder = SPEC_REVEAL.map((s, i) => ({
          t: 600 + i * 200,
          key: s.key,
        }));
        for (const r of revealOrder) {
          const id = window.setTimeout(() => revealSpec(r.key), r.t);
          timeoutsRef.current.push(id);
        }
        const t1 = window.setTimeout(() => setPipelineStage(1), 2200);
        const t2 = window.setTimeout(() => setChipsVisible(true), 2300);
        timeoutsRef.current.push(t1, t2);
      };

      if (!brandId) {
        useScripted();
        return;
      }

      try {
        const fetched = await extractSpec(userText, brandId);
        setSpec(fetched);
        setSpecOverrides(specToOverrides(fetched));

        append({
          id: `m-${Date.now()}`,
          role: "main",
          ts: nowStamp(),
          viaAgent: "@asi1-orchestrator",
          body: (
            <>
              Drafted a <strong>{String(fetched.cadence ?? "weekly")}</strong>
              {" "}post for <strong>{String(fetched.channel ?? "linkedin")}</strong>
              . Spec on the right ↘
            </>
          ),
        });

        SPEC_REVEAL.forEach((row, i) => {
          const id = window.setTimeout(() => revealSpec(row.key), 200 + i * 150);
          timeoutsRef.current.push(id);
        });
        const t1 = window.setTimeout(
          () => setPipelineStage(1),
          200 + SPEC_REVEAL.length * 150 + 100
        );
        const t2 = window.setTimeout(
          () => setChipsVisible(true),
          200 + SPEC_REVEAL.length * 150 + 200
        );
        timeoutsRef.current.push(t1, t2);
      } catch (err) {
        console.error("extractSpec failed", err);
        append({
          id: `m-err-${Date.now()}`,
          role: "main",
          ts: nowStamp(),
          viaAgent: "@asi1-orchestrator",
          body: "Spec service didn't respond — falling back to a scripted preview.",
        });
        useScripted();
      }
    },
    [append, brandId, clearTimeouts, revealSpec]
  );

  const handleSend = useCallback(() => {
    const text = inputValue.trim() || SCRIPTED_USER_MESSAGE;
    setInputValue("");
    void runReal(text);
  }, [inputValue, runReal]);

  const handleChipClick = useCallback(
    (chip: string) => {
      void runReal(chip);
    },
    [runReal]
  );

  const handleReset = useCallback(() => {
    clearTimeouts();
    setMessages([PREAMBLE_MESSAGE]);
    setRevealedSpecKeys(new Set());
    setLastRevealedKey(null);
    setPipelineStage(0);
    setChipsVisible(false);
    setInputValue("");
    setSpec(null);
    setSpecOverrides({});
  }, [clearTimeouts]);

  const allRevealed = revealedSpecKeys.size === SPEC_REVEAL.length;
  const chips = chipsVisible ? QUICK_CHIPS : null;

  return (
    <>
      <style>{`
        @keyframes ab-slide-in {
          0%   { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ab-fade-in {
          0%   { opacity: 0; transform: translateY(2px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ab-spec-pulse {
          0%   { background-color: var(--brand-soft); }
          100% { background-color: transparent; }
        }
        @keyframes ab-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: .55; transform: scale(.85); }
        }
      `}</style>
      <div className="px-7 py-6 grid grid-cols-[1fr_360px] gap-5">
        <ChatContainer
          messages={messages}
          chips={chips}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          onReset={handleReset}
          onChipClick={handleChipClick}
        />
        <SpecRail
          revealedSpecKeys={revealedSpecKeys}
          lastRevealedKey={lastRevealedKey}
          pipelineStage={pipelineStage}
          hireVisible={allRevealed}
          specOverrides={specOverrides}
          spec={spec}
          brandId={brandId}
        />
      </div>
    </>
  );
}
