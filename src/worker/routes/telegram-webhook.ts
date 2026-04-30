import { normalizeTelegramUpdate } from "../../adapters/telegram/normalize";
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
  if (env.TELEGRAM_WEBHOOK_SECRET && secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return errorResponse(401, "invalid_webhook_secret", "Invalid Telegram secret");
  }

  const payload = await request.json();
  const agentId = env.DEFAULT_AGENT_ID ?? "default";
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
