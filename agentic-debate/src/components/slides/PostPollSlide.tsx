"use client";

import { QRCodeSVG } from "qrcode.react";
import { COPY } from "@/lib/copy";
import type { PollSnapshot } from "@/lib/types";
import { ScanFrame } from "@/components/ui/ScanFrame";
import { PrimaryButton, SlideShell } from "./SlideShell";
import { YesNoPollChart } from "./YesNoPollChart";

interface PostPollSlideProps {
  topic: string;
  voteUrl: string;
  prePoll: PollSnapshot;
  postPoll: PollSnapshot;
  onContinue: () => void;
}

export function PostPollSlide({
  topic,
  voteUrl,
  prePoll,
  postPoll,
  onContinue,
}: PostPollSlideProps) {
  return (
    <SlideShell
      slide={4}
      title="Post-debate vote"
      footer={
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono-label text-xs uppercase tracking-widest text-[var(--text-muted)]">
            Same question. Different nervous system.
          </p>
          <PrimaryButton onClick={onContinue} ariaLabel={COPY.postPoll.cta}>
            {COPY.postPoll.cta}
          </PrimaryButton>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 sm:gap-6">
        <header className="shrink-0">
          <p className="font-mono-label text-[10px] uppercase tracking-[0.35em] text-[var(--blood)] sm:text-xs">
            {COPY.postPoll.eyebrow}
          </p>
          <p className="font-display mt-2 text-2xl font-bold text-[var(--ice)] sm:text-3xl lg:text-4xl">
            {COPY.postPoll.pollQuestion}
          </p>
          <blockquote className="mt-3 max-w-4xl text-lg font-medium leading-snug text-[var(--text-secondary)] sm:text-xl">
            &ldquo;{topic}&rdquo;
          </blockquote>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{COPY.postPoll.pollSubtext}</p>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
          <ScanFrame label="Scan again" size="xl">
            <div className="flex h-full flex-col items-center justify-center">
              <div
                className="rounded-sm bg-white p-4 sm:p-5"
                role="img"
                aria-label="QR code for post-debate vote"
              >
                <QRCodeSVG value={`${voteUrl}?phase=post`} size={240} level="M" includeMargin />
              </div>
              <p className="font-mono-label mt-5 text-center text-xs uppercase tracking-[0.25em] text-[var(--text-muted)]">
                Confess your new position
              </p>
            </div>
          </ScanFrame>

          <div className="flex min-h-0 flex-col gap-4">
            <YesNoPollChart title="Before" poll={prePoll} compact variant="dramatic" />
            <YesNoPollChart title="After (live)" poll={postPoll} live compact variant="dramatic" />
          </div>
        </div>
      </div>
    </SlideShell>
  );
}
