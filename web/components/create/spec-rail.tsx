"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetaKV } from "@/components/ui/meta-kv";
import { PulseDot } from "@/components/ui/pulse-dot";
import { cn, HATCH_BG } from "@/lib/utils";
import { hireAgent } from "@/actions/agents";
import { createCognitionAgent } from "@/lib/gateway";
import { SPEC_REVEAL, PIPELINE_STEPS } from "./scripted-flow";

interface SpecRowProps {
  label: string;
  value: string;
  via: string;
  revealed: boolean;
  pulsing?: boolean;
}

function SpecRow({ label, value, via, revealed, pulsing }: SpecRowProps) {
  return (
    <div
      className="grid grid-cols-[80px_1fr_auto] gap-x-2 items-baseline py-2 px-1 border-b border-line last:border-b-0"
      style={revealed ? { animation: "ab-slide-in 250ms ease both" } : undefined}
    >
      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
        {label}
      </span>
      {revealed ? (
        <>
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
          <span className="font-mono text-[9.5px] text-brand-ink whitespace-nowrap pl-1">
            {via}
          </span>
        </>
      ) : (
        <>
          <span className="font-mono text-[11px] text-ink-3">—</span>
          <span />
        </>
      )}
    </div>
  );
}

interface LiveSpecCardProps {
  revealed: Set<string>;
  lastRevealedKey: string | null;
  overrides?: Record<string, string>;
}

function LiveSpecCard({ revealed, lastRevealedKey, overrides }: LiveSpecCardProps) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <PulseDot tone="ok" />
        <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-ink-2">
          Spec · Live
        </span>
        <span className="ml-auto font-mono text-[9.5px] text-ink-3">
          {revealed.size}/{SPEC_REVEAL.length}
        </span>
      </CardHeader>
      <CardContent className="py-1">
        {SPEC_REVEAL.map((row) => (
          <SpecRow
            key={row.key}
            label={row.label}
            value={overrides?.[row.key] ?? row.value}
            via={row.via}
            revealed={revealed.has(row.key)}
            pulsing={
              row.key === "caption" &&
              row.key === lastRevealedKey &&
              revealed.has(row.key)
            }
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface PipelineCardProps {
  stage: number;
}

function PipelineCard({ stage }: PipelineCardProps) {
  return (
    <Card>
      <CardHeader>
        <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-ink-2">
          Pipeline · Planned
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {PIPELINE_STEPS.map((s, i) => {
          const done = stage > i;
          const current = stage === i;
          return (
            <div
              key={s.label}
              className="grid grid-cols-[16px_1fr_auto] items-center gap-2"
            >
              <span
                className={cn(
                  "w-2 h-2 inline-block",
                  done && "bg-ink rounded-sm",
                  current && "bg-ink rounded-full",
                  !done && !current && "border border-line rounded-sm"
                )}
              />
              <span
                className={cn(
                  "font-sans text-[12px]",
                  done || current ? "text-ink" : "text-ink-3"
                )}
              >
                {s.label}
              </span>
              <span className="font-mono text-[10px] text-ink-3">
                {s.agent}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AssetCard() {
  return (
    <Card>
      <CardHeader>
        <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-ink-2">
          Asset
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div
          className="w-full h-[120px] rounded-md grid place-items-center border border-line"
          style={{ background: HATCH_BG }}
        >
          <span className="font-mono text-[11px] text-ink-3">
            9:16 · oat-cortado pour
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1 border border-line"
          >
            ⬆ upload
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex-1 border border-line"
          >
            ⚡ generate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EstimatesCard() {
  return (
    <Card>
      <CardHeader>
        <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-ink-2">
          Estimates
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <MetaKV label="tokens" value="~2.4k" />
        <MetaKV label="cost" value="~$0.02" />
        <MetaKV label="latency" value="~14s end-to-end" />
      </CardContent>
    </Card>
  );
}

interface HireBlockProps {
  visible: boolean;
  spec?: Record<string, unknown> | null;
  brandId?: string | null;
}

function HireBlock({ visible, spec, brandId }: HireBlockProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!visible) return null;

  function handleHire() {
    startTransition(async () => {
      try {
        if (spec && brandId) {
          // Real path — POST through the gateway, which writes via main_agent.
          await createCognitionAgent(spec, brandId);
        } else {
          // Fallback — local server action with scripted defaults.
          await hireAgent({
            display_name: "TikTok pours",
            cadence: "Fri 15:00 PT weekly",
            channel: "tiktok",
            voice_traits: ["quiet", "confident"],
            tools: [
              "scheduler-uagent",
              "brand-voice-uagent",
              "channel-router-uagent",
              "strategist",
              "critic-uagent",
            ],
            description:
              "22-second TikTok with slow-mo pour, hand-lettered date stamp, voiceover under 12 words.",
            avatar_letter: "T",
          });
        }
        toast.success("Agent hired — heading to Agents.");
        router.push("/dashboard/agents");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Hire failed");
      }
    });
  }

  return (
    <div style={{ animation: "ab-slide-in 280ms ease both" }}>
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={handleHire}
        disabled={pending}
        className="w-full"
      >
        {pending ? "Hiring…" : "Hire this agent →"}
      </Button>
    </div>
  );
}

interface SpecRailProps {
  revealedSpecKeys: Set<string>;
  lastRevealedKey: string | null;
  pipelineStage: number;
  hireVisible: boolean;
  specOverrides?: Record<string, string>;
  spec?: Record<string, unknown> | null;
  brandId?: string | null;
}

export function SpecRail({
  revealedSpecKeys,
  lastRevealedKey,
  pipelineStage,
  hireVisible,
  specOverrides,
  spec,
  brandId,
}: SpecRailProps) {
  return (
    <aside
      className="flex flex-col gap-3 sticky"
      style={{ top: 84, alignSelf: "start" }}
    >
      <LiveSpecCard
        revealed={revealedSpecKeys}
        lastRevealedKey={lastRevealedKey}
        overrides={specOverrides}
      />
      <PipelineCard stage={pipelineStage} />
      <AssetCard />
      <EstimatesCard />
      <HireBlock visible={hireVisible} spec={spec} brandId={brandId} />
    </aside>
  );
}
