"use client";

import { QRCodeSVG } from "qrcode.react";
import { COPY } from "@/lib/copy";
import type { PollSnapshot } from "@/lib/types";
import { ScanFrame } from "@/components/ui/ScanFrame";
import { PrimaryButton, SlideShell } from "./SlideShell";
import { YesNoPollChart } from "./YesNoPollChart";

interface TopicPollSlideProps {
  topic: string;
  onTopicChange: (value: string) => void;
  telegramVoteUrl: string;
  botUsername?: string;
  poll: PollSnapshot;
  loading: boolean;
  error: string | null;
  onConfirmTopic: () => void;
  onContinue: () => void;
  sessionReady: boolean;
}

export function TopicPollSlide({
  topic,
  onTopicChange,
  telegramVoteUrl,
  botUsername,
  poll,
  loading,
  error,
  onConfirmTopic,
  onContinue,
  sessionReady,
}: TopicPollSlideProps) {
  const canConfirm = topic.trim().length >= 5 && !sessionReady;
  const hasTelegramVote = Boolean(telegramVoteUrl);
  const normalizedBot = botUsername?.replace(/^@/, "");

  return (
    <SlideShell
      slide={2}
      title="Baseline vote"
      footer={
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          {!sessionReady ? (
            <PrimaryButton
              onClick={onConfirmTopic}
              disabled={!canConfirm || loading}
              ariaLabel={COPY.topic.ctaConfirm}
            >
              {loading ? "Locking..." : COPY.topic.ctaConfirm}
            </PrimaryButton>
          ) : (
            <>
              <p className="font-mono-label text-xs uppercase tracking-widest text-[var(--text-muted)]">
                {poll.total} minds captured · live
              </p>
              <PrimaryButton onClick={onContinue} ariaLabel={COPY.topic.ctaDebate}>
                {COPY.topic.ctaDebate}
              </PrimaryButton>
            </>
          )}
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 sm:gap-6">
        <header className="shrink-0">
          <p className="font-mono-label text-[10px] font-medium uppercase tracking-[0.35em] text-[var(--blood)] sm:text-xs">
            {COPY.topic.eyebrow}
          </p>

          {!sessionReady ? (
            <div className="mt-3">
              <label
                htmlFor="debate-topic"
                className="font-display text-xl font-bold text-[var(--ice)] sm:text-2xl"
              >
                {COPY.topic.inputLabel}
              </label>
              <p id="topic-hint" className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
                {COPY.topic.inputHint}
              </p>
              <textarea
                id="debate-topic"
                value={topic}
                onChange={(event) => onTopicChange(event.target.value)}
                aria-describedby="topic-hint"
                placeholder={COPY.topic.inputPlaceholder}
                rows={2}
                className="mt-4 w-full resize-none border border-white/10 bg-[var(--bg-panel)] px-4 py-3 text-base leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--blood)]/50"
              />
              {error && (
                <p role="alert" className="mt-2 text-sm font-medium text-[var(--signal)]">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3">
              <p className="font-display text-lg font-semibold text-[var(--text-secondary)] sm:text-xl">
                {COPY.topic.pollQuestion}
              </p>
              <blockquote className="font-display mt-3 max-w-4xl border-l-4 border-[var(--blood)] pl-4 text-2xl font-bold leading-snug text-[var(--ice)] sm:text-3xl lg:text-4xl">
                &ldquo;{topic}&rdquo;
              </blockquote>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{COPY.topic.pollSubtext}</p>
            </div>
          )}
        </header>

        {sessionReady && hasTelegramVote ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
            <ScanFrame label="Scan to open Telegram vote" size="xl">
              <div className="flex h-full flex-col items-center justify-center">
                <div
                  className="rounded-sm bg-white p-4 sm:p-5"
                  role="img"
                  aria-label="QR code for Telegram pre-debate vote"
                >
                  <QRCodeSVG value={telegramVoteUrl} size={240} level="M" includeMargin />
                </div>
                <p className="font-mono-label mt-5 text-center text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
                  Vote in Telegram · Yes / No
                </p>
                <a
                  href={telegramVoteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 rounded border border-white/20 px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--blood)]/50 hover:text-[var(--ice)]"
                >
                  Open Telegram vote
                </a>
                {normalizedBot && (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Bot:{" "}
                    <a
                      href={`https://t.me/${normalizedBot}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2 hover:text-[var(--ice)]"
                    >
                      @{normalizedBot}
                    </a>
                  </p>
                )}
              </div>
            </ScanFrame>

            <div className="flex min-h-0 flex-col gap-4">
              <YesNoPollChart title="Live baseline" poll={poll} live variant="dramatic" />
              <div className="panel-glass border border-sky-400/20 bg-sky-950/20 p-3">
                <p className="font-mono-label text-[10px] uppercase tracking-widest text-sky-200">
                  Telegram-only voting
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                  If someone opens the bot directly, they can type <strong>/start</strong> and it
                  will auto-bind to the latest active session.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center border border-dashed border-white/10 bg-[var(--bg-panel)]/40 px-6">
            <p className="max-w-md text-center text-sm leading-relaxed text-[var(--text-muted)]">
              {!sessionReady
                ? "Your statement appears here. The room will be asked whether they believe it before any machine opens its mouth."
                : "Telegram voting is not configured yet. Set TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME (or NEXT_PUBLIC_TELEGRAM_BOT_USERNAME), then refresh."}
            </p>
          </div>
        )}
      </div>
    </SlideShell>
  );
}
