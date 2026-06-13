export interface KimiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface KimiOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Call Moonshot Kimi API (OpenAI-compatible endpoint).
 * Uses mock responses when MOONSHOT_API_KEY is not set.
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
    throw new Error(`Kimi API error: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0]?.message?.content ?? "";
}

function mockKimiResponse(messages: KimiMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const content = lastUser?.content ?? "";

  if (content.includes("judge") || content.includes("Score each side")) {
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

  if (content.includes("opening")) {
    return content.includes("AGAINST") || content.includes("Con")
      ? "Opening (Con): The burden of proof requires us to weigh systemic risks, unintended consequences, and equity impacts—not just headline benefits."
      : "Opening (Pro): The evidence supports adoption when safeguards exist; the status quo carries greater cumulative harm than thoughtful reform.";
  }

  if (content.includes("rebuttal")) {
    return "Rebuttal: Your cited studies conflate correlation with causation. Alternative explanations—selection bias and confounders—remain unaddressed.";
  }

  return "Argument: Multiple independent sources converge on measurable outcomes when policy design includes transparency, auditability, and human oversight.";
}
