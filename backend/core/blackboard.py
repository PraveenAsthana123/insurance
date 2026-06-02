"""blackboard — §77 row 1431, §64.43 #5 Shared Memory.

CAS-locked key-value store with namespacing + version-on-read.
SQLite WAL backend so multi-process agents can read/write without
clobbering each other.
"""
from __future__ import annotations
import json
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

REPO = Path(__file__).resolve().parents[2]
DB = REPO / "data" / "blackboard" / "blackboard.db"
DB.parent.mkdir(parents=True, exist_ok=True)


@contextmanager
def _conn() -> Iterator[sqlite3.Connection]:
    c = sqlite3.connect(DB)
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA busy_timeout=5000")
    try:
        yield c
        c.commit()
    finally:
        c.close()


with _conn() as _c:
    _c.execute("""CREATE TABLE IF NOT EXISTS bb(
        ns TEXT NOT NULL, key TEXT NOT NULL, value TEXT, version INTEGER NOT NULL,
        author TEXT, ts TEXT NOT NULL, PRIMARY KEY(ns, key))""")


def put(ns: str, key: str, value: Any, expected_version: int | None = None,
         author: str = "agent") -> tuple[bool, int]:
    """CAS write. Returns (succeeded, new_version). If expected_version is
    set and the current row's version differs, the write is rejected."""
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with _conn() as c:
        row = c.execute("SELECT version FROM bb WHERE ns=? AND key=?", (ns, key)).fetchone()
        if row is None:
            if expected_version not in (None, 0):
                return (False, 0)
            c.execute("INSERT INTO bb(ns,key,value,version,author,ts) VALUES(?,?,?,?,?,?)",
                      (ns, key, json.dumps(value), 1, author, ts))
            return (True, 1)
        current_version = row[0]
        if expected_version is not None and expected_version != current_version:
            return (False, current_version)
        new_version = current_version + 1
        c.execute("UPDATE bb SET value=?, version=?, author=?, ts=? WHERE ns=? AND key=?",
                  (json.dumps(value), new_version, author, ts, ns, key))
        return (True, new_version)


def get(ns: str, key: str) -> tuple[Any, int] | None:
    with _conn() as c:
        row = c.execute("SELECT value, version FROM bb WHERE ns=? AND key=?", (ns, key)).fetchone()
    if not row:
        return None
    return (json.loads(row[0]), row[1])


def list_ns(ns: str) -> list[dict]:
    with _conn() as c:
        rows = c.execute("SELECT key, value, version, author, ts FROM bb WHERE ns=? ORDER BY key", (ns,)).fetchall()
    return [{"key": k, "value": json.loads(v), "version": ver, "author": a, "ts": t}
            for k, v, ver, a, t in rows]


def delete(ns: str, key: str) -> bool:
    with _conn() as c:
        cur = c.execute("DELETE FROM bb WHERE ns=? AND key=?", (ns, key))
        return cur.rowcount > 0


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p_put = sub.add_parser("put"); p_put.add_argument("ns"); p_put.add_argument("key"); p_put.add_argument("value")
    p_get = sub.add_parser("get"); p_get.add_argument("ns"); p_get.add_argument("key")
    p_ls = sub.add_parser("ls"); p_ls.add_argument("ns")
    args = ap.parse_args()
    if args.cmd == "put":
        ok, ver = put(args.ns, args.key, args.value)
        print(json.dumps({"ok": ok, "version": ver}))
    elif args.cmd == "get":
        r = get(args.ns, args.key)
        print(json.dumps(r))
    elif args.cmd == "ls":
        print(json.dumps(list_ns(args.ns), indent=2))
