CREATE TABLE IF NOT EXISTS http_cookie_jars (
  agent_id TEXT NOT NULL,
  jar_id TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (agent_id, jar_id)
);

CREATE INDEX IF NOT EXISTS idx_http_cookie_jars_updated
  ON http_cookie_jars(agent_id, updated_at);
