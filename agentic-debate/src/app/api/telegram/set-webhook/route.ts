import { NextResponse } from "next/server";
import { readRuntimeConfig } from "@/lib/runtime-config";
import { telegramSetWebhook } from "@/lib/integrations/telegram";

function normalizeUrl(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?$/i.test(trimmed)) return `https://${trimmed}`;
  return null;
}

export async function POST(request: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    publicUrl?: string;
  };

  const configuredPublicUrl =
    normalizeUrl(body.publicUrl) ||
    normalizeUrl(readRuntimeConfig().publicUrl) ||
    normalizeUrl(process.env.NEXT_PUBLIC_QR_BASE_URL) ||
    normalizeUrl(process.env.QR_PUBLIC_URL) ||
    normalizeUrl(process.env.PUBLIC_APP_URL) ||
    normalizeUrl(process.env.DAYTONA_PUBLIC_URL) ||
    normalizeUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeUrl(process.env.VERCEL_URL);

  if (!configuredPublicUrl) {
    return NextResponse.json(
      { ok: false, error: "No public URL configured for webhook." },
      { status: 400 },
    );
  }

  const webhookUrl = `${configuredPublicUrl.replace(/\/+$/, "")}/api/telegram/webhook`;
  const ok = await telegramSetWebhook(webhookUrl);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Telegram setWebhook failed." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, webhookUrl });
}
