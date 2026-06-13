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
  voteUrl: string;
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
  voteUrl,
  poll,
  loading,
  error,
  onConfirmTopic,
  onContinue,
  sessionReady,
}: TopicPollSlideProps) {
  const canConfirm = topic.trim().length >= 5 && !sessionReady;

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
              {loading ? "Locking…" : COPY.topic.ctaConfirm}
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
              <label htmlFor="debate-topic" className="font-display text-xl font-bold text-[var(--ice)] sm:text-2xl">
                {COPY.topic.inputLabel}
              </label>
              <p id="topic-hint" className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
                {COPY.topic.inputHint}
              </p>
              <textarea
                id="debate-topic"
                value={topic}
                onChange={(e) => onTopicChange(e.target.value)}
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

        {sessionReady && voteUrl ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
            <ScanFrame label="Scan to vote" size="xl">
              <div className="flex h-full flex-col items-center justify-center">
                <div
                  className="rounded-sm bg-white p-4 sm:p-5"
                  role="img"
                  aria-label="QR code for pre-debate yes or no vote"
                >
                  <QRCodeSVG
                    value={`${voteUrl}?phase=pre`}
                    size={240}
                    level="M"
                    includeMargin
                  />
                </div>
                <p className="font-mono-label mt-5 text-center text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
                  Yes · No · No take-backs
                </p>
              </div>
            </ScanFrame>

            <YesNoPollChart
              title="Live baseline"
              poll={poll}
              live
              variant="dramatic"
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center border border-dashed border-white/10 bg-[var(--bg-panel)]/40 px-6">
            <p className="max-w-md text-center text-sm leading-relaxed text-[var(--text-muted)]">
              Your statement appears here. The room will be asked whether they believe it — before any machine opens its mouth.
            </p>
          </div>
        )}
      </div>
    </SlideShell>
  );
}
