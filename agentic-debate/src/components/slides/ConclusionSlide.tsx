"use client";

import type { ReactNode } from "react";
import { COPY } from "@/lib/copy";
import {
  pointersFromMessage,
  pointersFromMessages,
  type EvidencePointer,
} from "@/lib/evidence-pointers";
import type { ConclusionCopy } from "@/lib/poll-utils";
import type { DebateMessage, PollSnapshot } from "@/lib/types";
import { PrimaryButton, SlideShell } from "./SlideShell";

interface ConclusionSlideProps {
  conclusion: ConclusionCopy;
  prePoll: PollSnapshot;
  postPoll: PollSnapshot;
  messages: DebateMessage[];
  onRestart: () => void;
}

interface ObserverPoint {
  id: string;
  speaker: string;
  route?: string;
  text: string;
  pointers: EvidencePointer[];
}

export function ConclusionSlide({
  conclusion,
  prePoll,
  postPoll,
  messages,
  onRestart,
}: ConclusionSlideProps) {
  const delta = postPoll.yesPercent - prePoll.yesPercent;
  const agentCount = new Set(messages.map((message) => message.speaker)).size;
  const topPointers = pointersFromMessages(messages).slice(0, 6);
  const observerBrief = buildObserverBrief(messages);

  return (
    <SlideShell
      slide={5}
      title="Experiment conclusion"
      footer={
        <div className="flex justify-center">
          <PrimaryButton
            onClick={onRestart}
            ariaLabel={COPY.conclusion.cta}
            variant="ghost"
          >
            {COPY.conclusion.cta}
          </PrimaryButton>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center text-center">
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

        <section className="panel-glass mt-8 w-full max-w-4xl border-white/[0.08] p-4 text-left sm:p-5">
          <h3 className="font-display text-xl font-bold text-[var(--ice)]">Consolidation</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Quick summary for humans: what moved, who argued, and where to verify.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--text-primary)]">
            <li>
              Audience shift: <strong>{prePoll.yesPercent}%</strong> yes to{" "}
              <strong>{postPoll.yesPercent}%</strong> yes ({formatSignedPercentage(delta)}).
            </li>
            <li>
              Debate coverage: <strong>{messages.length}</strong> statements across{" "}
              <strong>{agentCount || 0}</strong> active agents.
            </li>
            <li>Action: review top pointers below before making a final policy decision.</li>
          </ul>

          {topPointers.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {topPointers.map((pointer, index) => (
                <a
                  key={`${pointer.url}-${index}`}
                  href={pointer.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-[var(--text-secondary)] hover:border-[var(--blood)]/50 hover:text-[var(--ice)]"
                >
                  {index + 1}. {pointer.label}
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="panel-glass mt-6 w-full max-w-4xl border-white/[0.08] p-4 text-left sm:p-5">
          <h3 className="font-display text-xl font-bold text-[var(--ice)]">
            Observer Brief: For vs Against
          </h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Strongest end-state arguments for external viewers, grouped into supporting and
            opposing case points.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ArgumentColumn
              title="Case For"
              tone="for"
              points={observerBrief.forPoints}
              emptyText="No clear supporting case was generated."
            />
            <ArgumentColumn
              title="Case Against"
              tone="against"
              points={observerBrief.againstPoints}
              emptyText="No clear opposing case was generated."
            />
          </div>

          <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-[var(--text-primary)]">
            <strong>Bottom line:</strong> {observerBrief.bottomLine}
          </p>
        </section>
      </div>
    </SlideShell>
  );
}

function normalizeSummaryText(content: string): string {
  return content.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function cleanPointText(content: string): string {
  return content
    .replace(/^\s*(opening|argument|rebuttal|closing)\s*:\s*/i, "")
    .replace(/\s*Evidence snapshot:\s*/i, " Evidence: ")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyPoint(message: DebateMessage, text: string): "for" | "against" {
  const lower = text.toLowerCase();
  if (/^rebuttal\s*:/i.test(message.content)) return "against";
  if (message.route === "risk-ethics") return "against";

  const forSignals = [
    "benefit",
    "upside",
    "improve",
    "opportunity",
    "efficient",
    "growth",
    "adopt",
    "value",
    "supports",
    "potential",
  ];
  const againstSignals = [
    "risk",
    "harm",
    "bias",
    "failure",
    "unsafe",
    "uncertain",
    "privacy",
    "constraint",
    "compliance",
    "misuse",
    "burden",
  ];

  const forScore = forSignals.reduce(
    (score, term) => score + (lower.includes(term) ? 1 : 0),
    0,
  );
  const againstScore = againstSignals.reduce(
    (score, term) => score + (lower.includes(term) ? 1 : 0),
    0,
  );

  return againstScore > forScore ? "against" : "for";
}

function rolePriority(message: DebateMessage): number {
  const lower = message.content.toLowerCase();
  if (lower.startsWith("closing:")) return 4;
  if (lower.startsWith("argument:")) return 3;
  if (lower.startsWith("rebuttal:")) return 2;
  if (lower.startsWith("opening:")) return 1;
  return 0;
}

function buildObserverBrief(messages: DebateMessage[]): {
  forPoints: ObserverPoint[];
  againstPoints: ObserverPoint[];
  bottomLine: string;
} {
  const messageQueue = [...messages]
    .filter((message) => !/ is active on /i.test(message.content))
    .sort((a, b) => {
      const byRole = rolePriority(b) - rolePriority(a);
      if (byRole !== 0) return byRole;
      return b.createdAt - a.createdAt;
    });

  const seen = new Set<string>();
  const forPoints: ObserverPoint[] = [];
  const againstPoints: ObserverPoint[] = [];

  for (const message of messageQueue) {
    const text = cleanPointText(message.content);
    if (!text || text.length < 30) continue;

    const normalized = normalizeSummaryText(text);
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    const point: ObserverPoint = {
      id: message.id,
      speaker: message.agentName || message.speaker,
      route: message.route,
      text,
      pointers: pointersFromMessage(message).slice(0, 3),
    };

    const side = classifyPoint(message, text);
    if (side === "for" && forPoints.length < 3) {
      forPoints.push(point);
      continue;
    }
    if (side === "against" && againstPoints.length < 3) {
      againstPoints.push(point);
    }

    if (forPoints.length >= 3 && againstPoints.length >= 3) break;
  }

  if (forPoints.length === 0 || againstPoints.length === 0) {
    for (const message of messageQueue) {
      const text = cleanPointText(message.content);
      const normalized = normalizeSummaryText(text);
      if (seen.has(`${normalized}-fallback`)) continue;
      seen.add(`${normalized}-fallback`);

      const point: ObserverPoint = {
        id: `${message.id}-fallback`,
        speaker: message.agentName || message.speaker,
        route: message.route,
        text,
        pointers: pointersFromMessage(message).slice(0, 3),
      };

      if (forPoints.length === 0) forPoints.push(point);
      else if (againstPoints.length === 0) againstPoints.push(point);

      if (forPoints.length > 0 && againstPoints.length > 0) break;
    }
  }

  const bottomLine =
    forPoints.length > againstPoints.length
      ? "Supportive arguments were more concrete, but review opposing risk controls before execution."
      : againstPoints.length > forPoints.length
        ? "Risk arguments were more prominent; any rollout should remain reversible and tightly monitored."
        : "Both sides produced material points, so decision quality depends on how much risk you can tolerate.";

  return { forPoints, againstPoints, bottomLine };
}

function renderAliasLinks(text: string, pointers: EvidencePointer[]): ReactNode {
  const nodes: ReactNode[] = [];
  const pattern = /\[(\d+)\]/g;
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const aliasNumber = Number(match[1]);
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));

    const pointer = pointers[aliasNumber - 1];
    if (!pointer) {
      nodes.push(match[0]);
      cursor = index + match[0].length;
      continue;
    }

    nodes.push(
      <a
        key={`${pointer.url}-${index}`}
        href={pointer.url}
        target="_blank"
        rel="noreferrer"
        className="font-semibold underline decoration-[var(--blood)]/70 decoration-2 underline-offset-2 hover:text-[var(--ice)]"
      >
        [{aliasNumber}]
      </a>,
    );
    cursor = index + match[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes.length > 0 ? nodes : text;
}

function ArgumentColumn({
  title,
  tone,
  points,
  emptyText,
}: {
  title: string;
  tone: "for" | "against";
  points: ObserverPoint[];
  emptyText: string;
}) {
  const toneBorder = tone === "for" ? "border-emerald-400/25" : "border-fuchsia-400/25";
  const toneText = tone === "for" ? "text-emerald-200" : "text-fuchsia-200";

  return (
    <div className={`rounded-lg border ${toneBorder} bg-white/[0.02] p-3`}>
      <p className={`font-mono-label text-[10px] uppercase tracking-widest ${toneText}`}>{title}</p>
      {points.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--text-muted)]">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {points.map((point) => (
            <li
              key={point.id}
              className="rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <p>
                <span className="mr-1 text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  {point.speaker}
                </span>
                {renderAliasLinks(point.text, point.pointers)}
              </p>
              {point.pointers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {point.pointers.map((pointer, index) => (
                    <a
                      key={`${point.id}-${pointer.url}-${index}`}
                      href={pointer.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-white/20 bg-white/[0.03] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:border-[var(--blood)]/50 hover:text-[var(--ice)]"
                    >
                      {index + 1}. {pointer.host}
                    </a>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatSignedPercentage(value: number): string {
  if (value > 0) return `+${value}%`;
  if (value < 0) return `${value}%`;
  return "0%";
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
            yes > 0
              ? "text-[var(--yes)]"
              : yes < 0
                ? "text-[var(--no)]"
                : "text-[var(--text-secondary)]"
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
          <p className="font-mono-label mt-1 text-xs tabular-nums text-[var(--no)]">{no}% no</p>
        </>
      )}
    </div>
  );
}
