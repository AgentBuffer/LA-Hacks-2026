import type { LiveEvent } from "@/actions/runs";
import { EventRow } from "./event-row";

interface EventListProps {
  events: LiveEvent[];
}

export function EventList({ events }: EventListProps) {
  if (!events.length) {
    return (
      <div
        className="rounded-lg border-[1.2px] border-ink-2 bg-paper text-ink-3 text-[12px] font-mono"
        style={{ minHeight: 480, padding: "14px 16px" }}
      >
        no events on this run yet
      </div>
    );
  }
  return (
    <div
      className="rounded-lg border-[1.2px] border-ink-2 bg-paper"
      style={{ minHeight: 480, padding: "14px 16px" }}
    >
      {events.map((evt, idx) => (
        <EventRow
          key={evt.id}
          event={evt}
          isLast={idx === events.length - 1}
        />
      ))}
    </div>
  );
}
