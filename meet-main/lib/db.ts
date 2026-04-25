import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DB_PATH = process.env.SPACEPRESENT_DB_PATH ?? resolve(process.cwd(), 'data/spacepresent.db');

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS worlds (
      id            TEXT PRIMARY KEY,
      room_name     TEXT NOT NULL UNIQUE,
      host_identity TEXT NOT NULL,
      s3_key        TEXT,
      created_at    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_worlds_room ON worlds(room_name);
  `);
  _db = db;
  return db;
}
