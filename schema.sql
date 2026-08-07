-- GetFit — D1 schema
-- Run this once against your D1 database to create the tables.

CREATE TABLE IF NOT EXISTS sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT    NOT NULL,          -- YYYY-MM-DD
  day_key     TEXT    NOT NULL,          -- mon | tue | wed | thu | fri
  focus       TEXT,                      -- e.g. "Arms / Chest"
  rounds      INTEGER,                   -- circuit rounds completed
  notes       TEXT,
  created_at  TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  INTEGER NOT NULL,
  movement    TEXT    NOT NULL,          -- e.g. "DB Bench Press"
  set_number  INTEGER,                   -- 1, 2, 3...
  weight      REAL,                      -- weight used (blank for bodyweight)
  reps        INTEGER,
  created_at  TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_entries_session  ON entries(session_id);
CREATE INDEX IF NOT EXISTS idx_entries_movement ON entries(movement);
CREATE INDEX IF NOT EXISTS idx_sessions_date    ON sessions(date);
