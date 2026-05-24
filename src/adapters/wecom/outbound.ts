import { physicalConversationForPlatform } from "../../conversations/ids";
import type { PlatformOutboundAdapter, PlatformSendResult } from "../../platforms/outbound/types";
import type { Env } from "../../shared/types/env";
import { WecomApiClient } from "./api";
import { resolveWecomForAgent } from "./config";

export function createWecomOutboundAdapter(env: Env): PlatformOutboundAdapter {
  return {
    platform: "wecom",
    sendText: (input) => sendWecomKfText(env, input.agentId, input.conversationId, input.text)
  };
}

export async function sendWecomKfText(
  env: Env,
  agentId: string,
  conversationId: string,
  text: string
): Promise<PlatformSendResult> {
  const config = await resolveWecomForAgent(env, agentId);
  if (!config?.corpId || !config.secret) {
    return { ok: false, error: "WeCom corp id or secret is not configured" };
  }

  const target = parseWecomKfConversation(conversationId);
  if (!target) {
    return { ok: false, error: "Conversation is not a WeCom customer service conversation" };
  }

  const client = new WecomApiClient({
    corpId: config.corpId,
    secret: config.secret,
    apiBaseUrl: config.apiBaseUrl
  });

  try {
    const payload = await client.sendKfText({
      toUser: target.externalUserId,
      openKfId: target.openKfId,
      content: text
    });
    return { ok: true, providerMessageId: payload.msgid };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "WeCom text send failed"
    };
  }
}

export function parseWecomKfConversation(
  conversationId: string
): { openKfId: string; externalUserId: string } | undefined {
  const physical = physicalConversationForPlatform("wecom", conversationId);
  const match = physical.match(/^wecom:kf:([^:]+):(.+)$/);
  if (!match) {
    return undefined;
  }
  return {
    openKfId: match[1],
    externalUserId: match[2]
  };
}
