CREATE TABLE IF NOT EXISTS platform_integrations (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  name TEXT NOT NULL,
  credential_id TEXT,
  config_json TEXT NOT NULL DEFAULT '{}',
  webhook_secret TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_checked_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_credentials (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'AES-GCM',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_integrations_lookup
  ON platform_integrations(platform, agent_id, status);

CREATE INDEX IF NOT EXISTS idx_platform_integrations_webhook_secret
  ON platform_integrations(platform, webhook_secret, status);
