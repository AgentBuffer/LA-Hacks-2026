"use client";

import { type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";

interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onReset: () => void;
}

export function Composer({ value, onChange, onSend, onReset }: ComposerProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="border-t border-line bg-paper-2">
      <div className="flex items-end gap-2 px-3.5 pt-2.5 pb-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell Main what you want…"
          rows={1}
          className="flex-1 bg-transparent border border-line rounded-md px-3 py-2 font-sans text-[12.5px] text-ink placeholder:text-ink-3 resize-none focus:outline-none focus:border-ink-2 min-h-[44px] max-h-[120px]"
        />
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onSend}
          aria-label="send"
        >
          ↑ send
        </Button>
      </div>
      <div className="flex items-center px-4 pb-2.5 font-mono text-[10px] text-ink-3">
        <button
          type="button"
          onClick={onReset}
          className="hover:text-ink cursor-pointer transition-colors"
        >
          ↻ start over
        </button>
        <span className="ml-auto">⌘↵ to send</span>
      </div>
    </div>
  );
}
