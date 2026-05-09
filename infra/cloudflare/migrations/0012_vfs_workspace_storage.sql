ALTER TABLE vfs_entries ADD COLUMN storage_kind TEXT NOT NULL DEFAULT 'legacy_r2';
ALTER TABLE vfs_entries ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

UPDATE vfs_entries SET storage_kind = 'directory' WHERE kind = 'directory';

CREATE TABLE IF NOT EXISTS vfs_contents (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER NOT NULL,
  checksum TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (agent_id, path)
);

CREATE TABLE IF NOT EXISTS vfs_revisions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  path TEXT NOT NULL,
  version INTEGER NOT NULL,
  kind TEXT NOT NULL,
  storage_kind TEXT NOT NULL,
  r2_key TEXT,
  content TEXT,
  mime_type TEXT,
  size INTEGER,
  checksum TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vfs_entries_agent_parent
  ON vfs_entries(agent_id, parent_path);

CREATE INDEX IF NOT EXISTS idx_vfs_revisions_agent_path_version
  ON vfs_revisions(agent_id, path, version);

CREATE TABLE IF NOT EXISTS vfs_mounts (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  path TEXT NOT NULL,
  mount_type TEXT NOT NULL,
  config_json TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (agent_id, path)
);
