import { createId } from "../../shared/ids";
import type { InternalMessage, MessageAttachment } from "../../shared/types/internal-message";
import type { TelegramMessage, TelegramUpdate } from "./types";

export function normalizeTelegramUpdate(
  payload: unknown,
  agentId: string
): InternalMessage | undefined {
  const update = payload as TelegramUpdate;
  const message = update.message ?? update.edited_message;

  if (!message) {
    return undefined;
  }

  const text = message.text ?? message.caption ?? "";
  const attachments = extractTelegramAttachments(message);
  if (!text && attachments.length === 0) {
    return undefined;
  }

  return normalizeTelegramMessage(update.update_id, message, agentId, text, attachments);
}

function normalizeTelegramMessage(
  updateId: number,
  message: TelegramMessage,
  agentId: string,
  text: string,
  attachments: MessageAttachment[]
): InternalMessage {
  const senderName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ");

  return {
    id: createId("msg"),
    platform: "telegram",
    platformMessageId: String(message.message_id),
    agentId,
    conversationId: `telegram:${message.chat.id}`,
    sender: {
      platformUserId: String(message.from?.id ?? "unknown"),
      displayName: senderName || message.from?.username,
      role: "unknown"
    },
    kind: text.startsWith("/") ? "command" : attachments.length ? "attachment" : "text",
    text: text || undefined,
    attachments,
    rawRef: `telegram:update:${updateId}`,
    receivedAt: new Date(message.date * 1000).toISOString()
  };
}

function extractTelegramAttachments(message: TelegramMessage): MessageAttachment[] {
  const attachments: MessageAttachment[] = [];
  const photo = [...(message.photo ?? [])].sort(
    (left, right) => (right.file_size ?? 0) - (left.file_size ?? 0)
  )[0];
  if (photo) {
    attachments.push({
      id: `tg_${photo.file_id}`,
      type: "image",
      name: `telegram-photo-${photo.file_unique_id ?? photo.file_id}.jpg`,
      mimeType: "image/jpeg",
      size: photo.file_size,
      sourceUrl: `telegram:file:${photo.file_id}`
    });
  }

  if (message.document) {
    const isImage = message.document.mime_type?.startsWith("image/") ?? false;
    attachments.push({
      id: `tg_${message.document.file_id}`,
      type: isImage ? "image" : "file",
      name: message.document.file_name,
      mimeType: message.document.mime_type,
      size: message.document.file_size,
      sourceUrl: `telegram:file:${message.document.file_id}`
    });
  }

  return attachments;
}
