#!/usr/bin/env python3
"""Campaign schedule executor · cron-friendly.

Per operator 2026-06-08: "schedule of campaign daily, weekly, monthly"

Reads /api/v1/content-ops/schedules/due via in-process TestClient (no
HTTP server required) · for each due schedule, POSTs /execute against
the associated marketing_campaign · updates next_run_at + last_run_at.

Install via cron every 15 min:
  */15 * * * * /path/to/venv/bin/python scripts/run_due_schedules.py \\
                > jobs/logs/scheduler-$(date +%Y%m%d).log 2>&1

Per §38.3 (audit per execution) · §47.4 (correlation_id) · §70 (cron
pattern) · §82.7 (last_run_status surface for drift detection).
"""
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
logging.disable(logging.CRITICAL)


def _next_run_after(schedule, now):
    """Compute the next next_run_at after the just-fired one."""
    cadence = schedule["cadence"]
    if cadence == "once":
        return None  # one-shot · disable after first run
    if cadence == "daily":
        return now + timedelta(days=1)
    if cadence == "weekly":
        return now + timedelta(days=7)
    if cadence == "monthly":
        # rough: 30 days · operator can refine with proper month math
        return now + timedelta(days=30)
    return None


def main() -> int:
    print(f"Schedule executor · {datetime.now(timezone.utc).isoformat()}\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    try:
        from main import create_app
        from fastapi.testclient import TestClient
        from core.config import get_settings
        import psycopg2
    except ImportError as e:
        print(f"  ✗ FATAL: {e}")
        return 1

    app = create_app()
    client = TestClient(app)

    # 1. Fetch due
    r = client.get("/api/v1/content-ops/schedules/due")
    if r.status_code != 200:
        print(f"  ✗ FATAL · /schedules/due returned {r.status_code}")
        return 1
    due = r.json()
    print(f"  1. fetched due schedules · n={len(due)}")
    if not due:
        print("  → nothing to do")
        return 0

    # 2. For each due · execute the associated campaign + update schedule
    success = 0
    failed = 0
    now = datetime.now(timezone.utc)
    settings = get_settings()

    for sched in due:
        sid = sched["id"]
        cid = sched["campaign_id"]
        # Execute
        r = client.post(f"/api/v1/marketing-campaigns/{cid}/execute", json={})
        ok = r.status_code == 200
        runs_created = r.json().get("runs_created", 0) if ok else 0

        # Update schedule: last_run + next_run
        next_run = _next_run_after(sched, now)
        status = "ok" if ok else "failed"
        try:
            with psycopg2.connect(settings.database_url) as c, c.cursor() as cur:
                cur.execute(
                    """
                    UPDATE campaign_schedules
                    SET last_run_at = NOW(),
                        last_run_status = %s,
                        run_count = run_count + 1,
                        next_run_at = %s,
                        enabled = CASE WHEN %s IS NULL THEN FALSE ELSE enabled END
                    WHERE id = %s
                    """,
                    (status, next_run, next_run, sid),
                )
                c.commit()
        except Exception as e:
            print(f"  ✗ UPDATE failed for schedule {sid}: {e}")
            failed += 1
            continue

        if ok:
            success += 1
            print(f"  ▶ sched {sid:>4} · campaign {cid:>4} · cadence={sched['cadence']:<7}"
                  f" runs={runs_created} · next={next_run.isoformat() if next_run else 'DISABLED'}")
        else:
            failed += 1
            print(f"  ✗ sched {sid:>4} · campaign {cid:>4} · execute failed")

    print(f"\n  Summary: {success} executed · {failed} failed of {len(due)} due")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
