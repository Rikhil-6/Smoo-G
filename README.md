# Smoo-G

Smoo-G is a lightweight workspace for simulating small groups of agents that debate a topic from different perspectives.

## Agent Simulator

Open `index.html` in a browser to run the first simulator. It is dependency-free and GitHub Pages friendly.

Current capabilities:

- Start with 2-3 mini agents and scale up to 6.
- Toggle perspectives such as business, ethical, technical, customer, legal, and creative.
- Run 1-5 debate rounds against a custom topic.
- Generate a transcript plus synthesis, alignment score, and risk score.
- Configure developer-mode skill sources for BrightData, VideoDB, Daytona, and Kimi.

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
git add README.md Markdown.md index.html docs/agent-workflow.md
git commit -m "Add static agent simulator"
git push -u origin codex/agent-simulator
```

For regular worktree orchestration, keep each larger capability on its own `codex/*` branch or Codex worktree, then rebase before opening a pull request.
