import type {
  MessageAttachment,
  MessageKind,
  Platform
} from "../../shared/types/internal-message";

export type ConversationMessage = {
  id: string;
  agentId: string;
  conversationId: string;
  platform: Platform;
  platformMessageId: string;
  senderId: string;
  role: "user" | "assistant";
  kind: MessageKind;
  text?: string;
  attachments: MessageAttachment[];
  receivedAt: string;
  createdAt: string;
};

export type MessageRow = {
  id: string;
  agent_id: string;
  conversation_id: string;
  platform: Platform;
  platform_message_id: string;
  sender_id: string;
  kind: MessageKind;
  text?: string | null;
  received_at: string;
  created_at: string;
};

export function mapMessageRow(row: MessageRow): ConversationMessage {
  return {
    id: row.id,
    agentId: row.agent_id,
    conversationId: row.conversation_id,
    platform: row.platform,
    platformMessageId: row.platform_message_id,
    senderId: row.sender_id,
    role: row.sender_id.startsWith("agent:") ? "assistant" : "user",
    kind: row.kind,
    text: row.text ?? undefined,
    attachments: [],
    receivedAt: row.received_at,
    createdAt: row.created_at
  };
}
