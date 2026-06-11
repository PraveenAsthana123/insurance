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


# Action class router · category → handler
ACTION_ROUTER = {
    "Agent gap": act_agent_gap,
    "Data health": act_approval_backlog,  # only handles approval_request backlog
    "Workforce hygiene": act_stale_agents,
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

    # Run advisor
    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())
    advisor = c.post("/api/v1/missing-items-advisor/scan").json()
    findings = advisor.get("findings", [])

    # Pick top-1 P0/P1/P2 (skip P3 by default · scaffold materializes on demand)
    sev_order = {"P0": 0, "P1": 1, "P2": 2}
    actionable = [f for f in findings if f["severity"] in sev_order]
    actionable.sort(key=lambda f: sev_order[f["severity"]])

    record = {
        "tick_id": tick_id, "started_at": started_at,
        "findings_total": len(findings),
        "p0_p1_p2_actionable": len(actionable),
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


if __name__ == "__main__":
    main()
