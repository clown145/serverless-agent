import { WecomApiClient } from "../../adapters/wecom/api";
import { decryptWecomCallback, verifyWecomUrl } from "../../adapters/wecom/crypto";
import { resolveWecomForWebhook } from "../../adapters/wecom/config";
import { normalizeWecomKfMessage } from "../../adapters/wecom/normalize";
import { parseSimpleXml } from "../../adapters/wecom/xml";
import { errorResponse } from "../../shared/http";
import { createId } from "../../shared/ids";
import type { Env } from "../../shared/types/env";
import type { QueueMessageBody } from "../../shared/types/queue";
import { nowIso } from "../../shared/time";

export async function handleWecomWebhook(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  webhookSecret: string
): Promise<Response> {
  const config = await resolveWecomForWebhook(env, webhookSecret);
  if (!config) {
    return errorResponse(401, "invalid_wecom_webhook_secret", "Invalid WeCom webhook secret");
  }

  if (!config.corpId || !config.secret || !config.token || !config.encodingAesKey) {
    return errorResponse(400, "wecom_config_incomplete", "WeCom webhook config is incomplete");
  }

  const url = new URL(request.url);
  const msgSignature = url.searchParams.get("msg_signature") ?? "";
  const timestamp = url.searchParams.get("timestamp") ?? "";
  const nonce = url.searchParams.get("nonce") ?? "";

  if (request.method === "GET") {
    const echoStr = url.searchParams.get("echostr") ?? "";
    try {
      const echo = await verifyWecomUrl({
        token: config.token,
        encodingAesKey: config.encodingAesKey,
        corpId: config.corpId,
        msgSignature,
        timestamp,
        nonce,
        echoStr
      });
      return new Response(echo, {
        headers: { "content-type": "text/plain; charset=utf-8" }
      });
    } catch (error) {
      return errorResponse(
        401,
        "wecom_verify_failed",
        error instanceof Error ? error.message : "WeCom URL verification failed"
      );
    }
  }

  if (request.method !== "POST") {
    return errorResponse(405, "method_not_allowed", "Method not allowed");
  }

  try {
    const decryptedXml = await decryptWecomCallback({
      token: config.token,
      encodingAesKey: config.encodingAesKey,
      corpId: config.corpId,
      msgSignature,
      timestamp,
      nonce,
      body: await request.text()
    });
    const callback = parseSimpleXml(decryptedXml);
    const event = callback.Event;
    if (event !== "kf_msg_or_event") {
      return new Response("success", { headers: { "content-type": "text/plain" } });
    }

    const openKfId = callback.OpenKfId ?? config.openKfId;
    if (!openKfId) {
      return new Response("success", { headers: { "content-type": "text/plain" } });
    }

    const token = callback.Token;
    ctx.waitUntil(syncAndDispatchKfMessages(env, config, openKfId, token));
    return new Response("success", { headers: { "content-type": "text/plain" } });
  } catch (error) {
    return errorResponse(
      400,
      "wecom_callback_failed",
      error instanceof Error ? error.message : "WeCom callback failed"
    );
  }
}

async function syncAndDispatchKfMessages(
  env: Env,
  config: NonNullable<Awaited<ReturnType<typeof resolveWecomForWebhook>>>,
  openKfId: string,
  token?: string
): Promise<void> {
  if (!config.corpId || !config.secret) {
    return;
  }

  const client = new WecomApiClient({
    corpId: config.corpId,
    secret: config.secret,
    apiBaseUrl: config.apiBaseUrl
  });
  const latest = await syncLatestKfMessage(client, openKfId, token);
  if (!latest) {
    return;
  }

  const message = normalizeWecomKfMessage(latest, config.agentId);
  if (!message) {
    return;
  }

  const job: QueueMessageBody = {
    type: "inbound.message",
    eventId: createId("evt"),
    agentId: config.agentId,
    message,
    receivedAt: nowIso()
  };
  await env.AGENT_QUEUE.send(job);
}

async function syncLatestKfMessage(
  client: WecomApiClient,
  openKfId: string,
  token?: string
) {
  let cursor = "";
  let latest;
  for (let page = 0; page < 10; page += 1) {
    const response = await client.syncKfMessages({
      token,
      openKfId,
      cursor,
      limit: 1000
    });
    const messages = response.msg_list ?? [];
    if (messages.length > 0) {
      latest = messages[messages.length - 1];
    }
    cursor = response.next_cursor ?? "";
    if (!response.has_more || !cursor) {
      break;
    }
  }
  return latest;
}
