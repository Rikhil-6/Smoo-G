# Overview

Smoo-G is an agent simulator and orchestration sandbox.

Current shape:

- `frontend/` is the browser UI and simulation surface.
- `backend/` is the adapter scaffold for Daytona, BrightData, Playwright, VideoDB, Kimi, and token routing.
- `docs/` stores workflow notes and agent-facing guidance.
- Root `index.html` is only a launcher for `frontend/index.html`.

Current product goal:

- Let users define perspectives.
- Show each agent in its own visible window.
- Surface research traces and routing choices.
- Keep the backend boundary clear so real integrations can be added later.
