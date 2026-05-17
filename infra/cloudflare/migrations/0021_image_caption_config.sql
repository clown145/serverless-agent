CREATE TABLE IF NOT EXISTS agent_model_config (
  agent_id TEXT PRIMARY KEY,
  image_caption_enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

ALTER TABLE message_attachments ADD COLUMN caption_text TEXT;
ALTER TABLE message_attachments ADD COLUMN caption_model_provider_id TEXT;
ALTER TABLE message_attachments ADD COLUMN caption_model_id TEXT;
ALTER TABLE message_attachments ADD COLUMN caption_updated_at TEXT;
