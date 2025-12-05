-- Wish Wall Schema for Cloudflare D1

CREATE TABLE IF NOT EXISTS wishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_hash TEXT UNIQUE NOT NULL,
  payer TEXT NOT NULL,
  amount REAL NOT NULL,
  content TEXT DEFAULT '心诚则灵',
  network TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_created_at ON wishes(created_at DESC);
