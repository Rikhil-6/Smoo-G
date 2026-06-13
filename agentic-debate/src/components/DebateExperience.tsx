"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConclusionSlide } from "@/components/slides/ConclusionSlide";
import { DebateSlide } from "@/components/slides/DebateSlide";
import { LandingSlide } from "@/components/slides/LandingSlide";
import { PostPollSlide } from "@/components/slides/PostPollSlide";
import { TopicPollSlide } from "@/components/slides/TopicPollSlide";
import { apiUrl, getApiBaseUrl } from "@/lib/client-api";
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

function buildTelegramVoteUrl(
  botUsername: string,
  sessionId: string,
  phase: "pre" | "post",
): string {
  const cleanBot = botUsername.replace(/^@/, "");
  return `https://t.me/${cleanBot}?start=vote_${sessionId}_${phase}`;
}

export function DebateExperience() {
  const [slide, setSlide] = useState<SlideIndex>(1);
  const [topic, setTopic] = useState("");
  const [session, setSession] = useState<DebateSession | null>(null);
  const [prePoll, setPrePoll] = useState<PollSnapshot>(EMPTY_POLL);
  const [postPoll, setPostPoll] = useState<PollSnapshot>(EMPTY_POLL);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [debateStatus, setDebateStatus] =
    useState<DebateSession["debateStatus"]>("idle");
  const [debateError, setDebateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [telegramBotUsername, setTelegramBotUsername] = useState("");
  const [integrationSummary, setIntegrationSummary] = useState("");
  const [apiHealth, setApiHealth] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const [apiTarget, setApiTarget] = useState("");

  const telegramPreVoteUrl = useMemo(() => {
    if (!telegramBotUsername || !session?.id) return "";
    return buildTelegramVoteUrl(telegramBotUsername, session.id, "pre");
  }, [telegramBotUsername, session?.id]);

  const telegramPostVoteUrl = useMemo(() => {
    if (!telegramBotUsername || !session?.id) return "";
    return buildTelegramVoteUrl(telegramBotUsername, session.id, "post");
  }, [telegramBotUsername, session?.id]);

  useEffect(() => {
    queueMicrotask(() => {
      const target =
        getApiBaseUrl() ||
        (typeof window !== "undefined" ? window.location.origin : "");
      setApiTarget(target);
    });
  }, []);

  useEffect(() => {
    fetch(apiUrl("/api/integrations/status"), { method: "GET" })
      .then((response) => {
        setApiHealth(response.ok ? "online" : "offline");
      })
      .catch(() => setApiHealth("offline"));
  }, []);

  useEffect(() => {
    fetch(apiUrl("/api/network-url"))
      .then((response) => response.json())
      .then((data) => {
        if (data.telegramBotUsername) {
          setTelegramBotUsername(String(data.telegramBotUsername));
        }
      })
      .catch(() => {
        setTelegramBotUsername("");
      });
  }, []);

  useEffect(() => {
    fetch(apiUrl("/api/integrations/status"))
      .then((response) => response.json())
      .then((data) => {
        if (data?.summary) setIntegrationSummary(String(data.summary));
      })
      .catch(() => {
        setIntegrationSummary("Integration status unavailable");
      });
  }, []);

  const refreshSession = useCallback(async (id: string) => {
    const response = await fetch(apiUrl(`/api/sessions/${id}`));
    if (!response.ok) return;
    const data = await response.json();
    setSession(data.session);
    setDebateStatus(data.session?.debateStatus ?? "idle");
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
    if (!session?.id || !telegramBotUsername || slide < 2 || slide > 4) return;

    const pollTelegramBridge = () => {
      fetch(apiUrl("/api/telegram/poll"), { method: "POST" }).catch(() => {
        // silent retry on next tick
      });
    };

    pollTelegramBridge();
    const interval = setInterval(pollTelegramBridge, 1600);
    return () => clearInterval(interval);
  }, [session?.id, telegramBotUsername, slide]);

  useEffect(() => {
    if (slide !== 3 || !session?.id) return;

    fetch(apiUrl(`/api/sessions/${session.id}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "debate" }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || "Could not start debate");
        }
      })
      .catch((caughtError) => {
        setDebateStatus("error");
        setDebateError(
          caughtError instanceof Error ? caughtError.message : "Could not start debate",
        );
      });

    const pollDebate = setInterval(() => {
      fetch(apiUrl(`/api/sessions/${session.id}?view=debate`))
        .then((res) => res.json())
        .then((data) => {
          setDebateStatus(data.debateStatus ?? "running");
          setDebateError(data.error ?? null);
          setMessages(Array.isArray(data.messages) ? data.messages : []);
        })
        .catch(() => {
          setDebateStatus("error");
          setDebateError("Debate polling failed");
        });
    }, 1200);

    return () => {
      clearInterval(pollDebate);
    };
  }, [slide, session?.id]);

  async function confirmTopic() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/api/sessions"), {
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
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function goToDebate() {
    if (session?.id) {
      setMessages([]);
      setDebateStatus("running");
      setDebateError(null);
      fetch(apiUrl(`/api/sessions/${session.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "debate" }),
      }).catch(console.error);
    }
    setSlide(3);
  }

  function goToPostPoll() {
    if (session?.id) {
      fetch(apiUrl(`/api/sessions/${session.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: "post_poll" }),
      }).catch(console.error);
    }
    setSlide(4);
  }

  function goToConclusion() {
    if (session?.id) {
      fetch(apiUrl(`/api/sessions/${session.id}`), {
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
    setDebateStatus("idle");
    setDebateError(null);
    setError(null);
  }

  const conclusion = buildConclusion(topic, prePoll, postPoll);

  return (
    <>
      <div
        suppressHydrationWarning
        className="pointer-events-none fixed right-4 top-3 z-[60] rounded border border-white/15 bg-black/60 px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-secondary)]"
      >
        API {apiHealth} · {apiTarget}
      </div>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <main id="main-content">
        {slide === 1 && <LandingSlide onBegin={() => setSlide(2)} />}
        {slide === 2 && (
          <TopicPollSlide
            topic={topic}
            onTopicChange={setTopic}
            telegramVoteUrl={telegramPreVoteUrl}
            botUsername={telegramBotUsername}
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
            debateStatus={debateStatus}
            debateError={debateError}
            integrationSummary={integrationSummary}
            onComplete={goToPostPoll}
          />
        )}
        {slide === 4 && session && (
          <PostPollSlide
            topic={topic}
            telegramVoteUrl={telegramPostVoteUrl}
            botUsername={telegramBotUsername}
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
            messages={messages}
            onRestart={restart}
          />
        )}
      </main>
    </>
  );
}
