ALTER TABLE schedules ADD COLUMN recurrence_due_at TEXT;

UPDATE schedules
SET recurrence_due_at = due_at
WHERE interval_seconds IS NOT NULL
  AND recurrence_due_at IS NULL;
