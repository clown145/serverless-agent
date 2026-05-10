import type { Env } from "../../shared/types/env";
import { callTelegramApi } from "./api";
import { resolveTelegramBotForAgent } from "./config";
import {
  normalizeTelegramParseMode,
  stripTelegramMarkup,
  telegramParseModePayload
} from "./formatting";
import { physicalConversationForPlatform } from "../../conversations/ids";

export type PlatformSendResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

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

  const chatId = physicalConversationForPlatform("telegram", conversationId).replace(/^telegram:/, "");
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
      bot.token,
      "sendMessage",
      requestBody
    );

    return {
      ok: true,
      providerMessageId: payload.message_id ? String(payload.message_id) : undefined
    };
  } catch (error) {
    if (parseMode !== "none") {
      const fallback = await sendPlainTextFallback(bot.token, chatId, text).catch(
        (fallbackError) => ({
          ok: false as const,
          error: fallbackError instanceof Error
            ? fallbackError.message
            : "Telegram fallback send failed"
        })
      );
      if (fallback.ok) {
        return fallback;
      }
    }

    return { ok: false, error: error instanceof Error ? error.message : "Telegram send failed" };
  }
}

async function sendPlainTextFallback(
  token: string,
  chatId: string,
  text: string
): Promise<PlatformSendResult> {
  const payload = await callTelegramApi<{ message_id?: number }>(
    token,
    "sendMessage",
    {
      chat_id: chatId,
      text: stripTelegramMarkup(text),
      disable_web_page_preview: true
    }
  );

  return {
    ok: true,
    providerMessageId: payload.message_id ? String(payload.message_id) : undefined
  };
}
