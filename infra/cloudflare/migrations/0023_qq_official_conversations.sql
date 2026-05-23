CREATE TABLE IF NOT EXISTS qq_official_conversations (
  integration_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  target_kind TEXT NOT NULL,
  target_id TEXT NOT NULL,
  last_message_id TEXT,
  last_event_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (integration_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_qq_official_conversations_agent
  ON qq_official_conversations(agent_id, conversation_id);
