import { nowIso } from "../../shared/time";
import type { QqOfficialConversationBinding } from "../../adapters/qq/official/normalize";

export type QqOfficialConversationRecord = QqOfficialConversationBinding & {
  integrationId: string;
  agentId: string;
  createdAt: string;
  updatedAt: string;
};

type QqOfficialConversationRow = {
  integration_id: string;
  agent_id: string;
  conversation_id: string;
  target_kind: QqOfficialConversationBinding["targetKind"];
  target_id: string;
  last_message_id?: string | null;
  last_event_id?: string | null;
  created_at: string;
  updated_at: string;
};

export async function upsertQqOfficialConversation(
  db: D1Database,
  input: {
    integrationId: string;
    agentId: string;
    binding: QqOfficialConversationBinding;
  }
): Promise<QqOfficialConversationRecord> {
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO qq_official_conversations (
        integration_id, agent_id, conversation_id, target_kind, target_id,
        last_message_id, last_event_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(integration_id, conversation_id)
      DO UPDATE SET
        agent_id = excluded.agent_id,
        target_kind = excluded.target_kind,
        target_id = excluded.target_id,
        last_message_id = excluded.last_message_id,
        last_event_id = excluded.last_event_id,
        updated_at = excluded.updated_at`
    )
    .bind(
      input.integrationId,
      input.agentId,
      input.binding.conversationId,
      input.binding.targetKind,
      input.binding.targetId,
      input.binding.lastMessageId ?? null,
      input.binding.lastEventId ?? null,
      now,
      now
    )
    .run();

  return {
    integrationId: input.integrationId,
    agentId: input.agentId,
    ...input.binding,
    createdAt: now,
    updatedAt: now
  };
}

export async function getQqOfficialConversationByIntegration(
  db: D1Database,
  input: {
    integrationId: string;
    conversationId: string;
  }
): Promise<QqOfficialConversationRecord | undefined> {
  const row = await db
    .prepare(
      `SELECT * FROM qq_official_conversations
       WHERE integration_id = ? AND conversation_id = ?`
    )
    .bind(input.integrationId, input.conversationId)
    .first<QqOfficialConversationRow>();

  return row ? mapQqOfficialConversationRow(row) : undefined;
}

export async function getQqOfficialConversationForAgent(
  db: D1Database,
  input: {
    agentId: string;
    conversationId: string;
  }
): Promise<QqOfficialConversationRecord | undefined> {
  const row = await db
    .prepare(
      `SELECT * FROM qq_official_conversations
       WHERE agent_id = ? AND conversation_id = ?
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    .bind(input.agentId, input.conversationId)
    .first<QqOfficialConversationRow>();

  return row ? mapQqOfficialConversationRow(row) : undefined;
}

function mapQqOfficialConversationRow(
  row: QqOfficialConversationRow
): QqOfficialConversationRecord {
  return {
    integrationId: row.integration_id,
    agentId: row.agent_id,
    conversationId: row.conversation_id,
    targetKind: row.target_kind,
    targetId: row.target_id,
    lastMessageId: row.last_message_id ?? undefined,
    lastEventId: row.last_event_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
