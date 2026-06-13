const http = require("http");

const host = process.env.SMOO_G_HOST || "127.0.0.1";
const port = Number(process.env.SMOO_G_PORT || 8787);

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
  }
};

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

  if (request.method === "GET" && url.pathname === "/token-router") {
    sendJson(response, 200, {
      routes: tokenRoutes,
      defaults: {
        budget: 24000,
        reservePercent: 20,
        defaultRoute: "balanced",
        fallbackProvider: "kimi"
      }
    });
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
    routes: ["GET /health", "GET /adapters", "GET /token-router", "POST /token-router/plan", "POST /runs"]
  });
});

server.listen(port, host, () => {
  console.log(`Smoo-G backend listening at http://${host}:${port}`);
});
