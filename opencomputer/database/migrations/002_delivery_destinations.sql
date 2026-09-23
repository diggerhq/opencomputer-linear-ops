CREATE TABLE delivery_destinations (
  destination_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider = 'agentmail'),
  inbox_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
