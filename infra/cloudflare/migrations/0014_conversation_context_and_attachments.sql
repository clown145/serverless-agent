CREATE TABLE IF NOT EXISTS conversation_settings (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  root_conversation_id TEXT NOT NULL,
  title TEXT,
  model_provider_id TEXT,
  model_id TEXT,
  history_limit INTEGER NOT NULL DEFAULT 16,
  summary_enabled INTEGER NOT NULL DEFAULT 1,
  summary_provider_id TEXT,
  summary_model_id TEXT,
  summary_text TEXT,
  summary_updated_at TEXT,
  compacted_until_message_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (agent_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_settings_root
  ON conversation_settings(agent_id, platform, root_conversation_id, updated_at);

CREATE TABLE IF NOT EXISTS conversation_bindings (
  agent_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  root_conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  active_conversation_id TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (agent_id, platform, root_conversation_id, sender_id)
);

CREATE TABLE IF NOT EXISTS message_attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT,
  mime_type TEXT,
  size INTEGER,
  r2_key TEXT,
  source_url TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message
  ON message_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_message_attachments_conversation
  ON message_attachments(agent_id, conversation_id, created_at);
