"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConclusionSlide } from "@/components/slides/ConclusionSlide";
import { DebateSlide } from "@/components/slides/DebateSlide";
import { LandingSlide } from "@/components/slides/LandingSlide";
import { PostPollSlide } from "@/components/slides/PostPollSlide";
import { TopicPollSlide } from "@/components/slides/TopicPollSlide";
import { getDemoDebateMessages } from "@/lib/demo-debate";
import { buildConclusion } from "@/lib/poll-utils";
import type {
  DebateMessage,
  DebateSession,
  PollSnapshot,
  SlideIndex,
} from "@/lib/types";

const EMPTY_POLL: PollSnapshot = {
  total: 0,
  yes: 0,
  no: 0,
  yesPercent: 0,
  noPercent: 0,
};

export function DebateExperience() {
  const [slide, setSlide] = useState<SlideIndex>(1);
  const [topic, setTopic] = useState("");
  const [session, setSession] = useState<DebateSession | null>(null);
  const [prePoll, setPrePoll] = useState<PollSnapshot>(EMPTY_POLL);
  const [postPoll, setPostPoll] = useState<PollSnapshot>(EMPTY_POLL);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const voteUrl = useMemo(() => {
    if (!session) return "";
    return `${baseUrl}/vote/${session.id}`;
  }, [baseUrl, session]);

  const refreshSession = useCallback(async (id: string) => {
    const response = await fetch(`/api/sessions/${id}`);
    if (!response.ok) return;
    const data = await response.json();
    setSession(data.session);
    setPrePoll(data.prePoll);
    setPostPoll(data.postPoll);
    if (data.session.messages?.length) {
      setMessages(data.session.messages);
    }
  }, []);

  useEffect(() => {
    if (!session?.id || slide < 2) return;

    const interval = setInterval(() => {
      refreshSession(session.id).catch(console.error);
    }, 2000);

    return () => clearInterval(interval);
  }, [session?.id, slide, refreshSession]);

  useEffect(() => {
    if (slide !== 3 || !session?.id) return;

    const demo = getDemoDebateMessages(topic);
    setMessages(demo);

    fetch(`/api/sessions/${session.id}/debate`, { method: "POST" }).catch(
      console.error,
    );

    const pollDebate = setInterval(() => {
      fetch(`/api/sessions/${session.id}/debate`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages?.length) {
            setMessages(data.messages);
          }
        })
        .catch(console.error);
    }, 3000);

    return () => {
      clearInterval(pollDebate);
    };
  }, [slide, session?.id, topic]);

  async function confirmTopic() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Could not create session");
      }

      const data = await response.json();
      setSession(data.session);
      setPrePoll(EMPTY_POLL);
      setPostPoll(EMPTY_POLL);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function goToDebate() {
    if (session?.id) {
      fetch(`/api/sessions/${session.id}/vote`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "debate" }),
      }).catch(console.error);
    }
    setSlide(3);
  }

  function goToPostPoll() {
    if (session?.id) {
      fetch(`/api/sessions/${session.id}/vote`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "post_poll" }),
      }).catch(console.error);
    }
    setSlide(4);
  }

  function goToConclusion() {
    if (session?.id) {
      fetch(`/api/sessions/${session.id}/vote`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "complete" }),
      }).catch(console.error);
    }
    setSlide(5);
  }

  function restart() {
    setSlide(1);
    setTopic("");
    setSession(null);
    setPrePoll(EMPTY_POLL);
    setPostPoll(EMPTY_POLL);
    setMessages([]);
    setError(null);
  }

  const conclusion = buildConclusion(topic, prePoll, postPoll);

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <main id="main-content">
        {slide === 1 && (
          <LandingSlide onBegin={() => setSlide(2)} />
        )}
        {slide === 2 && (
          <TopicPollSlide
            topic={topic}
            onTopicChange={setTopic}
            voteUrl={voteUrl}
            poll={prePoll}
            loading={loading}
            error={error}
            onConfirmTopic={confirmTopic}
            onContinue={goToDebate}
            sessionReady={Boolean(session)}
          />
        )}
        {slide === 3 && (
          <DebateSlide
            topic={topic}
            messages={messages}
            onComplete={goToPostPoll}
          />
        )}
        {slide === 4 && session && (
          <PostPollSlide
            topic={topic}
            voteUrl={voteUrl}
            prePoll={prePoll}
            postPoll={postPoll}
            onContinue={goToConclusion}
          />
        )}
        {slide === 5 && (
          <ConclusionSlide
            conclusion={conclusion}
            prePoll={prePoll}
            postPoll={postPoll}
            onRestart={restart}
          />
        )}
      </main>
    </>
  );
}
