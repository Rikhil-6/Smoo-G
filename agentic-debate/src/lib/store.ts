import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type {
  DebateAgent,
  DebatePhase,
  DebateSession,
  JudgeVerdict,
  Stance,
  Vote,
} from "./types";

type SessionMap = Record<string, DebateSession>;

const dataDir = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDir, "sessions.json");

function ensureStoreFile(): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, "{}", "utf8");
  }
}

function readSessions(): SessionMap {
  ensureStoreFile();
  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw) as SessionMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSessions(sessions: SessionMap): void {
  ensureStoreFile();
  fs.writeFileSync(dataFile, JSON.stringify(sessions), "utf8");
}

export function createSession(topic: string): DebateSession {
  const now = Date.now();
  const session: DebateSession = {
    id: uuidv4(),
    topic,
    phase: "pre_poll",
    agents: [],
    votes: [],
    messages: [],
    verdict: null,
    debateStatus: "idle",
    createdAt: now,
    updatedAt: now,
  };

  const sessions = readSessions();
  sessions[session.id] = session;
  writeSessions(sessions);
  return session;
}

export function getSession(id: string): DebateSession | undefined {
  const sessions = readSessions();
  return sessions[id];
}

export function getLatestSessionByPhases(
  phases: DebatePhase[],
): DebateSession | undefined {
  const sessions = Object.values(readSessions()).filter((session) =>
    phases.includes(session.phase),
  );
  if (sessions.length === 0) return undefined;
  sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  return sessions[0];
}

export function getCurrentVoteSession(): DebateSession | undefined {
  return (
    getLatestSessionByPhases(["pre_poll"]) ??
    getLatestSessionByPhases(["post_poll"])
  );
}

export function updateSessionPhase(
  id: string,
  phase: DebatePhase,
): DebateSession | undefined {
  const sessions = readSessions();
  const session = sessions[id];
  if (!session) return undefined;
  session.phase = phase;
  session.updatedAt = Date.now();
  sessions[id] = session;
  writeSessions(sessions);
  return session;
}

export function setSessionAgents(
  sessionId: string,
  agents: DebateAgent[],
): DebateSession | undefined {
  const sessions = readSessions();
  const session = sessions[sessionId];
  if (!session) return undefined;
  session.agents = agents;
  session.updatedAt = Date.now();
  sessions[sessionId] = session;
  writeSessions(sessions);
  return session;
}

export function addVote(
  sessionId: string,
  stance: Stance,
  phase: "pre" | "post",
  voterId?: string,
): Vote | undefined {
  const sessions = readSessions();
  const session = sessions[sessionId];
  if (!session) return undefined;

  if (voterId) {
    const existingVote = session.votes.find(
      (vote) => vote.phase === phase && vote.voterId === voterId,
    );
    if (existingVote) {
      existingVote.stance = stance;
      existingVote.createdAt = Date.now();
      session.updatedAt = Date.now();
      sessions[sessionId] = session;
      writeSessions(sessions);
      return existingVote;
    }
  }

  const vote: Vote = {
    id: uuidv4(),
    stance,
    phase,
    voterId,
    createdAt: Date.now(),
  };
  session.votes.push(vote);
  session.updatedAt = Date.now();
  sessions[sessionId] = session;
  writeSessions(sessions);
  return vote;
}

export function setDebateStatus(
  sessionId: string,
  status: DebateSession["debateStatus"],
  error?: string,
): DebateSession | undefined {
  const sessions = readSessions();
  const session = sessions[sessionId];
  if (!session) return undefined;
  session.debateStatus = status;
  session.debateError = error;
  session.updatedAt = Date.now();
  sessions[sessionId] = session;
  writeSessions(sessions);
  return session;
}

export function appendMessage(
  sessionId: string,
  message: DebateSession["messages"][number],
): DebateSession | undefined {
  const sessions = readSessions();
  const session = sessions[sessionId];
  if (!session) return undefined;
  session.messages.push(message);
  session.updatedAt = Date.now();
  sessions[sessionId] = session;
  writeSessions(sessions);
  return session;
}

export function setVerdict(
  sessionId: string,
  verdict: JudgeVerdict,
): DebateSession | undefined {
  const sessions = readSessions();
  const session = sessions[sessionId];
  if (!session) return undefined;
  session.verdict = verdict;
  session.updatedAt = Date.now();
  sessions[sessionId] = session;
  writeSessions(sessions);
  return session;
}
