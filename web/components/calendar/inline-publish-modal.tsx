"use client";

import { useState, useTransition } from "react";
import { X, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { HATCH_BG, aspectFor } from "@/lib/utils";
import { markSlotPublished, type SlotRow } from "@/actions/slots";

interface InlinePublishModalProps {
  slot: SlotRow;
  onClose: () => void;
}

const CHANNELS: { key: string; label: string }[] = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "x", label: "X" },
  { key: "instagram", label: "Instagram" },
];

export function InlinePublishModal({ slot, onClose }: InlinePublishModalProps) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {
      linkedin: false,
      x: false,
      instagram: false,
    };
    if (slot.platform in map) {
      map[slot.platform] = true;
    }
    return map;
  });
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<
    { platform: string; url: string }[] | null
  >(null);

  const enabledKeys = CHANNELS.filter((c) => enabled[c.key]).map((c) => c.key);

  function toggle(key: string) {
    setEnabled((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handlePublish() {
    if (enabledKeys.length === 0) return;
    const permalinks = enabledKeys.map((platform) => ({
      platform,
      url: `https://${platform}.com/lumen-coffee/${slot.id}`,
    }));
    startTransition(async () => {
      try {
        await markSlotPublished(slot.id, permalinks);
        setResults(permalinks);
      } catch {
        setResults(null);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 grid place-items-center bg-ink/30 z-50 p-6"
      onClick={onClose}
      style={{ backdropFilter: "blur(2px)" }}
    >
      <Card
        className="w-full max-w-[480px] p-0 shadow-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-line">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <ChannelIcon platform={slot.platform} size={14} />
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-ink-3">
                slot · {slot.platform}
              </span>
            </div>
            <div className="text-[13px] leading-snug text-ink line-clamp-3">
              {slot.caption ?? "Untitled draft"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 grid place-items-center rounded-md text-ink-3 hover:bg-bg-2 hover:text-ink cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {slot.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slot.image_url}
              alt=""
              className="w-full h-32 rounded-md object-cover border border-line"
            />
          ) : (
            <div
              className="w-full h-32 rounded-md border border-line grid place-items-center text-[11px] font-mono text-ink-3 uppercase tracking-wider"
              style={{ background: HATCH_BG }}
              aria-hidden
            >
              {aspectFor(slot.platform)}
            </div>
          )}

          {results ? (
            <div className="flex flex-col gap-2">
              <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-3 mb-1">
                published
              </div>
              {results.map((r) => (
                <div
                  key={r.platform}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-ok bg-ok-soft text-[12px] text-ink"
                >
                  <Check size={13} className="text-ok shrink-0" />
                  <span className="font-medium">posted to</span>
                  <ChannelIcon platform={r.platform} size={12} />
                  <span className="capitalize">{r.platform}</span>
                  <span className="ml-auto font-mono text-[10.5px] text-ink-3 truncate max-w-[180px]">
                    {r.url}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="text-[10.5px] font-mono uppercase tracking-wider text-ink-3 mb-1">
                channels
              </div>
              {CHANNELS.map((c) => {
                const on = enabled[c.key];
                return (
                  <label
                    key={c.key}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                      on
                        ? "border-ink bg-paper"
                        : "border-line bg-paper opacity-70 hover:opacity-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(c.key)}
                      className="accent-ink w-3.5 h-3.5 cursor-pointer"
                    />
                    <ChannelIcon platform={c.key} size={14} />
                    <span className="text-[12.5px] text-ink font-medium">
                      {c.label}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 pt-1">
          {results ? (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={onClose}
            >
              Done
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={enabledKeys.length === 0 || pending}
              onClick={handlePublish}
            >
              {pending
                ? "Publishing…"
                : `Publish to ${enabledKeys.length} channel${
                    enabledKeys.length === 1 ? "" : "s"
                  }`}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
