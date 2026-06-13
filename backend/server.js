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

  if (request.method === "POST" && url.pathname === "/runs") {
    const body = await readBody(request);
    const payload = body ? JSON.parse(body) : {};
    sendJson(response, 202, {
      id: `run-${Date.now().toString(36)}`,
      status: "accepted",
      message: "Run orchestration placeholder accepted. Adapter execution is not wired yet.",
      requestedAgents: payload.agents || []
    });
    return;
  }

  sendJson(response, 404, {
    error: "not_found",
    routes: ["GET /health", "GET /adapters", "POST /runs"]
  });
});

server.listen(port, host, () => {
  console.log(`Smoo-G backend listening at http://${host}:${port}`);
});
