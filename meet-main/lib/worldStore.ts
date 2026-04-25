import { getDb } from './db';

export type WorldRow = {
  id: string;
  roomName: string;
  hostIdentity: string;
  s3Key: string | null;
  createdAt: number;
};

type RawRow = {
  id: string;
  room_name: string;
  host_identity: string;
  s3_key: string | null;
  created_at: number;
};

function fromRaw(r: RawRow): WorldRow {
  return {
    id: r.id,
    roomName: r.room_name,
    hostIdentity: r.host_identity,
    s3Key: r.s3_key,
    createdAt: r.created_at,
  };
}

export function normalizeRoomName(roomName: string): string {
  return roomName.trim().toLowerCase();
}

export function createWorld(input: {
  id: string;
  roomName: string;
  hostIdentity: string;
  s3Key?: string | null;
}): WorldRow {
  const db = getDb();
  const createdAt = Date.now();
  const normalizedRoomName = normalizeRoomName(input.roomName);
  db.prepare(
    `INSERT INTO worlds (id, room_name, host_identity, s3_key, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(input.id, normalizedRoomName, input.hostIdentity, input.s3Key ?? null, createdAt);
  return {
    id: input.id,
    roomName: normalizedRoomName,
    hostIdentity: input.hostIdentity,
    s3Key: input.s3Key ?? null,
    createdAt,
  };
}

export function getWorldById(id: string): WorldRow | null {
  const row = getDb().prepare(`SELECT * FROM worlds WHERE id = ?`).get(id) as RawRow | undefined;
  return row ? fromRaw(row) : null;
}

export function getWorldByRoom(roomName: string): WorldRow | null {
  const normalizedRoomName = normalizeRoomName(roomName);
  const row = getDb()
    .prepare(`SELECT * FROM worlds WHERE lower(room_name) = lower(?) LIMIT 1`)
    .get(normalizedRoomName) as RawRow | undefined;
  return row ? fromRaw(row) : null;
}
