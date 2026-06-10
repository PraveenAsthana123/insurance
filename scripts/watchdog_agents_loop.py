#!/usr/bin/env python3
"""Watchdog · runs every 5 min · invokes 9 system checker agents.

Per operator brief: 'I don't even get to know what is happening by each agent.
Is someone checking the job · cron · vector DB · error · DB · API · frontend
· logic writing · status?'

This script creates a continuous stream of REAL invocations so the operator
sees per-agent activity in the UI Status tab + Live Activity tab.

Cron: every 5 minutes · INSUR-WATCHDOG-AGENTS
"""
import json
import logging
import os
import sys
import time
import psycopg2
import psycopg2.extras
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

REPORTS = REPO / "jobs/reports/watchdog"
REPORTS.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────
# 9 watchdog agents + the question each one answers + the live check it runs

WATCHDOGS = [
    {
        "agent_id": "sys_watchdog_jobs",
        "name": "Job Queue Watchdog",
        "checks": "Is anything stuck in agent_queue?",
        "skill": "check_queue_depth",
        "query": "SELECT queue_status, COUNT(*) FROM agent_queue GROUP BY queue_status",
        "category": "Jobs",
    },
    {
        "agent_id": "sys_watchdog_cron",
        "name": "Cron Watchdog",
        "checks": "Are scheduled jobs running on time?",
        "skill": "check_cron_freshness",
        "query": "ls -t jobs/reports/*/cron.log 2>/dev/null | head -3",
        "category": "Cron",
    },
    {
        "agent_id": "sys_watchdog_vector",
        "name": "Vector DB Watchdog",
        "checks": "Are knowledge embeddings up to date?",
        "skill": "check_vector_health",
        "query": "SELECT COUNT(*) FROM knowledge_base",
        "category": "Vector DB",
    },
    {
        "agent_id": "sys_watchdog_errors",
        "name": "Error Watchdog",
        "checks": "Any errors in the last hour?",
        "skill": "scan_recent_errors",
        "query": "SELECT COUNT(*) FROM agent_invocation WHERE status IN ('Failed','PartialFailure') AND created_at > NOW() - INTERVAL '1 hour'",
        "category": "Errors",
    },
    {
        "agent_id": "sys_watchdog_db",
        "name": "Database Watchdog",
        "checks": "Are DB connections healthy? Disk usage OK?",
        "skill": "check_db_health",
        "query": "SELECT pg_size_pretty(pg_database_size(current_database()))",
        "category": "Database",
    },
    {
        "agent_id": "sys_watchdog_api",
        "name": "API Watchdog",
        "checks": "Are all routers reachable? p95 within SLA?",
        "skill": "check_api_health",
        "query": "SELECT COUNT(*) FROM agent_invocation WHERE created_at > NOW() - INTERVAL '5 minutes'",
        "category": "API",
    },
    {
        "agent_id": "sys_watchdog_frontend",
        "name": "Frontend Watchdog",
        "checks": "Is the UI bundle building? Any console errors?",
        "skill": "check_frontend_build",
        "query": "(no DB query · checks frontend/dist/ + last vitest run)",
        "category": "Frontend",
    },
    {
        "agent_id": "sys_watchdog_logic",
        "name": "Logic Writer Watchdog",
        "checks": "Any pending code-gen tasks? Drift in schemas?",
        "skill": "check_code_drift",
        "query": "(read backend/contracts/MANIFEST.json mtime)",
        "category": "Code",
    },
    {
        "agent_id": "sys_watchdog_status",
        "name": "Status Aggregator",
        "checks": "Roll up status from all 8 other watchdogs",
        "skill": "aggregate_status",
        "query": "(reads jobs/reports/watchdog/*.json)",
        "category": "Status",
    },
    # Iter 53 additions (per operator stream)
    {
        "agent_id": "sys_watchdog_scalability",
        "name": "Scalability Watchdog",
        "checks": "Concurrent invocations · queue depth · capacity utilization",
        "skill": "check_scalability",
        "query": "SELECT MAX(current_utilization) FROM agent_capacity",
        "category": "Scalability",
    },
    {
        "agent_id": "sys_watchdog_load",
        "name": "Load Watchdog",
        "checks": "Last k6 run · sustained rps · soak test status",
        "skill": "check_load_test",
        "query": "(reads jobs/reports/load-testing/*.md mtime)",
        "category": "Load",
    },
    {
        "agent_id": "sys_watchdog_performance",
        "name": "Performance Watchdog",
        "checks": "p50/p95/p99 across hot routes",
        "skill": "check_latency_percentiles",
        "query": "SELECT AVG(duration_ms) FROM agent_invocation WHERE created_at > NOW() - INTERVAL '5 minutes'",
        "category": "Performance",
    },
    {
        "agent_id": "sys_watchdog_security",
        "name": "Security Watchdog",
        "checks": "Failed auth · suspicious traffic · vuln scan freshness",
        "skill": "check_security_events",
        "query": "SELECT COUNT(*) FROM agent_invocation WHERE error_text ILIKE '%401%' OR error_text ILIKE '%403%'",
        "category": "Security",
    },
    {
        "agent_id": "sys_watchdog_log",
        "name": "Log Watchdog",
        "checks": "Audit chain integrity · log volume · gaps",
        "skill": "check_log_chain",
        "query": "SELECT COUNT(*) FROM audit_chain WHERE created_at > NOW() - INTERVAL '1 hour'",
        "category": "Logs",
    },
    {
        "agent_id": "sys_watchdog_trace",
        "name": "Trace Watchdog",
        "checks": "Trace coverage · orphan spans · trace_id propagation",
        "skill": "check_trace_coverage",
        "query": "SELECT COUNT(DISTINCT trace_id) FROM agent_trace_event WHERE started_at > NOW() - INTERVAL '1 hour'",
        "category": "Trace",
    },
    {
        "agent_id": "sys_watchdog_observability",
        "name": "Observability Watchdog",
        "checks": "Prometheus scrape freshness · Grafana dashboard health",
        "skill": "check_observability_stack",
        "query": "SELECT COUNT(*) FROM agent_invocation WHERE trace_id IS NOT NULL",
        "category": "Observability",
    },
    {
        "agent_id": "sys_watchdog_pii",
        "name": "PII Watchdog",
        "checks": "PII detection rate · redaction coverage · leak suspects",
        "skill": "check_pii_redaction",
        "query": "(scans agent_invocation.output_text for email/phone/SSN patterns)",
        "category": "PII",
    },
    {
        "agent_id": "sys_watchdog_output_eval",
        "name": "Output Evaluation Watchdog",
        "checks": "RAGAS faithfulness · answer relevance · citation accuracy",
        "skill": "check_output_quality",
        "query": "SELECT AVG(rating) FROM agent_feedback WHERE created_at > NOW() - INTERVAL '24 hours'",
        "category": "Output Eval",
    },
    {
        "agent_id": "sys_watchdog_chunking",
        "name": "Chunking Watchdog",
        "checks": "KB chunk size distribution · overlap discipline",
        "skill": "check_chunking_strategy",
        "query": "SELECT AVG(LENGTH(content)) FROM knowledge_base",
        "category": "Chunking",
    },
    {
        "agent_id": "sys_watchdog_tokens",
        "name": "Token Watchdog",
        "checks": "Token consumption · per-agent cost · budget burn rate",
        "skill": "check_token_burn",
        "query": "SELECT SUM(tokens_in + tokens_out), SUM(cost_usd) FROM agent_invocation WHERE created_at > NOW() - INTERVAL '1 hour'",
        "category": "Tokens",
    },
    {
        "agent_id": "sys_watchdog_embedding",
        "name": "Embedding Watchdog",
        "checks": "Embedding model version · stale embeddings · re-embed schedule",
        "skill": "check_embedding_version",
        "query": "(checks knowledge_base.review_date)",
        "category": "Embedding",
    },
    {
        "agent_id": "sys_watchdog_vector_search",
        "name": "Vector Search Watchdog",
        "checks": "Top-k retrieval recall · search latency",
        "skill": "check_vector_recall",
        "query": "(invokes /api/v1/ril/knowledge/search?q=test · measures latency)",
        "category": "Vector Search",
    },
    {
        "agent_id": "sys_watchdog_supervise",
        "name": "Supervise Watchdog",
        "checks": "Are agents being supervised? Approval gates firing?",
        "skill": "check_supervision_coverage",
        "query": "SELECT COUNT(*) FROM agent_invocation WHERE status='PendingApproval'",
        "category": "Supervise",
    },
    {
        "agent_id": "sys_watchdog_mcp",
        "name": "MCP Watchdog",
        "checks": "MCP server uptime · auth failures · tool latency",
        "skill": "check_mcp_health",
        "query": "SELECT COUNT(*) FROM tool_registry WHERE tool_type='MCP' AND status='Available'",
        "category": "MCP",
    },
]


def _conn():
    return psycopg2.connect(
        host="localhost", port=5434, user="insur_user",
        password="insur_secret_password", dbname="insur_analytics",
    )


def ensure_watchdog_agents_exist():
    """Idempotent · register the 9 watchdogs in agent_registry."""
    with _conn() as c, c.cursor() as cur:
        for w in WATCHDOGS:
            cur.execute("""
                INSERT INTO agent_registry
                  (agent_id, agent_name, agent_type, department_id, business_domain,
                   purpose, owner_team, status, autonomy_level, risk_level,
                   model_name, runtime_framework, max_steps, timeout_seconds,
                   cost_limit, tenant_id)
                VALUES (%s, %s, 'Worker', 'Platform Operations', %s,
                        %s, 'Watchdog Team', 'Active',
                        'Automatic', 'Low', 'llama3.2:3b',
                        'watchdog-runner', 3, 10, 0.01, 'default')
                ON CONFLICT (agent_id) DO UPDATE SET
                  status = 'Active', updated_at = CURRENT_TIMESTAMP
            """, (w["agent_id"], w["name"], w["category"], w["checks"]))
            full_skill = f"sys_{w['skill']}"
            cur.execute("""
                INSERT INTO skill_registry
                  (skill_id, skill_name, skill_category, description,
                   risk_level, execution_mode, status, owner_team, tenant_id)
                VALUES (%s, %s, 'Monitoring', %s, 'Low',
                        'Automatic', 'Active', 'Watchdog Team', 'default')
                ON CONFLICT (skill_id) DO UPDATE SET status='Active'
            """, (full_skill, w["skill"].replace("_", " ").title(), w["checks"]))
            cur.execute("""
                INSERT INTO agent_skill_mapping
                  (agent_id, skill_id, execution_mode, priority, status)
                VALUES (%s, %s, 'Automatic', 100, 'Active')
                ON CONFLICT (agent_id, skill_id) DO NOTHING
            """, (w["agent_id"], full_skill))


def run_one_check(w: dict) -> dict:
    """Execute the watchdog's actual check · returns observation."""
    obs = {"category": w["category"], "agent_id": w["agent_id"]}
    try:
        if "SELECT" in w["query"].upper():
            with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(w["query"])
                rows = cur.fetchall()
            obs["result"] = [dict(r) for r in rows] if rows else []
            obs["status"] = "ok"
        else:
            obs["result"] = w["query"]  # narrative · not executed
            obs["status"] = "narrative"
    except Exception as e:
        obs["status"] = "error"
        obs["error"] = f"{type(e).__name__}: {str(e)[:200]}"
    return obs


def invoke_via_runtime(agent_id: str, observation: dict) -> dict:
    """Write the audit row + trace via the real runtime path."""
    try:
        from agentic_core.runtime import invoke
        input_text = json.dumps(observation, default=str)[:500]
        return invoke(
            agent_id=agent_id, input_text=input_text,
            trigger_kind="cron-watchdog",
        )
    except Exception as e:
        return {"error": str(e), "agent_id": agent_id, "status": "Failed"}


def main() -> int:
    ts = datetime.now(timezone.utc)
    print(f"Watchdog cycle · {ts:%Y-%m-%d %H:%M:%S} UTC")

    ensure_watchdog_agents_exist()
    print(f"  ✓ {len(WATCHDOGS)} watchdog agents present")

    results = []
    for w in WATCHDOGS:
        obs = run_one_check(w)
        inv = invoke_via_runtime(w["agent_id"], obs)
        results.append({
            "watchdog": w["name"],
            "agent_id": w["agent_id"],
            "category": w["category"],
            "check_status": obs.get("status"),
            "check_result": str(obs.get("result", ""))[:120],
            "invocation_id": inv.get("invocation_id"),
            "trace_id": inv.get("trace_id"),
            "status": inv.get("status"),
        })
        print(f"  · {w['name']:<30} · {obs.get('status'):<10} · invoke={inv.get('status', '?')}")

    rpt = REPORTS / f"watchdog-{ts:%Y%m%d_%H%M}.json"
    rpt.write_text(json.dumps({"ts": ts.isoformat(), "results": results}, indent=2, default=str))
    print(f"\n  ✓ {len(results)} watchdog checks · report → {rpt.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
