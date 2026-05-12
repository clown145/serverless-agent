import { normalizeTelegramUpdate } from "../../adapters/telegram/normalize";
import { resolveTelegramBotForWebhook } from "../../adapters/telegram/config";
import { handleTelegramCallbackQuery } from "../../adapters/telegram/callbacks/handler";
import type { TelegramUpdate } from "../../adapters/telegram/types";
import { errorResponse, jsonResponse } from "../../shared/http";
import { createId } from "../../shared/ids";
import type { Env } from "../../shared/types/env";
import type { QueueMessageBody } from "../../shared/types/queue";
import { nowIso } from "../../shared/time";

export async function handleTelegramWebhook(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  const bot = await resolveTelegramBotForWebhook(env, secret ?? undefined);
  if (!bot) {
    return errorResponse(401, "invalid_webhook_secret", "Invalid Telegram secret");
  }

  const payload = await request.json();
  const agentId = bot.agentId;
  const callbackQuery = (payload as TelegramUpdate).callback_query;
  if (callbackQuery) {
    const result = await handleTelegramCallbackQuery(
      env,
      {
        agentId,
        query: callbackQuery
      },
      bot.token
    );
    return jsonResponse({ ok: true, result });
  }

  const message = normalizeTelegramUpdate(payload, agentId);

  if (!message) {
    return jsonResponse({ ok: true, ignored: true });
  }

  const job: QueueMessageBody = {
    type: "inbound.message",
    eventId: createId("evt"),
    agentId,
    message,
    receivedAt: nowIso()
  };

  await env.AGENT_QUEUE.send(job);
  return jsonResponse({ ok: true, eventId: job.eventId });
}
