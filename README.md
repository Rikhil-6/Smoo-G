# Smoo-G

Smoo-G is a lightweight workspace for simulating small groups of agents that debate a topic from different perspectives.

## Agent Simulator

Open `frontend/index.html` in a browser to run the first simulator. The root `index.html` redirects there for convenience.

Current capabilities:

- Start with 2-3 mini agents and scale up to 6.
- Toggle perspectives such as business, ethical, technical, customer, legal, and creative.
- Add user-defined perspectives from the UI.
- Run 1-5 debate rounds against a custom topic.
- Generate a transcript plus synthesis, alignment score, and risk score.
- Configure developer-mode skill sources for BrightData, VideoDB, Daytona, and Kimi.
- Watch agents in separate supervision windows with research/action traces.
- Route token budgets by agent, task type, and fallback provider.

## GitHub Workflow

Remote:

```powershell
git remote -v
```

Current origin is expected to be:

```text
https://github.com/Rikhil-6/Smoo-G.git
```

Recommended cadence:

```powershell
git status --short --branch
git pull --rebase origin main
git checkout -b codex/agent-simulator
git add README.md Markdown.md index.html frontend backend docs/agent-workflow.md
git commit -m "Add static agent simulator"
git push -u origin codex/agent-simulator
```

For regular worktree orchestration, keep each larger capability on its own `codex/*` branch or Codex worktree, then rebase before opening a pull request.

## Project Layout

```text
frontend/   Static simulator UI and supervision room.
backend/    Adapter scaffold for Daytona, BrightData, Playwright, VideoDB, and Kimi.
docs/       Workflow and architecture notes.
docs/agents Mini handoff pack for new AI agents.
```
