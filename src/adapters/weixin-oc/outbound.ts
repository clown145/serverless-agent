import { physicalConversationForPlatform } from "../../conversations/ids";
import type {
  PlatformOutboundAdapter,
  PlatformSendResult
} from "../../platforms/outbound/types";
import type { Env } from "../../shared/types/env";
import { fetchWeixinOcGateway } from "./gateway-object";
import { parseWeixinOcConversationId } from "./normalize";

export function createWeixinOcOutboundAdapter(env: Env): PlatformOutboundAdapter {
  return {
    platform: "weixin_oc",
    sendText: (input) =>
      sendWeixinOcText(env, input.agentId, input.conversationId, input.text),
    sendActivity: (input) =>
      sendWeixinOcActivity(env, input.agentId, input.conversationId)
  };
}

export async function sendWeixinOcText(
  env: Env,
  agentId: string,
  conversationId: string,
  text: string
): Promise<PlatformSendResult> {
  const target = parseWeixinOcConversationId(
    physicalConversationForPlatform("weixin_oc", conversationId)
  );
  if (!target) {
    return { ok: false, error: "Conversation is not a Weixin OC conversation" };
  }

  return sendViaGateway(env, agentId, {
    userId: target.userId,
    text
  });
}

export async function sendWeixinOcActivity(
  env: Env,
  agentId: string,
  conversationId: string
): Promise<PlatformSendResult> {
  const target = parseWeixinOcConversationId(
    physicalConversationForPlatform("weixin_oc", conversationId)
  );
  if (!target) {
    return { ok: false, error: "Conversation is not a Weixin OC conversation" };
  }

  const response = await fetchWeixinOcGateway(env, agentId, "/typing", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: target.userId })
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: { message?: string } };
    return {
      ok: false,
      error: payload.error?.message ?? `Weixin OC typing failed ${response.status}`
    };
  }
  return { ok: true };
}

async function sendViaGateway(
  env: Env,
  agentId: string,
  body: { userId: string; text: string }
): Promise<PlatformSendResult> {
  const response = await fetchWeixinOcGateway(env, agentId, "/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = (await response.json().catch(() => undefined)) as
    | {
        result?: PlatformSendResult;
        error?: { message?: string };
      }
    | undefined;

  if (!response.ok) {
    return {
      ok: false,
      error: payload?.error?.message ?? `Weixin OC send failed ${response.status}`
    };
  }

  return payload?.result ?? { ok: false, error: "Weixin OC send returned no result" };
}

