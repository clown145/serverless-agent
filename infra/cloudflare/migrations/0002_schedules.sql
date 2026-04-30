ALTER TABLE schedules ADD COLUMN interval_seconds INTEGER;
ALTER TABLE schedules ADD COLUMN last_run_at TEXT;

ALTER TABLE runs ADD COLUMN schedule_id TEXT;

CREATE INDEX IF NOT EXISTS idx_schedules_due
  ON schedules(status, due_at);

CREATE INDEX IF NOT EXISTS idx_runs_schedule
  ON runs(schedule_id);
