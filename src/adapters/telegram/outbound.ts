import type { Env } from "../../shared/types/env";

export type PlatformSendResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

export async function sendTelegramText(
  env: Env,
  conversationId: string,
  text: string
): Promise<PlatformSendResult> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" };
  }

  const chatId = conversationId.replace(/^telegram:/, "");
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true
      })
    }
  );

  const payload = (await response.json().catch(() => undefined)) as
    | { result?: { message_id?: number }; description?: string }
    | undefined;

  if (!response.ok) {
    return {
      ok: false,
      error: payload?.description ?? `Telegram API error ${response.status}`
    };
  }

  return {
    ok: true,
    providerMessageId: payload?.result?.message_id
      ? String(payload.result.message_id)
      : undefined
  };
}
