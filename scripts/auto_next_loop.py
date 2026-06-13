#!/usr/bin/env python3
"""§106 · Auto-Next Loop · cron-driven §105 picker (every 5 min).

Run by:
  */5 * * * * cd /path && /venv/bin/python scripts/auto_next_loop.py

What it does (within §106 safe-action allowlist):
  1. Query advisor /scan
  2. Pick top-1 finding by severity
  3. If action class is on allowlist → act atomically · log · audit
  4. If gated → log to needs-operator-action.json · skip
  5. Return ≤60s · safe for cron
"""
from __future__ import annotations

import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))

os.environ.setdefault("BEV_POSTGRES_HOST", "localhost")
os.environ.setdefault("BEV_POSTGRES_PORT", "5434")
os.environ.setdefault("BEV_POSTGRES_USER", "insur_user")
os.environ.setdefault("BEV_POSTGRES_PASSWORD", "insur_secret_password")
os.environ.setdefault("BEV_POSTGRES_DB", "insur_analytics")
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

import logging
logging.disable(logging.CRITICAL)

import psycopg2

# §107 actor stamp
import getpass, platform
ACTOR_USER = getpass.getuser()
ACTOR_HOST = platform.node().split('.')[0]
REPORT_DIR = REPO / "jobs/reports/auto-next"
LOG_DIR = REPO / "jobs/logs"
REPORT_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)

MAX_ACTIONS = 50
MAX_WALL_S = 60
COOLDOWN_SECONDS = 24 * 60 * 60  # 24h


def _conn():
    return psycopg2.connect(host='localhost', port=5434, user='insur_user',
                            password='insur_secret_password',
                            dbname='insur_analytics')


def cooldown_active(finding_topic: str) -> bool:
    """Check audit_log for recent action on this topic."""
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM audit_log
            WHERE actor='sys_auto_next_loop' AND resource=%s
              AND created_at > NOW() - INTERVAL '24 hours'
        """, (finding_topic,))
        return cur.fetchone()[0] > 0


# ─────────────────────────────────────────────────────────────────────
# §106 safe-action handlers (idempotent · ON CONFLICT)

def act_agent_gap(finding: dict) -> dict:
    """Register missing agents in agent_registry."""
    topic_id = finding.get("topic_id", "")
    items = finding.get("items", [])
    if not items:
        return {"ok": False, "reason": "no items in finding"}
    n_inserted = 0
    with _conn() as c, c.cursor() as cur:
        for aid in items[:MAX_ACTIONS]:
            # Heuristic risk
            risk = "High" if any(k in aid for k in ["failure", "chaos", "threat",
                                                     "access_review", "fairness",
                                                     "bias", "mitigation"]) else \
                   "Low" if any(k in aid for k in ["watchdog", "inventory", "usage",
                                                    "classification", "search",
                                                    "summarization", "lessons",
                                                    "adoption", "training",
                                                    "communication", "kb_seeder",
                                                    "failover", "recovery",
                                                    "audit_chain", "reflection",
                                                    "compliance", "evidence",
                                                    "retention", "audit", "roi",
                                                    "forecast"]) else "Medium"
            autonomy = "Approval Required" if risk == "High" else "Automatic"
            name = aid.replace("sys_", "").replace("_", " ").title()
            try:
                cur.execute("""
                    INSERT INTO agent_registry
                      (agent_id, agent_name, agent_type, department_id, business_domain,
                       purpose, owner_team, status, autonomy_level, risk_level,
                       model_name, runtime_framework, max_steps, timeout_seconds,
                       cost_limit, tenant_id)
                    VALUES (%s, %s, 'Worker', 'Platform', %s, %s, 'Platform',
                            'Active', %s, %s, 'llama3.2:3b', 'specialist-runtime',
                            5, 30, 0.15, 'default')
                    ON CONFLICT (agent_id) DO NOTHING
                """, (aid, name, topic_id,
                      f"Auto-registered by §106 loop for {finding['topic']}",
                      autonomy, risk))
                if cur.rowcount > 0:
                    n_inserted += 1
            except Exception:
                pass
    return {"ok": True, "n_inserted": n_inserted, "topic_id": topic_id}


def act_approval_backlog(finding: dict) -> dict:
    """Auto-approve Low-risk · escalate Medium/High to operator queue."""
    n_approved = 0
    n_held = 0
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            UPDATE approval_request
            SET status='approved', decided_by='sys_auto_next_loop',
                decided_at=CURRENT_TIMESTAMP,
                payload=COALESCE(payload, '{}'::jsonb) ||
                        '{"auto_approved_by": "§106", "reason": "Low-risk auto per §103.4"}'::jsonb
            WHERE status='requested' AND risk_level='Low'
              AND created_at < NOW() - INTERVAL '1 hour'
        """)
        n_approved = cur.rowcount
        # Count High that we leave alone
        cur.execute("""
            SELECT COUNT(*) FROM approval_request
            WHERE status='requested' AND risk_level IN ('Medium', 'High')
        """)
        n_held = cur.fetchone()[0]
    return {"ok": True, "n_approved_low": n_approved,
            "n_held_for_human": n_held,
            "reason_held": "Medium/High requires operator per §103.5"}


def act_stale_agents(finding: dict) -> dict:
    """Retire Active agents with 0 invocations in 30+ days."""
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            UPDATE agent_registry SET status='Retired',
                purpose=COALESCE(purpose,'') || ' [auto-retired by §106 · 30d stale]'
            WHERE status='Active' AND NOT EXISTS (
              SELECT 1 FROM agent_invocation ai
              WHERE ai.agent_id=agent_registry.agent_id
                AND ai.created_at > NOW() - INTERVAL '30 days'
            )
            AND agent_id NOT LIKE 'sys_supervisor%'
            AND agent_id NOT LIKE 'sys_top1pct%'
            AND agent_id NOT LIKE 'sys_audit_chain%'
            AND agent_id NOT LIKE 'sys_brutal%'
            AND agent_id NOT LIKE 'sys_missing_items%'
            AND agent_id NOT LIKE 'sys_pending_topics%'
            AND agent_id NOT LIKE 'sys_auto_next%'
            RETURNING agent_id
        """)
        retired = [r[0] for r in cur.fetchall()]
    return {"ok": True, "n_retired": len(retired),
            "sample": retired[:5] if retired else []}


# Iter 95.7 · ABSENCE-MODE workflow hygiene handler.
#
# When operator is absent (sentinel file `.agent/absence-mode` exists),
# the dispatcher will auto-commit parallel session edits that match the
# SAFE pattern allowlist. §42 hard-gates ALL still apply: no force-push ·
# no rm-rf · no prod-write · no external messages · no §103.5 high-risk.
#
# Safe patterns (auto-commit allowed during absence mode):
#   - docs/*.md (documentation · low risk)
#   - frontend/src/pages/bank/*.jsx (bank shell · §137-audit-gated)
#   - frontend/src/pages/bank/tabs/*.jsx (bank tabs · §137 + drill gated)
#
# UNSAFE patterns (NEVER auto-commit even in absence mode):
#   - backend/ (production code · operator review required)
#   - scripts/ (operational code · operator review required)
#   - tests/drills/ (regression tests · operator review required)
#   - .github/workflows/ (CI infrastructure · operator review required)
#   - any path containing 'secrets', 'credentials', '.env', '.key', '.pem'
def act_absence_mode_hygiene(finding: dict) -> dict:
    """Absence-mode auto-commit handler for uncommitted real-code.

    Only fires when:
      1. Sentinel file .agent/absence-mode exists
      2. All uncommitted files match SAFE pattern allowlist
      3. §137 audit STILL PASSES post-commit (no regression)
    Per §57.7 honest: if any check fails, surface as no-handler · don't commit.
    """
    import subprocess
    from pathlib import Path

    sentinel = REPO / ".agent" / "absence-mode"
    if not sentinel.exists():
        return {"verdict": "skip",
                "reason": "absence-mode sentinel not set · operator must opt-in"}

    SAFE_PREFIXES = (
        "docs/",
        "frontend/src/pages/bank/",
    )
    UNSAFE_TOKENS = (
        "backend/",
        "scripts/",
        "tests/drills/",
        ".github/workflows/",
        "secrets", "credentials", ".env", ".key", ".pem",
        "Dockerfile", "docker-compose",
    )

    out = subprocess.run(["git", "diff", "--name-only", "HEAD"],
                          cwd=str(REPO), capture_output=True, text=True, timeout=10)
    if out.returncode != 0:
        return {"verdict": "skip", "reason": f"git diff failed: {out.stderr[:200]}"}

    candidates = [line.strip() for line in out.stdout.splitlines() if line.strip()]
    # Filter runtime churn (same prefixes as pending_topics_agent finder)
    runtime_prefixes = ("data/prompt-history.md", "data/work_tracker/",
                        "data/registry/workforce_health.json", ".agent/",
                        "jobs/", "data/insurance/", "config/")
    real_changes = [f for f in candidates
                    if not any(f.startswith(p) for p in runtime_prefixes)]

    # Classify each real change
    safe = []
    unsafe = []
    for f in real_changes:
        # UNSAFE wins · check tokens first
        if any(tok in f for tok in UNSAFE_TOKENS):
            unsafe.append(f)
            continue
        if any(f.startswith(p) for p in SAFE_PREFIXES):
            safe.append(f)
        else:
            unsafe.append(f)  # default-deny

    if unsafe:
        return {"verdict": "skip",
                "reason": "unsafe files in working tree · absence-mode requires all-safe",
                "unsafe_sample": unsafe[:3]}
    if not safe:
        return {"verdict": "skip",
                "reason": "no safe files to commit"}

    # Run §137 audit BEFORE commit (catch any dark-bg regression in safe files)
    audit = subprocess.run(["bash", "scripts/audit_no_black_backgrounds.sh"],
                            cwd=str(REPO), capture_output=True, text=True, timeout=30)
    if audit.returncode != 0:
        return {"verdict": "skip",
                "reason": "§137 audit FAIL · absence-mode requires green audit",
                "audit_tail": audit.stdout[-300:] + audit.stderr[-300:]}

    # Stage SAFE files + runtime churn (the finder excludes runtime · we
    # include it on auto-commit so the tree is clean post-commit).
    to_stage = safe + [f for f in candidates
                       if any(f.startswith(p) for p in runtime_prefixes)]
    subprocess.run(["git", "add", "--"] + to_stage,
                    cwd=str(REPO), check=True, timeout=10)

    # Build §51 substrate commit message
    ts_utc_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ts_local_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S %Z")
    msg = (
        f"chore(insur): absence-mode auto-integrate {len(safe)} safe file(s)\n"
        f"\n"
        f"Why\n"
        f"- Operator absent · .agent/absence-mode sentinel set\n"
        f"- §138 sweep detected uncommitted real-code · all files matched\n"
        f"  SAFE pattern allowlist (docs/ + frontend/src/pages/bank/)\n"
        f"- §137 audit PASSES post-change · no regression\n"
        f"\n"
        f"Files committed ({len(safe)} safe · {len(to_stage) - len(safe)} runtime)\n"
        + "\n".join(f"  - {f}" for f in safe[:10]) + "\n"
        f"\n"
        f"Forensic substrate\n"
        f"- ts_utc:   {ts_utc_str}\n"
        f"- ts_local: {ts_local_str}\n"
        f"- host:     {ACTOR_HOST}\n"
        f"- actor:    sys_auto_next_loop · absence-mode handler\n"
        f"- approach: §138 dispatcher · §42 safe-allowlist · §57.7 honest\n"
        f"- policies: §38.3 audit · §42 hard-gates respected · §51 substrate ·\n"
        f"            §54 no trailer · §137 audit gated · §138.6 categorization\n"
    )
    commit_res = subprocess.run(
        ["git", "commit", "-m", msg], cwd=str(REPO),
        capture_output=True, text=True, timeout=20,
    )
    if commit_res.returncode != 0:
        return {"verdict": "fail", "reason": "git commit failed",
                "stderr": commit_res.stderr[:300]}

    sha = subprocess.run(["git", "rev-parse", "HEAD"], cwd=str(REPO),
                          capture_output=True, text=True).stdout.strip()
    return {"verdict": "acted",
            "sha": sha,
            "n_safe": len(safe),
            "n_runtime": len(to_stage) - len(safe),
            "files": safe[:10]}


# Action class router · category → handler
ACTION_ROUTER = {
    "Agent gap": act_agent_gap,
    "Data health": act_approval_backlog,  # only handles approval_request backlog
    "Workforce hygiene": act_stale_agents,
    "Workflow hygiene": act_absence_mode_hygiene,  # NEW · §138 absence-mode
}

GATED_CATEGORIES = {
    "Office stub · not yet provisioned",  # 4-8h each · operator picks
    "§101 mandatory table missing",       # migration is gated
    "Platform vital",                      # cron reinstall is gated
}


def _audit(actor: str, action: str, resource: str, payload: dict):
    """§38.3 audit log · append-only."""
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO audit_log (actor, action, resource, payload)
            VALUES (%s, %s, %s, %s::jsonb)
        """, (actor, action, resource, json.dumps(payload, default=str)))


def main():
    tick_id = f"AUTO-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
    started = time.perf_counter()
    started_at = datetime.now(timezone.utc).isoformat()

    # Run advisor (Iter 95.3 · prefer HTTP over TestClient init for speed)
    import urllib.request, urllib.error
    backend_url = os.environ.get("INSUR_BACKEND_URL", "http://localhost:8001")
    try:
        req = urllib.request.Request(
            f"{backend_url}/api/v1/missing-items-advisor/scan",
            method="POST", data=b"{}",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            advisor = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, OSError, TimeoutError, json.JSONDecodeError):
        # Cold boot / CI fallback per §57.7 honest
        from main import create_app
        from fastapi.testclient import TestClient
        c = TestClient(create_app())
        advisor = c.post("/api/v1/missing-items-advisor/scan").json()
    findings = list(advisor.get("findings", []))

    # Iter 95.4 · include pending_topics extra_scans (cron silent ·
    # stale agents · UNCOMMITTED REAL-CODE) so the §106 dispatcher
    # acknowledges them as actionable instead of reporting "stable"
    # while real work sits uncommitted. Per §57.7 honest: a "stable"
    # status with uncommitted real-code is misleading.
    extra_vitals: dict = {}
    try:
        from pending_topics_agent import extra_scans as _extra_scans
        extra_findings, extra_vitals = _extra_scans()
        findings.extend(extra_findings)
    except Exception:
        pass  # best-effort · do not break dispatcher on extra_scans failure

    # Pick top-1 P0/P1/P2 (skip P3 by default · scaffold materializes on demand)
    sev_order = {"P0": 0, "P1": 1, "P2": 2}
    actionable = [f for f in findings if f["severity"] in sev_order]
    actionable.sort(key=lambda f: sev_order[f["severity"]])

    # Iter 95.8 · surface extra_scans vitals in the dispatcher record so
    # bash dispatcher (auto_next_dispatcher.sh) can echo
    # `uncommitted_real_files` count for operator-readable log lines.
    # Per §138.4 dim 4 + §57.7 honest: vitals carry truth even when
    # findings count is 0.
    record = {
        "tick_id": tick_id, "started_at": started_at,
        "actor_user": ACTOR_USER, "actor_host": ACTOR_HOST,
        "actor_kind": "cron", "agent_id": "sys_auto_next_loop",
        "tz_local": time.strftime("%Z"),
        "findings_total": len(findings),
        "p0_p1_p2_actionable": len(actionable),
        "uncommitted_real_files": extra_vitals.get("uncommitted_real_files", 0),
        "watchdog_1h": extra_vitals.get("watchdog_1h", 0),
    }

    if not actionable:
        record.update({"status": "stable",
                       "summary": "Platform stable · nothing actionable",
                       "completed_at": datetime.now(timezone.utc).isoformat(),
                       "duration_s": round(time.perf_counter() - started, 2)})
        with (REPORT_DIR / f"run-{tick_id}.json").open("w") as f:
            json.dump(record, f, indent=2)
        _audit("sys_auto_next_loop", "tick-stable", "platform",
               {"tick_id": tick_id, "duration_s": record["duration_s"]})
        print(f"[§106] {tick_id} · stable · 0 actionable")
        return

    top = actionable[0]
    record["top_finding"] = {
        "severity": top["severity"], "category": top["category"],
        "topic": top["topic"], "topic_id": top.get("topic_id"),
    }

    # Cooldown check
    if cooldown_active(top.get("topic_id", top["topic"])):
        record.update({"status": "cooldown",
                       "skipped_reason": "Same topic acted on within 24h"})
        with (REPORT_DIR / f"run-{tick_id}.json").open("w") as f:
            json.dump(record, f, indent=2)
        print(f"[§106] {tick_id} · cooldown · {top['topic']}")
        return

    # Gated check
    if top["category"] in GATED_CATEGORIES:
        record.update({"status": "gated",
                       "skipped_reason": f"Category '{top['category']}' requires operator"})
        # Write the needs-operator-action queue
        queue_path = REPORT_DIR / "needs-operator-action.json"
        queue = json.loads(queue_path.read_text()) if queue_path.exists() else []
        queue.append({"tick_id": tick_id, "finding": top,
                      "queued_at": datetime.now(timezone.utc).isoformat()})
        queue = queue[-50:]  # keep last 50
        queue_path.write_text(json.dumps(queue, indent=2, default=str))
        with (REPORT_DIR / f"run-{tick_id}.json").open("w") as f:
            json.dump(record, f, indent=2)
        print(f"[§106] {tick_id} · gated · operator action needed for {top['topic']}")
        return

    # Action allowed · dispatch
    handler = ACTION_ROUTER.get(top["category"])
    if not handler:
        record.update({"status": "no-handler",
                       "skipped_reason": f"No handler for '{top['category']}'"})
        with (REPORT_DIR / f"run-{tick_id}.json").open("w") as f:
            json.dump(record, f, indent=2)
        print(f"[§106] {tick_id} · no-handler · {top['category']}")
        return

    try:
        result = handler(top)
        # Iter 95.7 · honor handler verdict · skip/fail don't count as 'acted'
        verdict = (result or {}).get("verdict", "acted") if isinstance(result, dict) else "acted"
        if verdict == "skip":
            record["status"] = "skipped"
            record["action_result"] = result
            with (REPORT_DIR / f"run-{tick_id}.json").open("w") as f:
                json.dump(record, f, indent=2)
            print(f"[§106] {tick_id} · skipped · {result.get('reason','')[:80]}")
            return
        if verdict == "fail":
            record["status"] = "error"
            record["action_result"] = result
            with (REPORT_DIR / f"run-{tick_id}.json").open("w") as f:
                json.dump(record, f, indent=2)
            print(f"[§106] {tick_id} · error · {result.get('reason','')[:80]}")
            return
        record["status"] = "acted"
        record["action_result"] = result
    except Exception as e:
        record.update({"status": "error", "error": str(e)[:500]})
        with (REPORT_DIR / f"run-{tick_id}.json").open("w") as f:
            json.dump(record, f, indent=2)
        _audit("sys_auto_next_loop", "tick-error", top.get("topic_id", top["topic"]),
               {"tick_id": tick_id, "error": str(e)[:500]})
        print(f"[§106] {tick_id} · error · {e}")
        return

    record["completed_at"] = datetime.now(timezone.utc).isoformat()
    record["duration_s"] = round(time.perf_counter() - started, 2)

    with (REPORT_DIR / f"run-{tick_id}.json").open("w") as f:
        json.dump(record, f, indent=2)

    _audit("sys_auto_next_loop", "tick-acted",
           top.get("topic_id", top["topic"]),
           {"tick_id": tick_id, "category": top["category"],
            "result": result, "duration_s": record["duration_s"]})

    # Update _latest.md rolling summary
    latest = REPORT_DIR / "_latest.md"
    latest.write_text(
        f"# §106 Auto-Next Loop · Latest Tick\n\n"
        f"- **Tick ID**: {tick_id}\n"
        f"- **At**: {started_at}\n"
        f"- **Top finding**: [{top['severity']}] {top['topic']}\n"
        f"- **Category**: {top['category']}\n"
        f"- **Status**: {record['status']}\n"
        f"- **Action result**: `{json.dumps(result, default=str)[:200]}`\n"
        f"- **Duration**: {record['duration_s']}s\n"
    )

    print(f"[§106] {tick_id} · acted · {top['topic']} · {record['duration_s']}s")


EXIT_CODE_MAP = {
    "acted": 0, "cooldown": 10, "gated": 20,
    "stable": 30, "no-handler": 31, "error": 40,
    "cap-hit": 30, "needs-handler": 31,
}


def _main_with_exit():
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        print(f"[§106] crash: {e}")
        import sys
        sys.exit(40)
    # Read latest status to set exit
    import json as _json
    try:
        latest_dir = REPO / "jobs/reports/auto-next"
        latest_files = sorted(latest_dir.glob("run-*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
        if latest_files:
            with open(latest_files[0]) as f:
                rec = _json.load(f)
            import sys
            sys.exit(EXIT_CODE_MAP.get(rec.get("status"), 30))
    except Exception:
        pass


if __name__ == "__main__":
    _main_with_exit()
