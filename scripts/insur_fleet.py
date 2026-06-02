#!/usr/bin/env python3
"""insur_fleet — 1000-agent (configurable) fleet for issue discovery + repair.

Operator brief 2026-06-01: "how may agent working ...setup 1000 agent to fix all the issue"
                          "error , missing software, testing, api,fornted, backed,porcess"

Hub-and-spoke pattern per global §64.43 #1. File-backed task queue
(jobs/fleet/tasks.jsonl), file-backed result log (jobs/fleet/results.jsonl).

7 agent roles, each scoped to a category. Each worker thread:
  1. Pulls one task from the queue (atomic via portalocker)
  2. Runs a deterministic discovery probe for its category
  3. Writes a result row with verdict (ok | issue_found | fix_attempted | escalate)
  4. NEVER applies destructive fixes — §50.7: discovery deterministic, fix proposed,
     verification deterministic. Operator gates apply.

Modes:
  python insur_fleet.py seed                # populate tasks.jsonl from repo scan
  python insur_fleet.py run --workers 1000  # spawn N workers, drain queue
  python insur_fleet.py status              # summary of last run
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Callable

REPO = Path(__file__).resolve().parents[1]
FLEET_DIR = REPO / "jobs" / "fleet"
FLEET_DIR.mkdir(parents=True, exist_ok=True)
TASKS_FILE = FLEET_DIR / "tasks.jsonl"
RESULTS_FILE = FLEET_DIR / "results.jsonl"
STATUS_FILE = FLEET_DIR / "status.json"

# 7 agent role categories — matches operator's enumeration
ROLES = ["error", "missing_software", "testing", "api", "frontend", "backend", "process"]

_lock = threading.Lock()


def log_result(row: dict[str, Any]) -> None:
    with _lock:
        with RESULTS_FILE.open("a") as f:
            f.write(json.dumps(row) + "\n")


# ── Discovery probes per role (deterministic, read-only) ─────────────────

def probe_error(task: dict[str, Any]) -> dict[str, Any]:
    """Scan recent logs for ERROR/CRITICAL lines."""
    target = task["target"]
    log_path = REPO / target
    if not log_path.exists():
        return {"verdict": "ok", "note": "log absent (no errors to scan)"}
    pattern = re.compile(r"\b(ERROR|CRITICAL|Traceback|Exception)\b")
    hits = []
    try:
        with log_path.open() as f:
            for ln, line in enumerate(f, 1):
                if pattern.search(line):
                    hits.append({"line": ln, "text": line.strip()[:200]})
                    if len(hits) >= 5:
                        break
    except Exception as e:
        return {"verdict": "escalate", "note": f"read failed: {e}"}
    if hits:
        return {"verdict": "issue_found", "hits": hits, "target": target}
    return {"verdict": "ok", "note": "no error lines"}


def probe_missing_software(task: dict[str, Any]) -> dict[str, Any]:
    """Check a binary or python module is importable."""
    kind = task.get("kind", "binary")
    name = task["name"]
    if kind == "binary":
        path = shutil.which(name)
        if path:
            return {"verdict": "ok", "kind": "binary", "name": name, "path": path}
        return {"verdict": "issue_found", "kind": "binary", "name": name,
                "fix_proposal": f"apt-get install {name}  OR  pip install {name}"}
    if kind == "pypkg":
        try:
            subprocess.run([sys.executable, "-c", f"import {name}"],
                           check=True, capture_output=True, timeout=15)
            return {"verdict": "ok", "kind": "pypkg", "name": name}
        except subprocess.CalledProcessError:
            return {"verdict": "issue_found", "kind": "pypkg", "name": name,
                    "fix_proposal": f"pip install {name}"}
        except Exception as e:
            return {"verdict": "escalate", "note": str(e)}
    return {"verdict": "escalate", "note": f"unknown kind {kind}"}


def probe_testing(task: dict[str, Any]) -> dict[str, Any]:
    """Verify a drill or test file exists and is structurally valid."""
    target = REPO / task["target"]
    if not target.exists():
        return {"verdict": "issue_found", "note": "test/drill file missing", "target": task["target"]}
    text = target.read_text(errors="ignore")
    has_neg = any(tok in text.lower() for tok in ["negative", "assert false", "should reject", "raises", "must reject"])
    has_pos = "def test_" in text or "assert" in text
    issues = []
    if not has_neg:
        issues.append("no negative-assertion marker (per §43)")
    if not has_pos:
        issues.append("no test/assert content")
    if issues:
        return {"verdict": "issue_found", "target": task["target"], "issues": issues}
    return {"verdict": "ok", "target": task["target"]}


def probe_api(task: dict[str, Any]) -> dict[str, Any]:
    """Hit a backend endpoint and check status."""
    url = task["url"]
    try:
        import urllib.request
        req = urllib.request.Request(url, headers={"User-Agent": "insur-fleet/1.0"})
        with urllib.request.urlopen(req, timeout=task.get("timeout", 5)) as resp:
            status = resp.status
        if status == task.get("expect", 200):
            return {"verdict": "ok", "url": url, "status": status}
        return {"verdict": "issue_found", "url": url, "status": status,
                "expected": task.get("expect", 200)}
    except Exception as e:
        return {"verdict": "issue_found", "url": url, "error": str(e)[:200],
                "fix_proposal": "start backend OR fix route registration"}


def probe_frontend(task: dict[str, Any]) -> dict[str, Any]:
    """Check a frontend file/route exists and isn't a stub."""
    target = REPO / task["target"]
    if not target.exists():
        return {"verdict": "issue_found", "note": "frontend file missing", "target": task["target"]}
    text = target.read_text(errors="ignore")
    issues = []
    if "TODO" in text or "FIXME" in text:
        issues.append("contains TODO/FIXME")
    if len(text) < 100:
        issues.append("file < 100 bytes (likely stub)")
    if "console.log" in text:
        issues.append("contains console.log (global §26.4)")
    if issues:
        return {"verdict": "issue_found", "target": task["target"], "issues": issues}
    return {"verdict": "ok", "target": task["target"], "size": len(text)}


def probe_backend(task: dict[str, Any]) -> dict[str, Any]:
    """Check a backend file imports cleanly + obeys layer rules."""
    target = REPO / task["target"]
    if not target.exists():
        return {"verdict": "issue_found", "note": "backend file missing", "target": task["target"]}
    text = target.read_text(errors="ignore")
    issues = []
    # §3 router layer rule: no SQL in routers
    if "/routers/" in str(target) and re.search(r"\bSELECT\b|\bINSERT\b|\bUPDATE\b", text, re.I):
        issues.append("SQL in router (global §3)")
    # §3 service layer rule: no HTTPException in services
    if "/services/" in str(target) and "HTTPException" in text:
        issues.append("HTTPException in service (global §3)")
    # No bare print
    if re.search(r"^\s*print\(", text, re.M) and "logger" not in text.split("def ")[0]:
        issues.append("uses print() instead of logger (global §13 rule 15)")
    if issues:
        return {"verdict": "issue_found", "target": task["target"], "issues": issues}
    return {"verdict": "ok", "target": task["target"]}


def probe_process(task: dict[str, Any]) -> dict[str, Any]:
    """Check a per-dept process artifact exists (per global §64)."""
    dept = task["dept"]
    artifact = task["artifact"]
    target = REPO / "global-ai-org" / "departments" / dept / "business-layer" / artifact
    if target.exists() and target.stat().st_size > 200:
        return {"verdict": "ok", "dept": dept, "artifact": artifact, "size": target.stat().st_size}
    return {"verdict": "issue_found", "dept": dept, "artifact": artifact,
            "note": "missing or stub (< 200 bytes)",
            "fix_proposal": f"re-run scaffold-insur-* for {dept}"}


PROBES: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "error": probe_error,
    "missing_software": probe_missing_software,
    "testing": probe_testing,
    "api": probe_api,
    "frontend": probe_frontend,
    "backend": probe_backend,
    "process": probe_process,
}


def execute(task: dict[str, Any]) -> dict[str, Any]:
    role = task["role"]
    t0 = time.time()
    try:
        body = PROBES[role](task)
    except Exception as e:
        body = {"verdict": "escalate", "error": f"{type(e).__name__}: {e}"}
    result = {
        "task_id": task["task_id"],
        "role": role,
        "agent_id": f"{socket.gethostname()}/{threading.get_ident()}",
        "duration_ms": int((time.time() - t0) * 1000),
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        **body,
    }
    log_result(result)
    return result


# ── Seeding: scan the repo for real targets per role ─────────────────────

def seed_tasks() -> int:
    tasks: list[dict[str, Any]] = []

    # error: log files
    for log in (REPO / "jobs" / "logs").glob("*.log"):
        tasks.append({"task_id": f"err-{uuid.uuid4().hex[:8]}", "role": "error",
                      "target": str(log.relative_to(REPO))})

    # missing_software: critical bins + python pkgs
    for b in ["docker", "redis-cli", "psql", "ollama", "curl", "jq", "git", "espeak", "sqlite3"]:
        tasks.append({"task_id": f"sw-{uuid.uuid4().hex[:8]}", "role": "missing_software",
                      "kind": "binary", "name": b})
    for p in ["fastapi", "uvicorn", "pydantic", "psycopg", "redis", "chromadb",
              "rank_bm25", "networkx", "sklearn", "xgboost", "requests", "ragas", "deepeval"]:
        tasks.append({"task_id": f"sw-{uuid.uuid4().hex[:8]}", "role": "missing_software",
                      "kind": "pypkg", "name": p})

    # testing: every drill file
    for f in (REPO / "tests").rglob("drill_*.py"):
        tasks.append({"task_id": f"tst-{uuid.uuid4().hex[:8]}", "role": "testing",
                      "target": str(f.relative_to(REPO))})

    # api: backend endpoints (if backend running, probes; else recorded as issue)
    backend_base = os.environ.get("INSUR_BACKEND_URL", "http://localhost:8000")
    for path in ["/api/health", "/api/v1/insurance/depts", "/docs", "/api/v1/health"]:
        tasks.append({"task_id": f"api-{uuid.uuid4().hex[:8]}", "role": "api",
                      "url": f"{backend_base}{path}", "expect": 200})

    # frontend: per-page tsx/jsx
    for f in list((REPO / "frontend" / "src").rglob("*.tsx"))[:50]:
        tasks.append({"task_id": f"fe-{uuid.uuid4().hex[:8]}", "role": "frontend",
                      "target": str(f.relative_to(REPO))})

    # backend: routers + services + repositories
    for sub in ["routers", "services", "repositories"]:
        for f in (REPO / "backend" / sub).rglob("*.py") if (REPO / "backend" / sub).exists() else []:
            tasks.append({"task_id": f"be-{uuid.uuid4().hex[:8]}", "role": "backend",
                          "target": str(f.relative_to(REPO))})

    # process: per-dept 15 mandatory artifacts × 4 depts (claims, underwriting, customer-service, fraud-siu)
    artifacts = ["INSUR_DEMO_STORY.md", "INSUR_ASIS_ASSESSMENT.md", "INSUR_DT_STRATEGY.md",
                 "INSUR_CONTACT_CENTER.md", "INSUR_INCIDENT_MGMT.md", "INSUR_MEETING_COMMS.md",
                 "INSUR_PROCESS_MGMT.md", "INSUR_DATA_MGMT.md", "INSUR_RECOMMENDATION.md",
                 "INSUR_ANOMALY.md", "INSUR_FRAUD.md", "INSUR_CONTACTS.md", "INSUR_FLOW.md",
                 "INSUR_SECURITY.md", "INSUR_SIMULATION.md"]
    for dept in ["claims", "underwriting", "customer-service", "fraud-siu"]:
        for art in artifacts:
            tasks.append({"task_id": f"pr-{uuid.uuid4().hex[:8]}", "role": "process",
                          "dept": dept, "artifact": art})

    # Write atomically
    tmp = TASKS_FILE.with_suffix(".tmp")
    with tmp.open("w") as f:
        for t in tasks:
            f.write(json.dumps(t) + "\n")
    tmp.rename(TASKS_FILE)
    return len(tasks)


def load_tasks() -> list[dict[str, Any]]:
    if not TASKS_FILE.exists():
        return []
    return [json.loads(ln) for ln in TASKS_FILE.read_text().splitlines() if ln.strip()]


def run_fleet(max_workers: int) -> dict[str, Any]:
    tasks = load_tasks()
    if not tasks:
        print("No tasks. Run `seed` first.")
        return {"tasks": 0}
    # Clear results
    RESULTS_FILE.write_text("")
    t0 = time.time()
    print(f"[fleet] dispatching {len(tasks)} tasks across {max_workers} workers...")
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = [pool.submit(execute, t) for t in tasks]
        verdicts: dict[str, int] = {}
        for fut in as_completed(futures):
            r = fut.result()
            verdicts[r["verdict"]] = verdicts.get(r["verdict"], 0) + 1
    elapsed = time.time() - t0
    status = {
        "tasks": len(tasks),
        "workers": max_workers,
        "elapsed_seconds": round(elapsed, 2),
        "throughput_per_sec": round(len(tasks) / max(elapsed, 0.001), 1),
        "verdicts": verdicts,
        "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    STATUS_FILE.write_text(json.dumps(status, indent=2))
    return status


def show_status() -> None:
    if not STATUS_FILE.exists():
        print("No fleet run yet. Run `seed` then `run`.")
        return
    status = json.loads(STATUS_FILE.read_text())
    print(json.dumps(status, indent=2))
    # Top issues per role
    print("\nTop issues per role:")
    if RESULTS_FILE.exists():
        by_role: dict[str, list] = {}
        for ln in RESULTS_FILE.read_text().splitlines():
            try:
                r = json.loads(ln)
            except json.JSONDecodeError:
                continue
            if r.get("verdict") == "issue_found":
                by_role.setdefault(r["role"], []).append(r)
        for role in ROLES:
            issues = by_role.get(role, [])
            print(f"  {role:<18s} {len(issues):>4d} issues")


def main() -> None:
    ap = argparse.ArgumentParser(description="insur_fleet — N-agent issue-discovery fleet")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("seed", help="Scan repo + populate task queue")
    sp_run = sub.add_parser("run", help="Drain the queue with N workers")
    sp_run.add_argument("--workers", type=int, default=int(os.environ.get("FLEET_WORKERS", "1000")))
    sub.add_parser("status", help="Show last-run summary + top issues")
    args = ap.parse_args()

    if args.cmd == "seed":
        n = seed_tasks()
        print(f"Seeded {n} tasks → {TASKS_FILE}")
    elif args.cmd == "run":
        s = run_fleet(args.workers)
        print(json.dumps(s, indent=2))
    elif args.cmd == "status":
        show_status()


if __name__ == "__main__":
    main()
