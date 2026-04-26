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
  onInputChange: (v: string) => void;
  onSend: () => void;
  onReset: () => void;
  onChipClick: (chip: string) => void;
}

export function ChatContainer({
  messages,
  chips,
  inputValue,
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
  }, [messages.length, chips]);

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
          <ChatMessage
            key={m.id}
            role={m.role}
            ts={m.ts}
            viaAgent={m.viaAgent}
            body={m.body}
          />
        ))}
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
