CREATE TABLE IF NOT EXISTS mcp_servers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  transport TEXT NOT NULL DEFAULT 'streamable-http',
  auth_type TEXT NOT NULL DEFAULT 'none',
  auth_header TEXT,
  credential_id TEXT,
  protocol_version TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_checked_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mcp_server_credentials (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'AES-GCM',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mcp_tool_catalog (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  internal_name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  input_schema_json TEXT NOT NULL,
  output_schema_json TEXT,
  annotations_json TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (server_id, tool_name)
);
