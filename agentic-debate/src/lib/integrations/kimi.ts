export interface KimiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface KimiOptions {
  temperature?: number;
  maxTokens?: number;
}

function hashText(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/**
 * Call Moonshot Kimi API (OpenAI-compatible endpoint).
 * Uses deterministic mock responses when MOONSHOT_API_KEY is not set
 * or when provider auth/network fails.
 */
export async function chatWithKimi(
  messages: KimiMessage[],
  options: KimiOptions = {},
): Promise<string> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  const model = process.env.MOONSHOT_MODEL ?? "moonshot-v1-8k";

  if (!apiKey) {
    return mockKimiResponse(messages);
  }

  try {
    const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("Kimi API failed; falling back to mock response:", errorText);
      return mockKimiResponse(messages);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    return data.choices[0]?.message?.content ?? "";
  } catch (error) {
    console.warn("Kimi API request failed; falling back to mock response:", error);
    return mockKimiResponse(messages);
  }
}

function mockKimiResponse(messages: KimiMessage[]): string {
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const system = [...messages].reverse().find((message) => message.role === "system");
  const content = lastUser?.content ?? "";
  const systemContent = system?.content ?? "";
  const judgeIntent =
    /impartial debate judge/i.test(content) ||
    /score each side/i.test(content) ||
    /strict json/i.test(systemContent) && /evidence-driven/i.test(systemContent);

  if (judgeIntent) {
    return JSON.stringify({
      winner: "pro",
      proScores: {
        argumentStrength: 8,
        evidenceQuality: 7,
        rebuttalEffectiveness: 7,
        clarity: 9,
        persuasiveness: 8,
      },
      conScores: {
        argumentStrength: 7,
        evidenceQuality: 8,
        rebuttalEffectiveness: 6,
        clarity: 8,
        persuasiveness: 7,
      },
      reasoning:
        "Pro presented clearer causal mechanisms and stronger rebuttals; Con had stronger raw evidence but less direct engagement.",
    });
  }

  if (content.includes("Choose exactly 3 perspectives")) {
    return JSON.stringify([
      {
        id: "market-operator",
        name: "Market Operator",
        perspective: "Business viability",
        stance: "argues for the path that can survive customers, budget, and timing",
        route: "operator",
        tools: ["daytona"],
      },
      {
        id: "trust-guardian",
        name: "Trust Guardian",
        perspective: "Ethics and risk",
        stance: "challenges consent, safety, hidden incentives, and failure modes",
        route: "risk-ethics",
        tools: ["brightdata", "daytona"],
      },
      {
        id: "systems-builder",
        name: "Systems Builder",
        perspective: "Technical feasibility",
        stance: "tests whether the workflow can run with reliable data and tool outputs",
        route: "technical",
        tools: ["daytona", "brightdata"],
      },
    ]);
  }

  const roleMatch = content.match(/Role:\s*(opening|argument|rebuttal|closing)/i);
  const role = (roleMatch?.[1] || "argument").toLowerCase();
  const isRiskLens = (system?.content || "").toLowerCase().includes("risk");
  const sourceTags = Array.from(content.matchAll(/\[S(\d+)\]/g))
    .map((match) => `[S${match[1]}]`)
    .filter((tag, index, all) => all.indexOf(tag) === index)
    .slice(0, 3);
  const refs = sourceTags.length > 0 ? sourceTags : ["[S1]", "[S2]"];

  const variations = {
    opening: [
      `Opening: ${isRiskLens ? "The downside risk is underpriced" : "The opportunity is real only when execution is disciplined"}. ${refs[0]} points to measurable effects and ${refs[1]} shows the operational tradeoff.`,
      `Opening: We should not treat this as ideology. ${refs[0]} gives directional evidence, while ${refs[1]} shows where failure concentrates.`,
      `Opening: The question is not whether change happens, but who controls it. ${refs[0]} and ${refs[1]} map the leverage points.`,
    ],
    rebuttal: [
      `Rebuttal: The previous claim overstates certainty. ${refs[0]} is correlational, and ${refs[1]} highlights confounders the room cannot ignore.`,
      `Rebuttal: That argument cherry-picks wins. ${refs[0]} reports constraints, while ${refs[1]} documents spillover harms.`,
      `Rebuttal: We need stronger causality. ${refs[0]} suggests benefit under strict conditions, but ${refs[1]} shows those conditions often fail in production.`,
    ],
    argument: [
      `Argument: A workable path exists if we sequence rollout, supervision, and audits. ${refs[0]} supports upside; ${refs[1]} bounds the risk envelope.`,
      `Argument: Execution quality determines outcomes more than slogans. ${refs[0]} favors adoption in narrow scopes, while ${refs[1]} warns against uncontrolled scale.`,
      `Argument: The data supports a staged policy: pilot, measure, then expand. ${refs[0]} provides efficacy signals and ${refs[1]} captures real-world friction.`,
    ],
    closing: [
      `Closing: Decide on evidence, not fear or hype. The strongest shared signal comes from ${refs[0]} plus ${refs[1]}, and both imply conditional adoption.`,
      `Closing: Commit to a reversible test with hard thresholds. ${refs[0]} and ${refs[1]} justify action with safeguards.`,
      `Closing: The prudent move is neither blind yes nor blanket no. ${refs[0]} shows potential; ${refs[1]} defines the guardrails.`,
    ],
  };

  const bucket =
    role === "opening"
      ? variations.opening
      : role === "rebuttal"
        ? variations.rebuttal
        : role === "closing"
          ? variations.closing
          : variations.argument;
  const pick = hashText(`${system?.content || ""}\n${content}`) % bucket.length;
  return bucket[pick];
}
