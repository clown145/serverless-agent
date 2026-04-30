import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import type { InternalMessage, SenderRole } from "../../shared/types/internal-message";

export type AdminMessageInput = {
  agentId: string;
  text: string;
  conversationId?: string;
  senderId?: string;
  displayName?: string;
  role?: SenderRole;
};

export function createAdminMessage(input: AdminMessageInput): InternalMessage {
  const id = createId("msg");
  const text = input.text.trim();

  return {
    id,
    platform: "admin",
    platformMessageId: id,
    agentId: input.agentId,
    conversationId: input.conversationId ?? "admin:default",
    sender: {
      platformUserId: input.senderId ?? "admin",
      displayName: input.displayName ?? "Admin",
      role: input.role ?? "owner"
    },
    kind: text.startsWith("/") ? "command" : "text",
    text,
    attachments: [],
    receivedAt: nowIso()
  };
}
