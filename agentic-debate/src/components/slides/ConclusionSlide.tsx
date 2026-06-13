"use client";

import type { ConclusionCopy } from "@/lib/poll-utils";
import { COPY } from "@/lib/copy";
import type { PollSnapshot } from "@/lib/types";
import { PrimaryButton, SlideShell } from "./SlideShell";

interface ConclusionSlideProps {
  conclusion: ConclusionCopy;
  prePoll: PollSnapshot;
  postPoll: PollSnapshot;
  onRestart: () => void;
}

export function ConclusionSlide({
  conclusion,
  prePoll,
  postPoll,
  onRestart,
}: ConclusionSlideProps) {
  const delta = postPoll.yesPercent - prePoll.yesPercent;

  return (
    <SlideShell
      slide={5}
      title="Experiment conclusion"
      footer={
        <div className="flex justify-center">
          <PrimaryButton onClick={onRestart} ariaLabel={COPY.conclusion.cta} variant="ghost">
            {COPY.conclusion.cta}
          </PrimaryButton>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        <p className="font-mono-label text-[10px] uppercase tracking-[0.4em] text-[var(--blood)] sm:text-xs">
          {COPY.conclusion.eyebrow}
        </p>

        <p
          className={`mt-4 font-mono-label text-xs font-semibold uppercase tracking-[0.3em] ${
            conclusion.verdict === "shifted"
              ? "text-[var(--signal)]"
              : conclusion.verdict === "unchanged"
                ? "text-[var(--text-muted)]"
                : "text-[var(--text-secondary)]"
          }`}
        >
          {conclusion.verdict === "shifted"
            ? "Conviction compromised"
            : conclusion.verdict === "unchanged"
              ? "Conviction intact"
              : "Data incomplete"}
        </p>

        <h2 className="font-display mt-4 max-w-4xl text-3xl font-bold leading-[1.05] text-[var(--ice)] sm:text-5xl lg:text-6xl">
          {conclusion.headline}
        </h2>

        <p className="font-display mt-5 text-lg font-semibold text-[var(--blood)] sm:text-xl">
          {conclusion.subheadline}
        </p>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
          {conclusion.body}
        </p>

        <div
          className="mt-10 grid w-full max-w-2xl grid-cols-3 gap-3 sm:gap-4"
          aria-label="Before and after comparison"
        >
          <StatCard label="Before" yes={prePoll.yesPercent} no={prePoll.noPercent} />
          <StatCard label="Delta" yes={delta} isDelta />
          <StatCard label="After" yes={postPoll.yesPercent} no={postPoll.noPercent} />
        </div>
      </div>
    </SlideShell>
  );
}

function StatCard({
  label,
  yes,
  no,
  isDelta,
}: {
  label: string;
  yes: number;
  no?: number;
  isDelta?: boolean;
}) {
  return (
    <div className="panel-glass border-white/[0.06] px-3 py-5 sm:px-4">
      <p className="font-mono-label text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </p>
      {isDelta ? (
        <p
          className={`font-display mt-3 text-3xl font-black tabular-nums sm:text-4xl ${
            yes > 0 ? "text-[var(--yes)]" : yes < 0 ? "text-[var(--no)]" : "text-[var(--text-secondary)]"
          }`}
        >
          {yes > 0 ? "+" : ""}
          {yes}%
        </p>
      ) : (
        <>
          <p className="font-display mt-3 text-2xl font-bold tabular-nums text-[var(--yes)] sm:text-3xl">
            {yes}%
          </p>
          <p className="font-mono-label mt-1 text-xs tabular-nums text-[var(--no)]">
            {no}% no
          </p>
        </>
      )}
    </div>
  );
}
