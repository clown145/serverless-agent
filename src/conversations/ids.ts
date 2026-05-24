import type { InternalMessage, Platform } from "../shared/types/internal-message";

const LOGICAL_SEPARATOR = "#";

export function rootConversationId(conversationId: string): string {
  return conversationId.split(LOGICAL_SEPARATOR)[0] ?? conversationId;
}

export function createLogicalConversationId(rootId: string, sessionId: string): string {
  return `${rootConversationId(rootId)}${LOGICAL_SEPARATOR}${sessionId}`;
}

export function conversationSessionSuffix(conversationId: string): string {
  const parts = conversationId.split(LOGICAL_SEPARATOR);
  return parts.length > 1 ? parts.slice(1).join(LOGICAL_SEPARATOR) : "default";
}

export function rootIdForMessage(message: InternalMessage): string {
  return rootConversationId(message.conversationId);
}

export function physicalConversationForPlatform(
  platform: Platform,
  conversationId: string
): string {
  if (platform === "telegram") {
    return rootConversationId(conversationId);
  }

  return conversationId;
}
