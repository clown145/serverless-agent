import { resolveQqBotForWebhook } from "../../adapters/qq/config";
import { normalizeQqPayload } from "../../adapters/qq/normalize";
import { createQqValidationResponse } from "../../adapters/qq/verify";
import { errorResponse, jsonResponse } from "../../shared/http";
import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import type { Env } from "../../shared/types/env";
import type { QueueMessageBody } from "../../shared/types/queue";
import type { QqPayload, QqValidationRequest } from "../../adapters/qq/types";

export async function handleQqWebhook(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const payload = await request.json().catch(() => undefined) as QqPayload | undefined;
  if (!payload) {
    return errorResponse(400, "invalid_payload", "Invalid QQ webhook payload");
  }

  const bot = await resolveQqBotForWebhook(env, {
    appId: request.headers.get("x-bot-appid") ?? undefined,
    webhookSecret: request.headers.get("x-serverless-agent-secret") ?? undefined
  });
  if (!bot?.credential) {
    return errorResponse(401, "qq_integration_not_found", "QQ integration not found");
  }

  if (payload.op === 13) {
    return jsonResponse(await createQqValidationResponse(
      payload.d as QqValidationRequest,
      bot.credential.appSecret
    ));
  }

  const message = normalizeQqPayload(payload, bot.agentId);
  if (!message) {
    return jsonResponse({ ok: true, ignored: true });
  }

  const job: QueueMessageBody = {
    type: "inbound.message",
    eventId: payload.id ?? createId("evt"),
    agentId: bot.agentId,
    message,
    receivedAt: nowIso()
  };

  await env.AGENT_QUEUE.send(job);
  return jsonResponse({ ok: true, eventId: job.eventId });
}
