import { QqOfficialApiClient } from "./api";
import { trySendQqOfficialAttachment } from "./attachment-sender";
import { resolveQqOfficialBotByIntegrationId, resolveQqOfficialBotForAgent } from "./config";
import type { QqOfficialConversationRecord } from "../../../storage/repositories/qq-official-conversations-repository";
import {
  getQqOfficialConversationByIntegration,
  getQqOfficialConversationForAgent
} from "../../../storage/repositories/qq-official-conversations-repository";
import type { Env } from "../../../shared/types/env";
import type { OutboundFile } from "../../../platforms/outbound/types";

export type QqOfficialDirectSendRequest = {
  conversationId: string;
  text?: string;
  file?: OutboundFile;
  replyToMessageId?: string;
  integrationId?: string;
};

export type QqOfficialDirectSendResponse = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
};

export async function sendQqOfficialDirect(
  env: Env,
  agentId: string,
  input: QqOfficialDirectSendRequest
): Promise<QqOfficialDirectSendResponse> {
  if (!input.conversationId || (!input.text && !input.file)) {
    return { ok: false, error: "conversationId and text or file are required" };
  }

  const conversation = await findConversation(env, agentId, input);
  if (!conversation) {
    return {
      ok: false,
      error: "QQ official conversation is unknown until the bot receives a webhook message from it"
    };
  }

  const config =
    (await resolveQqOfficialBotByIntegrationId(env, conversation.integrationId)) ??
    (await resolveQqOfficialBotForAgent(env, agentId));
  if (!config.appId || !config.secret) {
    return { ok: false, error: "QQ official appId/secret is not configured" };
  }

  const api = new QqOfficialApiClient({
    appId: config.appId,
    secret: config.secret,
    isSandbox: config.isSandbox
  });
  const common = {
    content: input.text,
    msgId: input.replyToMessageId ?? conversation.lastMessageId,
    eventId: conversation.lastEventId
  };

  if (conversation.targetKind === "group") {
    if (!input.file) {
      const response = await api.sendGroupText({
        groupOpenId: conversation.targetId,
        content: input.text ?? "",
        msgId: common.msgId,
        eventId: common.eventId
      });
      return { ok: true, providerMessageId: response.id };
    }

    const result = await trySendQqOfficialAttachment(api, {
      target: { kind: "group", groupOpenId: conversation.targetId },
      file: input.file,
      ...common
    });
    return sendResult(result);
  }

  if (conversation.targetKind === "c2c") {
    if (!input.file) {
      const response = await api.sendC2cText({
        openId: conversation.targetId,
        content: input.text ?? "",
        msgId: common.msgId,
        eventId: common.eventId
      });
      return { ok: true, providerMessageId: response.id };
    }

    const result = await trySendQqOfficialAttachment(api, {
      target: { kind: "c2c", openId: conversation.targetId },
      file: input.file,
      ...common
    });
    return sendResult(result);
  }

  if (conversation.targetKind === "direct") {
    if (input.file) {
      const result = await trySendQqOfficialAttachment(api, {
        target: { kind: "direct", guildId: conversation.targetId },
        file: input.file,
        ...common
      });
      return sendResult(result);
    }

    const response = await api.sendDirectText({
      guildId: conversation.targetId,
      content: input.text ?? "",
      msgId: common.msgId,
      eventId: common.eventId
    });
    return { ok: true, providerMessageId: response.id };
  }

  if (input.file) {
    const result = await trySendQqOfficialAttachment(api, {
      target: { kind: "channel", channelId: conversation.targetId },
      file: input.file,
      ...common
    });
    return sendResult(result);
  }

  const response = await api.sendChannelText({
    channelId: conversation.targetId,
    content: input.text ?? "",
    msgId: common.msgId,
    eventId: common.eventId
  });
  return { ok: true, providerMessageId: response.id };
}

async function findConversation(
  env: Env,
  agentId: string,
  input: QqOfficialDirectSendRequest
): Promise<QqOfficialConversationRecord | undefined> {
  if (input.integrationId) {
    return getQqOfficialConversationByIntegration(env.AGENT_DB, {
      integrationId: input.integrationId,
      conversationId: input.conversationId
    });
  }

  return getQqOfficialConversationForAgent(env.AGENT_DB, {
    agentId,
    conversationId: input.conversationId
  });
}

function sendResult(
  result: Awaited<ReturnType<typeof trySendQqOfficialAttachment>>
): QqOfficialDirectSendResponse {
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, providerMessageId: result.response.id };
}
