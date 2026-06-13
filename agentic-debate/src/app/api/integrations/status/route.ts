import { NextResponse } from "next/server";

export async function GET() {
  const status = {
    kimi: {
      configured: Boolean(process.env.MOONSHOT_API_KEY),
      model: process.env.MOONSHOT_MODEL ?? "moonshot-v1-8k",
      mode: process.env.MOONSHOT_API_KEY ? "configured" : "mock",
    },
    brightdata: {
      apiConfigured: Boolean(process.env.BRIGHTDATA_API_KEY),
      browserWssConfigured: Boolean(process.env.BRIGHTDATA_PLAYWRIGHT_WSS),
      mode: process.env.BRIGHTDATA_API_KEY
        ? "live-api"
        : process.env.BRIGHTDATA_PLAYWRIGHT_WSS
          ? "browser-cdp"
          : "mock",
    },
    daytona: {
      configured: Boolean(process.env.DAYTONA_API_KEY),
      apiUrl: process.env.DAYTONA_API_URL ?? "https://app.daytona.io/api",
      proxyUrl: process.env.DAYTONA_PROXY_URL ?? "https://proxy.app.daytona.io",
      mode: process.env.DAYTONA_API_KEY ? "live-sandbox" : "mock",
    },
    tokenRouter: {
      configured: Boolean(process.env.TOKENROUTER_API_KEY),
      defaultRoute: process.env.TOKENROUTER_DEFAULT_ROUTE ?? "research-heavy",
      mode: process.env.TOKENROUTER_API_KEY ? "external" : "local-rules",
    },
    telegram: {
      tokenConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()),
      usernameConfigured: Boolean(
        process.env.TELEGRAM_BOT_USERNAME?.trim() ||
          process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() ||
          process.env.TELEGRAM_BOT_URL?.trim() ||
          process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL?.trim(),
      ),
      webhookSecretConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET?.trim()),
      mode: process.env.TELEGRAM_BOT_TOKEN?.trim() ? "bot-vote" : "disabled",
    },
  };

  const summary = status.kimi.mode === "configured"
    ? "Agent generation is configured (auto-fallback enabled on provider error)"
    : "Agent generation is running fallback/mock mode";

  return NextResponse.json({
    ok: true,
    summary,
    status,
  });
}
