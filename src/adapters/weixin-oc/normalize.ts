import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import type { InternalMessage, MessageAttachment } from "../../shared/types/internal-message";
import type {
  WeixinOcInboundMessage,
  WeixinOcMediaRef,
  WeixinOcMessageItem,
  WeixinOcTextItem
} from "./types";

export function weixinOcConversationId(userId: string): string {
  return `weixin_oc:${userId}`;
}

export function parseWeixinOcConversationId(
  conversationId: string
): { userId: string } | undefined {
  const match = conversationId.match(/^weixin_oc:(.+)$/);
  return match ? { userId: match[1] } : undefined;
}

export function normalizeWeixinOcInboundMessage(
  message: WeixinOcInboundMessage,
  agentId: string
): InternalMessage | undefined {
  const fromUserId = message.from_user_id?.trim();
  if (!fromUserId) {
    return undefined;
  }

  const text = textFromWeixinOcItems(message.item_list);
  const attachments = attachmentsFromWeixinOcItems(message.item_list);
  if (!text && attachments.length === 0) {
    return undefined;
  }

  return {
    id: createId("msg"),
    platform: "weixin_oc",
    platformMessageId: message.message_id ?? message.msg_id ?? createId("wxoc_msg"),
    agentId,
    conversationId: weixinOcConversationId(fromUserId),
    sender: {
      platformUserId: fromUserId,
      displayName: fromUserId,
      role: "member"
    },
    kind: text.startsWith("/") ? "command" : attachments.length ? "attachment" : "text",
    text: text || undefined,
    attachments,
    rawRef: `weixin_oc:${message.message_id ?? message.msg_id ?? "unknown"}`,
    receivedAt: receivedAtIso(message)
  };
}

export function attachmentsFromWeixinOcItems(
  items: WeixinOcMessageItem[] | undefined
): MessageAttachment[] {
  const attachments: MessageAttachment[] = [];
  for (const [index, item] of (items ?? []).entries()) {
    if (Number(item.type ?? 0) !== 2 || !item.image_item?.media) {
      continue;
    }

    attachments.push({
      id: `wxoc_image_${item.msg_id ?? index}`,
      type: "image",
      name: `weixin-oc-image-${item.msg_id ?? index}.jpg`,
      mimeType: "image/jpeg",
      size: item.image_item.mid_size || item.image_item.hd_size || undefined,
      sourceUrl: encodeWeixinOcCdnSource({
        media: item.image_item.media,
        aeskey: item.image_item.aeskey
      })
    });
  }
  return attachments;
}

export function buildWeixinOcTextItem(text: string): WeixinOcTextItem {
  return {
    type: 1,
    text_item: { text }
  };
}

export function textFromWeixinOcItems(items: WeixinOcMessageItem[] | undefined): string {
  const parts: string[] = [];
  for (const item of items ?? []) {
    const itemType = Number(item.type ?? 0);
    if (itemType === 1) {
      const text = item.text_item?.text?.trim();
      if (text) {
        parts.push(text);
      }
      continue;
    }
    if (itemType === 2) {
      parts.push("[image]");
      continue;
    }
    if (itemType === 3) {
      parts.push(item.voice_item?.text?.trim() || "[voice]");
      continue;
    }
    if (itemType === 4) {
      parts.push("[file]");
      continue;
    }
    if (itemType === 5) {
      parts.push("[video]");
    }
  }
  return parts.join("\n").trim();
}

function receivedAtIso(message: WeixinOcInboundMessage): string {
  const raw = message.create_time_ms ?? message.create_time;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return nowIso();
  }

  const timestampMs = raw > 1_000_000_000_000 ? raw : raw * 1000;
  return new Date(timestampMs).toISOString();
}

function encodeWeixinOcCdnSource(input: { media: WeixinOcMediaRef; aeskey?: string }): string {
  return `weixin-oc:cdn:${btoa(JSON.stringify(input))}`;
}
