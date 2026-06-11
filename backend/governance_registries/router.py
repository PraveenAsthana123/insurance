"""/api/v1/governance-registries/* · Iter 68 · 6 registries + DLQ + kill_switch + ABAC."""
from __future__ import annotations

import json
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from fastapi import APIRouter
from pydantic import BaseModel

from core.config import get_settings

router = APIRouter(prefix="/api/v1/governance-registries", tags=["governance-registries"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


def _all(table: str, limit: int = 100) -> list[dict]:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(f"SELECT * FROM {table} ORDER BY created_at DESC LIMIT %s", (limit,))
        return [dict(r) for r in cur.fetchall()]


# ─────────────────────────────────────────────────────────────────────
# READ endpoints

@router.get("/mcp-registry")
def mcp_registry():
    rows = _all("mcp_server_registry")
    return {"count": len(rows), "servers": rows}


@router.get("/eval-registry")
def eval_registry():
    rows = _all("eval_registry")
    return {"count": len(rows), "evals": rows}


@router.get("/dataset-registry")
def dataset_registry():
    rows = _all("dataset_registry")
    return {"count": len(rows), "datasets": rows}


@router.get("/access-registry")
def access_registry():
    rows = _all("access_registry")
    return {"count": len(rows), "grants": rows}


@router.get("/dlq")
def dead_letter_queue():
    rows = _all("dead_letter_queue")
    return {"count": len(rows), "items": rows}


@router.get("/kill-switches")
def kill_switches():
    rows = _all("kill_switch")
    return {"count": len(rows), "switches": rows}


@router.get("/abac-policies")
def abac_policies():
    rows = _all("abac_policy")
    return {"count": len(rows), "policies": rows}


# ─────────────────────────────────────────────────────────────────────
# Kill-switch toggle

class KillToggle(BaseModel):
    switch_id: str
    target_type: str
    target_id: str
    kill: bool
    by: str | None = "operator"
    reason: str | None = None


@router.post("/kill-switch/toggle")
def kill_toggle(body: KillToggle):
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO kill_switch (switch_id, target_type, target_id, is_killed, killed_by, killed_at, reason)
            VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s)
            ON CONFLICT (switch_id) DO UPDATE SET
              is_killed = EXCLUDED.is_killed,
              killed_by = EXCLUDED.killed_by,
              killed_at = CURRENT_TIMESTAMP,
              reason = EXCLUDED.reason
        """, (body.switch_id, body.target_type, body.target_id, body.kill,
              body.by, body.reason))
    return {"switch_id": body.switch_id, "is_killed": body.kill,
            "at": datetime.now(timezone.utc).isoformat()}


# ─────────────────────────────────────────────────────────────────────
# DLQ retry

class DlqRetry(BaseModel):
    dlq_id: int


@router.post("/dlq/retry")
def dlq_retry(body: DlqRetry):
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            UPDATE dead_letter_queue
            SET status='retrying', retry_count = retry_count + 1,
                next_retry_at = CURRENT_TIMESTAMP + INTERVAL '5 seconds'
            WHERE dlq_id = %s AND retry_count < max_retries
            RETURNING dlq_id, retry_count, max_retries
        """, (body.dlq_id,))
        row = cur.fetchone()
        if not row:
            return {"error": "DLQ item not found or max retries exceeded"}
    return {"dlq_id": row[0], "retry_count": row[1], "max_retries": row[2]}


# ─────────────────────────────────────────────────────────────────────
# ABAC evaluation (simplified · for demonstration)

class AbacRequest(BaseModel):
    user_role: str
    user_tenant: str = "default"
    resource_type: str
    resource_tenant: str = "default"
    resource_pii_classification: str | None = None
    action: str


@router.post("/abac/evaluate")
def abac_evaluate(body: AbacRequest):
    """Simplified ABAC eval · matches operator-provided context against active policies.
    Returns Allow/Deny based on highest-priority matching policy.
    """
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM abac_policy WHERE status='active'
            ORDER BY priority ASC
        """)
        policies = [dict(r) for r in cur.fetchall()]

    decisions = []
    # Highest-priority matching policy wins
    for p in policies:
        applies = True
        cond = p.get("conditions") or {}
        # Resource pattern match
        if p["resource_pattern"] != "*" and p["resource_pattern"] != body.resource_type:
            applies = False
        # Tenant isolation
        if cond.get("resource.tenant_id != user.tenant_id"):
            if body.user_tenant != body.resource_tenant:
                applies = True
            else:
                applies = False
        # PII restriction
        if "resource.pii_classification" in cond:
            req_pii = cond["resource.pii_classification"]
            if body.resource_pii_classification == req_pii and body.user_role != "Compliance":
                applies = True
            else:
                applies = False
        decisions.append({
            "policy_id": p["policy_id"], "effect": p["effect"],
            "applies": applies, "priority": p["priority"],
        })

    # First applying policy wins
    winner = next((d for d in decisions if d["applies"]), None)
    final = winner["effect"] if winner else "Allow"  # default-allow
    return {
        "decision": final,
        "winning_policy": winner,
        "all_evaluations": decisions,
        "request": body.model_dump(),
    }


# ─────────────────────────────────────────────────────────────────────
# Iter 69 · concurrency · secrets · golden tests · synthetic data

@router.get("/concurrency")
def concurrency_control():
    rows = _all("concurrency_control")
    return {"count": len(rows), "controls": rows}


class ConcurrencyAcquire(BaseModel):
    control_id: str
    increment: int = 1


@router.post("/concurrency/acquire")
def concurrency_acquire(body: ConcurrencyAcquire):
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            UPDATE concurrency_control
            SET current_count = current_count + %s,
                last_acquired_at = CURRENT_TIMESTAMP
            WHERE control_id = %s AND current_count + %s <= max_concurrent
            RETURNING current_count, max_concurrent
        """, (body.increment, body.control_id, body.increment))
        row = cur.fetchone()
        if not row:
            return {"acquired": False, "reason": "max_concurrent would be exceeded"}
    return {"acquired": True, "current": row[0], "max": row[1]}


@router.post("/concurrency/release")
def concurrency_release(body: ConcurrencyAcquire):
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            UPDATE concurrency_control
            SET current_count = GREATEST(0, current_count - %s),
                last_released_at = CURRENT_TIMESTAMP
            WHERE control_id = %s
            RETURNING current_count
        """, (body.increment, body.control_id))
        row = cur.fetchone()
    return {"released": True, "current": row[0] if row else 0}


@router.get("/secrets-vault")
def secrets_vault():
    rows = _all("secrets_vault")
    # Mask the encrypted value
    for r in rows:
        if "encrypted_value" in r:
            r["encrypted_value"] = "__masked__"
    return {"count": len(rows), "secrets": rows}


@router.get("/golden-tests")
def golden_tests(agent_id: str | None = None):
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        if agent_id:
            cur.execute("""
                SELECT * FROM golden_test_set WHERE target_agent_id=%s
                ORDER BY created_at LIMIT 100
            """, (agent_id,))
        else:
            cur.execute("""
                SELECT * FROM golden_test_set ORDER BY created_at LIMIT 100
            """)
        rows = [dict(r) for r in cur.fetchall()]
    return {"count": len(rows), "tests": rows}


@router.get("/synthetic-datasets")
def synthetic_datasets():
    rows = _all("synthetic_dataset")
    return {"count": len(rows), "datasets": rows}


class SynthGenRequest(BaseModel):
    synth_id: str
    n: int = 5


@router.post("/synthetic/generate")
def synthetic_generate(body: SynthGenRequest):
    """Tiny synthetic data generator · uses Python's hash + counter (no Faker dep)."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM synthetic_dataset WHERE synth_id=%s", (body.synth_id,))
        ds = cur.fetchone()
    if not ds:
        return {"error": "synth_id not found"}
    template = ds["template"]
    fields = template.get("fields", []) if isinstance(template, dict) else []
    rows = []
    for i in range(min(body.n, 100)):
        row = {}
        for f in fields:
            t = f.get("type", "string")
            if t == "uuid":
                row[f["name"]] = f"u-{i:06d}-{abs(hash(f['name']+str(i))) % 10000}"
            elif t == "float":
                lo = f.get("min", 0)
                hi = f.get("max", 100)
                row[f["name"]] = round(lo + (hi - lo) * ((i * 37 + 13) % 100) / 100.0, 2)
            elif t == "choice":
                vals = f.get("values", ["a"])
                row[f["name"]] = vals[i % len(vals)]
            elif t == "name":
                row[f["name"]] = f"Customer-{i}"
            elif t == "email":
                row[f["name"]] = f"user{i}@synthetic.local"
            elif t == "phone":
                row[f["name"]] = f"555-{(i * 7) % 1000:03d}-{(i * 13) % 10000:04d}"
            else:
                row[f["name"]] = f"value-{i}"
        rows.append(row)
    return {"synth_id": body.synth_id, "generated": len(rows), "rows": rows[:50],
            "scaffold_note": "Deterministic stub generator · plug Faker for prod"}


# ─────────────────────────────────────────────────────────────────────
# Health · summary across all tables

@router.get("/health")
def health():
    """Per-registry counts · for §99 coverage."""
    out = {}
    with _conn() as c, c.cursor() as cur:
        for t in ["mcp_server_registry", "eval_registry", "dataset_registry",
                  "access_registry", "dead_letter_queue", "kill_switch",
                  "abac_policy", "concurrency_control", "secrets_vault",
                  "golden_test_set", "synthetic_dataset"]:
            cur.execute(f"SELECT COUNT(*) FROM {t}")
            out[t] = cur.fetchone()[0]
        # Check new agents
        cur.execute("""
            SELECT COUNT(*) FROM agent_registry
            WHERE agent_id IN ('sys_router_agent','sys_memory_agent',
                              'sys_cost_agent','sys_compliance_agent')
              AND status='Active'
        """)
        out["new_dedicated_agents"] = cur.fetchone()[0]
    return {
        "status": "ok", "module": "governance-registries",
        "spec": "§99 push to Grade A · 7 new tables + 4 new agents",
        "counts": out,
        "all_present": True  # tables exist · rows optional,
    }
