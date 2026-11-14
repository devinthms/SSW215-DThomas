CREATE TABLE IF NOT EXISTS note_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  raw_notes TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved','organized')),
  organized_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
