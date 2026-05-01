CREATE TABLE IF NOT EXISTS model_credentials (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'AES-GCM',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

ALTER TABLE model_providers ADD COLUMN credential_id TEXT;
ALTER TABLE model_providers ADD COLUMN auth_type TEXT NOT NULL DEFAULT 'bearer';
ALTER TABLE model_providers ADD COLUMN auth_header TEXT;
ALTER TABLE model_providers ADD COLUMN auth_query_param TEXT;
ALTER TABLE model_providers ADD COLUMN model_list_strategy TEXT NOT NULL DEFAULT 'openai';
ALTER TABLE model_providers ADD COLUMN chat_protocol TEXT NOT NULL DEFAULT 'openai-chat-completions';

UPDATE model_providers
SET
  auth_type = 'x-goog-api-key',
  model_list_strategy = 'gemini',
  chat_protocol = 'gemini-generate-content'
WHERE provider_type = 'gemini';

UPDATE model_providers
SET
  auth_type = 'none',
  model_list_strategy = 'static',
  chat_protocol = 'openai-chat-completions'
WHERE provider_type = 'mock';
