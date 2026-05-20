import { createId } from "../../../shared/ids";
import type {
  InternalMessage,
  MessageAttachment
} from "../../../shared/types/internal-message";
import { nowIso } from "../../../shared/time";
import type {
  QqOfficialAttachment,
  QqOfficialEventType,
  QqOfficialMessagePayload
} from "./types";

export type QqOfficialNormalizedEvent = {
  message?: InternalMessage;
  conversationBinding?: QqOfficialConversationBinding;
};

export type QqOfficialConversationBinding = {
  conversationId: string;
  targetKind: "group" | "c2c" | "channel" | "direct";
  targetId: string;
  lastMessageId?: string;
  lastEventId?: string;
};

export function normalizeQqOfficialGatewayEvent(
  eventType: QqOfficialEventType,
  payload: QqOfficialMessagePayload,
  agentId: string
): QqOfficialNormalizedEvent {
  const text = stripBotMention(payload.content ?? "", payload.mentions);
  const attachments = extractAttachments(payload.attachments);
  if (!text && attachments.length === 0) {
    return {};
  }

  const binding = conversationBinding(eventType, payload);
  if (!binding) {
    return {};
  }

  const senderId = senderPlatformId(eventType, payload);
  const senderName = payload.author?.username;
  const receivedAt = payload.timestamp
    ? new Date(payload.timestamp).toISOString()
    : nowIso();

  return {
    conversationBinding: {
      ...binding,
      lastMessageId: payload.id,
      lastEventId: payload.event_id
    },
    message: {
      id: createId("msg"),
      platform: "qq",
      platformMessageId: payload.id,
      agentId,
      conversationId: binding.conversationId,
      sender: {
        platformUserId: senderId,
        displayName: senderName,
        role: "unknown"
      },
      kind: text.startsWith("/") ? "command" : attachments.length ? "attachment" : "text",
      text: text || undefined,
      attachments,
      rawRef: `qq:${eventType}:${payload.id}`,
      receivedAt
    }
  };
}

export function qqOfficialConversationId(
  kind: QqOfficialConversationBinding["targetKind"],
  targetId: string
): string {
  return `qq:${kind}:${targetId}`;
}

function conversationBinding(
  eventType: QqOfficialEventType,
  payload: QqOfficialMessagePayload
): Omit<QqOfficialConversationBinding, "lastMessageId" | "lastEventId"> | undefined {
  if (eventType === "GROUP_AT_MESSAGE_CREATE" && payload.group_openid) {
    return {
      conversationId: qqOfficialConversationId("group", payload.group_openid),
      targetKind: "group",
      targetId: payload.group_openid
    };
  }

  if (eventType === "C2C_MESSAGE_CREATE" && payload.author?.user_openid) {
    return {
      conversationId: qqOfficialConversationId("c2c", payload.author.user_openid),
      targetKind: "c2c",
      targetId: payload.author.user_openid
    };
  }

  if (eventType === "DIRECT_MESSAGE_CREATE" && payload.guild_id) {
    return {
      conversationId: qqOfficialConversationId("direct", payload.guild_id),
      targetKind: "direct",
      targetId: payload.guild_id
    };
  }

  if (eventType === "AT_MESSAGE_CREATE" && payload.channel_id) {
    return {
      conversationId: qqOfficialConversationId("channel", payload.channel_id),
      targetKind: "channel",
      targetId: payload.channel_id
    };
  }

  return undefined;
}

function senderPlatformId(
  eventType: QqOfficialEventType,
  payload: QqOfficialMessagePayload
): string {
  if (eventType === "GROUP_AT_MESSAGE_CREATE") {
    return payload.author?.member_openid ?? "unknown";
  }

  if (eventType === "C2C_MESSAGE_CREATE") {
    return payload.author?.user_openid ?? "unknown";
  }

  return payload.author?.id ?? "unknown";
}

function stripBotMention(
  content: string,
  mentions: QqOfficialMessagePayload["mentions"]
): string {
  let normalized = content.trim();
  for (const mention of mentions ?? []) {
    if (!mention.id) {
      continue;
    }
    normalized = normalized.replace(new RegExp(`<@!?${escapeRegExp(mention.id)}>`, "g"), "");
  }
  return normalized.trim();
}

function extractAttachments(
  attachments: QqOfficialAttachment[] | undefined
): MessageAttachment[] {
  const normalized: MessageAttachment[] = [];

  for (const [index, attachment] of (attachments ?? []).entries()) {
    const sourceUrl = normalizeAttachmentUrl(attachment.url);
    if (!sourceUrl) {
      continue;
    }

    const mimeType = attachment.content_type;
    const type = mimeType?.startsWith("image/")
      ? "image"
      : mimeType?.startsWith("audio/")
        ? "audio"
        : mimeType?.startsWith("video/")
          ? "video"
          : "file";

    normalized.push({
      id: attachment.id ?? `qq_attachment_${index}`,
      type,
      name: attachment.filename,
      mimeType,
      size: attachment.size,
      sourceUrl
    });
  }

  return normalized;
}

function normalizeAttachmentUrl(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  return url.startsWith("http://") || url.startsWith("https://")
    ? url
    : `https://${url}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
