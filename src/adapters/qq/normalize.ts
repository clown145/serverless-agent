import { createId } from "../../shared/ids";
import type { InternalMessage } from "../../shared/types/internal-message";
import { nowIso } from "../../shared/time";

type QqTextEvent = {
  id?: string;
  group_id?: string;
  user_id?: string;
  content?: string;
};

export function normalizeQqTextEvent(
  payload: unknown,
  agentId: string
): InternalMessage | undefined {
  const event = payload as QqTextEvent;
  if (!event.content) {
    return undefined;
  }

  const platformMessageId = event.id ?? createId("qq_msg");
  const conversation = event.group_id ?? event.user_id ?? "unknown";

  return {
    id: createId("msg"),
    platform: "qq",
    platformMessageId,
    agentId,
    conversationId: `qq:${conversation}`,
    sender: {
      platformUserId: event.user_id ?? "unknown",
      role: "unknown"
    },
    kind: event.content.startsWith("/") ? "command" : "text",
    text: event.content,
    attachments: [],
    receivedAt: nowIso()
  };
}
