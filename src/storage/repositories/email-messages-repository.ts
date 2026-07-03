import { createId } from "../../shared/ids";
import { nowIso } from "../../shared/time";
import {
  mapEmailMessageRow,
  type EmailAddress,
  type EmailMessageDirection,
  type EmailMessageRecord,
  type EmailMessageRow,
  type EmailMessageStatus
} from "./email-message-types";

export type CreateEmailMessageInput = {
  id?: string;
  agentId: string;
  integrationId: string;
  internalMessageId?: string;
  direction: EmailMessageDirection;
  conversationId: string;
  threadKey: string;
  rfcMessageId?: string;
  resendMessageId?: string;
  inReplyTo?: string;
  references?: string[];
  from: EmailAddress;
  to?: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress[];
  subject?: string;
  snippet?: string;
  textBody?: string;
  htmlBody?: string;
  headers?: Record<string, string>;
  rawR2Key?: string;
  status?: EmailMessageStatus;
  error?: string;
  sentAt?: string;
  receivedAt?: string;
};

export async function createEmailMessageRecord(
  db: D1Database,
  input: CreateEmailMessageInput
): Promise<EmailMessageRecord> {
  const id = input.id ?? createId("email");
  const now = nowIso();

  await db
    .prepare(
      `INSERT INTO email_messages (
        id, agent_id, integration_id, internal_message_id, direction,
        conversation_id, thread_key, rfc_message_id, resend_message_id,
        in_reply_to, references_json, from_json, to_json, cc_json,
        bcc_json, reply_to_json, subject, snippet, text_body, html_body,
        headers_json, raw_r2_key, status, error, sent_at, received_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.agentId,
      input.integrationId,
      input.internalMessageId ?? null,
      input.direction,
      input.conversationId,
      input.threadKey,
      input.rfcMessageId ?? null,
      input.resendMessageId ?? null,
      input.inReplyTo ?? null,
      JSON.stringify(input.references ?? []),
      JSON.stringify(input.from),
      JSON.stringify(input.to ?? []),
      JSON.stringify(input.cc ?? []),
      JSON.stringify(input.bcc ?? []),
      JSON.stringify(input.replyTo ?? []),
      input.subject ?? null,
      input.snippet ?? null,
      input.textBody ?? null,
      input.htmlBody ?? null,
      JSON.stringify(input.headers ?? {}),
      input.rawR2Key ?? null,
      input.status ?? (input.direction === "inbound" ? "received" : "queued"),
      input.error ?? null,
      input.sentAt ?? null,
      input.receivedAt ?? null,
      now,
      now
    )
    .run();

  const record = await getEmailMessageRecord(db, id);
  if (!record) {
    throw new Error("Email message record was not created");
  }
  return record;
}

export async function getEmailMessageRecord(
  db: D1Database,
  id: string
): Promise<EmailMessageRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM email_messages WHERE id = ?")
    .bind(id)
    .first<EmailMessageRow>();

  return row ? mapEmailMessageRow(row) : undefined;
}

export async function getEmailMessageByInternalMessageId(
  db: D1Database,
  internalMessageId: string
): Promise<EmailMessageRecord | undefined> {
  const row = await db
    .prepare("SELECT * FROM email_messages WHERE internal_message_id = ? LIMIT 1")
    .bind(internalMessageId)
    .first<EmailMessageRow>();

  return row ? mapEmailMessageRow(row) : undefined;
}

export async function listEmailMessageRecords(
  db: D1Database,
  input: {
    agentId: string;
    integrationId?: string;
    direction?: EmailMessageDirection;
    conversationId?: string;
    limit?: number;
  }
): Promise<EmailMessageRecord[]> {
  const clauses = ["agent_id = ?"];
  const values: unknown[] = [input.agentId];

  if (input.integrationId) {
    clauses.push("integration_id = ?");
    values.push(input.integrationId);
  }
  if (input.direction) {
    clauses.push("direction = ?");
    values.push(input.direction);
  }
  if (input.conversationId) {
    clauses.push("conversation_id = ?");
    values.push(input.conversationId);
  }

  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  values.push(limit);

  const result = await db
    .prepare(
      `SELECT * FROM email_messages
       WHERE ${clauses.join(" AND ")}
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(...values)
    .all<EmailMessageRow>();

  return (result.results ?? []).map(mapEmailMessageRow);
}

export async function updateEmailMessageDelivery(
  db: D1Database,
  id: string,
  input: {
    status: EmailMessageStatus;
    resendMessageId?: string;
    error?: string;
    sentAt?: string;
  }
): Promise<EmailMessageRecord | undefined> {
  await db
    .prepare(
      `UPDATE email_messages
       SET status = ?,
           resend_message_id = COALESCE(?, resend_message_id),
           error = ?,
           sent_at = COALESCE(?, sent_at),
           updated_at = ?
       WHERE id = ?`
    )
    .bind(
      input.status,
      input.resendMessageId ?? null,
      input.error ?? null,
      input.sentAt ?? null,
      nowIso(),
      id
    )
    .run();

  return getEmailMessageRecord(db, id);
}
