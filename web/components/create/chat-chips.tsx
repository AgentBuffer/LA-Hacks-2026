"use client";

interface ChatChipsProps {
  chips: string[];
  onChipClick: (chip: string) => void;
}

export function ChatChips({ chips, onChipClick }: ChatChipsProps) {
  return (
    <div
      className="flex flex-wrap gap-2 px-4 pt-2 pb-2.5"
      style={{ animation: "ab-fade-in 320ms ease both" }}
    >
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => onChipClick(chip)}
          className="border border-line rounded-full px-2.5 py-1 font-mono text-[10.5px] text-ink-2 hover:border-ink hover:text-ink hover:bg-bg-2 transition-colors cursor-pointer"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
