# Folder Map

## `frontend/`

Browser experience only.

Use this folder for:

- agent windows
- perspective controls
- developer settings
- token router UI
- local simulation logic

## `backend/`

Runtime and adapter boundary.

Use this folder for:

- Daytona workspace orchestration
- BrightData scraping adapters
- Playwright browser sessions
- VideoDB ingestion
- Kimi model calls
- token routing and budget planning

## `docs/`

Project guidance.

Use this folder for:

- workflow notes
- teammate handoffs
- architecture decisions
- work queues

## Root

Keep the root light.

- `index.html` should stay a launcher or redirect.
- `README.md` should stay high level.
- Avoid putting backend logic in root files.
