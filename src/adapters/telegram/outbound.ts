import { physicalConversationForPlatform } from "../../conversations/ids";
import type {
  ButtonLayout,
  OutboundButton,
  OutboundButtonRow,
  OutboundFile,
  PlatformActivityType,
  PlatformOutboundAdapter,
  PlatformSendResult
} from "../../platforms/outbound/types";
import type { Env } from "../../shared/types/env";
import { callTelegramApi, callTelegramMultipartApi } from "./api";
import { resolveTelegramBotForAgent } from "./config";
import {
  normalizeTelegramParseMode,
  stripTelegramMarkup,
  telegramParseModePayload
} from "./formatting";
import { createTelegramInlineKeyboard } from "./inline-keyboard";
import type { TelegramInlineKeyboardMarkup } from "./types";

export function createTelegramOutboundAdapter(env: Env): PlatformOutboundAdapter {
  return {
    platform: "telegram",
    sendText: (input) => sendTelegramText(env, input.agentId, input.conversationId, input.text),
    sendFile: (input) =>
      sendTelegramDocument(env, input.agentId, input.conversationId, input.file, {
        caption: input.caption
      }),
    sendImage: (input) =>
      sendTelegramPhoto(env, input.agentId, input.conversationId, input.file, {
        caption: input.caption
      }),
    sendButtons: (input) =>
      sendTelegramButtons(env, input.agentId, input.conversationId, input.text, {
        buttons: input.buttons,
        rows: input.rows,
        layout: input.layout,
        expiresInSeconds: input.expiresInSeconds
      }),
    sendActivity: (input) =>
      sendTelegramChatAction(env, input.agentId, input.conversationId, input.activity)
  };
}

export async function sendTelegramText(
  env: Env,
  agentId: string,
  conversationId: string,
  text: string
): Promise<PlatformSendResult> {
  const bot = await resolveTelegramBotForAgent(env, agentId);
  if (!bot.token) {
    return { ok: false, error: "Telegram bot token is not configured" };
  }
  const token = bot.token;

  const chatId = telegramChatId(conversationId);
  const parseMode = normalizeTelegramParseMode(bot.integration?.config.parseMode);
  const requestBody: Record<string, unknown> = {
    chat_id: chatId,
    text,
    disable_web_page_preview: true
  };
  const parseModePayload = telegramParseModePayload(parseMode);
  if (parseModePayload) {
    requestBody.parse_mode = parseModePayload;
  }

  try {
    const payload = await callTelegramApi<{ message_id?: number }>(
      token,
      "sendMessage",
      requestBody
    );

    return messageResult(payload);
  } catch (error) {
    if (parseMode !== "none") {
      const fallback = await sendPlainTextFallback(token, chatId, text).catch((fallbackError) => ({
        ok: false as const,
        error:
          fallbackError instanceof Error ? fallbackError.message : "Telegram fallback send failed"
      }));
      if (fallback.ok) {
        return fallback;
      }
    }

    return { ok: false, error: error instanceof Error ? error.message : "Telegram send failed" };
  }
}

export async function sendTelegramDocument(
  env: Env,
  agentId: string,
  conversationId: string,
  file: OutboundFile,
  options: { caption?: string } = {}
): Promise<PlatformSendResult> {
  const bot = await resolveTelegramBotForAgent(env, agentId);
  if (!bot.token) {
    return { ok: false, error: "Telegram bot token is not configured" };
  }

  const form = createTelegramFileForm({
    chatId: telegramChatId(conversationId),
    fieldName: "document",
    file,
    caption: options.caption
  });

  return callTelegramMultipartApi<{ message_id?: number }>(bot.token, "sendDocument", form).then(
    messageResult,
    sendError
  );
}

export async function sendTelegramPhoto(
  env: Env,
  agentId: string,
  conversationId: string,
  file: OutboundFile,
  options: { caption?: string } = {}
): Promise<PlatformSendResult> {
  const bot = await resolveTelegramBotForAgent(env, agentId);
  if (!bot.token) {
    return { ok: false, error: "Telegram bot token is not configured" };
  }

  const form = createTelegramFileForm({
    chatId: telegramChatId(conversationId),
    fieldName: "photo",
    file,
    caption: options.caption
  });

  return callTelegramMultipartApi<{ message_id?: number }>(bot.token, "sendPhoto", form).then(
    messageResult,
    sendError
  );
}

export async function sendTelegramButtons(
  env: Env,
  agentId: string,
  conversationId: string,
  text: string,
  input: {
    buttons?: OutboundButton[];
    rows?: OutboundButtonRow[];
    layout?: ButtonLayout;
    expiresInSeconds?: number;
  }
): Promise<PlatformSendResult> {
  const bot = await resolveTelegramBotForAgent(env, agentId);
  if (!bot.token) {
    return { ok: false, error: "Telegram bot token is not configured" };
  }
  const token = bot.token;

  const expiresAt = new Date(Date.now() + (input.expiresInSeconds ?? 600) * 1000).toISOString();
  const keyboard = await createTelegramInlineKeyboard(env, {
    agentId,
    conversationId,
    rows: input.rows ?? chunkButtons(input.buttons ?? [], input.layout?.columns ?? 1),
    expiresAt
  });

  const body: Record<string, unknown> = {
    chat_id: telegramChatId(conversationId),
    text,
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: keyboard
    }
  };
  const parseMode = normalizeTelegramParseMode(bot.integration?.config.parseMode);
  const parseModePayload = telegramParseModePayload(parseMode);
  if (parseModePayload) {
    body.parse_mode = parseModePayload;
  }

  return callTelegramApi<{ message_id?: number }>(token, "sendMessage", body).then(
    messageResult,
    async (error) => {
      if (parseMode === "none") {
        return sendError(error);
      }

      return callTelegramApi<{ message_id?: number }>(token, "sendMessage", {
        ...body,
        text: stripTelegramMarkup(text),
        parse_mode: undefined
      }).then(messageResult, sendError);
    }
  );
}

export async function sendTelegramChatAction(
  env: Env,
  agentId: string,
  conversationId: string,
  activity: PlatformActivityType
): Promise<PlatformSendResult> {
  const bot = await resolveTelegramBotForAgent(env, agentId);
  if (!bot.token) {
    return { ok: false, error: "Telegram bot token is not configured" };
  }

  return callTelegramApi<boolean>(bot.token, "sendChatAction", {
    chat_id: telegramChatId(conversationId),
    action: telegramChatAction(activity)
  }).then(() => ({ ok: true }), sendError);
}

function telegramChatAction(activity: PlatformActivityType): string {
  if (activity === "upload_photo") {
    return "upload_photo";
  }
  if (activity === "upload_document") {
    return "upload_document";
  }
  return "typing";
}

function chunkButtons<T>(buttons: T[], columns: number): T[][] {
  const size = Math.min(Math.max(Math.floor(columns), 1), 4);
  const rows: T[][] = [];
  for (let index = 0; index < buttons.length; index += size) {
    rows.push(buttons.slice(index, index + size));
  }
  return rows;
}

export async function answerTelegramCallbackQuery(
  token: string,
  callbackQueryId: string,
  options: { text?: string; showAlert?: boolean } = {}
): Promise<boolean> {
  return callTelegramApi<boolean>(token, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: options.text,
    show_alert: options.showAlert
  });
}

export async function editTelegramMessageReplyMarkup(
  token: string,
  input: {
    chatId?: string | number;
    messageId?: number;
    inlineMessageId?: string;
    replyMarkup?: TelegramInlineKeyboardMarkup;
  }
): Promise<boolean> {
  return callTelegramApi<boolean>(token, "editMessageReplyMarkup", {
    chat_id: input.chatId,
    message_id: input.messageId,
    inline_message_id: input.inlineMessageId,
    reply_markup: input.replyMarkup ?? { inline_keyboard: [] }
  });
}

export async function editTelegramMessageText(
  token: string,
  input: {
    chatId?: string | number;
    messageId?: number;
    inlineMessageId?: string;
    text: string;
    replyMarkup?: TelegramInlineKeyboardMarkup;
  }
): Promise<boolean> {
  return callTelegramApi<boolean>(token, "editMessageText", {
    chat_id: input.chatId,
    message_id: input.messageId,
    inline_message_id: input.inlineMessageId,
    text: input.text,
    reply_markup: input.replyMarkup
  });
}

function createTelegramFileForm(input: {
  chatId: string;
  fieldName: "document" | "photo";
  file: OutboundFile;
  caption?: string;
}): FormData {
  const form = new FormData();
  form.append("chat_id", input.chatId);
  if (input.caption) {
    form.append("caption", input.caption);
  }
  form.append(
    input.fieldName,
    new Blob([input.file.bytes], { type: input.file.mimeType }),
    input.file.fileName
  );
  return form;
}

async function sendPlainTextFallback(
  token: string,
  chatId: string,
  text: string
): Promise<PlatformSendResult> {
  const payload = await callTelegramApi<{ message_id?: number }>(token, "sendMessage", {
    chat_id: chatId,
    text: stripTelegramMarkup(text),
    disable_web_page_preview: true
  });

  return messageResult(payload);
}

function telegramChatId(conversationId: string): string {
  return physicalConversationForPlatform("telegram", conversationId).replace(/^telegram:/, "");
}

function messageResult(payload: { message_id?: number }): PlatformSendResult {
  return {
    ok: true,
    providerMessageId: payload.message_id ? String(payload.message_id) : undefined
  };
}

function sendError(error: unknown): PlatformSendResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Telegram send failed"
  };
}
