UPDATE model_providers
SET
  auth_type = 'query-param',
  auth_query_param = 'key',
  updated_at = datetime('now')
WHERE provider_type = 'gemini'
  AND auth_type = 'x-goog-api-key';
