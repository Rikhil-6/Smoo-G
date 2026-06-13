# Agentic Debate

Responsive live debate platform: audience QR polling, pro/con AI agents, and judge scoring.

## Flow

1. **Host** picks a topic on `/`
2. **Pre-debate QR** → audience opens `/vote/[sessionId]?phase=pre` on phones
3. **Live poll** updates on host + audience screens
4. **Debate** runs (Bright Data research → Kimi arguments → Daytona tooling)
5. **Post-debate QR** → `/vote/[sessionId]?phase=post`
6. **Judge agent** scores the debate and compares audience shift

## Run locally

```bash
cd agentic-debate
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on the host machine. For phone QR testing on the same Wi‑Fi, set:

```env
NEXT_PUBLIC_APP_URL=http://YOUR_LAN_IP:3000
```

## Environment variables

Copy `.env.example` to `.env.local`:

| Variable | Purpose |
|----------|---------|
| `MOONSHOT_API_KEY` | Kimi (Moonshot) LLM for agents |
| `MOONSHOT_MODEL` | Optional model id (default `moonshot-v1-8k`) |
| `BRIGHTDATA_API_KEY` | Web research via Bright Data |
| `BRIGHTDATA_ZONE` | Bright Data zone name |
| `DAYTONA_API_KEY` | Sandbox execution |
| `DAYTONA_API_URL` | Daytona API base URL |
| `NEXT_PUBLIC_APP_URL` | Public URL embedded in QR codes |

Without API keys, the app runs in **demo mode** with mock research and Kimi responses.

## Architecture

- **Next.js App Router** — responsive host UI + mobile vote page
- **In-memory session store** — swap for Redis/Postgres for production
- **Polling (2s)** — simple live updates without WebSockets
- **Integrations** — `src/lib/integrations/{brightdata,kimi,daytona}.ts`

## Voice (future)

Text debate is implemented now. Voice can be added with Web Speech API (browser TTS) or a TTS provider on each agent turn.
