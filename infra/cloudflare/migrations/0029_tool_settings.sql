CREATE TABLE IF NOT EXISTS tool_settings (
  agent_id TEXT PRIMARY KEY,
  max_tool_calls_per_run INTEGER NOT NULL DEFAULT 20,
  updated_at TEXT NOT NULL
);
