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

The first implementation is static HTML, CSS, and JavaScript in `index.html`.

That makes it easy to:

- Open locally without installing dependencies.
- Publish with GitHub Pages.
- Keep UI/UX iteration fast.
- Later replace the local response templates with real model calls.

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

## Integrations Backlog

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
