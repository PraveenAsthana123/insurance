#!/usr/bin/env python3
"""§C1 PENDING_TASKS closer · 10 behavioral audit assertions.

Per PENDING_TASKS_PLAN C1 review gate: replace `.exists()` structural
checks with `r.json()['count'] == N`-style behavioral checks that fail
when the BEHAVIOR breaks (not just when a file is renamed).

This script is the §43 drill for C1. Each assertion:
  - hits a live HTTP endpoint
  - asserts on the RESPONSE SHAPE / CONTENT
  - returns pass/fail with a structured reason

Cron: invoked by scripts/insur audit (or directly).
Exit code 0 on all-pass · 1 on any failure.
"""
from __future__ import annotations
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Callable
from zoneinfo import ZoneInfo

import httpx

TZ = ZoneInfo("America/Edmonton")
ROOT = Path("/mnt/deepa/insur_project")
BASE = os.environ.get("INSUR_BACKEND_URL", "http://localhost:8001")
HEADERS = {"X-Demo-Role": "manager", "Content-Type": "application/json"}


def stamp() -> str:
    return datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S MDT")


def _check(name: str, fn: Callable[[], dict]) -> dict:
    try:
        v = fn()
        v.setdefault("name", name)
        return v
    except Exception as e:
        return {"name": name, "status": "fail",
                "reason": f"{e.__class__.__name__}: {str(e)[:120]}"}


def a1_healthz_live() -> dict:
    r = httpx.get(f"{BASE}/healthz/live", timeout=4)
    return {"status": "pass" if r.status_code == 200 else "fail",
            "reason": f"HTTP {r.status_code}"}


def a2_service_health_processes_5_alive() -> dict:
    r = httpx.get(f"{BASE}/api/v1/service-health/processes", timeout=4)
    d = r.json()
    alive = d.get("summary", {}).get("alive", 0)
    total = d.get("summary", {}).get("total", 0)
    return {"status": "pass" if alive == total and total >= 5 else "fail",
            "reason": f"alive={alive}/{total}"}


def a3_top1pct_grade_A() -> dict:
    r = httpx.get(f"{BASE}/api/v1/test-catalog/top-1pct-report", timeout=8)
    d = r.json()
    grade = d["summary"]["overall_grade"]
    passing = d["summary"]["n_passing_80pct"]
    return {"status": "pass" if grade == "A" and passing >= 10 else "fail",
            "reason": f"grade={grade} n_passing={passing}"}


def a4_advisor_p0_zero() -> dict:
    r = httpx.post(f"{BASE}/api/v1/missing-items-advisor/scan",
                   headers=HEADERS, timeout=30)
    d = r.json()
    p0 = d["summary"].get("P0_critical", 0)
    p1 = d["summary"].get("P1_high", 0)
    return {"status": "pass" if p0 == 0 and p1 == 0 else "fail",
            "reason": f"P0={p0} P1={p1}"}


def a5_mcp_servers_at_least_4() -> dict:
    r = httpx.get(f"{BASE}/api/v1/agentic/mcp-servers",
                  headers=HEADERS, timeout=8)
    d = r.json()
    return {"status": "pass" if d["count"] >= 4 else "fail",
            "reason": f"mcp_count={d['count']}"}


def a6_verification_gates_count_9() -> dict:
    r = httpx.get(f"{BASE}/api/v1/verification/gates",
                  headers=HEADERS, timeout=4)
    d = r.json()
    return {"status": "pass" if d["n_gates"] == 9 else "fail",
            "reason": f"n_gates={d['n_gates']}"}


def a7_verification_run_pii_fails() -> dict:
    r = httpx.post(f"{BASE}/api/v1/verification/run", headers=HEADERS, timeout=8,
                   json={"invocation_id": "AUDIT-C1-PII",
                         "output_text": "SSN 123-45-6789 leaked"})
    d = r.json()
    pii = d["verdicts"]["pii"]
    return {"status": "pass" if pii["status"] == "fail" else "fail",
            "reason": f"pii.status={pii['status']} (expected fail)"}


def a8_intervention_404_on_missing() -> dict:
    r = httpx.post(f"{BASE}/api/v1/agentic/invocations/INV-DOES-NOT-EXIST/decide",
                   headers=HEADERS, timeout=4,
                   json={"decision": "approve"})
    return {"status": "pass" if r.status_code == 404 else "fail",
            "reason": f"HTTP {r.status_code} (expected 404)"}


def a9_status_agents_min_7() -> dict:
    r = httpx.get(f"{BASE}/api/v1/status-agents/all", timeout=8)
    d = r.json()
    n = len(d.get("status_agents", []))
    return {"status": "pass" if n >= 7 else "fail",
            "reason": f"status_agents={n}"}


def a10_pending_tasks_done_count() -> dict:
    r = httpx.get(f"{BASE}/api/v1/status-agents/all", timeout=8)
    d = r.json()
    pt = next((a for a in d["status_agents"]
               if "pending" in a.get("label", "").lower()), None)
    if not pt:
        return {"status": "fail", "reason": "pending tasks agent missing"}
    metrics = pt.get("metrics", {})
    done = metrics.get("done", 0)
    return {"status": "pass" if done >= 10 else "fail",
            "reason": f"done={done} (expected >=10)"}


ASSERTIONS = [
    a1_healthz_live,
    a2_service_health_processes_5_alive,
    a3_top1pct_grade_A,
    a4_advisor_p0_zero,
    a5_mcp_servers_at_least_4,
    a6_verification_gates_count_9,
    a7_verification_run_pii_fails,
    a8_intervention_404_on_missing,
    a9_status_agents_min_7,
    a10_pending_tasks_done_count,
]


def main() -> None:
    results: list[dict] = []
    for fn in ASSERTIONS:
        results.append(_check(fn.__name__, fn))

    n_pass = sum(1 for r in results if r["status"] == "pass")
    n_fail = len(results) - n_pass

    report = {
        "ts_local": stamp(),
        "n_assertions": len(results),
        "n_pass": n_pass,
        "n_fail": n_fail,
        "overall": "PASS" if n_fail == 0 else "FAIL",
        "policy_refs": ["§C1 PENDING_TASKS", "§43 drill", "§57.7 honest"],
        "results": results,
    }

    out_dir = ROOT / "jobs" / "reports" / "behavioral-smoke"
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(TZ).strftime("%Y%m%d_%H%M")
    (out_dir / f"audit-{ts}.json").write_text(json.dumps(report, indent=2))

    print(json.dumps({k: v for k, v in report.items() if k != "results"}, indent=2))
    print()
    for r in results:
        mark = "ok" if r["status"] == "pass" else "FAIL"
        print(f"  [{mark}] {r['name']:50} · {r['reason']}")

    sys.exit(0 if n_fail == 0 else 1)


if __name__ == "__main__":
    main()
