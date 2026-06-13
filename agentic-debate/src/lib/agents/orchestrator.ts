import { v4 as uuidv4 } from "uuid";
import { fetchResearch } from "../integrations/brightdata";
import { summarizeResearchInSandbox } from "../integrations/daytona";
import { chatWithKimi } from "../integrations/kimi";
import { describeAudienceShift, computePollSnapshot } from "../poll-utils";
import {
  appendMessage,
  getSession,
  setDebateStatus,
  setVerdict,
  updateSessionPhase,
} from "../store";
import type { AgentSide, JudgeScores, JudgeVerdict } from "../types";

const ROUNDS = 3;

async function generateArgument(params: {
  topic: string;
  side: AgentSide;
  role: "opening" | "argument" | "rebuttal" | "closing";
  researchSummary: string;
  opponentHistory: string;
}): Promise<string> {
  const sideLabel = params.side === "pro" ? "FOR" : "AGAINST";
  const systemPrompt = `You are a competitive debate agent arguing ${sideLabel} the proposition: "${params.topic}".
Use concise, persuasive language (120-180 words). Cite research themes when relevant. No markdown headers.`;

  const userPrompt = `Role: ${params.role}
Research context:
${params.researchSummary}

Opponent arguments so far:
${params.opponentHistory || "None yet."}

Deliver your ${params.role} statement now.`;

  return chatWithKimi([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);
}

function totalScore(scores: JudgeScores): number {
  return Object.values(scores).reduce((sum, n) => sum + n, 0);
}

async function runJudge(params: {
  topic: string;
  transcript: string;
  audienceShift: string;
}): Promise<JudgeVerdict> {
  const prompt = `You are an impartial debate judge. Score each side 1-10 on:
argumentStrength, evidenceQuality, rebuttalEffectiveness, clarity, persuasiveness.

Topic: ${params.topic}
Audience shift: ${params.audienceShift}

Transcript:
${params.transcript}

Respond ONLY with valid JSON:
{
  "winner": "pro" | "con" | "tie",
  "proScores": { "argumentStrength": number, ... },
  "conScores": { "argumentStrength": number, ... },
  "reasoning": "string"
}`;

  const raw = await chatWithKimi([
    {
      role: "system",
      content: "Return strict JSON only. Be fair and evidence-driven.",
    },
    { role: "user", content: prompt },
  ]);

  let parsed: {
    winner: JudgeVerdict["winner"];
    proScores: JudgeScores;
    conScores: JudgeScores;
    reasoning: string;
  };

  try {
    parsed = JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : {
          winner: "tie",
          proScores: {
            argumentStrength: 7,
            evidenceQuality: 7,
            rebuttalEffectiveness: 7,
            clarity: 7,
            persuasiveness: 7,
          },
          conScores: {
            argumentStrength: 7,
            evidenceQuality: 7,
            rebuttalEffectiveness: 7,
            clarity: 7,
            persuasiveness: 7,
          },
          reasoning: "Unable to parse judge output; defaulting to tie.",
        };
  }

  const proTotal = totalScore(parsed.proScores);
  const conTotal = totalScore(parsed.conScores);

  return {
    winner: parsed.winner,
    proTotal,
    conTotal,
    proScores: parsed.proScores,
    conScores: parsed.conScores,
    reasoning: parsed.reasoning,
    audienceShiftSummary: params.audienceShift,
  };
}

export async function runDebate(sessionId: string): Promise<void> {
  const session = getSession(sessionId);
  if (!session) throw new Error("Session not found");

  setDebateStatus(sessionId, "running");
  updateSessionPhase(sessionId, "debate");

  try {
    const [proResearch, conResearch] = await Promise.all([
      fetchResearch(session.topic, "pro"),
      fetchResearch(session.topic, "con"),
    ]);

    const proSummary = await summarizeResearchInSandbox(
      proResearch.map((r) => `${r.title}: ${r.snippet}`),
    );
    const conSummary = await summarizeResearchInSandbox(
      conResearch.map((r) => `${r.title}: ${r.snippet}`),
    );

    const addTurn = async (
      side: AgentSide,
      roleKey: "opening" | "argument" | "rebuttal" | "closing",
      opponentHistory: string,
      sources: string[],
    ) => {
      const content = await generateArgument({
        topic: session.topic,
        side,
        role: roleKey,
        researchSummary: side === "pro" ? proSummary : conSummary,
        opponentHistory,
      });

      appendMessage(sessionId, {
        id: uuidv4(),
        speaker: side,
        content,
        sources,
        createdAt: Date.now(),
      });
    };

    let proHistory = "";
    let conHistory = "";

    await addTurn("pro", "opening", conHistory, proResearch.map((r) => r.url));
    proHistory = getSession(sessionId)?.messages.at(-1)?.content ?? "";

    await addTurn("con", "opening", proHistory, conResearch.map((r) => r.url));
    conHistory = getSession(sessionId)?.messages.at(-1)?.content ?? "";

    for (let round = 0; round < ROUNDS; round++) {
      await addTurn("pro", "rebuttal", conHistory, proResearch.map((r) => r.url));
      proHistory += `\n${getSession(sessionId)?.messages.at(-1)?.content ?? ""}`;

      await addTurn("con", "rebuttal", proHistory, conResearch.map((r) => r.url));
      conHistory += `\n${getSession(sessionId)?.messages.at(-1)?.content ?? ""}`;
    }

    await addTurn("pro", "closing", conHistory, proResearch.map((r) => r.url));
    await addTurn("con", "closing", proHistory, conResearch.map((r) => r.url));

    setDebateStatus(sessionId, "done");
    updateSessionPhase(sessionId, "post_poll");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Debate failed";
    setDebateStatus(sessionId, "error", message);
    throw error;
  }
}

export async function finalizeSession(sessionId: string): Promise<JudgeVerdict | null> {
  const session = getSession(sessionId);
  if (!session) return null;

  const pre = computePollSnapshot(session.votes, "pre");
  const post = computePollSnapshot(session.votes, "post");
  const audienceShift = describeAudienceShift(pre, post);

  const transcript = session.messages
    .map((m) => `[${m.speaker.toUpperCase()}] ${m.content}`)
    .join("\n\n");

  const verdict = await runJudge({
    topic: session.topic,
    transcript,
    audienceShift,
  });

  setVerdict(sessionId, verdict);
  updateSessionPhase(sessionId, "complete");
  return verdict;
}
