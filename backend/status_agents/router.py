"""/api/v1/status-agents/* · Iter 59 · 7 live status-aggregator agents."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras
from fastapi import APIRouter

from core.config import get_settings

router = APIRouter(prefix="/api/v1/status-agents", tags=["status-agents"])

REPO = Path(__file__).resolve().parent.parent.parent


def _conn():
    return psycopg2.connect(get_settings().database_url)


# ─────────────────────────────────────────────────────────────────────
# 7 status-aggregator agents · each returns a small status dict

def _agent_brutal_feedback() -> dict:
    """Missing-task list · what's still scaffold / unwired."""
    from test_catalog.router import top_1pct_report
    rep = top_1pct_report()
    scaffolds = [s for s in rep["scorecard"] if s["scaffold"]]
    return {
        "agent_id": "sys_brutal_feedback",
        "label": "Brutal Feedback",
        "summary": f"{len(scaffolds)} dim(s) still scaffold · {rep['summary']['overall_grade']} grade",
        "metrics": {
            "scaffold_dims": [s["id"] for s in scaffolds],
            "n_scaffold": len(scaffolds),
            "grade": rep["summary"]["overall_grade"],
            "average_score_pct": round(rep["summary"]["average_score"] * 100, 1),
        },
        "color": "#ef4444" if scaffolds else "#10b981",
    }


def _agent_top1pct_status() -> dict:
    """Top-1% scorecard rollup."""
    from test_catalog.router import top_1pct_report
    rep = top_1pct_report()
    s = rep["summary"]
    return {
        "agent_id": "sys_top1pct_status",
        "label": "Top-1% Status",
        "summary": f"Grade {s['overall_grade']} · {s['n_passing_80pct']}/{s['n_dimensions']} passing · {'TOP-1%' if s['is_top_1_pct'] else 'BELOW'}",
        "metrics": {
            "grade": s["overall_grade"],
            "average_score_pct": round(s["average_score"] * 100, 1),
            "is_top_1_pct": s["is_top_1_pct"],
            "passing_80pct": s["n_passing_80pct"],
            "total_dims": s["n_dimensions"],
        },
        "color": "#10b981" if s["is_top_1_pct"] else "#f59e0b",
    }


def _agent_pending_tasks() -> dict:
    """PENDING_TASKS_PLAN.md counts (live read)."""
    p = REPO / "docs/PENDING_TASKS_PLAN.md"
    if not p.exists():
        return {"agent_id": "sys_pending_task_tracker", "label": "Pending Tasks",
                "summary": "doc missing", "metrics": {}, "color": "#94a3b8"}
    text = p.read_text()
    n_done = text.count("✅")
    n_progress = text.count("🔄")
    n_pending = text.count("⏳")
    n_blocked = text.count("🚫")
    total = n_done + n_progress + n_pending + n_blocked
    pct_done = round(100 * n_done / max(total, 1), 1)
    return {
        "agent_id": "sys_pending_task_tracker",
        "label": "Pending Tasks",
        "summary": f"{n_pending} pending · {n_progress} in-progress · {n_done} done · {pct_done}% complete",
        "metrics": {"done": n_done, "in_progress": n_progress,
                    "pending": n_pending, "blocked": n_blocked,
                    "pct_complete": pct_done},
        "color": "#10b981" if pct_done > 80 else "#f59e0b" if pct_done > 50 else "#ef4444",
    }


def _agent_error_status() -> dict:
    """Errors by category · per operator: api/data/frontend/backend/model/accuracy/integration."""
    cats = {
        "api":         "agent_id LIKE 'sys_api%' OR trigger_kind = 'api'",
        "data":        "agent_id LIKE 'sys_watchdog_db%' OR agent_id LIKE 'sys_watchdog_vector%'",
        "frontend":    "agent_id LIKE 'sys_watchdog_frontend%'",
        "backend":     "agent_id LIKE 'sys_watchdog_api%' OR agent_id LIKE 'sys_watchdog_jobs%'",
        "model":       "agent_id LIKE 'test_model_%'",
        "accuracy":    "agent_id LIKE 'sys_watchdog_output_eval%'",
        "integration": "agent_id LIKE 'sys_watchdog_mcp%' OR agent_id LIKE 'sys_slack%'",
    }
    counts = {}
    with _conn() as c, c.cursor() as cur:
        for cat, where in cats.items():
            cur.execute(f"""
                SELECT COUNT(*) FROM agent_invocation
                WHERE status IN ('Failed', 'PartialFailure')
                  AND ({where})
                  AND created_at > NOW() - INTERVAL '24 hours'
            """)
            counts[cat] = cur.fetchone()[0]
    total = sum(counts.values())
    return {
        "agent_id": "sys_error_status",
        "label": "Error Status (7 categories)",
        "summary": f"{total} errors in last 24h · " + " · ".join(f"{k}:{v}" for k, v in counts.items() if v),
        "metrics": {**counts, "total_24h": total},
        "color": "#10b981" if total == 0 else "#f59e0b" if total < 10 else "#ef4444",
    }


def _agent_testing_status() -> dict:
    """Number of tests completed."""
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            SELECT
              COUNT(*) AS n_total,
              COUNT(*) FILTER (WHERE status='Success') AS n_ok,
              COUNT(*) FILTER (WHERE status IN ('Failed','PartialFailure')) AS n_fail,
              COUNT(*) FILTER (WHERE status='PendingApproval') AS n_pend,
              COUNT(DISTINCT agent_id) AS n_agents
            FROM agent_invocation
            WHERE agent_id LIKE 'test\\_%' ESCAPE '\\'
              AND created_at > NOW() - INTERVAL '24 hours'
        """)
        r = cur.fetchone()
    n_total, n_ok, n_fail, n_pend, n_agents = r
    pct = round(100 * n_ok / max(n_total, 1), 1)
    return {
        "agent_id": "sys_testing_status",
        "label": "Testing Status (24h)",
        "summary": f"{n_total} tests · {n_ok} ok ({pct}%) · {n_fail} fail · {n_pend} pending · {n_agents} test agents",
        "metrics": {"total": n_total, "ok": n_ok, "fail": n_fail,
                    "pending": n_pend, "n_test_agents": n_agents,
                    "pass_pct": pct},
        "color": "#10b981" if pct >= 90 else "#f59e0b" if pct >= 70 else "#ef4444",
    }


def _agent_scalability_status() -> dict:
    """Scalability · capacity util + queue depth."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT
              COALESCE(MAX(current_utilization), 0) AS max_util,
              COALESCE(AVG(current_utilization), 0) AS avg_util,
              COUNT(*) AS n_capacity_rows
            FROM agent_capacity
        """)
        cap = dict(cur.fetchone())
        cur.execute("""
            SELECT COUNT(*) AS depth FROM agent_queue
            WHERE queue_status IN ('Pending', 'Queued', 'Running')
        """)
        depth = cur.fetchone()["depth"]
    max_util = float(cap["max_util"] or 0)
    return {
        "agent_id": "sys_scalability_status",
        "label": "Scalability Status",
        "summary": f"max util {max_util:.1f}% · avg {float(cap['avg_util'] or 0):.1f}% · queue depth {depth}",
        "metrics": {"max_utilization_pct": max_util,
                    "avg_utilization_pct": float(cap["avg_util"] or 0),
                    "queue_depth": depth,
                    "headroom_pct": round(100 - max_util, 1)},
        "color": "#10b981" if max_util < 70 else "#f59e0b" if max_util < 90 else "#ef4444",
    }


def _agent_load_perf_status() -> dict:
    """Load + perf · p50/p95 over last 1h · excludes cron-watchdog."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT
              COUNT(*) AS n,
              COALESCE(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms), 0) AS p50,
              COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) AS p95,
              COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms), 0) AS p99,
              COALESCE(AVG(duration_ms), 0) AS avg_ms,
              COALESCE(MAX(duration_ms), 0) AS max_ms
            FROM agent_invocation
            WHERE created_at > NOW() - INTERVAL '1 hour'
              AND duration_ms IS NOT NULL
              AND trigger_kind NOT IN ('cron-watchdog')
        """)
        r = dict(cur.fetchone())
    p50, p95, p99 = float(r["p50"]), float(r["p95"]), float(r["p99"])
    return {
        "agent_id": "sys_load_perf_status",
        "label": "Load + Performance Status (1h)",
        "summary": f"{r['n']} req · p50={p50:.0f}ms · p95={p95:.0f}ms · p99={p99:.0f}ms · max={float(r['max_ms']):.0f}ms",
        "metrics": {"n_requests_1h": r["n"], "p50_ms": p50, "p95_ms": p95,
                    "p99_ms": p99, "avg_ms": float(r["avg_ms"]),
                    "max_ms": float(r["max_ms"])},
        "color": "#10b981" if p95 < 3000 else "#f59e0b" if p95 < 10000 else "#ef4444",
    }


STATUS_AGENTS = [
    _agent_brutal_feedback,
    _agent_top1pct_status,
    _agent_pending_tasks,
    _agent_error_status,
    _agent_testing_status,
    _agent_scalability_status,
    _agent_load_perf_status,
]


@router.get("/health")
def health():
    return {"status": "ok", "module": "status-agents",
            "n_agents": len(STATUS_AGENTS)}


@router.get("/all")
def all_status():
    """Run all 7 status agents · return their live state."""
    out = []
    for fn in STATUS_AGENTS:
        try:
            out.append(fn())
        except Exception as e:
            out.append({"agent_id": fn.__name__, "error": str(e)[:200]})
    return {"status_agents": out, "as_of": datetime.now(timezone.utc).isoformat(),
            "count": len(out)}


@router.get("/by-id/{agent_id}")
def by_id(agent_id: str):
    """Run a single status agent."""
    for fn in STATUS_AGENTS:
        result = fn()
        if result.get("agent_id") == agent_id:
            return result
    return {"error": f"unknown status agent: {agent_id}"}
