const http = require("http");
const fs = require("fs");
const path = require("path");

function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env.local");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separator = trimmed.indexOf("=");
    if (separator === -1) return;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadLocalEnv();

const host = process.env.SMOO_G_HOST || "127.0.0.1";
const port = Number(process.env.SMOO_G_PORT || 8787);

const integrationConfig = {
  daytona: {
    configured: Boolean(process.env.DAYTONA_API_KEY),
    label: "Daytona workspace runtime"
  },
  brightdataPlaywright: {
    configured: Boolean(process.env.BRIGHTDATA_PLAYWRIGHT_WSS),
    label: "BrightData scraping browser",
    endpoint: process.env.BRIGHTDATA_PLAYWRIGHT_WSS ? "wss://brd.superproxy.io:9222" : null
  },
  videodb: {
    configured: Boolean(process.env.VIDEODB_API_KEY),
    label: "VideoDB evidence ingest"
  }
};

const adapters = [
  {
    id: "daytona",
    name: "Daytona",
    status: "planned",
    responsibility: "Start isolated workspaces and stream agent run logs."
  },
  {
    id: "brightdata",
    name: "BrightData",
    status: "planned",
    responsibility: "Run public web research with proxy-backed collection."
  },
  {
    id: "playwright",
    name: "Playwright",
    status: "planned",
    responsibility: "Drive supervised browser sessions and capture evidence."
  },
  {
    id: "videodb",
    name: "VideoDB",
    status: "planned",
    responsibility: "Load video transcript and metadata context."
  },
  {
    id: "kimi",
    name: "Kimi",
    status: "planned",
    responsibility: "Generate live perspective-specific agent turns."
  }
];

const tokenRoutes = {
  economy: {
    provider: "kimi",
    modelClass: "small",
    maxReasoning: "low",
    bestFor: "Cheap first-pass turns, summaries, and mechanical checks."
  },
  balanced: {
    provider: "kimi",
    modelClass: "standard",
    maxReasoning: "medium",
    bestFor: "Default agent turns with enough context for useful tradeoffs."
  },
  "deep-reasoning": {
    provider: "kimi",
    modelClass: "reasoning",
    maxReasoning: "high",
    bestFor: "Ethical, legal, strategic, or high-impact synthesis turns."
  },
  "research-heavy": {
    provider: "brightdata-playwright",
    modelClass: "tool-first",
    maxReasoning: "medium",
    bestFor: "Web research, browsing, scraping, and evidence collection."
  },
  "code-specialist": {
    provider: "claude-code",
    modelClass: "coding-agent",
    maxReasoning: "high",
    bestFor: "Implementation planning, repo edits, debugging, and code review."
  },
  "design-specialist": {
    provider: "nanobana",
    modelClass: "visual-agent",
    maxReasoning: "medium",
    bestFor: "UI direction, visual design systems, presentation-grade outputs, and image-led briefs."
  }
};

const learnerRules = [
  {
    id: "design",
    label: "Design and visual output",
    priority: 40,
    route: "design-specialist",
    recommendedAgents: ["creative", "customer", "technical"],
    tools: ["nanobana", "VideoDB", "Playwright"],
    keywords: ["design", "ui", "ux", "visual", "website", "deck", "presentation", "brand", "image", "template"]
  },
  {
    id: "coding",
    label: "Code and implementation",
    priority: 35,
    route: "code-specialist",
    recommendedAgents: ["technical", "business", "ethical"],
    tools: ["claude-code", "Daytona", "Playwright"],
    keywords: ["code", "repo", "bug", "test", "backend", "frontend", "api", "implementation", "refactor"]
  },
  {
    id: "research",
    label: "Public research and evidence",
    priority: 25,
    route: "research-heavy",
    recommendedAgents: ["business", "legal", "customer"],
    tools: ["BrightData", "Playwright", "VideoDB"],
    keywords: ["public", "scrape", "research", "market", "competitor", "source", "evidence", "citation", "web"]
  },
  {
    id: "risk",
    label: "Risk, policy, and ethics",
    priority: 30,
    route: "deep-reasoning",
    recommendedAgents: ["ethical", "legal", "technical"],
    tools: ["Kimi", "BrightData", "Playwright"],
    keywords: ["risk", "ethic", "legal", "policy", "privacy", "compliance", "safety", "consent", "audit"]
  }
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordScore(request, keywords) {
  return keywords.reduce((total, keyword) => {
    const pattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`);
    return total + (pattern.test(request) ? 1 : 0);
  }, 0);
}

function recommendRoute(payload) {
  const request = String(payload.role || payload.request || "").toLowerCase();
  const matches = learnerRules.map((rule) => {
    const score = keywordScore(request, rule.keywords);
    return { ...rule, score };
  }).sort((left, right) => (right.score - left.score) || (right.priority - left.priority));
  const winner = matches.find((match) => match.score > 0) || learnerRules[0];

  return {
    learner: "tokenrouter-low-level-learner",
    confidence: Math.min(0.92, 0.48 + winner.score * 0.11),
    matchedRule: winner.id,
    route: winner.route,
    routeConfig: tokenRoutes[winner.route],
    recommendedAgents: winner.recommendedAgents,
    tools: winner.tools,
    rationale: `Matched ${winner.label.toLowerCase()} from the requested role. Use this as a seed recommendation until live run outcomes are logged.`
  };
}

function createTokenPlan(payload) {
  const agents = Array.isArray(payload.agents) ? payload.agents : [];
  const budget = Number(payload.budget || 24000);
  const reservePercent = Math.min(80, Math.max(0, Number(payload.reservePercent || 20)));
  const reserveTokens = Math.floor(budget * (reservePercent / 100));
  const allocatableTokens = Math.max(0, budget - reserveTokens);
  const perAgent = agents.length > 0 ? Math.floor(allocatableTokens / agents.length) : allocatableTokens;
  const defaultRoute = payload.defaultRoute || "balanced";
  const policies = payload.policies || {};

  return {
    budget,
    reservePercent,
    reserveTokens,
    allocatableTokens,
    fallbackProvider: payload.fallbackProvider || "kimi",
    defaultRoute,
    agents: agents.map((agent) => {
      const routeId = policies[agent.id] || agent.route || defaultRoute;
      return {
        id: agent.id,
        name: agent.name,
        route: routeId,
        allocatedTokens: perAgent,
        routeConfig: tokenRoutes[routeId] || tokenRoutes[defaultRoute] || tokenRoutes.balanced
      };
    })
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, {
      ok: true,
      service: "smoo-g-backend",
      mode: "adapter-scaffold"
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/adapters") {
    sendJson(response, 200, { adapters });
    return;
  }

  if (request.method === "GET" && url.pathname === "/config/status") {
    sendJson(response, 200, {
      ok: true,
      integrations: integrationConfig
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/token-router") {
    sendJson(response, 200, {
      routes: tokenRoutes,
      learnerRules: learnerRules.map(({ keywords, ...rule }) => rule),
      defaults: {
        budget: 24000,
        reservePercent: 20,
        defaultRoute: "balanced",
        fallbackProvider: "kimi"
      }
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/token-router/learner") {
    sendJson(response, 200, {
      learner: "tokenrouter-low-level-learner",
      status: "seeded",
      rules: learnerRules.map(({ keywords, ...rule }) => rule)
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/token-router/recommend") {
    const body = await readBody(request);
    const payload = body ? JSON.parse(body) : {};
    sendJson(response, 200, recommendRoute(payload));
    return;
  }

  if (request.method === "POST" && url.pathname === "/token-router/plan") {
    const body = await readBody(request);
    const payload = body ? JSON.parse(body) : {};
    sendJson(response, 200, createTokenPlan(payload));
    return;
  }

  if (request.method === "POST" && url.pathname === "/runs") {
    const body = await readBody(request);
    const payload = body ? JSON.parse(body) : {};
    const tokenPlan = createTokenPlan(payload.tokenRouter || payload);
    sendJson(response, 202, {
      id: `run-${Date.now().toString(36)}`,
      status: "accepted",
      message: "Run orchestration placeholder accepted. Adapter execution is not wired yet.",
      requestedAgents: payload.agents || [],
      tokenPlan
    });
    return;
  }

  sendJson(response, 404, {
    error: "not_found",
    routes: ["GET /health", "GET /adapters", "GET /config/status", "GET /token-router", "GET /token-router/learner", "POST /token-router/recommend", "POST /token-router/plan", "POST /runs"]
  });
});

server.listen(port, host, () => {
  console.log(`Smoo-G backend listening at http://${host}:${port}`);
});
