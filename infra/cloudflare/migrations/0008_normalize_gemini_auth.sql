UPDATE model_providers
SET
  auth_type = 'query-param',
  auth_query_param = 'key',
  updated_at = datetime('now')
WHERE provider_type = 'gemini'
  AND credential_id IS NOT NULL;
