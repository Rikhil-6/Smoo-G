import { NextResponse } from "next/server";
import { processTelegramUpdate } from "@/lib/integrations/telegram-update-processor";
import type { TelegramUpdate } from "@/lib/integrations/telegram";

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (expectedSecret) {
    const actualSecret =
      request.headers.get("x-telegram-bot-api-secret-token")?.trim() || "";
    if (!actualSecret || actualSecret !== expectedSecret) {
      return NextResponse.json({ ok: false, error: "Invalid webhook secret." }, { status: 401 });
    }
  }

  const update = (await request.json()) as TelegramUpdate;
  const handled = await processTelegramUpdate(update);
  return NextResponse.json({ ok: true, handled });
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "telegram-webhook" });
}
