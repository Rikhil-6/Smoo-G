import { v4 as uuidv4 } from "uuid";
import { fetchResearch } from "../integrations/brightdata";
import { summarizeResearchInSandbox } from "../integrations/daytona";
import { chatWithKimi } from "../integrations/kimi";
import { describeAudienceShift, computePollSnapshot } from "../poll-utils";
import { buildFallbackAgents, chooseTokenRoute } from "../token-router";
import {
  appendMessage,
  getSession,
  setDebateStatus,
  setSessionAgents,
  setVerdict,
  updateSessionPhase,
} from "../store";
import type { DebateAgent, JudgeScores, JudgeVerdict } from "../types";

const ROUNDS = 2;

interface ResearchResult {
  title: string;
  snippet: string;
  url: string;
}

function parseJsonArray(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : null;
  }
}

async function selectAgents(params: {
  topic: string;
  researchSummary: string;
}): Promise<DebateAgent[]> {
  const fallback = buildFallbackAgents(params.topic);
  const prompt = `You are an agent-router choosing the best debate perspectives for a live audience.
Topic: ${params.topic}
Grounding research summary:
${params.researchSummary}

Choose exactly 3 perspectives. They should not simply be pro/con; they should be useful lenses grounded in the topic.
Use TokenRouter-style route ids from: research-heavy, risk-ethics, operator, technical.
Respond ONLY with valid JSON array:
[
  {"id":"short-kebab-id","name":"Agent Name","perspective":"short lens","stance":"what it argues/checks","route":"route-id","tools":["brightdata","daytona"]}
]`;

  try {
    const raw = await chatWithKimi(
      [
        {
          role: "system",
          content:
            "Return strict JSON only. Select practical agent perspectives that help humans decide.",
        },
        { role: "user", content: prompt },
      ],
      { temperature: 0.35, maxTokens: 700 },
    );
    const parsed = parseJsonArray(raw);
    if (!Array.isArray(parsed)) return fallback;

    const agents = parsed.slice(0, 3).map((item, index) => {
      const candidate = item as Partial<DebateAgent>;
      const route = chooseTokenRoute(
        `${candidate.name ?? ""} ${candidate.perspective ?? ""} ${candidate.stance ?? ""} ${params.topic}`,
      );
      return {
        id: candidate.id || `agent-${index + 1}`,
        name: candidate.name || fallback[index]?.name || `Agent ${index + 1}`,
        perspective:
          candidate.perspective ||
          fallback[index]?.perspective ||
          "Decision lens",
        stance:
          candidate.stance ||
          fallback[index]?.stance ||
          "tests the strongest claim and its weakest assumption",
        route: candidate.route || route.id,
        model: candidate.model || route.model,
        tools: Array.isArray(candidate.tools) && candidate.tools.length
          ? candidate.tools
          : route.tools,
      };
    });

    return agents.length >= 2 ? agents : fallback;
  } catch {
    return fallback;
  }
}

async function generateArgument(params: {
  topic: string;
  agent: DebateAgent;
  role: "opening" | "argument" | "rebuttal" | "closing";
  researchSummary: string;
  transcriptSoFar: string;
}): Promise<string> {
  const systemPrompt = `You are ${params.agent.name}, a debate agent with this perspective: ${params.agent.perspective}.
Your stance: ${params.agent.stance}
TokenRouter route: ${params.agent.route}
Tools available: ${params.agent.tools.join(", ")}
Topic: "${params.topic}"
Use concise, persuasive language (90-140 words). Ground claims in the research context. No markdown headers.`;

  const userPrompt = `Role: ${params.role}
Research context:
${params.researchSummary}

Conversation so far:
${params.transcriptSoFar || "None yet."}

Deliver your ${params.role} statement now. Challenge at least one assumption from another perspective when useful.`;

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
    const allResearch = [...proResearch, ...conResearch];

    const proSummary = await summarizeResearchInSandbox(
      proResearch.map((r) => `${r.title}: ${r.snippet}`),
    );
    const conSummary = await summarizeResearchInSandbox(
      conResearch.map((r) => `${r.title}: ${r.snippet}`),
    );
    const combinedSummary = await summarizeResearchInSandbox(
      allResearch.map((r) => `${r.title}: ${r.snippet}`),
    );

    const agents = await selectAgents({
      topic: session.topic,
      researchSummary: combinedSummary,
    });
    setSessionAgents(sessionId, agents);
    agents.forEach((agent) => {
      appendMessage(sessionId, {
        id: uuidv4(),
        speaker: agent.id,
        agentName: agent.name,
        perspective: agent.perspective,
        route: agent.route,
        content: `I selected myself for the ${agent.perspective.toLowerCase()} lens. TokenRouter assigned ${agent.route} on ${agent.model}, with ${agent.tools.join(" + ")} as supporting tools. I will argue by checking: ${agent.stance}.`,
        sources: allResearch.slice(0, 3).map((r) => r.url),
        createdAt: Date.now(),
      });
    });

    const addTurn = async (
      agent: DebateAgent,
      roleKey: "opening" | "argument" | "rebuttal" | "closing",
      transcriptSoFar: string,
      sources: ResearchResult[],
    ) => {
      const content = await generateArgument({
        topic: session.topic,
        agent,
        role: roleKey,
        researchSummary: agent.route === "risk-ethics" ? conSummary : proSummary,
        transcriptSoFar,
      });

      appendMessage(sessionId, {
        id: uuidv4(),
        speaker: agent.id,
        agentName: agent.name,
        perspective: agent.perspective,
        route: agent.route,
        content,
        sources: sources.map((r) => r.url),
        createdAt: Date.now(),
      });
    };

    let transcriptSoFar = "";

    for (let round = 0; round < ROUNDS; round++) {
      for (const agent of agents) {
        await addTurn(
          agent,
          round === 0 ? "opening" : "rebuttal",
          transcriptSoFar,
          agent.route === "risk-ethics" ? conResearch : allResearch,
        );
        const latest = getSession(sessionId)?.messages.at(-1);
        transcriptSoFar += `\n[${latest?.agentName ?? latest?.speaker}] ${latest?.content ?? ""}`;
      }
    }

    for (const agent of agents) {
      await addTurn(agent, "closing", transcriptSoFar, allResearch);
      const latest = getSession(sessionId)?.messages.at(-1);
      transcriptSoFar += `\n[${latest?.agentName ?? latest?.speaker}] ${latest?.content ?? ""}`;
    }

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
