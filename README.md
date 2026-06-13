# Smoo-G

Main app lives in `agentic-debate/` (Next.js).

## Run locally

```powershell
cd agentic-debate
npm install
npm run dev
```

## QR URL behavior

`/api/network-url` now prioritizes public hosts for QR:

1. Runtime override from `POST /api/network-url`
2. `NEXT_PUBLIC_QR_BASE_URL`, `QR_PUBLIC_URL`, `PUBLIC_APP_URL`, `DAYTONA_PUBLIC_URL`
3. Vercel envs (`VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_BRANCH_URL`, `VERCEL_URL`)
4. Forwarded host/proto (proxy)
5. LAN/local fallback

Telegram fallback is supported for cross-network cases where direct QR cannot reach your host.

### Set public QR target at runtime

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://localhost:3000/api/network-url `
  -ContentType "application/json" `
  -Body '{"publicUrl":"https://your-public-host.com"}'
```

## Deploy options (internet-accessible QR)

### Option A: Vercel (recommended for quick global access)

1. Push repo to GitHub.
2. Import repo in Vercel.
3. Set env vars in Vercel Project Settings (Production):
   - `DAYTONA_API_KEY`
   - `DAYTONA_API_URL` (optional, default already set)
   - `DAYTONA_PROXY_URL` (optional, default already set)
   - `BRIGHTDATA_API_KEY` or `BRIGHTDATA_PLAYWRIGHT_WSS`
   - `MOONSHOT_API_KEY`
4. Redeploy.
5. QR will use the Vercel domain automatically.

### Option B: Daytona-hosted app URL

1. Deploy app inside your Daytona sandbox/container.
2. Get the public preview/domain URL for app port.
3. Set `DAYTONA_PUBLIC_URL` (or runtime `publicUrl`) to that public URL.
4. QR now resolves globally (not LAN-limited).

## Key env vars (`agentic-debate/.env.local`)

- `DAYTONA_API_KEY`
- `DAYTONA_API_URL`
- `DAYTONA_PROXY_URL`
- `BRIGHTDATA_API_KEY` / `BRIGHTDATA_PLAYWRIGHT_WSS`
- `MOONSHOT_API_KEY`
- `NEXT_PUBLIC_QR_BASE_URL` (optional explicit override)
- `NEXT_PUBLIC_API_BASE_URL` (if frontend and API are split)
- `TELEGRAM_BOT_USERNAME` (or `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`) for QR fallback
- `TELEGRAM_BOT_TOKEN` (optional, keep secret; only needed for API bot actions)
