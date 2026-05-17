import { createId } from "../../shared/ids";
import type { InternalMessage, MessageAttachment } from "../../shared/types/internal-message";
import { nowIso } from "../../shared/time";
import type {
  QqAttachment,
  QqC2cMessage,
  QqGroupAtMessage,
  QqGuildMessage,
  QqPayload
} from "./types";

export function normalizeQqPayload(
  payload: unknown,
  agentId: string
): InternalMessage | undefined {
  const event = payload as QqPayload;
  if (event.op !== 0 || !event.t || !event.d) {
    return undefined;
  }

  if (event.t === "C2C_MESSAGE_CREATE") {
    return normalizeC2c(event, agentId);
  }
  if (event.t === "GROUP_AT_MESSAGE_CREATE") {
    return normalizeGroupAt(event, agentId);
  }
  if (event.t === "AT_MESSAGE_CREATE") {
    return normalizeChannelAt(event, agentId);
  }
  if (event.t === "DIRECT_MESSAGE_CREATE") {
    return normalizeDirectMessage(event, agentId);
  }

  return undefined;
}

function normalizeC2c(event: QqPayload, agentId: string): InternalMessage | undefined {
  const message = event.d as QqC2cMessage;
  const userOpenId = message.author?.user_openid;
  if (!userOpenId) {
    return undefined;
  }

  return createMessage({
    agentId,
    event,
    platformMessageId: message.id,
    conversationId: `qq:c2c:${userOpenId}`,
    senderId: userOpenId,
    text: message.content,
    timestamp: message.timestamp,
    attachments: message.attachments
  });
}

function normalizeGroupAt(event: QqPayload, agentId: string): InternalMessage | undefined {
  const message = event.d as QqGroupAtMessage;
  if (!message.group_openid || !message.author?.member_openid) {
    return undefined;
  }

  return createMessage({
    agentId,
    event,
    platformMessageId: message.id,
    conversationId: `qq:group:${message.group_openid}`,
    senderId: message.author.member_openid,
    text: trimBotMentionPadding(message.content),
    timestamp: message.timestamp,
    attachments: message.attachments
  });
}

function normalizeChannelAt(event: QqPayload, agentId: string): InternalMessage | undefined {
  const message = event.d as QqGuildMessage;
  if (!message.channel_id || !message.author?.id) {
    return undefined;
  }

  return createMessage({
    agentId,
    event,
    platformMessageId: message.id,
    conversationId: `qq:channel:${message.channel_id}`,
    senderId: message.author.id,
    displayName: message.author.username,
    text: trimBotMentionPadding(message.content),
    timestamp: message.timestamp,
    attachments: message.attachments
  });
}

function normalizeDirectMessage(event: QqPayload, agentId: string): InternalMessage | undefined {
  const message = event.d as QqGuildMessage;
  if (!message.guild_id || !message.author?.id) {
    return undefined;
  }

  return createMessage({
    agentId,
    event,
    platformMessageId: message.id,
    conversationId: `qq:dm:${message.guild_id}`,
    senderId: message.author.id,
    displayName: message.author.username,
    text: message.content,
    timestamp: message.timestamp,
    attachments: message.attachments
  });
}

function createMessage(input: {
  agentId: string;
  event: QqPayload;
  platformMessageId: string;
  conversationId: string;
  senderId: string;
  displayName?: string;
  text?: string;
  timestamp?: string;
  attachments?: QqAttachment[];
}): InternalMessage | undefined {
  const text = input.text?.trim() ?? "";
  const attachments = normalizeAttachments(input.attachments);
  if (!text && attachments.length === 0) {
    return undefined;
  }

  return {
    id: createId("msg"),
    platform: "qq",
    platformMessageId: input.platformMessageId,
    agentId: input.agentId,
    conversationId: input.conversationId,
    sender: {
      platformUserId: input.senderId,
      displayName: input.displayName,
      role: "unknown"
    },
    kind: text.startsWith("/") ? "command" : attachments.length ? "attachment" : "text",
    text: text || undefined,
    attachments,
    rawRef: input.event.id ? `qq:event:${input.event.id}` : undefined,
    receivedAt: input.timestamp ?? nowIso()
  };
}

function normalizeAttachments(attachments: QqAttachment[] | undefined): MessageAttachment[] {
  return (attachments ?? []).flatMap((attachment, index) => {
    const sourceUrl = attachment.voice_wav_url ?? attachment.url;
    if (!sourceUrl) {
      return [];
    }
    const mimeType = attachment.content_type;
    return [{
      id: `qq_${index}_${hashAttachmentId(sourceUrl)}`,
      type: attachmentType(mimeType),
      name: attachment.filename,
      mimeType,
      size: attachment.size,
      sourceUrl,
      captionText: attachment.asr_refer_text
    }];
  });
}

function attachmentType(mimeType: string | undefined): MessageAttachment["type"] {
  if (!mimeType) {
    return "unknown";
  }
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("audio/") || mimeType.includes("voice")) {
    return "audio";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  return "file";
}

function trimBotMentionPadding(text: string | undefined): string | undefined {
  return text?.trimStart();
}

function hashAttachmentId(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}
