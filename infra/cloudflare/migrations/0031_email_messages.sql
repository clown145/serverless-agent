CREATE TABLE IF NOT EXISTS email_messages (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  integration_id TEXT NOT NULL,
  internal_message_id TEXT,
  direction TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  thread_key TEXT NOT NULL,
  rfc_message_id TEXT,
  resend_message_id TEXT,
  in_reply_to TEXT,
  references_json TEXT NOT NULL DEFAULT '[]',
  from_json TEXT NOT NULL,
  to_json TEXT NOT NULL DEFAULT '[]',
  cc_json TEXT NOT NULL DEFAULT '[]',
  bcc_json TEXT NOT NULL DEFAULT '[]',
  reply_to_json TEXT NOT NULL DEFAULT '[]',
  subject TEXT,
  snippet TEXT,
  text_body TEXT,
  html_body TEXT,
  headers_json TEXT NOT NULL DEFAULT '{}',
  raw_r2_key TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  error TEXT,
  sent_at TEXT,
  received_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_messages_agent_created
  ON email_messages(agent_id, created_at);

CREATE INDEX IF NOT EXISTS idx_email_messages_integration_created
  ON email_messages(integration_id, created_at);

CREATE INDEX IF NOT EXISTS idx_email_messages_conversation
  ON email_messages(agent_id, conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_email_messages_internal
  ON email_messages(internal_message_id);
