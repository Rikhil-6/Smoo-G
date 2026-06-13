"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { COPY } from "@/lib/copy";
import { pointersFromMessage } from "@/lib/evidence-pointers";
import type { DebateMessage } from "@/lib/types";
import { PrimaryButton, SlideShell } from "./SlideShell";

interface DebateSlideProps {
  topic: string;
  messages: DebateMessage[];
  debateStatus: "idle" | "running" | "done" | "error";
  debateError?: string | null;
  integrationSummary?: string;
  onComplete: () => void;
}

interface TonePalette {
  chip: string;
  bubble: string;
}

export function DebateSlide({
  topic,
  messages,
  debateStatus,
  debateError,
  integrationSummary,
  onComplete,
}: DebateSlideProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const cappedVisibleCount = Math.min(visibleCount, messages.length);

  useEffect(() => {
    if (cappedVisibleCount >= messages.length) {
      return;
    }

    const typingTimer = setTimeout(() => {
      setVisibleCount((count) => Math.min(count + 1, messages.length));
    }, 700);

    return () => clearTimeout(typingTimer);
  }, [cappedVisibleCount, messages.length]);

  const visibleMessages = messages.slice(0, cappedVisibleCount);
  const speakerSides = useMemo(() => {
    const seen = new Map<string, boolean>();
    let nextRight = true;
    for (const message of messages) {
      if (!seen.has(message.speaker)) {
        seen.set(message.speaker, nextRight);
        nextRight = !nextRight;
      }
    }
    return seen;
  }, [messages]);
  const typing = cappedVisibleCount < messages.length;
  const waitingForServer =
    debateStatus === "running" && cappedVisibleCount >= messages.length;
  const allShown =
    debateStatus !== "running" &&
    cappedVisibleCount >= messages.length &&
    messages.length > 0;
  const nextMessage = messages[cappedVisibleCount];

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
          <p
            className="font-mono-label text-center text-xs uppercase tracking-widest text-[var(--text-muted)]"
            aria-live="polite"
          >
            {waitingForServer
              ? "Agents are formulating responses..."
              : typing
                ? COPY.debate.statusTyping
                : COPY.debate.statusActive}
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
        <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
          &ldquo;{topic}&rdquo;
        </p>
        {integrationSummary && (
          <p className="mt-2 text-xs uppercase tracking-widest text-[var(--text-muted)]">
            {integrationSummary}
          </p>
        )}
        <p className="mt-2 text-xs text-[var(--text-secondary)]">
          Tip: tap citation tags like [1], plus pointer chips below each message.
        </p>
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
            <ChatBubble
              key={message.id}
              message={message}
              index={index}
              alignRight={speakerSides.get(message.speaker) ?? (index % 2 === 0)}
            />
          ))}

          {waitingForServer && <TokenLoadingSegment />}

          {typing && visibleCount < messages.length && (
            <TypingIndicator message={nextMessage} />
          )}

          {debateStatus === "error" && debateError && (
            <p className="text-xs uppercase tracking-wider text-[var(--signal)]">
              {debateError}
            </p>
          )}
        </div>
      </div>
    </SlideShell>
  );
}

function toneForRoute(route: string | undefined, alignRight: boolean): TonePalette {
  if (route === "risk-ethics") {
    return {
      chip: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-300/30",
      bubble:
        "border border-fuchsia-400/25 bg-fuchsia-600/18 text-fuchsia-50 shadow-[0_4px_24px_rgba(161,78,255,0.25)]",
    };
  }
  if (route === "technical") {
    return {
      chip: "bg-sky-500/20 text-sky-200 border-sky-300/30",
      bubble:
        "border border-sky-400/25 bg-sky-600/18 text-sky-50 shadow-[0_4px_24px_rgba(27,124,255,0.25)]",
    };
  }
  if (route === "research-heavy") {
    return {
      chip: "bg-amber-500/20 text-amber-200 border-amber-300/30",
      bubble:
        "border border-amber-400/25 bg-amber-600/16 text-amber-50 shadow-[0_4px_24px_rgba(242,161,30,0.24)]",
    };
  }
  if (alignRight) {
    return {
      chip: "bg-emerald-500/20 text-emerald-200 border-emerald-300/30",
      bubble:
        "border border-emerald-400/25 bg-emerald-600/18 text-emerald-50 shadow-[0_4px_24px_rgba(17,149,129,0.28)]",
    };
  }
  return {
    chip: "bg-slate-500/25 text-slate-200 border-white/20",
    bubble: "border border-white/10 bg-[var(--con-bubble)] text-[var(--text-primary)]",
  };
}

function ChatBubble({
  message,
  index,
  alignRight,
}: {
  message: DebateMessage;
  index: number;
  alignRight: boolean;
}) {
  const isLegacyPro = message.speaker === "pro";
  const speakerLabel =
    message.agentName ||
    (isLegacyPro
      ? "Agent A"
      : message.speaker === "con"
        ? "Agent B"
        : message.speaker);
  const lensLabel =
    message.perspective ||
    (isLegacyPro
      ? "For"
      : message.speaker === "con"
        ? "Against"
        : "Perspective");
  const tone = toneForRoute(message.route, alignRight);
  const pointers = pointersFromMessage(message).slice(0, 3);

  return (
    <div
      className={`flex animate-fade-up ${alignRight ? "justify-end" : "justify-start"}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div
        className={`flex max-w-[88%] flex-col gap-1 sm:max-w-[72%] ${
          alignRight ? "items-end" : "items-start"
        }`}
      >
        <span
          className={`font-mono-label rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${tone.chip}`}
        >
          {speakerLabel} - {lensLabel}
          {message.route ? ` - ${message.route}` : ""}
        </span>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed sm:text-base ${tone.bubble} ${
            alignRight ? "rounded-br-sm" : "rounded-bl-sm"
          }`}
        >
          {renderReadableLinks(message.content, pointers)}
        </div>
        {pointers.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-1">
            <span className="font-mono-label text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Pointers:
            </span>
            {pointers.map((pointer, pointerIndex) => (
              <a
                key={`${message.id}-${pointer.url}-${pointerIndex}`}
                href={pointer.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/20 bg-white/[0.04] px-2.5 py-1 text-[11px] text-[var(--text-secondary)] hover:border-[var(--blood)]/50 hover:text-[var(--ice)]"
              >
                {pointerIndex + 1}. {pointer.host}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function shortenUrlLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    return `${host}${parsed.pathname !== "/" ? " source" : ""}`;
  } catch {
    return "source";
  }
}

function renderReadableLinks(content: string, pointers: ReturnType<typeof pointersFromMessage>): ReactNode {
  const tokenPattern =
    /(\[(\d+)\])|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/[^\s)]+[^\s.,);])/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of content.matchAll(tokenPattern)) {
    const fullToken = match[0];
    const tokenIndex = match.index ?? 0;
    if (tokenIndex > cursor) {
      nodes.push(content.slice(cursor, tokenIndex));
    }

    const aliasNumber = match[2] ? Number(match[2]) : null;
    if (aliasNumber && aliasNumber > 0) {
      const pointer = pointers[aliasNumber - 1];
      if (pointer) {
        nodes.push(
          <a
            key={`${pointer.url}-${tokenIndex}`}
            href={pointer.url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline decoration-[var(--blood)]/70 decoration-2 underline-offset-2 hover:text-[var(--ice)]"
            title={pointer.url}
          >
            [{aliasNumber}]
          </a>,
        );
      } else {
        nodes.push(fullToken);
      }
      cursor = tokenIndex + fullToken.length;
      continue;
    }

    const markdownLabel = match[3];
    const markdownUrl = match[4];
    const rawUrl = match[5];
    const url = markdownUrl ?? rawUrl ?? "";
    const label = markdownLabel?.trim() || shortenUrlLabel(url);

    nodes.push(
      <a
        key={`${url}-${tokenIndex}`}
        href={url}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-[var(--blood)]/70 decoration-2 underline-offset-2 hover:text-[var(--ice)]"
        title={url}
      >
        {label}
      </a>,
    );

    cursor = tokenIndex + fullToken.length;
  }

  if (cursor < content.length) {
    nodes.push(content.slice(cursor));
  }

  return nodes.length > 0 ? nodes : content;
}

function TypingIndicator({ message }: { message?: DebateMessage }) {
  const alignRight =
    !message || message.speaker === "pro" || message.speaker === "market-operator";

  return (
    <div
      className={`flex ${alignRight ? "justify-end" : "justify-start"}`}
      aria-label="Agent is typing"
    >
      <div
        className={`flex gap-1.5 rounded-2xl px-5 py-3.5 ${
          alignRight
            ? "bg-[var(--pro-bubble)]"
            : "border border-white/10 bg-[var(--con-bubble)]"
        }`}
      >
        <span className="typing-dot h-2 w-2 rounded-full bg-white/60" />
        <span className="typing-dot h-2 w-2 rounded-full bg-white/60" />
        <span className="typing-dot h-2 w-2 rounded-full bg-white/60" />
      </div>
    </div>
  );
}

function TokenLoadingSegment() {
  const [tokenCount, setTokenCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTokenCount((count) => count + Math.floor(Math.random() * 24) + 8);
    }, 240);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[520px] rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono-label text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          Token loading
        </span>
        <span className="font-mono-label text-[10px] uppercase tracking-widest text-[var(--blood)]">
          {tokenCount} tok
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded bg-white/10">
        <div className="h-full w-1/3 animate-pulse rounded bg-[var(--blood)]/70" />
      </div>
    </div>
  );
}
