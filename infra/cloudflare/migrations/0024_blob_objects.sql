CREATE TABLE IF NOT EXISTS blob_objects (
  key TEXT PRIMARY KEY,
  body_base64 TEXT NOT NULL,
  content_type TEXT,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
