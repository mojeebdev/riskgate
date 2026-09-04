CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rules_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluations (
  id TEXT PRIMARY KEY,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  order_type TEXT NOT NULL,
  notional_usd REAL NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'approval_required', 'blocked')),
  reasons_json TEXT NOT NULL,
  policy_json TEXT NOT NULL,
  market_snapshot_json TEXT NOT NULL,
  data_source TEXT NOT NULL CHECK (data_source IN ('binance-agent-os', 'demo')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS evaluations_created_at_idx
  ON evaluations(created_at DESC);
