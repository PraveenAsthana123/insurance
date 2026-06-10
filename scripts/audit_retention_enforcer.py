#!/usr/bin/env python3
"""Audit log retention enforcer · Iter 32.

Per §47.7 + GDPR Art. 5(e) · data minimization · §38.3 audit retention:
  · Compliance-relevant rows: keep 7 years
  · Operational rows: keep 90 days
  · Activity log: keep 30 days

This runner trims in-memory + DB stores past retention windows.
Writes Markdown + JSON report under jobs/reports/retention/.

Cron: weekly Sun 02:30 UTC.
"""
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

REPORTS = REPO / "jobs/reports/retention"
REPORTS.mkdir(parents=True, exist_ok=True)

RETENTION = {
    "audit_chain": timedelta(days=2557),  # 7 years
    "activity":    timedelta(days=30),
    "comments":    timedelta(days=90),
    "deliveries":  timedelta(days=90),
}


def _evict_activity(now: datetime) -> dict:
    try:
        from alerts.router import _ACTIVITY
        cutoff = (now - RETENTION["activity"]).isoformat()
        before = len(_ACTIVITY)
        _ACTIVITY[:] = [r for r in _ACTIVITY if r.get("timestamp", "") > cutoff]
        return {"evicted": before - len(_ACTIVITY), "remaining": len(_ACTIVITY)}
    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}


def _evict_audit_chain(now: datetime) -> dict:
    try:
        from core.audit_chain import _CHAIN
        cutoff = (now - RETENTION["audit_chain"]).timestamp()
        before = len(_CHAIN)
        _CHAIN[:] = [r for r in _CHAIN if r.get("timestamp", 0) > cutoff]
        return {"evicted": before - len(_CHAIN), "remaining": len(_CHAIN)}
    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}


def _evict_comments(now: datetime) -> dict:
    try:
        from comments.router import _THREADS
        cutoff = (now - RETENTION["comments"]).isoformat()
        evicted = 0
        for k, t in list(_THREADS.items()):
            before = len(t)
            _THREADS[k] = [c for c in t if c.get("created_at", "") > cutoff]
            evicted += before - len(_THREADS[k])
        return {"evicted": evicted, "remaining_threads": len(_THREADS)}
    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}


def main() -> int:
    now = datetime.now(timezone.utc)
    report = {
        "timestamp": now.isoformat(),
        "retention_days": {k: v.days for k, v in RETENTION.items()},
        "results": {
            "audit_chain": _evict_audit_chain(now),
            "activity":    _evict_activity(now),
            "comments":    _evict_comments(now),
        },
    }
    json_path = REPORTS / f"retention-{now:%Y%m%d}.json"
    md_path = REPORTS / f"retention-{now:%Y%m%d}.md"
    json_path.write_text(json.dumps(report, indent=2))

    lines = [f"# Audit Retention · {now:%Y-%m-%d %H:%M:%S} UTC", ""]
    lines.append("| Store | Retention (days) | Evicted | Remaining |")
    lines.append("|---|---|---|---|")
    for store, r in report["results"].items():
        days = report["retention_days"].get(store, "—")
        ev = r.get("evicted", r.get("error", "—"))
        rem = r.get("remaining", r.get("remaining_threads", "—"))
        lines.append(f"| {store} | {days} | {ev} | {rem} |")
    md_path.write_text("\n".join(lines))

    print(f"Retention report → {md_path.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
