#!/usr/bin/env python3
"""Initialize the voice command history SQLite DB.

Per operator 2026-06-01 ("save these command on sqlite as well").

Schema: every voice transcript + trigger action + outcome stored for
later replay / audit / search.
"""
from __future__ import annotations
import sqlite3
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DB_PATH = REPO / "data" / "voice_history.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS voice_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    ts              TEXT NOT NULL DEFAULT (datetime('now', 'subsec')),
    session_id      TEXT,
    chunk_index     INTEGER,
    duration_sec    REAL,
    mic_source      TEXT,
    model           TEXT,
    raw_transcript  TEXT,
    trigger_word    TEXT,
    action          TEXT,
    typed_text      TEXT,
    audio_max_db    REAL,
    audio_mean_db   REAL,
    latency_ms      INTEGER,
    ok              BOOLEAN DEFAULT 1,
    error           TEXT
);

CREATE INDEX IF NOT EXISTS idx_voice_ts ON voice_history (ts DESC);
CREATE INDEX IF NOT EXISTS idx_voice_session ON voice_history (session_id);
CREATE INDEX IF NOT EXISTS idx_voice_trigger ON voice_history (trigger_word);

CREATE VIEW IF NOT EXISTS voice_recent AS
SELECT
    ts,
    substr(raw_transcript, 1, 80) AS transcript_preview,
    trigger_word,
    action,
    audio_max_db,
    latency_ms,
    ok
FROM voice_history
ORDER BY ts DESC
LIMIT 100;
"""


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)
    conn.commit()
    n = conn.execute("SELECT COUNT(*) FROM voice_history").fetchone()[0]
    print(f"voice_history.db ready at {DB_PATH} ({n} rows)")
    conn.close()


if __name__ == "__main__":
    init_db()
