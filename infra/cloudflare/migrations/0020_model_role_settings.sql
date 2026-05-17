CREATE TABLE IF NOT EXISTS agent_model_role_settings (
  agent_id TEXT NOT NULL,
  role TEXT NOT NULL,
  provider_id TEXT,
  model_id TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (agent_id, role)
);
