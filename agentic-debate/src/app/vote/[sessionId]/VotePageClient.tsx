"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { COPY } from "@/lib/copy";
import { apiUrl } from "@/lib/client-api";
import type { PollSnapshot, Stance } from "@/lib/types";

export default function VotePageClient() {
  const params = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const phase = searchParams.get("phase") === "post" ? "post" : "pre";

  const [topic, setTopic] = useState("");
  const [poll, setPoll] = useState<PollSnapshot | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params.sessionId) return;

    fetch(apiUrl(`/api/sessions/${params.sessionId}`))
      .then((res) => res.json())
      .then((data) => {
        setTopic(data.session?.topic ?? "");
        setPoll(phase === "post" ? data.postPoll : data.prePoll);
      })
      .catch(() => setError("Could not load session."));
  }, [params.sessionId, phase]);

  useEffect(() => {
    if (!params.sessionId) return;

    const interval = setInterval(() => {
      fetch(apiUrl(`/api/sessions/${params.sessionId}`))
        .then((res) => res.json())
        .then((data) => {
          setPoll(phase === "post" ? data.postPoll : data.prePoll);
        })
        .catch(console.error);
    }, 2000);

    return () => clearInterval(interval);
  }, [params.sessionId, phase]);

  async function submitVote(stance: Stance) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/api/sessions/${params.sessionId}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote", stance, phase }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Vote failed");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setLoading(false);
    }
  }

  const question =
    phase === "pre" ? COPY.vote.preQuestion : COPY.vote.postQuestion;

  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-[var(--bg-deep)] px-5 py-6">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,29,72,0.12),transparent_55%)]"
        aria-hidden="true"
      />

      <header className="relative shrink-0 text-center">
        <p className="font-mono-label text-[10px] uppercase tracking-[0.35em] text-[var(--blood)]">
          {phase === "pre" ? COPY.vote.preEyebrow : COPY.vote.postEyebrow}
        </p>
        <h1 className="font-display mt-3 text-2xl font-bold leading-tight text-[var(--ice)] sm:text-3xl">
          {question}
        </h1>
        <blockquote className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[var(--text-secondary)]">
          &ldquo;{topic || "Loading…"}&rdquo;
        </blockquote>
      </header>

      {poll && (
        <div
          className="panel-glass relative mx-auto mt-6 w-full max-w-md shrink-0 px-4 py-3 text-center"
          aria-live="polite"
        >
          <p className="font-mono-label text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
            Room pulse
          </p>
          <p className="font-display mt-1 text-xl font-bold tabular-nums">
            <span className="text-[var(--yes)]">{poll.yesPercent}% yes</span>
            <span className="mx-2 text-[var(--text-muted)]">·</span>
            <span className="text-[var(--no)]">{poll.noPercent}% no</span>
          </p>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col justify-center gap-4 py-4">
        {!submitted ? (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => submitVote("yes")}
              className="font-display min-h-[76px] w-full max-w-md self-center border border-[var(--yes)]/30 bg-[var(--yes)]/10 text-2xl font-bold text-[var(--yes)] transition hover:bg-[var(--yes)] hover:text-white disabled:opacity-50"
              aria-label="Vote yes"
            >
              Yes
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => submitVote("no")}
              className="font-display min-h-[76px] w-full max-w-md self-center border border-[var(--no)]/30 bg-[var(--no)]/10 text-2xl font-bold text-[var(--no)] transition hover:bg-[var(--no)] hover:text-white disabled:opacity-50"
              aria-label="Vote no"
            >
              No
            </button>
          </>
        ) : (
          <div
            className="mx-auto w-full max-w-md border border-[var(--blood)]/30 bg-[var(--blood)]/10 px-6 py-8 text-center"
            role="status"
          >
            <p className="font-display text-xl font-bold text-[var(--ice)]">
              Recorded.
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Your position is logged. You may close this window — or watch the room move without you.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="relative shrink-0 text-center text-sm font-medium text-[var(--signal)]">
          {error}
        </p>
      )}
    </main>
  );
}
