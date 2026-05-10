import { nowIso } from "../../shared/time";
import type { Platform } from "../../shared/types/internal-message";

export type ConversationBindingRecord = {
  agentId: string;
  platform: Platform;
  rootConversationId: string;
  senderId: string;
  activeConversationId: string;
  updatedAt: string;
};

type ConversationBindingRow = {
  agent_id: string;
  platform: Platform;
  root_conversation_id: string;
  sender_id: string;
  active_conversation_id: string;
  updated_at: string;
};

export async function getConversationBinding(
  db: D1Database,
  input: {
    agentId: string;
    platform: Platform;
    rootConversationId: string;
    senderId: string;
  }
): Promise<ConversationBindingRecord | undefined> {
  const row = await db
    .prepare(
      `SELECT * FROM conversation_bindings
       WHERE agent_id = ? AND platform = ? AND root_conversation_id = ? AND sender_id = ?`
    )
    .bind(input.agentId, input.platform, input.rootConversationId, input.senderId)
    .first<ConversationBindingRow>();

  return row ? mapConversationBindingRow(row) : undefined;
}

export async function setConversationBinding(
  db: D1Database,
  input: {
    agentId: string;
    platform: Platform;
    rootConversationId: string;
    senderId: string;
    activeConversationId: string;
  }
): Promise<ConversationBindingRecord> {
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO conversation_bindings (
        agent_id, platform, root_conversation_id, sender_id,
        active_conversation_id, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(agent_id, platform, root_conversation_id, sender_id)
      DO UPDATE SET
        active_conversation_id = excluded.active_conversation_id,
        updated_at = excluded.updated_at`
    )
    .bind(
      input.agentId,
      input.platform,
      input.rootConversationId,
      input.senderId,
      input.activeConversationId,
      now
    )
    .run();

  return {
    agentId: input.agentId,
    platform: input.platform,
    rootConversationId: input.rootConversationId,
    senderId: input.senderId,
    activeConversationId: input.activeConversationId,
    updatedAt: now
  };
}

function mapConversationBindingRow(row: ConversationBindingRow): ConversationBindingRecord {
  return {
    agentId: row.agent_id,
    platform: row.platform,
    rootConversationId: row.root_conversation_id,
    senderId: row.sender_id,
    activeConversationId: row.active_conversation_id,
    updatedAt: row.updated_at
  };
}
