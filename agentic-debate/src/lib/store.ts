import { v4 as uuidv4 } from "uuid";
import type {
  DebatePhase,
  DebateSession,
  JudgeVerdict,
  Stance,
  Vote,
} from "./types";

const sessions = new Map<string, DebateSession>();

export function createSession(topic: string): DebateSession {
  const now = Date.now();
  const session: DebateSession = {
    id: uuidv4(),
    topic,
    phase: "pre_poll",
    votes: [],
    messages: [],
    verdict: null,
    debateStatus: "idle",
    createdAt: now,
    updatedAt: now,
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): DebateSession | undefined {
  return sessions.get(id);
}

export function updateSessionPhase(
  id: string,
  phase: DebatePhase,
): DebateSession | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;
  session.phase = phase;
  session.updatedAt = Date.now();
  return session;
}

export function addVote(
  sessionId: string,
  stance: Stance,
  phase: "pre" | "post",
): Vote | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  const vote: Vote = {
    id: uuidv4(),
    stance,
    phase,
    createdAt: Date.now(),
  };
  session.votes.push(vote);
  session.updatedAt = Date.now();
  return vote;
}

export function setDebateStatus(
  sessionId: string,
  status: DebateSession["debateStatus"],
  error?: string,
): DebateSession | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  session.debateStatus = status;
  session.debateError = error;
  session.updatedAt = Date.now();
  return session;
}

export function appendMessage(
  sessionId: string,
  message: DebateSession["messages"][number],
): DebateSession | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  session.messages.push(message);
  session.updatedAt = Date.now();
  return session;
}

export function setVerdict(
  sessionId: string,
  verdict: JudgeVerdict,
): DebateSession | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;
  session.verdict = verdict;
  session.updatedAt = Date.now();
  return session;
}
