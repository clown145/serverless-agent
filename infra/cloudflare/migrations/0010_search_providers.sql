CREATE TABLE IF NOT EXISTS search_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  base_url TEXT,
  credential_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS search_provider_credentials (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'AES-GCM',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS search_settings (
  agent_id TEXT PRIMARY KEY,
  provider_id TEXT,
  updated_at TEXT NOT NULL
);
