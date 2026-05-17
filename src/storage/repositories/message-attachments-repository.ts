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
  caption_text?: string | null;
  caption_model_provider_id?: string | null;
  caption_model_id?: string | null;
  caption_updated_at?: string | null;
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

export async function getMessageAttachmentRecord(
  db: D1Database,
  input: {
    messageId: string;
    attachmentId: string;
  }
): Promise<MessageAttachmentRecord | undefined> {
  const row = await db
    .prepare(
      `SELECT * FROM message_attachments
       WHERE message_id = ? AND id = ?`
    )
    .bind(input.messageId, input.attachmentId)
    .first<MessageAttachmentRow>();

  return row ? mapAttachmentRow(row) : undefined;
}

export async function updateMessageAttachmentCaption(
  db: D1Database,
  input: {
    messageId: string;
    attachmentId: string;
    captionText: string;
    captionModelProviderId?: string;
    captionModelId: string;
  }
): Promise<void> {
  await db
    .prepare(
      `UPDATE message_attachments
       SET caption_text = ?,
           caption_model_provider_id = ?,
           caption_model_id = ?,
           caption_updated_at = ?
       WHERE message_id = ? AND id = ?`
    )
    .bind(
      input.captionText,
      input.captionModelProviderId ?? null,
      input.captionModelId,
      nowIso(),
      input.messageId,
      input.attachmentId
    )
    .run();
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
    captionText: row.caption_text ?? undefined,
    captionModelProviderId: row.caption_model_provider_id ?? undefined,
    captionModelId: row.caption_model_id ?? undefined,
    captionUpdatedAt: row.caption_updated_at ?? undefined,
    createdAt: row.created_at
  };
}
