"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Sparkles, Send, Check, X, Pencil } from "lucide-react";
import { converseSpec, createCognitionAgent } from "@/lib/gateway";
import { cn } from "@/lib/utils";
import type { BrandSummary } from "@/actions/agents";

interface HireChatPanelProps {
  brand: BrandSummary | null;
}

export interface DraftSpec {
  display_name: string;
  slug: string;
  role_line: string;
  cadence: string;
  channel?: string;
  voice_traits: string[];
  description: string;
  tools: string[];
  avatar_letter: string;
  owns_channels?: string[];
}

type Message =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string };

const STARTER_SUGGESTIONS = [
  "Weekly LinkedIn agent that shares a Friday reflection on craft",
  "Daily X agent that posts one practical tip in our voice",
  "Twice-weekly Instagram carousel with brand-relevant lessons",
];

const CHANNEL_OPTIONS = [
  "linkedin",
  "x",
  "instagram",
  "tiktok",
  "youtube",
  "bluesky",
];

const CADENCE_OPTIONS = [
  "daily",
  "weekly",
  "every 3 days",
  "every 12 hours",
  "monthly",
];

export function HireChatPanel({ brand }: HireChatPanelProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [spec, setSpec] = useState<DraftSpec | null>(null);
  const [done, setDone] = useState(false);
  const [hireError, setHireError] = useState<string | null>(null);
  const [hired, setHired] = useState(false);
  const [pending, startTransition] = useTransition();

  const brandReady = !!brand?.brand_id;

  function pushMessage(m: Message) {
    setMessages((prev) => [...prev, m]);
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending || hired) return;
    pushMessage({ kind: "user", text: trimmed });
    setInput("");
    setHireError(null);

    startTransition(async () => {
      try {
        const out = await converseSpec(
          trimmed,
          (spec as unknown as Record<string, unknown>) ?? null,
          brand?.brand_id ?? ""
        );
        setSpec(out.spec as unknown as DraftSpec);
        setDone(out.done);
        pushMessage({ kind: "assistant", text: out.message });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not refine the spec.";
        pushMessage({
          kind: "assistant",
          text: `${message} — try mentioning a cadence (weekly/daily) and a channel (linkedin/x/instagram).`,
        });
      }
    });
  }

  function handleHire() {
    if (!spec || !brand?.brand_id || pending || hired) return;
    setHireError(null);
    startTransition(async () => {
      try {
        await createCognitionAgent(
          spec as unknown as Record<string, unknown>,
          brand.brand_id!
        );
        setHired(true);
        pushMessage({
          kind: "assistant",
          text: "Hired — supervisor will run it on cadence within 30s.",
        });
        router.refresh();
      } catch (err) {
        setHireError(err instanceof Error ? err.message : "Hire failed.");
      }
    });
  }

  function handleReset() {
    setMessages([]);
    setSpec(null);
    setDone(false);
    setHired(false);
    setHireError(null);
  }

  function patchSpec(patch: Partial<DraftSpec>) {
    setSpec((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      // keep owns_channels/channel synchronized when channel changes
      if (patch.channel) next.owns_channels = [patch.channel];
      return next;
    });
    // Editing fields invalidates "done"; user can always Hire if they choose.
    setDone(false);
  }

  return (
    <div className="rounded-lg border border-line-2 bg-paper">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line-2">
        <Sparkles size={13} className="text-brand-ink" />
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink">
          Hire an agent
        </span>
        {brand?.name ? (
          <span className="ml-auto font-mono text-[10px] text-ink-3 truncate max-w-[260px]">
            grounded in {brand.name}
            {brand.industry ? ` · ${brand.industry}` : ""}
          </span>
        ) : (
          <span className="ml-auto font-mono text-[10px] text-yellow-700">
            no brand yet — onboard first
          </span>
        )}
      </div>

      <div className="px-3.5 py-3 flex flex-col gap-2 max-h-[260px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-[12px] text-ink-2 leading-relaxed">
              Describe a recurring agent. I'll draft a spec, ask follow-up
              questions if anything's vague, and you can edit any field directly.
            </p>
            <div className="flex flex-col gap-1">
              {STARTER_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={!brandReady || pending}
                  className={cn(
                    "text-left text-[11.5px] px-2.5 py-1.5 rounded-md border border-line",
                    "text-ink-2 hover:bg-bg-2 transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) =>
            m.kind === "user" ? (
              <div
                key={i}
                className="self-end max-w-[85%] px-3 py-1.5 rounded-md bg-ink text-paper text-[12px]"
              >
                {m.text}
              </div>
            ) : (
              <div
                key={i}
                className="self-start max-w-[85%] px-3 py-1.5 rounded-md bg-bg-2 text-ink text-[12px]"
              >
                {m.text}
              </div>
            )
          )
        )}
        {pending && (
          <div className="self-start text-[11px] font-mono text-ink-3 px-2 py-1">
            ⋯ thinking
          </div>
        )}
      </div>

      {spec && (
        <SpecEditor
          spec={spec}
          done={done}
          hired={hired}
          pending={pending}
          onPatch={patchSpec}
          onHire={handleHire}
          onReset={handleReset}
          hireError={hireError}
          brandReady={brandReady}
        />
      )}

      <form
        className="flex items-center gap-2 px-3.5 py-2.5 border-t border-line-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            hired
              ? "Agent hired — start a new draft below"
              : brandReady
                ? spec
                  ? "Refine — change cadence, voice, channel…"
                  : "Describe a recurring agent…"
                : "Onboard a brand first to hire agents"
          }
          disabled={!brandReady || pending || hired}
          className={cn(
            "flex-1 bg-transparent border-0 outline-none text-[12.5px] text-ink",
            "placeholder:text-ink-3 disabled:opacity-50"
          )}
        />
        {hired ? (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-line text-ink-2 text-[11.5px] hover:bg-bg-2"
          >
            New draft
          </button>
        ) : (
          <button
            type="submit"
            disabled={!brandReady || pending || !input.trim()}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md bg-ink text-paper text-[11.5px] font-medium hover:bg-ink-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={12} /> send
          </button>
        )}
      </form>
    </div>
  );
}

interface SpecEditorProps {
  spec: DraftSpec;
  done: boolean;
  hired: boolean;
  pending: boolean;
  brandReady: boolean;
  hireError: string | null;
  onPatch: (patch: Partial<DraftSpec>) => void;
  onHire: () => void;
  onReset: () => void;
}

function SpecEditor({
  spec,
  done,
  hired,
  pending,
  brandReady,
  hireError,
  onPatch,
  onHire,
  onReset,
}: SpecEditorProps) {
  const channel = spec.channel ?? spec.owns_channels?.[0] ?? "linkedin";
  return (
    <div className="border-t border-line-2 px-3.5 py-3 flex flex-col gap-2 bg-bg-2/30">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
          Draft spec · click any field to edit
        </span>
        {done ? (
          <span className="font-mono text-[10px] text-ok inline-flex items-center gap-1">
            <Check size={11} /> ready to hire
          </span>
        ) : (
          <span className="font-mono text-[10px] text-yellow-700 inline-flex items-center gap-1">
            <Pencil size={10} /> needs more info
          </span>
        )}
      </div>

      <EditableTextField
        label="display name"
        value={spec.display_name}
        onChange={(v) =>
          onPatch({
            display_name: v,
            avatar_letter: (v || "A").charAt(0).toUpperCase(),
          })
        }
        disabled={hired}
      />
      <EditableTextField
        label="role"
        value={spec.role_line}
        onChange={(v) => onPatch({ role_line: v })}
        disabled={hired}
      />
      <EditableLongTextField
        label="description"
        value={spec.description}
        onChange={(v) => onPatch({ description: v })}
        disabled={hired}
      />

      <div className="grid grid-cols-2 gap-2">
        <EditableSelectField
          label="cadence"
          value={spec.cadence}
          options={CADENCE_OPTIONS}
          onChange={(v) => onPatch({ cadence: v })}
          allowCustom
          disabled={hired}
        />
        <EditableSelectField
          label="channel"
          value={channel}
          options={CHANNEL_OPTIONS}
          onChange={(v) => onPatch({ channel: v })}
          disabled={hired}
        />
      </div>

      <EditableTagField
        label="voice traits"
        values={spec.voice_traits ?? []}
        onChange={(vals) => onPatch({ voice_traits: vals })}
        placeholder="add trait + Enter (e.g. thoughtful)"
        disabled={hired}
      />

      <div className="flex items-center justify-between gap-2 pt-1">
        {hireError && (
          <span className="text-[10.5px] text-crit truncate">{hireError}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={pending}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-line text-ink-2 text-[11px] hover:bg-bg-2 disabled:opacity-50"
          >
            <X size={11} /> Discard
          </button>
          <button
            type="button"
            onClick={onHire}
            disabled={!brandReady || pending || hired}
            className={cn(
              "inline-flex items-center gap-1 h-7 px-3 rounded-md text-[11px] font-medium",
              "bg-ink text-paper hover:bg-ink-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              done && "shadow-1"
            )}
          >
            <Check size={11} /> {hired ? "Hired" : "Hire"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── small inline-edit primitives ──

function EditableTextField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-ink-3 w-[88px] shrink-0">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "flex-1 h-7 px-2 rounded border border-transparent hover:border-line",
          "bg-paper text-[12px] text-ink outline-none focus:border-ink",
          "disabled:opacity-60"
        )}
      />
    </label>
  );
}

function EditableLongTextField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-2">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-ink-3 w-[88px] shrink-0 pt-1.5">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={2}
        className={cn(
          "flex-1 px-2 py-1.5 rounded border border-transparent hover:border-line",
          "bg-paper text-[12px] text-ink outline-none focus:border-ink resize-none",
          "disabled:opacity-60"
        )}
      />
    </label>
  );
}

function EditableSelectField({
  label,
  value,
  options,
  onChange,
  allowCustom,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  allowCustom?: boolean;
  disabled?: boolean;
}) {
  const isCustom = !options.includes(value);
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-ink-3">
        {label}
      </span>
      {allowCustom && isCustom ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-7 px-2 rounded border border-line bg-paper text-[12px] text-ink outline-none focus:border-ink"
        />
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-7 px-2 rounded border border-line bg-paper text-[12px] text-ink outline-none focus:border-ink"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          {allowCustom && <option value="">(custom…)</option>}
        </select>
      )}
    </label>
  );
}

function EditableTagField({
  label,
  values,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const t = draft.trim();
    if (!t) return;
    if (values.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...values, t]);
    setDraft("");
  }

  return (
    <div className="flex items-start gap-2">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-ink-3 w-[88px] shrink-0 pt-1.5">
        {label}
      </span>
      <div className="flex-1 flex flex-wrap items-center gap-1 min-h-7 px-1.5 py-1 rounded border border-transparent hover:border-line bg-paper">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-2 text-[10.5px] font-mono text-ink-2"
          >
            {v}
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="text-ink-3 hover:text-crit"
                aria-label={`Remove ${v}`}
              >
                <X size={9} />
              </button>
            )}
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && !draft && values.length > 0) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 min-w-[80px] bg-transparent text-[11.5px] text-ink outline-none placeholder:text-ink-3"
        />
      </div>
    </div>
  );
}
