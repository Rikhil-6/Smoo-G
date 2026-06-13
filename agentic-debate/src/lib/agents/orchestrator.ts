import { v4 as uuidv4 } from "uuid";
import { fetchResearch } from "../integrations/brightdata";
import {
  provisionDaytonaSandboxes,
  runInDaytona,
  summarizeResearchInSandbox,
} from "../integrations/daytona";
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

const ROUNDS = 3;
const MIN_TURN_INTERVAL_MS = Number(process.env.DEBATE_MIN_TURN_MS ?? 1200);
const MAX_GENERATION_RETRIES = 4;
const activeDebates = new Set<string>();

type AgentRole = "opening" | "argument" | "rebuttal" | "closing";

interface ResearchResult {
  title: string;
  snippet: string;
  url: string;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/[),.;]+$/g, "").replace(/\/+$/, "");
}

function firstSentence(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  const sentenceMatch = compact.match(/^(.{35,190}?[.!?])(?:\s|$)/);
  if (sentenceMatch?.[1]) return sentenceMatch[1].trim();
  return compact.length > 180 ? `${compact.slice(0, 177).trim()}...` : compact;
}

function formatResearchContext(sources: ResearchResult[]): string {
  return sources
    .map((source, index) => {
      const summary = firstSentence(source.snippet || source.title);
      return `[${index + 1}] ${source.title}\nSource URL: ${source.url}\nKey finding: ${summary}`;
    })
    .join("\n\n");
}

function pickResearchForAgent(
  agent: DebateAgent,
  allSources: ResearchResult[],
): ResearchResult[] {
  if (allSources.length === 0) return [];
  const seed = agent.id
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const start = seed % allSources.length;
  const rotated = [...allSources.slice(start), ...allSources.slice(0, start)];
  return rotated.slice(0, Math.min(4, rotated.length));
}

function normalizeMessageContent(content: string): string {
  return content
    .toLowerCase()
    .replace(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/\[\d+\]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(content: string): Set<string> {
  return new Set(
    normalizeMessageContent(content)
      .split(" ")
      .filter((token) => token.length > 2),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function looksLikeRepeat(candidate: string, history: string[]): boolean {
  const normalizedCandidate = normalizeMessageContent(candidate);
  if (!normalizedCandidate) return true;

  const recent = history.slice(-8);
  if (recent.some((message) => normalizeMessageContent(message) === normalizedCandidate)) {
    return true;
  }

  const candidateTokens = tokenSet(candidate);
  return recent.some((message) => jaccardSimilarity(candidateTokens, tokenSet(message)) >= 0.84);
}

function hasExactDuplicate(candidate: string, history: string[]): boolean {
  const normalizedCandidate = normalizeMessageContent(candidate);
  return history.some(
    (message) => normalizeMessageContent(message) === normalizedCandidate,
  );
}

function sourceAlias(index: number): string {
  return `[${index + 1}]`;
}

function sourceSummaryLine(source: ResearchResult, index: number): string {
  const summary = firstSentence(source.snippet || source.title);
  return `${sourceAlias(index)} ${summary}`;
}

function buildEvidenceDigest(sources: ResearchResult[]): string {
  if (sources.length === 0) return "";
  const lines = sources.slice(0, 3).map((source, index) => sourceSummaryLine(source, index));
  return `Evidence snapshot: ${lines.join(" ")}`;
}

function findSourceIndexByUrl(url: string, sources: ResearchResult[]): number {
  const normalized = normalizeUrl(url);
  if (!normalized) return -1;

  const exactMatch = sources.findIndex((source) => normalizeUrl(source.url) === normalized);
  if (exactMatch >= 0) return exactMatch;

  try {
    const target = new URL(normalized);
    return sources.findIndex((source) => {
      try {
        const candidate = new URL(source.url);
        return (
          candidate.hostname === target.hostname &&
          candidate.pathname.replace(/\/+$/, "") === target.pathname.replace(/\/+$/, "")
        );
      } catch {
        return false;
      }
    });
  } catch {
    return -1;
  }
}

function aliasInlineCitations(content: string, sources: ResearchResult[]): string {
  let rewritten = content;

  rewritten = rewritten.replace(/\[S(\d+)\]/g, (_match, rawIndex: string) => {
    const index = Number(rawIndex) - 1;
    return index >= 0 && index < sources.length ? sourceAlias(index) : "";
  });

  rewritten = rewritten.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    (_match, _label: string, url: string) => {
      const sourceIndex = findSourceIndexByUrl(url, sources);
      return sourceIndex >= 0 ? sourceAlias(sourceIndex) : "";
    },
  );

  for (let index = 0; index < sources.length; index += 1) {
    const rawUrl = sources[index]?.url;
    if (!rawUrl) continue;
    const escaped = escapeRegExp(rawUrl);
    rewritten = rewritten.replace(new RegExp(escaped, "gi"), sourceAlias(index));
  }

  rewritten = rewritten.replace(/https?:\/\/[^\s)]+/gi, "");
  rewritten = rewritten.replace(/\s{2,}/g, " ").trim();
  return rewritten;
}

function looksLikeJudgeJson(content: string): boolean {
  return /"winner"\s*:|"proScores"\s*:|"conScores"\s*:|"argumentStrength"\s*:|proScores\s*:\s*\{/i.test(
    content,
  );
}

function cleanReadableProse(content: string): string {
  return content
    .replace(/```(?:json)?/gi, "")
    .replace(/Unique angle\s*\([^)]+\):[^.]+\./gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function buildNonRepeatFallback(params: {
  agent: DebateAgent;
  role: AgentRole;
  topic: string;
  sources: ResearchResult[];
}): string {
  const cite1 = params.sources[0] ? sourceAlias(0) : "";
  const cite2 = params.sources[1] ? sourceAlias(1) : cite1;
  const digest = buildEvidenceDigest(params.sources);

  if (params.role === "opening") {
    return `From the ${params.agent.perspective.toLowerCase()} perspective, "${params.topic}" should be judged on measurable outcomes and practical constraints ${cite1} ${cite2}. ${digest}`.trim();
  }
  if (params.role === "rebuttal") {
    return `That claim assumes too much certainty for the available evidence. The data is conditional, and edge-case risks remain important ${cite1} ${cite2}. ${digest}`.trim();
  }
  if (params.role === "closing") {
    return `Final position: move forward only with clear guardrails, verification loops, and rollback triggers ${cite1} ${cite2}. ${digest}`.trim();
  }
  return `A staged rollout is strongest here: pilot first, monitor outcomes, then expand only if evidence remains positive ${cite1} ${cite2}. ${digest}`.trim();
}

function finalizeAgentContent(params: {
  raw: string;
  agent: DebateAgent;
  role: AgentRole;
  topic: string;
  sources: ResearchResult[];
}): string {
  const digest = buildEvidenceDigest(params.sources);
  const baseFallback = buildNonRepeatFallback(params);

  let content = cleanReadableProse(params.raw);
  if (!content || looksLikeJudgeJson(content)) {
    content = baseFallback;
  }

  content = aliasInlineCitations(content, params.sources);
  if (!/\[\d+\]/.test(content) && params.sources.length > 0) {
    content = `${content} ${sourceAlias(0)}${params.sources[1] ? ` ${sourceAlias(1)}` : ""}`.trim();
  }

  if (digest && !/Evidence snapshot:/i.test(content)) {
    content = `${content} ${digest}`.trim();
  }

  content = content.replace(/\s{2,}/g, " ").trim();
  if (!/[.!?]$/.test(content)) content = `${content}.`;
  return content;
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
        tools:
          Array.isArray(candidate.tools) && candidate.tools.length
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
  role: AgentRole;
  researchSources: ResearchResult[];
  transcriptSoFar: string;
}): Promise<string> {
  const researchContext = formatResearchContext(params.researchSources);
  const systemPrompt = `You are ${params.agent.name}, a debate agent with this perspective: ${params.agent.perspective}.
Your stance: ${params.agent.stance}
TokenRouter route: ${params.agent.route}
Tools available: ${params.agent.tools.join(", ")}
Topic: "${params.topic}"
Write concise persuasive prose (95-145 words). Use clear human language.
Use citations only as aliases [1], [2], [3]. Do not output raw URLs.
Include one concrete data takeaway from the provided research snippets.
No JSON. No markdown headers. No code blocks.`;

  const userPrompt = `Role: ${params.role}
Research context:
${researchContext || "No external sources available."}

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
  if (activeDebates.has(sessionId)) return;

  const session = getSession(sessionId);
  if (!session) throw new Error("Session not found");

  activeDebates.add(sessionId);
  setDebateStatus(sessionId, "running");
  updateSessionPhase(sessionId, "debate");

  try {
    const [proResearch, conResearch] = await Promise.all([
      fetchResearch(session.topic, "pro"),
      fetchResearch(session.topic, "con"),
    ]);
    const allResearch = [...proResearch, ...conResearch];

    const combinedSummary = await summarizeResearchInSandbox(
      allResearch.map((item) => `${item.title}: ${item.snippet}`),
      "combined-research",
    );

    const agents = await selectAgents({
      topic: session.topic,
      researchSummary: combinedSummary,
    });
    const daytonaSandboxes = await provisionDaytonaSandboxes(
      agents.map((agent) => `${sessionId}-${agent.id}`),
    );
    const sandboxProbeByLabel = new Map(
      await Promise.all(
        agents.map(async (agent) => {
          const label = `${sessionId}-${agent.id}`;
          const probe = await runInDaytona("print('sandbox-ready')", "python", label);
          return [label, probe] as const;
        }),
      ),
    );
    const sandboxByLabel = new Map(
      daytonaSandboxes.map((sandbox) => [sandbox.label, sandbox]),
    );

    setSessionAgents(sessionId, agents);
    agents.forEach((agent) => {
      const label = `${sessionId}-${agent.id}`;
      const sandbox = sandboxByLabel.get(label);
      const probe = sandboxProbeByLabel.get(label);
      const sandboxDetails = sandbox
        ? `Sandbox ${sandbox.id} (${sandbox.mode}, probe exit ${probe?.exitCode ?? 0})`
        : "Sandbox not provisioned";

      appendMessage(sessionId, {
        id: uuidv4(),
        speaker: agent.id,
        agentName: agent.name,
        perspective: agent.perspective,
        route: agent.route,
        content: `${agent.name} is active on ${agent.route} (${agent.model}) with ${agent.tools.join(" + ")}. ${sandboxDetails}. Focus: ${agent.stance}.`,
        sources: allResearch.slice(0, 3).map((item) => item.url),
        createdAt: Date.now(),
      });
    });

    let lastTurnTimestamp = 0;

    const addTurn = async (
      agent: DebateAgent,
      roleKey: AgentRole,
      transcriptSoFar: string,
      sources: ResearchResult[],
    ) => {
      const waitFor = MIN_TURN_INTERVAL_MS - (Date.now() - lastTurnTimestamp);
      if (waitFor > 0) await sleep(waitFor);

      const selectedSources = pickResearchForAgent(agent, sources);
      const messageHistory =
        getSession(sessionId)?.messages.map((message) => message.content) ?? [];

      let content = "";
      let attempts = 0;

      while (attempts <= MAX_GENERATION_RETRIES) {
        const generated = await generateArgument({
          topic: session.topic,
          agent,
          role: roleKey,
          researchSources: selectedSources,
          transcriptSoFar,
        });

        content = finalizeAgentContent({
          raw: generated,
          agent,
          role: roleKey,
          topic: session.topic,
          sources: selectedSources,
        });

        if (!looksLikeRepeat(content, messageHistory)) break;
        attempts += 1;
      }

      if (!content || looksLikeRepeat(content, messageHistory)) {
        content = buildNonRepeatFallback({
          agent,
          role: roleKey,
          topic: session.topic,
          sources: selectedSources,
        });
      }

      if (hasExactDuplicate(content, messageHistory)) {
        const digest = buildEvidenceDigest(selectedSources);
        content = `${content} Additional emphasis: ${agent.stance}. ${digest}`.replace(
          /\s{2,}/g,
          " ",
        );
      }

      appendMessage(sessionId, {
        id: uuidv4(),
        speaker: agent.id,
        agentName: agent.name,
        perspective: agent.perspective,
        route: agent.route,
        content,
        sources: selectedSources.map((item) => item.url),
        createdAt: Date.now(),
      });

      lastTurnTimestamp = Date.now();
    };

    let transcriptSoFar = "";

    for (let round = 0; round < ROUNDS; round += 1) {
      for (const agent of agents) {
        const roleKey: AgentRole =
          round === 0 ? "opening" : round === 1 ? "argument" : "rebuttal";
        await addTurn(
          agent,
          roleKey,
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
  } finally {
    activeDebates.delete(sessionId);
  }
}

export async function finalizeSession(sessionId: string): Promise<JudgeVerdict | null> {
  const session = getSession(sessionId);
  if (!session) return null;

  const pre = computePollSnapshot(session.votes, "pre");
  const post = computePollSnapshot(session.votes, "post");
  const audienceShift = describeAudienceShift(pre, post);

  const transcript = session.messages
    .map((message) => `[${message.speaker.toUpperCase()}] ${message.content}`)
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
