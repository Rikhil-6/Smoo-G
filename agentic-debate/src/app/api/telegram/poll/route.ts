import { NextResponse } from "next/server";
import { pollTelegramUpdatesPass } from "@/lib/integrations/telegram-update-processor";
import { isTelegramConfigured } from "@/lib/integrations/telegram";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured." },
      { status: 400 },
    );
  }

  const result = await pollTelegramUpdatesPass();
  return NextResponse.json({ ok: true, mode: "polling-bridge", ...result });
}

export async function GET() {
  return NextResponse.json({ ok: true, route: "telegram-poll" });
}
