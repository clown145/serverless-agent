export type EmailAddress = {
  address: string;
  name?: string;
};

export type EmailMessageDirection = "inbound" | "outbound";

export type EmailMessageStatus = "received" | "queued" | "sent" | "failed" | "rejected";

export type EmailMessageRecord = {
  id: string;
  agentId: string;
  integrationId: string;
  internalMessageId?: string;
  direction: EmailMessageDirection;
  conversationId: string;
  threadKey: string;
  rfcMessageId?: string;
  resendMessageId?: string;
  inReplyTo?: string;
  references: string[];
  from: EmailAddress;
  to: EmailAddress[];
  cc: EmailAddress[];
  bcc: EmailAddress[];
  replyTo: EmailAddress[];
  subject?: string;
  snippet?: string;
  textBody?: string;
  htmlBody?: string;
  headers: Record<string, string>;
  rawR2Key?: string;
  status: EmailMessageStatus;
  error?: string;
  sentAt?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type EmailMessageRow = {
  id: string;
  agent_id: string;
  integration_id: string;
  internal_message_id?: string | null;
  direction: EmailMessageDirection;
  conversation_id: string;
  thread_key: string;
  rfc_message_id?: string | null;
  resend_message_id?: string | null;
  in_reply_to?: string | null;
  references_json: string;
  from_json: string;
  to_json: string;
  cc_json: string;
  bcc_json: string;
  reply_to_json: string;
  subject?: string | null;
  snippet?: string | null;
  text_body?: string | null;
  html_body?: string | null;
  headers_json: string;
  raw_r2_key?: string | null;
  status: EmailMessageStatus;
  error?: string | null;
  sent_at?: string | null;
  received_at?: string | null;
  created_at: string;
  updated_at: string;
};

export function mapEmailMessageRow(row: EmailMessageRow): EmailMessageRecord {
  return {
    id: row.id,
    agentId: row.agent_id,
    integrationId: row.integration_id,
    internalMessageId: row.internal_message_id ?? undefined,
    direction: row.direction,
    conversationId: row.conversation_id,
    threadKey: row.thread_key,
    rfcMessageId: row.rfc_message_id ?? undefined,
    resendMessageId: row.resend_message_id ?? undefined,
    inReplyTo: row.in_reply_to ?? undefined,
    references: parseJsonArray(row.references_json),
    from: parseJsonObject<EmailAddress>(row.from_json, { address: "" }),
    to: parseJsonArray<EmailAddress>(row.to_json),
    cc: parseJsonArray<EmailAddress>(row.cc_json),
    bcc: parseJsonArray<EmailAddress>(row.bcc_json),
    replyTo: parseJsonArray<EmailAddress>(row.reply_to_json),
    subject: row.subject ?? undefined,
    snippet: row.snippet ?? undefined,
    textBody: row.text_body ?? undefined,
    htmlBody: row.html_body ?? undefined,
    headers: parseJsonObject<Record<string, string>>(row.headers_json, {}),
    rawR2Key: row.raw_r2_key ?? undefined,
    status: row.status,
    error: row.error ?? undefined,
    sentAt: row.sent_at ?? undefined,
    receivedAt: row.received_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function parseJsonArray<T = string>(value: string): T[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function parseJsonObject<T extends Record<string, unknown>>(value: string, fallback: T): T {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as T)
      : fallback;
  } catch {
    return fallback;
  }
}
