ALTER TABLE model_catalog ADD COLUMN capabilities_source TEXT;
ALTER TABLE model_catalog ADD COLUMN context_window INTEGER;
ALTER TABLE model_catalog ADD COLUMN max_output_tokens INTEGER;
ALTER TABLE model_catalog ADD COLUMN metadata_json TEXT;
ALTER TABLE model_catalog ADD COLUMN metadata_source TEXT;
ALTER TABLE model_catalog ADD COLUMN metadata_confidence TEXT;
ALTER TABLE model_catalog ADD COLUMN metadata_fetched_at TEXT;
