import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';

let db: Database.Database;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  width_cm   REAL NOT NULL DEFAULT 500,
  height_cm  REAL NOT NULL DEFAULT 400,
  grid_size  REAL NOT NULL DEFAULT 20,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS room_elements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  subtype      TEXT,
  label        TEXT,
  x            REAL NOT NULL DEFAULT 0,
  y            REAL NOT NULL DEFAULT 0,
  width        REAL,
  height       REAL,
  rotation     REAL NOT NULL DEFAULT 0,
  scale_x      REAL NOT NULL DEFAULT 1,
  scale_y      REAL NOT NULL DEFAULT 1,
  x1           REAL,
  y1           REAL,
  x2           REAL,
  y2           REAL,
  swing_angle  REAL,
  swing_dir    TEXT,
  path_data    TEXT,
  z_index      INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS custom_objects (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  path_data  TEXT NOT NULL,
  width_cm   REAL NOT NULL,
  height_cm  REAL NOT NULL,
  thumbnail  TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_elements_project ON room_elements(project_id);
`;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function runMigrations(): void {
  const eCols = db.prepare("PRAGMA table_info(room_elements)").all() as { name: string }[];
  if (!eCols.some((c) => c.name === 'display_unit')) {
    db.exec("ALTER TABLE room_elements ADD COLUMN display_unit TEXT");
  }
  const pCols = db.prepare("PRAGMA table_info(projects)").all() as { name: string }[];
  if (!pCols.some((c) => c.name === 'default_unit')) {
    db.exec("ALTER TABLE projects ADD COLUMN default_unit TEXT");
  }
  if (!pCols.some((c) => c.name === 'thumbnail')) {
    db.exec("ALTER TABLE projects ADD COLUMN thumbnail TEXT");
  }
}

export function initDatabase(): void {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'grid-vis.db');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  runMigrations();
}

export function closeDatabase(): void {
  if (db) {
    db.close();
  }
}
