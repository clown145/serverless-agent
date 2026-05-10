import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import type {
  InternalMessage,
  MessageAttachment,
  SenderRole
} from "../../shared/types/internal-message";

export type AdminMessageInput = {
  agentId: string;
  text: string;
  conversationId?: string;
  senderId?: string;
  displayName?: string;
  role?: SenderRole;
  attachments?: MessageAttachment[];
};

export function createAdminMessage(input: AdminMessageInput): InternalMessage {
  const id = createId("msg");
  const text = input.text.trim();
  const attachments = input.attachments ?? [];

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
    kind: text.startsWith("/") ? "command" : attachments.length ? "attachment" : "text",
    text: text || undefined,
    attachments,
    receivedAt: nowIso()
  };
}
