export type DebatePhase =
  | "setup"
  | "pre_poll"
  | "debate"
  | "post_poll"
  | "complete";

export type Stance = "yes" | "no";

export type AgentSide = "pro" | "con";

export interface DebateAgent {
  id: string;
  name: string;
  perspective: string;
  stance: string;
  route: string;
  model: string;
  tools: string[];
}

export interface Vote {
  id: string;
  stance: Stance;
  phase: "pre" | "post";
  createdAt: number;
}

export interface DebateMessage {
  id: string;
  speaker: string;
  agentName?: string;
  perspective?: string;
  route?: string;
  content: string;
  sources?: string[];
  createdAt: number;
}

export interface JudgeScores {
  argumentStrength: number;
  evidenceQuality: number;
  rebuttalEffectiveness: number;
  clarity: number;
  persuasiveness: number;
}

export interface JudgeVerdict {
  winner: AgentSide | "tie";
  proTotal: number;
  conTotal: number;
  proScores: JudgeScores;
  conScores: JudgeScores;
  reasoning: string;
  audienceShiftSummary: string;
}

export interface PollSnapshot {
  total: number;
  yes: number;
  no: number;
  yesPercent: number;
  noPercent: number;
}

export interface DebateSession {
  id: string;
  topic: string;
  phase: DebatePhase;
  agents: DebateAgent[];
  votes: Vote[];
  messages: DebateMessage[];
  verdict: JudgeVerdict | null;
  debateStatus: "idle" | "running" | "done" | "error";
  debateError?: string;
  createdAt: number;
  updatedAt: number;
}

export const STANCE_LABELS: Record<Stance, string> = {
  yes: "Yes",
  no: "No",
};

export type SlideIndex = 1 | 2 | 3 | 4 | 5;

export const SLIDE_LABELS: Record<SlideIndex, string> = {
  1: "Transmission",
  2: "Baseline",
  3: "Contagion",
  4: "Aftermath",
  5: "Verdict",
};
