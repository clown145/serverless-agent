import { createId } from "../../shared/ids";
import type { InternalMessage } from "../../shared/types/internal-message";
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

  const text = message.text ?? message.caption;
  if (!text) {
    return undefined;
  }

  return normalizeTelegramMessage(update.update_id, message, agentId, text);
}

function normalizeTelegramMessage(
  updateId: number,
  message: TelegramMessage,
  agentId: string,
  text: string
): InternalMessage {
  const senderName = [message.from?.first_name, message.from?.last_name]
    .filter(Boolean)
    .join(" ");

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
    kind: text.startsWith("/") ? "command" : "text",
    text,
    attachments: [],
    rawRef: `telegram:update:${updateId}`,
    receivedAt: new Date(message.date * 1000).toISOString()
  };
}
