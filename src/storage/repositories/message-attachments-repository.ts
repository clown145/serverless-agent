import { nowIso } from "../../shared/time";
import type { MessageAttachment } from "../../shared/types/internal-message";

export type MessageAttachmentRecord = MessageAttachment & {
  messageId: string;
  agentId: string;
  conversationId: string;
  createdAt: string;
};

type MessageAttachmentRow = {
  id: string;
  message_id: string;
  agent_id: string;
  conversation_id: string;
  type: MessageAttachment["type"];
  name?: string | null;
  mime_type?: string | null;
  size?: number | null;
  r2_key?: string | null;
  source_url?: string | null;
  created_at: string;
};

export async function insertMessageAttachments(
  db: D1Database,
  input: {
    messageId: string;
    agentId: string;
    conversationId: string;
    attachments: MessageAttachment[];
  }
): Promise<void> {
  if (!input.attachments.length) {
    return;
  }

  const now = nowIso();
  const statement = db.prepare(
    `INSERT OR REPLACE INTO message_attachments (
      id, message_id, agent_id, conversation_id, type,
      name, mime_type, size, r2_key, source_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  await db.batch(
    input.attachments.map((attachment) =>
      statement.bind(
        attachment.id,
        input.messageId,
        input.agentId,
        input.conversationId,
        attachment.type,
        attachment.name ?? null,
        attachment.mimeType ?? null,
        attachment.size ?? null,
        attachment.r2Key ?? null,
        attachment.sourceUrl ?? null,
        now
      )
    )
  );
}

export async function listMessageAttachments(
  db: D1Database,
  messageIds: string[]
): Promise<MessageAttachmentRecord[]> {
  const records: MessageAttachmentRecord[] = [];
  for (const messageId of messageIds) {
    const result = await db
      .prepare(
        `SELECT * FROM message_attachments
         WHERE message_id = ?
         ORDER BY created_at ASC`
      )
      .bind(messageId)
      .all<MessageAttachmentRow>();
    records.push(...(result.results ?? []).map(mapAttachmentRow));
  }

  return records;
}

function mapAttachmentRow(row: MessageAttachmentRow): MessageAttachmentRecord {
  return {
    id: row.id,
    messageId: row.message_id,
    agentId: row.agent_id,
    conversationId: row.conversation_id,
    type: row.type,
    name: row.name ?? undefined,
    mimeType: row.mime_type ?? undefined,
    size: row.size ?? undefined,
    r2Key: row.r2_key ?? undefined,
    sourceUrl: row.source_url ?? undefined,
    createdAt: row.created_at
  };
}
