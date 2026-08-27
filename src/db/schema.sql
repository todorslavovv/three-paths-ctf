-- VaultGate database schema.
-- Every query in the application uses parameterised statements EXCEPT the
-- deliberately vulnerable search endpoint (see src/routes/search.js). That
-- single exception is the intended SQL-injection teaching point.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  email         TEXT NOT NULL,
  department    TEXT NOT NULL DEFAULT 'General',
  role          TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS documents (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  department     TEXT NOT NULL DEFAULT 'General',
  classification TEXT NOT NULL DEFAULT 'Public',
  owner_id       INTEGER,
  restricted     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER,
  action    TEXT NOT NULL,
  ip        TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Key/value store for server-side secrets, populated at startup from
-- environment variables. NEVER seeded from a literal in this file or in
-- version control.
CREATE TABLE IF NOT EXISTS secrets (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  key   TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL
);
