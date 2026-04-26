from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import sqlite3
import threading
from typing import Any


@dataclass(frozen=True)
class SessionRow:
    id: str
    room_name: str
    world_id: str | None
    status: str
    created_at: int
    updated_at: int
    stopped_at: int | None
    error: str | None
    transcript_path: str
    vision_path: str
    rolling_summary_path: str
    final_summary_path: str


class SessionStore:
    def __init__(self, db_path: Path) -> None:
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        self._init_schema()

    def _init_schema(self) -> None:
        with self._lock:
            cur = self._conn.cursor()
            cur.executescript(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    id                    TEXT PRIMARY KEY,
                    room_name             TEXT NOT NULL,
                    world_id              TEXT,
                    status                TEXT NOT NULL,
                    created_at            INTEGER NOT NULL,
                    updated_at            INTEGER NOT NULL,
                    stopped_at            INTEGER,
                    error                 TEXT,
                    transcript_path       TEXT NOT NULL,
                    vision_path           TEXT NOT NULL,
                    rolling_summary_path  TEXT NOT NULL,
                    final_summary_path    TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS transcript_chunks (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id    TEXT NOT NULL,
                    created_at    INTEGER NOT NULL,
                    speaker       TEXT,
                    start_ms      INTEGER,
                    end_ms        INTEGER,
                    text          TEXT NOT NULL,
                    is_final      INTEGER NOT NULL DEFAULT 1,
                    source        TEXT NOT NULL DEFAULT 'livekit_gcp_stt',
                    FOREIGN KEY(session_id) REFERENCES sessions(id)
                );
                CREATE INDEX IF NOT EXISTS idx_transcript_chunks_session
                  ON transcript_chunks(session_id, id);

                CREATE TABLE IF NOT EXISTS vision_events (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id    TEXT NOT NULL,
                    created_at    INTEGER NOT NULL,
                    frame_ts_ms   INTEGER,
                    frame_hash    TEXT,
                    ocr_text      TEXT,
                    labels_json   TEXT,
                    error         TEXT,
                    FOREIGN KEY(session_id) REFERENCES sessions(id)
                );
                CREATE INDEX IF NOT EXISTS idx_vision_events_session
                  ON vision_events(session_id, id);

                CREATE TABLE IF NOT EXISTS summary_updates (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id    TEXT NOT NULL,
                    created_at    INTEGER NOT NULL,
                    kind          TEXT NOT NULL,
                    payload_json  TEXT NOT NULL,
                    FOREIGN KEY(session_id) REFERENCES sessions(id)
                );
                CREATE INDEX IF NOT EXISTS idx_summary_updates_session
                  ON summary_updates(session_id, id);
                """
            )
            self._conn.commit()

    def create_session(
        self,
        *,
        session_id: str,
        room_name: str,
        world_id: str | None,
        created_at: int,
        transcript_path: str,
        vision_path: str,
        rolling_summary_path: str,
        final_summary_path: str,
    ) -> None:
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO sessions (
                    id, room_name, world_id, status,
                    created_at, updated_at, stopped_at, error,
                    transcript_path, vision_path, rolling_summary_path, final_summary_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    room_name,
                    world_id,
                    'running',
                    created_at,
                    created_at,
                    None,
                    None,
                    transcript_path,
                    vision_path,
                    rolling_summary_path,
                    final_summary_path,
                ),
            )
            self._conn.commit()

    def update_session_status(
        self,
        session_id: str,
        *,
        status: str,
        updated_at: int,
        stopped_at: int | None = None,
        error: str | None = None,
    ) -> None:
        with self._lock:
            self._conn.execute(
                """
                UPDATE sessions
                   SET status = ?, updated_at = ?, stopped_at = COALESCE(?, stopped_at), error = ?
                 WHERE id = ?
                """,
                (status, updated_at, stopped_at, error, session_id),
            )
            self._conn.commit()

    def add_transcript_chunk(self, session_id: str, payload: dict[str, Any], created_at: int) -> int:
        with self._lock:
            cur = self._conn.execute(
                """
                INSERT INTO transcript_chunks (
                    session_id, created_at, speaker, start_ms, end_ms, text, is_final, source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    created_at,
                    payload.get('speaker'),
                    payload.get('startMs'),
                    payload.get('endMs'),
                    payload.get('text', ''),
                    1 if payload.get('isFinal', True) else 0,
                    payload.get('source', 'livekit_gcp_stt'),
                ),
            )
            self._conn.commit()
            return int(cur.lastrowid)

    def add_vision_event(self, session_id: str, payload: dict[str, Any], created_at: int) -> int:
        with self._lock:
            cur = self._conn.execute(
                """
                INSERT INTO vision_events (
                    session_id, created_at, frame_ts_ms, frame_hash, ocr_text, labels_json, error
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    created_at,
                    payload.get('frameTsMs'),
                    payload.get('frameHash'),
                    payload.get('ocrText'),
                    payload.get('labelsJson'),
                    payload.get('error'),
                ),
            )
            self._conn.commit()
            return int(cur.lastrowid)

    def add_summary_update(
        self,
        session_id: str,
        *,
        kind: str,
        payload_json: str,
        created_at: int,
    ) -> int:
        with self._lock:
            cur = self._conn.execute(
                """
                INSERT INTO summary_updates (session_id, created_at, kind, payload_json)
                VALUES (?, ?, ?, ?)
                """,
                (session_id, created_at, kind, payload_json),
            )
            self._conn.commit()
            return int(cur.lastrowid)

    def get_session(self, session_id: str) -> SessionRow | None:
        with self._lock:
            row = self._conn.execute(
                "SELECT * FROM sessions WHERE id = ? LIMIT 1", (session_id,)
            ).fetchone()
        if row is None:
            return None
        return SessionRow(
            id=row['id'],
            room_name=row['room_name'],
            world_id=row['world_id'],
            status=row['status'],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            stopped_at=row['stopped_at'],
            error=row['error'],
            transcript_path=row['transcript_path'],
            vision_path=row['vision_path'],
            rolling_summary_path=row['rolling_summary_path'],
            final_summary_path=row['final_summary_path'],
        )

    def list_transcript_chunks(
        self,
        session_id: str,
        *,
        after_id: int = 0,
        limit: int = 200,
    ) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                """
                SELECT id, created_at, speaker, start_ms, end_ms, text, is_final, source
                  FROM transcript_chunks
                 WHERE session_id = ? AND id > ?
                 ORDER BY id ASC
                 LIMIT ?
                """,
                (session_id, after_id, limit),
            ).fetchall()
        return [
            {
                'id': row['id'],
                'createdAt': row['created_at'],
                'speaker': row['speaker'],
                'startMs': row['start_ms'],
                'endMs': row['end_ms'],
                'text': row['text'],
                'isFinal': bool(row['is_final']),
                'source': row['source'],
            }
            for row in rows
        ]

    def list_recent_transcript_chunks(
        self,
        session_id: str,
        *,
        limit: int = 6,
    ) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                """
                SELECT id, created_at, speaker, start_ms, end_ms, text, is_final, source
                  FROM transcript_chunks
                 WHERE session_id = ?
                 ORDER BY id DESC
                 LIMIT ?
                """,
                (session_id, limit),
            ).fetchall()
        items = [
            {
                'id': row['id'],
                'createdAt': row['created_at'],
                'speaker': row['speaker'],
                'startMs': row['start_ms'],
                'endMs': row['end_ms'],
                'text': row['text'],
                'isFinal': bool(row['is_final']),
                'source': row['source'],
            }
            for row in rows
        ]
        return list(reversed(items))

    def list_vision_events(
        self,
        session_id: str,
        *,
        after_id: int = 0,
        limit: int = 200,
    ) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                """
                SELECT id, created_at, frame_ts_ms, frame_hash, ocr_text, labels_json, error
                  FROM vision_events
                 WHERE session_id = ? AND id > ?
                 ORDER BY id ASC
                 LIMIT ?
                """,
                (session_id, after_id, limit),
            ).fetchall()
        return [
            {
                'id': row['id'],
                'createdAt': row['created_at'],
                'frameTsMs': row['frame_ts_ms'],
                'frameHash': row['frame_hash'],
                'ocrText': row['ocr_text'],
                'labelsJson': row['labels_json'],
                'error': row['error'],
            }
            for row in rows
        ]

    def list_recent_vision_events(
        self,
        session_id: str,
        *,
        limit: int = 6,
    ) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._conn.execute(
                """
                SELECT id, created_at, frame_ts_ms, frame_hash, ocr_text, labels_json, error
                  FROM vision_events
                 WHERE session_id = ?
                 ORDER BY id DESC
                 LIMIT ?
                """,
                (session_id, limit),
            ).fetchall()
        items = [
            {
                'id': row['id'],
                'createdAt': row['created_at'],
                'frameTsMs': row['frame_ts_ms'],
                'frameHash': row['frame_hash'],
                'ocrText': row['ocr_text'],
                'labelsJson': row['labels_json'],
                'error': row['error'],
            }
            for row in rows
        ]
        return list(reversed(items))

    def list_summary_updates(
        self,
        session_id: str,
        *,
        kind: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        query = (
            "SELECT id, created_at, kind, payload_json FROM summary_updates "
            "WHERE session_id = ? "
        )
        params: list[Any] = [session_id]
        if kind is not None:
            query += "AND kind = ? "
            params.append(kind)
        query += "ORDER BY id DESC LIMIT ?"
        params.append(limit)

        with self._lock:
            rows = self._conn.execute(query, tuple(params)).fetchall()

        return [
            {
                'id': row['id'],
                'createdAt': row['created_at'],
                'kind': row['kind'],
                'payloadJson': row['payload_json'],
            }
            for row in rows
        ]
