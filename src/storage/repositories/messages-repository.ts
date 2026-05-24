import type { InternalMessage } from "../../shared/types/internal-message";
import type { Platform } from "../../shared/types/internal-message";
import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import { mapMessageRow, type ConversationMessage, type MessageRow } from "./message-types";
import { insertMessageAttachments, listMessageAttachments } from "./message-attachments-repository";

export async function insertMessage(db: D1Database, message: InternalMessage): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO messages (
        id, agent_id, conversation_id, platform, platform_message_id,
        sender_id, kind, text, raw_ref, received_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      message.id,
      message.agentId,
      message.conversationId,
      message.platform,
      message.platformMessageId,
      message.sender.platformUserId,
      message.kind,
      message.text ?? null,
      message.rawRef ?? null,
      message.receivedAt,
      nowIso()
    )
    .run();

  await insertMessageAttachments(db, {
    messageId: message.id,
    agentId: message.agentId,
    conversationId: message.conversationId,
    attachments: message.attachments.map((attachment) => {
      const { dataBase64: _dataBase64, ...persistedAttachment } = attachment;
      return persistedAttachment;
    })
  });
}

export async function insertOutboundTextMessage(
  db: D1Database,
  input: {
    agentId: string;
    platform: Platform;
    conversationId: string;
    text: string;
    platformMessageId?: string;
  }
): Promise<ConversationMessage> {
  const id = createId("msg");
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO messages (
        id, agent_id, conversation_id, platform, platform_message_id,
        sender_id, kind, text, raw_ref, received_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.agentId,
      input.conversationId,
      input.platform,
      input.platformMessageId ?? id,
      `agent:${input.agentId}`,
      "text",
      input.text,
      null,
      now,
      now
    )
    .run();

  return {
    id,
    agentId: input.agentId,
    conversationId: input.conversationId,
    platform: input.platform,
    platformMessageId: input.platformMessageId ?? id,
    senderId: `agent:${input.agentId}`,
    role: "assistant",
    kind: "text",
    text: input.text,
    attachments: [],
    receivedAt: now,
    createdAt: now
  };
}

export async function listConversationMessages(
  db: D1Database,
  input: {
    agentId: string;
    conversationId: string;
    platform?: Platform;
    limit?: number;
  }
): Promise<ConversationMessage[]> {
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const query = input.platform
    ? db
        .prepare(
          `SELECT * FROM (
            SELECT * FROM messages
            WHERE agent_id = ? AND conversation_id = ? AND platform = ?
            ORDER BY created_at DESC
            LIMIT ?
          ) ORDER BY created_at ASC`
        )
        .bind(input.agentId, input.conversationId, input.platform, limit)
    : db
        .prepare(
          `SELECT * FROM (
            SELECT * FROM messages
            WHERE agent_id = ? AND conversation_id = ?
            ORDER BY created_at DESC
            LIMIT ?
          ) ORDER BY created_at ASC`
        )
        .bind(input.agentId, input.conversationId, limit);

  const result = await query.all<MessageRow>();
  const messages = (result.results ?? []).map(mapMessageRow);
  const attachments = await listMessageAttachments(
    db,
    messages.map((message) => message.id)
  );
  const byMessage = new Map<string, typeof attachments>();
  for (const attachment of attachments) {
    const current = byMessage.get(attachment.messageId) ?? [];
    current.push(attachment);
    byMessage.set(attachment.messageId, current);
  }

  return messages.map((message) => ({
    ...message,
    attachments: (byMessage.get(message.id) ?? []).map(
      ({
        messageId: _messageId,
        agentId: _agentId,
        conversationId: _conversationId,
        createdAt: _createdAt,
        ...attachment
      }) => attachment
    )
  }));
}
