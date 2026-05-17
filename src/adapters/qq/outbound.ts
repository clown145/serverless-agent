import type {
  PlatformOutboundAdapter,
  PlatformSendResult
} from "../../platforms/outbound/types";
import type { Env } from "../../shared/types/env";
import { callQqApi, getQqAccessToken } from "./api";
import { resolveQqBotForAgent } from "./config";
import type { QqSendMessageResponse } from "./types";

export function createQqOutboundAdapter(env: Env): PlatformOutboundAdapter {
  return {
    platform: "qq",
    sendText: (input) =>
      sendQqText(env, input.agentId, input.conversationId, input.text)
  };
}

export async function sendQqText(
  env: Env,
  agentId: string,
  conversationId: string,
  text: string
): Promise<PlatformSendResult> {
  const bot = await resolveQqBotForAgent(env, agentId);
  if (!bot?.credential) {
    return { ok: false, error: "QQ bot credential is not configured" };
  }

  const target = qqMessageTarget(conversationId);
  if (!target) {
    return { ok: false, error: `Unsupported QQ conversation: ${conversationId}` };
  }

  try {
    const accessToken = await getQqAccessToken(env, {
      integrationId: bot.integration.id,
      credential: bot.credential
    });
    const payload = await callQqApi<QqSendMessageResponse>({
      accessToken,
      environment: bot.environment,
      path: target.path,
      body: {
        content: text,
        msg_type: 0
      }
    });

    return {
      ok: true,
      providerMessageId: payload.id
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "QQ send failed"
    };
  }
}

export function qqMessageTarget(conversationId: string): { path: string } | undefined {
  const match = conversationId.match(/^qq:(c2c|group|channel|dm):(.+)$/);
  if (!match) {
    return undefined;
  }
  const [, kind, id] = match;
  const encoded = encodeURIComponent(id);
  if (kind === "c2c") {
    return { path: `/v2/users/${encoded}/messages` };
  }
  if (kind === "group") {
    return { path: `/v2/groups/${encoded}/messages` };
  }
  if (kind === "channel") {
    return { path: `/channels/${encoded}/messages` };
  }
  if (kind === "dm") {
    return { path: `/dms/${encoded}/messages` };
  }
  return undefined;
}
