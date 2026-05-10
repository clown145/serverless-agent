import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import type {
  InternalMessage,
  MessageAttachment,
  SenderRole
} from "../../shared/types/internal-message";

export type WebUiMessageInput = {
  agentId: string;
  text: string;
  conversationId?: string;
  senderId?: string;
  displayName?: string;
  role?: SenderRole;
  attachments?: MessageAttachment[];
};

export function createWebUiMessage(input: WebUiMessageInput): InternalMessage {
  const id = createId("msg");
  const text = input.text.trim();
  const attachments = input.attachments ?? [];

  return {
    id,
    platform: "webui",
    platformMessageId: id,
    agentId: input.agentId,
    conversationId: input.conversationId ?? "webui:default",
    sender: {
      platformUserId: input.senderId ?? "webui-admin",
      displayName: input.displayName ?? "WebUI",
      role: input.role ?? "owner"
    },
    kind: text.startsWith("/") ? "command" : attachments.length ? "attachment" : "text",
    text: text || undefined,
    attachments,
    receivedAt: nowIso()
  };
}
