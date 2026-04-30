CREATE TABLE IF NOT EXISTS permission_policies (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  max_level INTEGER NOT NULL,
  scopes_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_permission_policies_lookup
  ON permission_policies(agent_id, subject_type, subject_id, status);

CREATE TABLE IF NOT EXISTS pending_actions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  input_json TEXT NOT NULL,
  status TEXT NOT NULL,
  reason TEXT,
  expires_at TEXT NOT NULL,
  result_json TEXT,
  error_code TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  confirmed_at TEXT,
  executed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pending_actions_status
  ON pending_actions(agent_id, status, expires_at);
