import { DatabaseSync } from "node:sqlite";

export const db = new DatabaseSync(process.env.DB_PATH || "data.db");

db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS owners (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  pass TEXT NOT NULL,
  paid_until INTEGER NOT NULL,          -- unix ms; trial counts as paid
  outlet_limit INTEGER NOT NULL DEFAULT 1,
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS resets (
  token_hash TEXT PRIMARY KEY,           -- sha256 of the emailed token; the token itself is never stored
  owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS outlets (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT '',     -- comma separated highlights
  place_id TEXT NOT NULL DEFAULT '',
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('scan', 'rating', 'copy')),
  rating INTEGER,
  lang TEXT,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS events_outlet_ts ON events(outlet_id, ts);
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY,
  outlet_id INTEGER NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  rating INTEGER,
  message TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  ts INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  order_id TEXT UNIQUE NOT NULL,
  payment_id TEXT,
  outlets INTEGER NOT NULL,
  amount INTEGER NOT NULL,               -- paise
  status TEXT NOT NULL DEFAULT 'created',
  ts INTEGER NOT NULL
);
`);

// Columns added after launch: CREATE TABLE IF NOT EXISTS won't add them to an existing database.
if (!db.prepare("PRAGMA table_info(owners)").all().some((c) => c.name === "google_sub")) {
  db.exec("ALTER TABLE owners ADD COLUMN google_sub TEXT"); // Google account id for "Continue with Google"
}
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS owners_google_sub ON owners(google_sub)");

export const q = (sql) => db.prepare(sql);
