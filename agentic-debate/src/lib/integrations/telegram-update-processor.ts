import { computePollSnapshot } from "../poll-utils";
import { addVote, getCurrentVoteSession, getSession } from "../store";
import {
  parseTelegramVoteCallbackData,
  parseTelegramVoteStartPayload,
  telegramAnswerCallback,
  telegramEditMessage,
  telegramGetUpdates,
  telegramSendMessage,
  telegramSendVotePrompt,
  type TelegramCallbackQuery,
  type TelegramMessage,
  type TelegramUpdate,
  type VotePhase,
} from "./telegram";

const chatSessionBindings = new Map<number, string>();
let lastUpdateOffset = 0;
let pollingRun: Promise<{
  fetched: number;
  handled: number;
  offset: number;
}> | null = null;

function isPhaseOpen(sessionPhase: string, votePhase: VotePhase): boolean {
  if (votePhase === "pre") return sessionPhase === "pre_poll";
  return sessionPhase === "post_poll";
}

function parseStartPayload(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed === "/start") return null;
  const match = trimmed.match(/^\/start(?:\s+(.+))?$/i);
  return match?.[1]?.trim() || null;
}

function resolveActiveVoteContextForChat(chatId: number): {
  sessionId: string;
  phase: VotePhase;
} | null {
  const boundSessionId = chatSessionBindings.get(chatId);
  if (boundSessionId) {
    const bound = getSession(boundSessionId);
    if (bound?.phase === "pre_poll" || bound?.phase === "post_poll") {
      return {
        sessionId: bound.id,
        phase: bound.phase === "post_poll" ? "post" : "pre",
      };
    }
  }

  const active = getCurrentVoteSession();
  if (!active) return null;
  return {
    sessionId: active.id,
    phase: active.phase === "post_poll" ? "post" : "pre",
  };
}

async function handleStartMessage(message: TelegramMessage): Promise<boolean> {
  const text = message.text?.trim() ?? "";
  const payload = parseStartPayload(text);

  if (!payload) {
    const active = resolveActiveVoteContextForChat(message.chat.id);
    if (!active) {
      await telegramSendMessage({
        chatId: message.chat.id,
        text: "No active vote session is open right now. Ask host to open a vote, then scan the latest QR.",
      });
      return true;
    }

    const session = getSession(active.sessionId);
    if (!session) return true;

    chatSessionBindings.set(message.chat.id, session.id);
    await telegramSendVotePrompt({
      chatId: message.chat.id,
      topic: session.topic,
      sessionId: session.id,
      phase: active.phase,
    });
    return true;
  }

  const parsed = parseTelegramVoteStartPayload(payload);
  if (!parsed) {
    await telegramSendMessage({
      chatId: message.chat.id,
      text: "That vote link is invalid or expired.",
    });
    return true;
  }

  const session = getSession(parsed.sessionId);
  if (!session) {
    await telegramSendMessage({
      chatId: message.chat.id,
      text: "Session not found. Ask host to generate a fresh QR.",
    });
    return true;
  }

  if (!isPhaseOpen(session.phase, parsed.phase)) {
    const phaseLabel = parsed.phase === "pre" ? "pre-debate" : "post-debate";
    await telegramSendMessage({
      chatId: message.chat.id,
      text: `The ${phaseLabel} vote is currently closed.`,
    });
    return true;
  }

  chatSessionBindings.set(message.chat.id, session.id);
  await telegramSendVotePrompt({
    chatId: message.chat.id,
    topic: session.topic,
    sessionId: session.id,
    phase: parsed.phase,
  });
  return true;
}

async function handleCallbackQuery(query: TelegramCallbackQuery): Promise<boolean> {
  const data = query.data?.trim() ?? "";
  const parsed = parseTelegramVoteCallbackData(data);

  if (!parsed) {
    await telegramAnswerCallback({
      callbackQueryId: query.id,
      text: "Invalid vote action.",
      showAlert: true,
    });
    return true;
  }

  const session = getSession(parsed.sessionId);
  if (!session) {
    await telegramAnswerCallback({
      callbackQueryId: query.id,
      text: "Session no longer exists.",
      showAlert: true,
    });
    return true;
  }

  if (!isPhaseOpen(session.phase, parsed.phase)) {
    await telegramAnswerCallback({
      callbackQueryId: query.id,
      text: "That voting phase is closed.",
      showAlert: true,
    });
    return true;
  }

  chatSessionBindings.set(query.from.id, parsed.sessionId);
  addVote(parsed.sessionId, parsed.stance, parsed.phase, `tg:${query.from.id}`);

  const updated = getSession(parsed.sessionId);
  const poll = computePollSnapshot(updated?.votes ?? [], parsed.phase);
  const phaseLabel = parsed.phase === "pre" ? "Pre-debate" : "Post-debate";
  const stanceLabel = parsed.stance === "yes" ? "YES" : "NO";

  await telegramAnswerCallback({
    callbackQueryId: query.id,
    text: `Vote recorded: ${stanceLabel}`,
  });

  if (query.message) {
    await telegramEditMessage({
      chatId: query.message.chat.id,
      messageId: query.message.message_id,
      text: `${phaseLabel} vote recorded: ${stanceLabel}\n\nTopic: "${session.topic}"\nLive room pulse: ${poll.yesPercent}% yes / ${poll.noPercent}% no`,
    });
  }
  return true;
}

export async function processTelegramUpdate(update: TelegramUpdate): Promise<boolean> {
  if (update.message?.text?.startsWith("/start")) {
    return handleStartMessage(update.message);
  }
  if (update.callback_query) {
    return handleCallbackQuery(update.callback_query);
  }
  return false;
}

export async function pollTelegramUpdatesPass(): Promise<{
  fetched: number;
  handled: number;
  offset: number;
}> {
  if (pollingRun) return pollingRun;

  pollingRun = (async () => {
    const updates = await telegramGetUpdates(lastUpdateOffset || undefined, 30);
    let handled = 0;

    for (const update of updates) {
      lastUpdateOffset = Math.max(lastUpdateOffset, update.update_id + 1);
      const didHandle = await processTelegramUpdate(update);
      if (didHandle) handled += 1;
    }

    return {
      fetched: updates.length,
      handled,
      offset: lastUpdateOffset,
    };
  })().finally(() => {
    pollingRun = null;
  });

  return pollingRun;
}
