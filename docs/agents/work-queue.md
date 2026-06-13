# Work Queue

## Frontend

1. Improve the agent window layout for more simultaneous agents.
2. Add better per-agent evidence views.
3. Replace simulated traces with live backend events when ready.

## Backend

1. Wire `/runs` to create real run records.
2. Add a token-router adapter that accounts for provider cost and task type.
3. Add event streaming so each agent window can update live.
4. Connect Daytona, BrightData, Playwright, VideoDB, and Kimi behind safe adapters.

## Shared

1. Keep secrets out of frontend code.
2. Keep folder ownership clean.
3. Push small, reviewable changes often.
