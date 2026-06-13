# Smoo-G

Smoo-G’s main surface is now the `agentic-debate/` Next app pulled from the `agentic-debate` branch.

## Main App

```powershell
cd agentic-debate
npm install
npm run dev
```

The dev script binds to `0.0.0.0` so QR voting works from phones on the same network. The app also exposes `/api/network-url` to prefer a LAN URL for QR codes instead of `127.0.0.1`.

## Current Capabilities

- Live topic session with pre/post QR voting.
- Agent roster chosen by Kimi/TokenRouter from the topic plus research summary.
- BrightData-backed research path with graceful fallback when only the browser WSS is configured.
- Daytona sandbox summary path with fail-soft behavior if the run endpoint differs.
- Multi-perspective argument chat with agent names, lenses, routes, and supporting source URLs.

## Local Config

Use `agentic-debate/.env.local` for real credentials. It is ignored by git. Start from:

```powershell
Copy-Item agentic-debate/.env.example agentic-debate/.env.local
```

Key integrations:

- `DAYTONA_API_KEY`
- `BRIGHTDATA_API_KEY` or `BRIGHTDATA_PLAYWRIGHT_WSS`
- `MOONSHOT_API_KEY` for Kimi
- `TOKENROUTER_API_KEY` when a hosted router is available
- `NEXT_PUBLIC_APP_URL` when you want to force a specific QR base URL

## Legacy Prototype

The older static simulator remains in `frontend/` as reference material, but new work should target `agentic-debate/`.
