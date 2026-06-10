"""/api/v1/migrations/* · Iter 33 · schema migration tracker."""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/migrations", tags=["migrations"])

MIGRATIONS_DIR = Path(__file__).parent.parent / "migrations"


def _applied_from_db() -> set[str]:
    try:
        import psycopg2
        from core.config import get_settings
        with psycopg2.connect(get_settings().database_url) as c, c.cursor() as cur:
            cur.execute("SELECT migration_name FROM _migrations ORDER BY applied_at")
            return {row[0] for row in cur.fetchall()}
    except Exception:
        return set()


def _all_on_disk() -> list[str]:
    if not MIGRATIONS_DIR.exists():
        return []
    return sorted(p.name for p in MIGRATIONS_DIR.glob("*.sql"))


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "migrations",
        "directory": str(MIGRATIONS_DIR),
    }


@router.get("")
def list_migrations():
    applied = _applied_from_db()
    on_disk = _all_on_disk()
    rows = []
    for name in on_disk:
        rows.append({
            "name": name,
            "applied": name in applied,
            "kind": name.split("_", 1)[1].split(".")[0] if "_" in name else "unknown",
        })
    pending = [r for r in rows if not r["applied"]]
    return {
        "migrations": rows,
        "count": len(rows),
        "applied": len(applied),
        "on_disk": len(on_disk),
        "pending": len(pending),
        "pending_names": [r["name"] for r in pending],
        "db_reachable": len(applied) > 0 or os.environ.get("INSUR_SKIP_MIGRATIONS") == "1",
    }


@router.get("/{name}")
def get_migration(name: str):
    path = MIGRATIONS_DIR / name
    if not path.exists():
        return {"name": name, "exists": False}
    body = path.read_text()
    return {
        "name": name,
        "exists": True,
        "applied": name in _applied_from_db(),
        "size_bytes": len(body),
        "preview": body[:500],
    }
