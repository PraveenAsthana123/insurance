#!/usr/bin/env python3
"""§44 + §150 · autonomous fix-all-pending loop · cron-driven.

Per operator directive 2026-06-12 14:30 MDT: "fix all · create plan ·
cron job · complete all" + 14:32 MDT: "no need to ask approval · complete
autonomously."

Each tick:
  1. Read docs/PENDING_TASKS_PLAN.md
  2. Find the next ⏳ or 🔄 task with a registered closer
  3. Run the closer (must be idempotent)
  4. Verify outcome
  5. If verified: mark ✅ in plan + git commit
  6. Exit

Operates ENTIRELY within §106 safe-allowlist:
  - INSERT / append-only audit operations
  - File creates / edits in repo
  - Doc updates
  - Mark stale-done when reality already exceeds plan

NEVER:
  - touches secrets or vault
  - pushes to remote (§42 still gated)
  - mutates High-risk approval_request rows (§103.5)

Stop conditions:
  - 0 ⏳/🔄 tasks remain
  - 5 consecutive failures on same task → write blocker report + skip
  - exception in main loop → log + exit non-zero

Cron: `*/15 * * * *` per INSUR-FIX-ALL-PENDING tag.
"""
from __future__ import annotations
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Callable
from zoneinfo import ZoneInfo

TZ = ZoneInfo("America/Edmonton")
ROOT = Path("/mnt/deepa/insur_project")
PLAN = ROOT / "docs/PENDING_TASKS_PLAN.md"
LOG_DIR = ROOT / "jobs/logs"
STATE_DIR = ROOT / "jobs/state"
LOG_DIR.mkdir(parents=True, exist_ok=True)
STATE_DIR.mkdir(parents=True, exist_ok=True)
STATE_FILE = STATE_DIR / "fix_all_pending.json"
LOG_FILE = LOG_DIR / "fix_all_pending.log"

VENV = "/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"


def stamp() -> str:
    return datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S MDT")


def log(msg: str) -> None:
    line = f"[{stamp()}] {msg}"
    print(line, flush=True)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


def read_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except json.JSONDecodeError:
            pass
    return {"failed_counts": {}, "last_run_utc": None}


def write_state(state: dict) -> None:
    state["last_run_utc"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    STATE_FILE.write_text(json.dumps(state, indent=2))


# ──────────────────────────────────────────────────────────────────────
# Closers: each returns (success: bool, message: str)
#
# Closers run idempotently · they should be no-ops if the task is
# already closed. Each closer also performs the verification step so
# the loop only needs the boolean.

def close_b2() -> tuple[bool, str]:
    """B2 · register 5 kernel tools."""
    env = {**os.environ,
           "BEV_POSTGRES_HOST": "localhost", "BEV_POSTGRES_PORT": "5434",
           "BEV_POSTGRES_USER": "insur_user",
           "BEV_POSTGRES_PASSWORD": "insur_secret_password",
           "BEV_POSTGRES_DB": "insur_analytics"}
    r = subprocess.run(
        [VENV, str(ROOT / "scripts/register_b2_kernel_tools.py")],
        cwd=str(ROOT), capture_output=True, text=True, timeout=60, env=env,
    )
    if r.returncode != 0:
        return False, f"runner exit {r.returncode}: {r.stderr[:200]}"
    # Verify ≥5 kernel tools exist
    import psycopg2
    conn = psycopg2.connect(
        host="localhost", port=5434, user="insur_user",
        password="insur_secret_password", dbname="insur_analytics"
    )
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM kernel_tool_registry WHERE status='active'")
        n = cur.fetchone()[0]
    conn.close()
    return n >= 5, f"kernel_tool_registry count={n}"


def close_b3() -> tuple[bool, str]:
    """B3 · KB ≥ 50 docs."""
    import psycopg2
    conn = psycopg2.connect(
        host="localhost", port=5434, user="insur_user",
        password="insur_secret_password", dbname="insur_analytics"
    )
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM knowledge_base")
        n = cur.fetchone()[0]
    conn.close()
    return n >= 50, f"knowledge_base count={n}"


def close_b4() -> tuple[bool, str]:
    """B4 · MCPs in registry."""
    import psycopg2
    conn = psycopg2.connect(
        host="localhost", port=5434, user="insur_user",
        password="insur_secret_password", dbname="insur_analytics"
    )
    with conn.cursor() as cur:
        cur.execute("SELECT mcp_id FROM mcp_server_registry")
        ids = [r[0] for r in cur.fetchall()]
    conn.close()
    return len(ids) >= 3, f"mcp_server_registry ids={ids}"


def close_b5() -> tuple[bool, str]:
    """B5 · /verification/gates endpoint returns 9 gates."""
    import httpx
    try:
        r = httpx.get("http://localhost:8001/api/v1/verification/gates",
                      headers={"X-Demo-Role": "manager"}, timeout=5)
        n = r.json().get("n_gates", 0)
        return n == 9, f"verification gates n={n}"
    except Exception as e:
        return False, f"probe failed: {e.__class__.__name__}"


def close_c1() -> tuple[bool, str]:
    """C1 · behavioral audit runs and all 10 pass."""
    r = subprocess.run(
        [VENV, str(ROOT / "scripts/audit_behavioral_smoke.py")],
        cwd=str(ROOT), capture_output=True, text=True, timeout=90,
    )
    # exit 0 = all pass
    return r.returncode == 0, f"behavioral-smoke exit {r.returncode}"


def close_c2() -> tuple[bool, str]:
    """C2 · .github/workflows/contracts.yml exists."""
    f = ROOT / ".github/workflows/contracts.yml"
    if not f.exists():
        return False, "workflow file missing"
    return "pydantic-zod-drift" in f.read_text(), "workflow_file_present"


def close_d1() -> tuple[bool, str]:
    """D1 · GET /agentic/mcp-servers returns rows."""
    import httpx
    try:
        r = httpx.get("http://localhost:8001/api/v1/agentic/mcp-servers",
                      headers={"X-Demo-Role": "manager"}, timeout=5)
        n = r.json().get("count", 0)
        return n >= 1, f"mcp-servers endpoint count={n}"
    except Exception as e:
        return False, f"probe failed: {e.__class__.__name__}"


def close_e1() -> tuple[bool, str]:
    """E1 · Dockerfile at repo root."""
    f = ROOT / "Dockerfile"
    if not f.exists():
        return False, "Dockerfile missing"
    txt = f.read_text()
    if "FROM python" not in txt:
        return False, "Dockerfile missing FROM python"
    return True, "dockerfile_present"


def close_f1() -> tuple[bool, str]:
    """F1 · scripts/rotate_jwt_secret.py exists + .env.template has INSUR_JWT_SECRET."""
    rotator = ROOT / "scripts/rotate_jwt_secret.py"
    env_tmpl = ROOT / ".env.template"
    if not rotator.exists():
        return False, "rotator missing"
    if "INSUR_JWT_SECRET" not in env_tmpl.read_text():
        return False, ".env.template missing INSUR_JWT_SECRET"
    return True, "rotator+template_present"


def close_a3() -> tuple[bool, str]:
    """A3 · Playwright smoke for /agentic."""
    f = ROOT / "frontend/e2e/agentic-hub.spec.js"
    return f.exists() and "SKILL_CATALOG" in f.read_text(), "spec_present"


CLOSERS: dict[str, Callable[[], tuple[bool, str]]] = {
    "A3": close_a3,
    "B2": close_b2,
    "B3": close_b3,
    "B4": close_b4,
    "B5": close_b5,
    "C1": close_c1,
    "C2": close_c2,
    "D1": close_d1,
    "E1": close_e1,
    "F1": close_f1,
}


# ──────────────────────────────────────────────────────────────────────
# Plan parser

TASK_RE = re.compile(r"^## ([A-Z][0-9]+)\s+·\s+(.+)$")
STATUS_RE = re.compile(r"^\|\s*\*\*STATUS\*\*\s*\|\s*([⏳🔄✅🚫].*)\s*\|", re.MULTILINE)


def parse_plan() -> list[dict]:
    """Return list of tasks with id/title/status/status_line_idx."""
    lines = PLAN.read_text().splitlines()
    tasks: list[dict] = []
    current: dict | None = None
    for i, line in enumerate(lines):
        m = TASK_RE.match(line)
        if m:
            if current is not None:
                tasks.append(current)
            current = {"id": m.group(1), "title": m.group(2).strip(),
                       "status_char": "?", "status_line_idx": None,
                       "status_line": ""}
            continue
        if current and "STATUS" in line and "|" in line:
            ms = STATUS_RE.match(line)
            if ms:
                current["status_line_idx"] = i
                current["status_line"] = line
                txt = ms.group(1)
                for c in "✅⏳🔄🚫":
                    if c in txt:
                        current["status_char"] = c
                        break
    if current is not None:
        tasks.append(current)
    return tasks


def mark_done(task: dict, evidence: str) -> None:
    """Rewrite the STATUS row of `task` to ✅ with evidence note."""
    lines = PLAN.read_text().splitlines()
    idx = task["status_line_idx"]
    if idx is None:
        return
    new = (f"| **STATUS** | ✅ done · {stamp()} · auto-closed by fix_all_pending_loop "
           f"· evidence: {evidence} |")
    lines[idx] = new
    PLAN.write_text("\n".join(lines) + "\n")


def git_commit(task_id: str, evidence: str) -> None:
    """Idempotent · only commits if plan-doc actually changed."""
    status = subprocess.run(["git", "status", "--porcelain", str(PLAN)],
                            cwd=str(ROOT), capture_output=True, text=True, timeout=10)
    if not status.stdout.strip():
        log(f"no plan-doc change for {task_id} · skipping commit")
        return
    msg = f"""chore(insur): auto-close PENDING_TASKS {task_id}

Auto-closed by §44 fix_all_pending_loop · {stamp()}
Evidence: {evidence}
Policies: §44 autonomous loop · §51 substrate · §54 no Claude trailer ·
          §57.7 honest (evidence-required) · §106 safe-allowlist ·
          §107 timestamps · §150 supervisor drilled
"""
    subprocess.run(["git", "add", str(PLAN)],
                   cwd=str(ROOT), check=True, timeout=10)
    subprocess.run(["git", "commit", "-m", msg],
                   cwd=str(ROOT), check=True, timeout=20)
    log(f"committed close for {task_id}")


# ──────────────────────────────────────────────────────────────────────
# Main

def main() -> int:
    log("=== fix_all_pending_loop · tick start ===")
    state = read_state()
    failed_counts = state.get("failed_counts", {})

    try:
        tasks = parse_plan()
    except Exception as e:
        log(f"plan parse failed: {e.__class__.__name__}: {e}")
        return 1

    open_tasks = [t for t in tasks if t["status_char"] in ("⏳", "🔄")]
    log(f"open tasks: {len(open_tasks)} · all tasks: {len(tasks)}")

    if not open_tasks:
        log("0 open tasks · loop idle · exiting clean")
        write_state(state)
        return 0

    # Pick the first task with a registered closer that hasn't failed 5×
    target = None
    for t in open_tasks:
        tid = t["id"]
        if tid not in CLOSERS:
            continue
        if failed_counts.get(tid, 0) >= 5:
            continue
        target = t
        break

    if target is None:
        log("no actionable task this tick (all have closers exhausted or no closer)")
        write_state(state)
        return 0

    tid = target["id"]
    log(f"target: {tid} · {target['title'][:60]}")

    try:
        ok, evidence = CLOSERS[tid]()
    except Exception as e:
        ok, evidence = False, f"closer raised: {e.__class__.__name__}: {e}"

    if not ok:
        failed_counts[tid] = failed_counts.get(tid, 0) + 1
        state["failed_counts"] = failed_counts
        write_state(state)
        log(f"FAIL {tid} · {evidence} · fail_count={failed_counts[tid]}")
        if failed_counts[tid] >= 5:
            blocker = ROOT / "jobs/reports/fix-all"
            blocker.mkdir(parents=True, exist_ok=True)
            (blocker / f"blocker-{tid}.md").write_text(
                f"# {tid} blocker · {stamp()}\n\nLast 5 fails ended with:\n\n```\n{evidence}\n```\n"
            )
            log(f"BLOCKER REPORT for {tid} written")
        return 2

    log(f"PASS {tid} · {evidence}")
    failed_counts.pop(tid, None)
    state["failed_counts"] = failed_counts
    write_state(state)

    mark_done(target, evidence)
    try:
        git_commit(tid, evidence)
    except subprocess.CalledProcessError as e:
        log(f"git commit failed for {tid}: {e}")
        return 1

    log("=== tick end · 1 task closed ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
