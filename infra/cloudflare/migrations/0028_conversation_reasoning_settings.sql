ALTER TABLE conversation_settings ADD COLUMN reasoning_effort TEXT NOT NULL DEFAULT 'auto';
ALTER TABLE conversation_settings ADD COLUMN reasoning_state_mode TEXT NOT NULL DEFAULT 'auto';
