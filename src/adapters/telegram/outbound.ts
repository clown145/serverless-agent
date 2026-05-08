import type { Env } from "../../shared/types/env";
import { callTelegramApi } from "./api";
import { resolveTelegramBotForAgent } from "./config";

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

  const chatId = conversationId.replace(/^telegram:/, "");
  try {
    const payload = await callTelegramApi<{ message_id?: number }>(
      bot.token,
      "sendMessage",
      {
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      }
    );

    return {
      ok: true,
      providerMessageId: payload.message_id ? String(payload.message_id) : undefined
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Telegram send failed" };
  }
}
