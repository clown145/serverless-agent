CREATE TABLE IF NOT EXISTS skill_settings (
  agent_id TEXT PRIMARY KEY,
  edit_confirmation_required INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);
