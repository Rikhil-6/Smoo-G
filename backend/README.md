# Smoo-G Backend

This folder is for the runtime layer that will eventually drive real supervised agents.

## Intended Responsibilities

- Start and monitor Daytona workspaces per agent or simulation.
- Run supervised Playwright browser sessions.
- Call BrightData-backed research adapters where proxy-backed scraping is needed.
- Pull VideoDB transcript or metadata context into simulation topics.
- Call model providers such as Kimi for live agent turns.
- Route token budgets across agents, providers, and task types.
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
- `GET /token-router`: available token routes and defaults.
- `POST /token-router/plan`: deterministic budget allocation for a proposed run.
- `POST /runs`: future simulation run creation.

Secrets, API keys, proxy configuration, and provider tokens should stay in backend environment variables, never in frontend code.

## Token Router

The router is intentionally simple for now:

- `economy`: cheap first-pass and summary work.
- `balanced`: default live agent turns.
- `deep-reasoning`: high-impact ethical, legal, strategic, or synthesis turns.
- `research-heavy`: tool-first browsing and evidence collection with BrightData or Playwright.

The production version should add provider health, price tables, rate limits, latency history, and per-user spend caps.
