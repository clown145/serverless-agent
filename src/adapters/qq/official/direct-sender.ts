import { QqOfficialApiClient } from "./api";
import { resolveQqOfficialBotByIntegrationId, resolveQqOfficialBotForAgent } from "./config";
import { qqOfficialFileDataBase64, qqOfficialFileType } from "./media";
import type { QqOfficialConversationRecord } from "../../../storage/repositories/qq-official-conversations-repository";
import {
  getQqOfficialConversationByIntegration,
  getQqOfficialConversationForAgent
} from "../../../storage/repositories/qq-official-conversations-repository";
import type { Env } from "../../../shared/types/env";
import type { OutboundFile } from "../../../platforms/outbound/types";
import type { QqOfficialMedia } from "./types";

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

    const media = await uploadGroupFile(api, conversation.targetId, input.file);
    const response = await api.sendGroupMessage({
      groupOpenId: conversation.targetId,
      ...common,
      media,
      msgType: 7
    });
    return { ok: true, providerMessageId: response.id };
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

    const media = await uploadC2cFile(api, conversation.targetId, input.file);
    const response = await api.sendC2cMessage({
      openId: conversation.targetId,
      ...common,
      media,
      msgType: 7
    });
    return { ok: true, providerMessageId: response.id };
  }

  if (input.file) {
    return {
      ok: false,
      error: "QQ official file upload is currently supported for group and C2C conversations only"
    };
  }

  if (conversation.targetKind === "direct") {
    const response = await api.sendDirectText({
      guildId: conversation.targetId,
      content: input.text ?? "",
      msgId: common.msgId,
      eventId: common.eventId
    });
    return { ok: true, providerMessageId: response.id };
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

async function uploadGroupFile(
  api: QqOfficialApiClient,
  groupOpenId: string,
  file: OutboundFile
): Promise<QqOfficialMedia> {
  return api.uploadGroupFile({
    groupOpenId,
    fileDataBase64: qqOfficialFileDataBase64(file),
    fileType: qqOfficialFileType(file)
  });
}

async function uploadC2cFile(
  api: QqOfficialApiClient,
  openId: string,
  file: OutboundFile
): Promise<QqOfficialMedia> {
  return api.uploadC2cFile({
    openId,
    fileDataBase64: qqOfficialFileDataBase64(file),
    fileType: qqOfficialFileType(file)
  });
}
