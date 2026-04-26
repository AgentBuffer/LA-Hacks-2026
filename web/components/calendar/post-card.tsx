"use client";

import { ChannelIcon } from "@/components/ui/channel-icon";
import { Verdict } from "@/components/ui/verdict";
import { cn, HATCH_BG, aspectFor, formatClock } from "@/lib/utils";
import type { SlotRow } from "@/actions/slots";

interface PostCardProps {
  slot: SlotRow;
  onClick: () => void;
  rank?: number;
}

export function PostCard({ slot, onClick, rank }: PostCardProps) {
  const status = slot.status;
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const isPublished = status === "published";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left bg-paper rounded-md p-2 flex flex-col gap-1.5 transition-shadow cursor-pointer hover:shadow-1",
        isApproved && "border-[1.5px] border-ink",
        isRejected && "border border-dashed border-crit opacity-85",
        isPublished && "border border-solid border-ink-2 opacity-75",
        !isApproved &&
          !isRejected &&
          !isPublished &&
          "border border-dashed border-ink-3 opacity-85"
      )}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-ink-3 tabular-nums">
        {isApproved && (
          <span
            className="w-[6px] h-[6px] rounded-full bg-ink shrink-0"
            aria-hidden
          />
        )}
        <ChannelIcon platform={slot.platform} size={12} />
        <span>{formatClock(slot.scheduled_for)}</span>
        {rank != null && (
          <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand-soft text-brand-ink text-[9.5px] font-semibold">
            ✨ #{rank}
          </span>
        )}
      </div>

      {slot.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slot.image_url}
          alt=""
          className="w-full h-[46px] rounded object-cover border border-line"
        />
      ) : (
        <div
          className="w-full h-[46px] rounded border border-line grid place-items-center text-[9px] font-mono text-ink-3 uppercase tracking-wider"
          style={{ background: HATCH_BG }}
          aria-hidden
        >
          {aspectFor(slot.platform)}
        </div>
      )}

      <div
        className={cn(
          "text-[11.5px] leading-snug text-ink line-clamp-2",
          isRejected && "line-through decoration-crit/60 text-ink-3"
        )}
      >
        {slot.caption ?? "Untitled draft"}
      </div>

      {isRejected && (
        <div className="pt-0.5">
          <Verdict
            variant="rejected"
            score={slot.critic_scores?.average}
          />
        </div>
      )}
    </button>
  );
}
