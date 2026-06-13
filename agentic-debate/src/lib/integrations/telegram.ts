import type { Stance } from "../types";

export type VotePhase = "pre" | "post";

export interface TelegramUser {
  id: number;
}

export interface TelegramChat {
  id: number;
}

export interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: TelegramMessage;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramInlineButton {
  text: string;
  callback_data: string;
}

interface TelegramInlineKeyboard {
  inline_keyboard: TelegramInlineButton[][];
}

let cachedBotUsername: string | null = null;
let cachedAt = 0;

const BOT_USERNAME_CACHE_MS = 60_000;

function telegramBotToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN?.trim();
}

export function isTelegramConfigured(): boolean {
  return Boolean(telegramBotToken());
}

export function configuredTelegramBotUsername(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim() ||
    process.env.TELEGRAM_BOT_USERNAME?.trim() ||
    process.env.TELEGRAM_BOT_URL?.trim() ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL?.trim();
  if (!raw) return null;

  const fromUrl = raw.match(/(?:https?:\/\/)?t\.me\/([a-z0-9_]+)/i)?.[1];
  return (fromUrl || raw.replace(/^@/, "")).trim();
}

export async function resolveTelegramBotUsername(): Promise<string | null> {
  const configured = configuredTelegramBotUsername();
  if (configured) return configured;

  const token = telegramBotToken();
  if (!token) return null;

  if (cachedBotUsername && Date.now() - cachedAt < BOT_USERNAME_CACHE_MS) {
    return cachedBotUsername;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      ok: boolean;
      result?: { username?: string };
    };
    const username = payload.ok ? payload.result?.username?.trim() : undefined;
    if (!username) return null;
    cachedBotUsername = username;
    cachedAt = Date.now();
    return username;
  } catch {
    return null;
  }
}

export function buildTelegramVoteStartPayload(
  sessionId: string,
  phase: VotePhase,
): string {
  return `vote_${sessionId}_${phase}`;
}

export function parseTelegramVoteStartPayload(payload: string): {
  sessionId: string;
  phase: VotePhase;
} | null {
  const match = payload.trim().match(/^vote_([0-9a-zA-Z-]+)_(pre|post)$/);
  if (!match) return null;
  return {
    sessionId: match[1],
    phase: match[2] as VotePhase,
  };
}

export function buildTelegramVoteDeepLink(
  botUsername: string,
  sessionId: string,
  phase: VotePhase,
): string {
  const payload = buildTelegramVoteStartPayload(sessionId, phase);
  return `https://t.me/${botUsername}?start=${payload}`;
}

function telegramApiUrl(method: string): string {
  const token = telegramBotToken();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function callTelegramApi<T>(
  method: string,
  body: Record<string, unknown>,
): Promise<T | null> {
  try {
    const response = await fetch(telegramApiUrl(method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { ok: boolean; result?: T };
    return payload.ok ? (payload.result ?? null) : null;
  } catch {
    return null;
  }
}

export function buildTelegramVoteKeyboard(
  sessionId: string,
  phase: VotePhase,
): TelegramInlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "Yes", callback_data: `vote:${sessionId}:${phase}:yes` },
        { text: "No", callback_data: `vote:${sessionId}:${phase}:no` },
      ],
    ],
  };
}

export function parseTelegramVoteCallbackData(data: string): {
  sessionId: string;
  phase: VotePhase;
  stance: Stance;
} | null {
  const match = data.match(/^vote:([^:]+):(pre|post):(yes|no)$/);
  if (!match) return null;
  return {
    sessionId: match[1],
    phase: match[2] as VotePhase,
    stance: match[3] as Stance,
  };
}

export async function telegramGetUpdates(
  offset?: number,
  limit = 25,
): Promise<TelegramUpdate[]> {
  const updates = await callTelegramApi<TelegramUpdate[]>("getUpdates", {
    offset,
    limit,
    timeout: 0,
    allowed_updates: ["message", "callback_query"],
  });
  return updates ?? [];
}

export async function telegramSendVotePrompt(params: {
  chatId: number;
  topic: string;
  sessionId: string;
  phase: VotePhase;
}): Promise<void> {
  const phaseLabel =
    params.phase === "pre" ? "Pre-debate vote" : "Post-debate vote";
  const prompt =
    params.phase === "pre"
      ? "Before agents speak, where do you stand?"
      : "After reading the debate, where do you stand now?";

  await callTelegramApi("sendMessage", {
    chat_id: params.chatId,
    text: `${phaseLabel}\n\n${prompt}\n\n"${params.topic}"`,
    reply_markup: buildTelegramVoteKeyboard(params.sessionId, params.phase),
  });
}

export async function telegramAnswerCallback(params: {
  callbackQueryId: string;
  text: string;
  showAlert?: boolean;
}): Promise<void> {
  await callTelegramApi("answerCallbackQuery", {
    callback_query_id: params.callbackQueryId,
    text: params.text,
    show_alert: params.showAlert ?? false,
  });
}

export async function telegramEditMessage(params: {
  chatId: number;
  messageId: number;
  text: string;
}): Promise<void> {
  await callTelegramApi("editMessageText", {
    chat_id: params.chatId,
    message_id: params.messageId,
    text: params.text,
  });
}

export async function telegramSendMessage(params: {
  chatId: number;
  text: string;
}): Promise<void> {
  await callTelegramApi("sendMessage", {
    chat_id: params.chatId,
    text: params.text,
  });
}

export async function telegramSetWebhook(webhookUrl: string): Promise<boolean> {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const payload: Record<string, unknown> = {
    url: webhookUrl,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  };
  if (secret) payload.secret_token = secret;
  const result = await callTelegramApi<{ url: string }>("setWebhook", payload);
  return Boolean(result);
}
