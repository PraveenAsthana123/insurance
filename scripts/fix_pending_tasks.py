#!/usr/bin/env python3
"""Self-healing cron · fix all known pending tasks · Iter 48.

Per global agentic-quality-benchmarks policy + operator brief
'create plan for all pending task · cron and fix'.

Scans for repairable issues + auto-fixes them. Schedule: every 4h.
"""
import json
import logging
import os
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO)); sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

REPORTS = REPO / "jobs/reports/pending-tasks"
REPORTS.mkdir(parents=True, exist_ok=True)

ACTIONS = []


def _log(action: str, detail: str, ok: bool):
    mark = "✓" if ok else "✗"
    ACTIONS.append({"action": action, "detail": detail, "ok": ok})
    print(f"  {mark} {action} · {detail}")


def check_ollama() -> bool:
    """Fix #1 · verify Ollama is reachable; if so · export env for downstream."""
    try:
        import httpx
        r = httpx.get(os.environ.get("OLLAMA_URL", "http://localhost:11434") + "/api/tags",
                      timeout=2)
        if r.status_code == 200:
            tags = r.json().get("models", [])
            _log("Ollama reachable", f"{len(tags)} model(s) installed", True)
            return True
        _log("Ollama reachable", f"HTTP {r.status_code}", False)
        return False
    except Exception as e:
        _log("Ollama reachable", f"{type(e).__name__}", False)
        return False


def fix_coverage_below_95() -> None:
    """Fix #2 · if coverage <95% re-run agentic_coverage_loop."""
    try:
        import psycopg2, psycopg2.extras
        from core.config import get_settings
        with psycopg2.connect(get_settings().database_url) as c, c.cursor() as cur:
            cur.execute("""
                SELECT
                  COUNT(*) FILTER (WHERE agent_id LIKE 'sys_%' AND status='Active') AS sys,
                  COUNT(*) FILTER (WHERE agent_id NOT LIKE 'sys_%' AND status='Active') AS biz
                FROM agent_registry
            """)
            row = cur.fetchone()
        if row[0] < 30:  # we have ~52 system agents · drop = need re-run
            r = subprocess.run([sys.executable, str(REPO / "scripts/agentic_coverage_loop.py")],
                               capture_output=True, text=True, timeout=60)
            _log("Coverage re-run", f"agents: sys={row[0]} biz={row[1]} · rerun rc={r.returncode}", r.returncode == 0)
        else:
            _log("Coverage OK", f"sys={row[0]} biz={row[1]} · no rerun needed", True)
    except Exception as e:
        _log("Coverage check", str(e)[:80], False)


def auto_close_stale_hitl(hours: int = 24) -> None:
    """Fix #3 · pending HITL invocations older than N hours · mark Cancelled."""
    try:
        import psycopg2
        from core.config import get_settings
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        with psycopg2.connect(get_settings().database_url) as c, c.cursor() as cur:
            cur.execute("""
                UPDATE agent_invocation
                SET status = 'Cancelled',
                    error_text = COALESCE(error_text, '') || ' · auto-cancelled by fix_pending_tasks > ' || %s || 'h'
                WHERE status = 'PendingApproval'
                  AND created_at < %s
                RETURNING invocation_id
            """, (hours, cutoff))
            cancelled = cur.fetchall()
        _log("Stale HITL auto-cancel",
             f"{len(cancelled)} invocation(s) older than {hours}h cancelled",
             True)
    except Exception as e:
        _log("Stale HITL auto-cancel", str(e)[:80], False)


def regenerate_stale_catalogs(days: int = 7) -> None:
    """Fix #4 · catalogs older than N days · regenerate."""
    docs = REPO / "docs"
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    for name in ["AGENT_CATALOG.md", "SKILL_CATALOG.md"]:
        p = docs / name
        if not p.exists() or datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc) < cutoff:
            try:
                r = subprocess.run([sys.executable, str(REPO / "scripts/generate_catalogs.py")],
                                   capture_output=True, text=True, timeout=30)
                _log(f"Regen {name}", f"rc={r.returncode}", r.returncode == 0)
                break  # script regens both at once
            except Exception as e:
                _log(f"Regen {name}", str(e)[:80], False)
                break
    else:
        _log("Catalogs fresh", f"both modified within {days}d", True)


def regenerate_stale_contracts(days: int = 30) -> None:
    """Fix #5 · Pydantic contracts older than N days · regen Zod."""
    manifest = REPO / "backend/contracts/MANIFEST.json"
    if not manifest.exists() or \
       datetime.fromtimestamp(manifest.stat().st_mtime, tz=timezone.utc) < \
       datetime.now(timezone.utc) - timedelta(days=days):
        try:
            r = subprocess.run([sys.executable, str(REPO / "scripts/export_pydantic_schemas.py")],
                               capture_output=True, text=True, timeout=30)
            _log("Regen contracts", f"rc={r.returncode}", r.returncode == 0)
        except Exception as e:
            _log("Regen contracts", str(e)[:80], False)
    else:
        _log("Contracts fresh", f"within {days}d", True)


def main() -> int:
    ts = datetime.now(timezone.utc)
    print(f"Fix pending tasks · {ts:%Y-%m-%d %H:%M:%S} UTC")

    check_ollama()
    fix_coverage_below_95()
    auto_close_stale_hitl()
    regenerate_stale_catalogs()
    regenerate_stale_contracts()

    n_ok = sum(1 for a in ACTIONS if a["ok"])
    n_total = len(ACTIONS)
    print(f"\n  {n_ok}/{n_total} actions succeeded")

    # Write report
    rpt = REPORTS / f"fix-{ts:%Y%m%d_%H%M}.json"
    rpt.write_text(json.dumps({"ts": ts.isoformat(), "actions": ACTIONS,
                                "n_ok": n_ok, "n_total": n_total}, indent=2))
    print(f"  Report → {rpt.relative_to(REPO)}")
    return 0 if n_ok == n_total else 1


if __name__ == "__main__":
    sys.exit(main())
