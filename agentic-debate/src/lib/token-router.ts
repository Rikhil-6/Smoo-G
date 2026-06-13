import type { DebateAgent } from "./types";

interface TokenRoute {
  id: string;
  model: string;
  tools: string[];
  budget: number;
  keywords: string[];
}

const routes: TokenRoute[] = [
  {
    id: "research-heavy",
    model: "kimi",
    tools: ["brightdata", "daytona"],
    budget: 7200,
    keywords: ["evidence", "research", "public", "market", "policy", "news"],
  },
  {
    id: "risk-ethics",
    model: "kimi",
    tools: ["brightdata", "daytona"],
    budget: 6400,
    keywords: ["risk", "ethic", "privacy", "safety", "trust", "harm"],
  },
  {
    id: "operator",
    model: "kimi",
    tools: ["daytona"],
    budget: 5600,
    keywords: ["business", "revenue", "growth", "customer", "ops", "startup"],
  },
  {
    id: "technical",
    model: "kimi",
    tools: ["daytona", "brightdata"],
    budget: 6400,
    keywords: ["technical", "architecture", "data", "integration", "system"],
  },
];

function scoreRoute(text: string, route: TokenRoute): number {
  const lower = text.toLowerCase();
  return route.keywords.reduce(
    (score, keyword) => score + (lower.includes(keyword) ? 1 : 0),
    0,
  );
}

export function chooseTokenRoute(roleRequest: string): TokenRoute {
  return [...routes].sort(
    (left, right) => scoreRoute(roleRequest, right) - scoreRoute(roleRequest, left),
  )[0];
}

export function buildFallbackAgents(topic: string): DebateAgent[] {
  const baseAgents = [
    {
      id: "market-operator",
      name: "Market Operator",
      perspective: "Business viability",
      stance: "argues for the path that can survive customers, budget, and timing",
      request: `${topic} business revenue customer adoption`,
    },
    {
      id: "trust-guardian",
      name: "Trust Guardian",
      perspective: "Ethics and risk",
      stance: "challenges consent, safety, hidden incentives, and failure modes",
      request: `${topic} ethics risk trust privacy harm`,
    },
    {
      id: "systems-builder",
      name: "Systems Builder",
      perspective: "Technical feasibility",
      stance: "tests whether the workflow can actually run with reliable data and tools",
      request: `${topic} technical architecture integration data quality`,
    },
  ];

  return baseAgents.map(({ request, ...agent }) => {
    const route = chooseTokenRoute(request);
    return {
      ...agent,
      route: route.id,
      model: route.model,
      tools: route.tools,
    };
  });
}

