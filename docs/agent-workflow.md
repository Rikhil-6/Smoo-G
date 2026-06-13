# Agent Simulator Workflow

This project starts with a browser-first simulator and keeps the orchestration simple enough to run in GitHub, Codex worktrees, or a Daytona-backed environment later.

## Default Agent Room

Start each simulation with 2-3 perspectives:

- Business: revenue, moat, cost, go-to-market, operational impact.
- Ethical: consent, accountability, harm reduction, transparency.
- Technical: architecture, reliability, model quality, data flow.

Optional perspectives can be toggled in when the topic needs them:

- Customer: trust, support burden, appeal paths, everyday usability.
- Legal: compliance, retention, contracts, auditability.
- Creative: positioning, narrative, differentiated interaction design.

## Runtime Direction

The first implementation is static HTML, CSS, and JavaScript in `frontend/index.html`.

That makes it easy to:

- Open locally without installing dependencies.
- Publish with GitHub Pages.
- Keep UI/UX iteration fast.
- Later replace the local response templates with real model calls.

## Team Work Areas

Frontend teammates should work in `frontend/`:

- Agent room UI.
- Perspective builder.
- Supervision windows.
- Research trace visualization.
- Run controls and settings.

Backend teammates should work in `backend/`:

- Daytona workspace lifecycle.
- BrightData and Playwright adapters.
- VideoDB scenario ingestion.
- Kimi model-provider adapter.
- Token router policy and budget accounting.
- API and event streaming for live runs.

New AI agents should start with `docs/agents/README.md`, then read `overview.md`, `folder-map.md`, and `work-queue.md`.

## Orchestration Pattern

Use a small loop for each feature branch or worktree:

1. Pull latest `main`.
2. Create a focused `codex/*` branch or Codex worktree.
3. Assign one clear responsibility to each agent.
4. Keep write scopes separate when multiple agents are active.
5. Rebase before push.
6. Push the branch and open a pull request.

Example branches:

- `codex/agent-simulator-ui`
- `codex/kimi-agent-adapter`
- `codex/videodb-topic-ingest`
- `codex/daytona-runner`

## Supervision Model

The UI should make each agent observable as its own work window:

- Runtime: where the agent is running, such as a Daytona workspace or browser session.
- Tool: what it is using, such as BrightData, Playwright, VideoDB, or Kimi.
- Research trace: search queries, page checks, extracted snippets, and blocked actions.
- Thought summary: concise reasoning updates that are safe to show to the supervisor.
- Human gate: approval before expensive, credentialed, or externally mutating actions.

The static prototype renders this as a simulated ops room. A production adapter should route each agent action through a backend service so credentials, proxy settings, API keys, and scraping sessions never live in browser code.

## Token Router

The token router decides how much model/tool budget each agent receives before the run starts.

Initial routing dimensions:

- Run budget: total token ceiling for one simulation.
- Review reserve: budget held back for synthesis, citation checks, and human follow-ups.
- Default route: economy, balanced, deep reasoning, or research heavy.
- Per-agent route: override route by perspective.
- Fallback provider: where the run goes when the preferred route is unavailable.

Production routing should also consider:

- Provider price and rate limit.
- Agent importance and risk tier.
- Tool cost for BrightData, Playwright, VideoDB, and Daytona runtime time.
- Cached evidence reuse.
- User or team spend caps.

## Integrations Backlog

The simulator includes a developer settings panel for local configuration. Use the gear button to toggle developer mode, enable or disable skill sources, edit source URLs, and export the current JSON settings.

Daytona:

- Start one isolated workspace per agent or per simulation run.
- Attach each workspace to a branch or ephemeral task id.
- Stream logs back to the simulator as window events.
- Push useful artifacts or patches back through GitHub.

BrightData and Playwright:

- Use Playwright for supervised browsing, screenshots, and DOM inspection.
- Use BrightData for resilient public web research where proxy-backed access is needed.
- Store raw pages, snippets, and citations as evidence objects linked to the agent turn.
- Pause for user confirmation before login, purchase, upload, or other side-effecting actions.

Kimi:

- Use as a model provider for real agent turns.
- Keep prompts perspective-scoped so each agent has a durable role.
- Store provider settings outside committed source.

VideoDB:

- Ingest videos as scenario material.
- Extract transcript snippets or metadata into the topic context.
- Let agents cite specific evidence from video-derived notes.

Daytona:

- Use for isolated workspaces when testing provider adapters or heavier demos.
- Keep each environment tied to one branch.
- Push changes frequently so work is not trapped in an instance.

GitHub:

- Use GitHub Pages for the static simulator.
- Use branches for experimental adapters.
- Use issues or Markdown notes for agent-room presets and scenario templates.

## Near-Term Roadmap

- Split `index.html` into `styles.css` and `app.js` once the prototype grows.
- Add import/export for simulation configs.
- Add persisted presets in local storage.
- Add real provider adapters behind a small interface.
- Add scenario sources from VideoDB transcripts.
