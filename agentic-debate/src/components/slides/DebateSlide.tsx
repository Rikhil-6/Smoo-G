"use client";

import { useEffect, useState } from "react";
import { COPY } from "@/lib/copy";
import type { DebateMessage } from "@/lib/types";
import { PrimaryButton, SlideShell } from "./SlideShell";

interface DebateSlideProps {
  topic: string;
  messages: DebateMessage[];
  onComplete: () => void;
}

export function DebateSlide({ topic, messages, onComplete }: DebateSlideProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    setVisibleCount(0);
    setTyping(true);
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) return;

    if (visibleCount >= messages.length) {
      setTyping(false);
      return;
    }

    setTyping(true);
    const typingTimer = setTimeout(() => {
      setTyping(false);
      setVisibleCount((count) => count + 1);
    }, 2000);

    return () => clearTimeout(typingTimer);
  }, [visibleCount, messages.length]);

  const visibleMessages = messages.slice(0, visibleCount);
  const allShown = visibleCount >= messages.length && messages.length > 0;
  const nextSpeaker = messages[visibleCount]?.speaker ?? "pro";

  return (
    <SlideShell
      slide={3}
      title="AI agents debating"
      footer={
        allShown ? (
          <div className="flex justify-center">
            <PrimaryButton onClick={onComplete} ariaLabel={COPY.debate.cta}>
              {COPY.debate.cta}
            </PrimaryButton>
          </div>
        ) : (
          <p className="font-mono-label text-center text-xs uppercase tracking-widest text-[var(--text-muted)]" aria-live="polite">
            {typing ? COPY.debate.statusTyping : COPY.debate.statusActive}
          </p>
        )
      }
    >
      <header className="mb-4 shrink-0">
        <p className="font-mono-label text-[10px] uppercase tracking-[0.35em] text-[var(--blood)] sm:text-xs">
          {COPY.debate.eyebrow}
        </p>
        <p className="font-display mt-1 text-lg font-bold text-[var(--ice)] sm:text-xl">
          {COPY.debate.header}
        </p>
        <p className="mt-1 truncate text-sm text-[var(--text-muted)]">&ldquo;{topic}&rdquo;</p>
      </header>

      <div className="panel-glass flex min-h-0 flex-1 flex-col overflow-hidden border-white/[0.06]">
        <div
          className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden bg-[var(--chat-bg)] px-4 py-4 sm:gap-4 sm:px-6 sm:py-5"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Debate transcript"
        >
          {visibleMessages.map((message, index) => (
            <ChatBubble key={message.id} message={message} index={index} />
          ))}

          {typing && visibleCount < messages.length && (
            <TypingIndicator side={nextSpeaker} />
          )}
        </div>
      </div>
    </SlideShell>
  );
}

function ChatBubble({
  message,
  index,
}: {
  message: DebateMessage;
  index: number;
}) {
  const isPro = message.speaker === "pro";

  return (
    <div
      className={`flex animate-fade-up ${isPro ? "justify-end" : "justify-start"}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div
        className={`flex max-w-[88%] flex-col gap-1 sm:max-w-[72%] ${
          isPro ? "items-end" : "items-start"
        }`}
      >
        <span className="font-mono-label px-1 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          {isPro ? "Agent A · For" : "Agent B · Against"}
        </span>
        <div
          className={`px-4 py-3 text-sm leading-relaxed sm:text-base ${
            isPro
              ? "rounded-2xl rounded-br-sm bg-[var(--pro-bubble)] text-white shadow-[0_4px_24px_rgba(13,61,50,0.4)]"
              : "rounded-2xl rounded-bl-sm border border-white/10 bg-[var(--con-bubble)] text-[var(--text-primary)]"
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator({ side }: { side: "pro" | "con" }) {
  const isPro = side === "pro";

  return (
    <div className={`flex ${isPro ? "justify-end" : "justify-start"}`} aria-label="Agent is typing">
      <div
        className={`flex gap-1.5 rounded-2xl px-5 py-3.5 ${
          isPro ? "bg-[var(--pro-bubble)]" : "border border-white/10 bg-[var(--con-bubble)]"
        }`}
      >
        <span className="typing-dot h-2 w-2 rounded-full bg-white/60" />
        <span className="typing-dot h-2 w-2 rounded-full bg-white/60" />
        <span className="typing-dot h-2 w-2 rounded-full bg-white/60" />
      </div>
    </div>
  );
}
