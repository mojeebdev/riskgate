CREATE TABLE IF NOT EXISTS binance_oauth_connections (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  encrypted_access_token TEXT NOT NULL,
  expires_at TEXT,
  updated_at TEXT NOT NULL
);
