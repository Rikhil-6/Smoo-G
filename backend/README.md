# Smoo-G Backend

This folder is for the runtime layer that will eventually drive real supervised agents.

## Intended Responsibilities

- Start and monitor Daytona workspaces per agent or simulation.
- Run supervised Playwright browser sessions.
- Call BrightData-backed research adapters where proxy-backed scraping is needed.
- Pull VideoDB transcript or metadata context into simulation topics.
- Call model providers such as Kimi for live agent turns.
- Stream safe progress events back to the frontend.

## Local Prototype

`server.js` is a dependency-free Node scaffold. It exposes placeholder API routes so frontend and backend work can proceed in parallel.

```powershell
node backend/server.js
```

Then open:

```text
http://127.0.0.1:8787/health
```

## API Shape

- `GET /health`: backend status.
- `GET /adapters`: configured adapter capabilities.
- `POST /runs`: future simulation run creation.

Secrets, API keys, proxy configuration, and provider tokens should stay in backend environment variables, never in frontend code.
