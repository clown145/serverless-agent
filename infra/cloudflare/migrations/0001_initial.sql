CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_accounts (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_account_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  UNIQUE (platform, platform_account_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_conversation_id TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (platform, platform_conversation_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_message_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  text TEXT,
  raw_ref TEXT,
  received_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  conversation_id TEXT,
  trigger_message_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS run_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL,
  kind TEXT NOT NULL,
  summary TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tool_calls (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  status TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_json TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  run_id TEXT,
  step_id TEXT,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT,
  status TEXT NOT NULL,
  summary TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vfs_entries (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  path TEXT NOT NULL,
  parent_path TEXT NOT NULL,
  kind TEXT NOT NULL,
  r2_key TEXT,
  mime_type TEXT,
  size INTEGER,
  checksum TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  UNIQUE (agent_id, path)
);

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  status TEXT NOT NULL,
  due_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS heartbeats (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  error_count INTEGER NOT NULL DEFAULT 0,
  details_json TEXT
);
