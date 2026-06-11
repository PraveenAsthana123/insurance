"""/api/v1/langsmith/* · Iter 88 · LangSmith adapter (Stage-1 opt-in)."""
from __future__ import annotations

import getpass
import json
import os
import platform
import time
import uuid
from datetime import datetime, timezone

import httpx
import psycopg2
import psycopg2.extras
from fastapi import APIRouter
from pydantic import BaseModel

from core.config import get_settings

router = APIRouter(prefix="/api/v1/langsmith", tags=["langsmith"])

ACTOR_USER = getpass.getuser()
ACTOR_HOST = platform.node().split(".")[0]

# LangSmith config from env (§42 secrets · §61 venv path)
LANGSMITH_API_KEY = os.environ.get("LANGSMITH_API_KEY", "")
LANGSMITH_ENDPOINT = os.environ.get("LANGSMITH_ENDPOINT",
                                    "https://api.smith.langchain.com")
LANGSMITH_PROJECT = os.environ.get("LANGSMITH_PROJECT", "insur-project")


def _conn():
    return psycopg2.connect(get_settings().database_url)


def _stamp() -> dict:
    """§107 triple-stamp."""
    return {
        "ts_utc": datetime.now(timezone.utc).isoformat(),
        "ts_local": datetime.now().astimezone().isoformat(),
        "tz": time.strftime("%Z"),
        "actor_user": ACTOR_USER, "actor_host": ACTOR_HOST,
    }


def _is_configured() -> bool:
    return bool(LANGSMITH_API_KEY)


def _try_sdk():
    """Lazy import · §56 Stage-1 pattern."""
    try:
        from langsmith import Client
        return Client(api_key=LANGSMITH_API_KEY,
                      api_url=LANGSMITH_ENDPOINT)
    except ImportError:
        return None
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────
# Endpoints

@router.get("/health")
def health():
    sdk = _try_sdk() if _is_configured() else None
    return {
        **_stamp(),
        "module": "langsmith-adapter",
        "configured": _is_configured(),
        "sdk_available": sdk is not None,
        "endpoint": LANGSMITH_ENDPOINT,
        "project": LANGSMITH_PROJECT,
        "spec": "§56 Stage-1 opt-in adapter · §57.7 honest",
        "scaffold_note": None if _is_configured() else
            "LANGSMITH_API_KEY not set · running in scaffold mode (no remote traces sent)",
        "capabilities": [
            "trace LLM calls (gateway → LangSmith run)",
            "dataset management (CRUD · pull · push)",
            "prompt versioning (push prompts from prompt_log)",
            "evaluation tracking (eval_registry → LangSmith experiments)",
            "production monitoring (mirror llm_gateway_call to runs)",
        ],
    }


class TraceCall(BaseModel):
    name: str
    run_type: str = "llm"  # llm | tool | chain | retriever
    inputs: dict
    outputs: dict | None = None
    error: str | None = None
    tags: list[str] | None = None
    metadata: dict | None = None
    parent_run_id: str | None = None


@router.post("/trace")
def trace(body: TraceCall):
    """Send a trace to LangSmith · honest scaffold when not configured."""
    run_id = str(uuid.uuid4())
    stamp = _stamp()

    payload = {
        "id": run_id,
        "name": body.name,
        "run_type": body.run_type,
        "session_name": LANGSMITH_PROJECT,
        "inputs": body.inputs,
        "outputs": body.outputs or {},
        "error": body.error,
        "tags": body.tags or [],
        "extra": body.metadata or {},
        "start_time": stamp["ts_utc"],
        "end_time": stamp["ts_utc"],
        "parent_run_id": body.parent_run_id,
    }

    if not _is_configured():
        # §57.7 honest scaffold · write to local audit instead
        with _conn() as c, c.cursor() as cur:
            cur.execute("""
                INSERT INTO audit_log (actor, action, resource, payload)
                VALUES ('sys_langsmith_adapter', 'scaffold_trace', %s, %s::jsonb)
            """, (body.name, json.dumps(payload, default=str)))
        return {
            **stamp, "run_id": run_id, "status": "scaffold",
            "sent_to": "audit_log (LANGSMITH_API_KEY not set)",
            "payload_sample": {k: payload[k] for k in ("name", "run_type", "session_name")},
            "scaffold_note": "Set LANGSMITH_API_KEY to send real traces",
        }

    # Real LangSmith POST
    try:
        r = httpx.post(
            f"{LANGSMITH_ENDPOINT}/runs",
            headers={"x-api-key": LANGSMITH_API_KEY, "Content-Type": "application/json"},
            json=payload, timeout=10,
        )
        status_text = "ok" if r.status_code < 300 else f"http_{r.status_code}"
        # Mirror to audit_log
        with _conn() as c, c.cursor() as cur:
            cur.execute("""
                INSERT INTO audit_log (actor, action, resource, payload)
                VALUES ('sys_langsmith_adapter', 'trace_sent', %s, %s::jsonb)
            """, (body.name, json.dumps({"run_id": run_id, "status": status_text,
                                          "name": body.name})))
        return {
            **stamp, "run_id": run_id, "status": status_text,
            "langsmith_status": r.status_code,
            "sent_to": "LangSmith API + audit_log",
        }
    except Exception as e:
        return {
            **stamp, "run_id": run_id, "status": "error",
            "error": str(e)[:200],
        }


@router.post("/mirror-gateway")
def mirror_gateway(hours: int = 1):
    """Mirror llm_gateway_call rows from the last N hours to LangSmith.
    Honest: when not configured, just counts what would be sent.
    """
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT call_id, model_used, status, prompt_tokens, completion_tokens,
                   cost_usd, latency_ms, ts_utc, tenant_id, actor_user
            FROM llm_gateway_call
            WHERE ts_utc > NOW() - (%s || ' hours')::interval
            ORDER BY ts_utc DESC LIMIT 500
        """, (hours,))
        rows = [dict(r) for r in cur.fetchall()]

    if not _is_configured():
        return {
            **_stamp(), "configured": False, "would_send": len(rows),
            "sample_call_ids": [r["call_id"] for r in rows[:5]],
            "scaffold_note": "Set LANGSMITH_API_KEY to actually push these to LangSmith",
        }

    n_sent = 0
    n_failed = 0
    for r in rows:
        payload = {
            "id": str(uuid.uuid4()),
            "name": f"gateway-call-{r['model_used']}",
            "run_type": "llm",
            "session_name": LANGSMITH_PROJECT,
            "inputs": {"model": r["model_used"], "tenant_id": r["tenant_id"]},
            "outputs": {"prompt_tokens": r["prompt_tokens"],
                        "completion_tokens": r["completion_tokens"]},
            "tags": [f"status_{r['status']}", f"actor_{r['actor_user']}"],
            "extra": {"call_id": r["call_id"], "cost_usd": float(r["cost_usd"] or 0),
                      "latency_ms": r["latency_ms"]},
            "start_time": r["ts_utc"].isoformat(),
            "end_time": r["ts_utc"].isoformat(),
        }
        try:
            resp = httpx.post(
                f"{LANGSMITH_ENDPOINT}/runs",
                headers={"x-api-key": LANGSMITH_API_KEY},
                json=payload, timeout=5,
            )
            if resp.status_code < 300:
                n_sent += 1
            else:
                n_failed += 1
        except Exception:
            n_failed += 1

    return {**_stamp(), "configured": True, "sent": n_sent, "failed": n_failed,
            "total_candidates": len(rows)}


@router.get("/datasets")
def datasets():
    """List datasets · scaffold when not configured."""
    if not _is_configured():
        return {**_stamp(), "configured": False,
                "datasets": [],
                "scaffold_note": "Returns empty when LANGSMITH_API_KEY unset · §57.7 honest"}
    try:
        r = httpx.get(f"{LANGSMITH_ENDPOINT}/datasets",
                      headers={"x-api-key": LANGSMITH_API_KEY}, timeout=10)
        if r.status_code == 200:
            data = r.json()
            return {**_stamp(), "configured": True,
                    "datasets": data if isinstance(data, list) else data.get("data", []),
                    "count": len(data) if isinstance(data, list) else 0}
        return {**_stamp(), "configured": True, "error": f"http_{r.status_code}"}
    except Exception as e:
        return {**_stamp(), "configured": True, "error": str(e)[:200]}


@router.get("/runs/recent")
def runs_recent(limit: int = 20):
    """Recent runs · scaffold when not configured · returns local audit instead."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT created_at, action, resource, payload
            FROM audit_log
            WHERE actor='sys_langsmith_adapter'
            ORDER BY created_at DESC LIMIT %s
        """, (limit,))
        rows = [dict(r) for r in cur.fetchall()]
    return {**_stamp(), "configured": _is_configured(),
            "local_audit_count": len(rows), "rows": rows[:limit],
            "note": "Local audit_log rows · use /mirror-gateway to push to LangSmith"}


@router.get("/config-example")
def config_example():
    """How to configure LangSmith · operator setup guide."""
    return {
        **_stamp(),
        "setup_steps": [
            "1. Sign up at https://smith.langchain.com (free tier available)",
            "2. Create a project · note the project name",
            "3. Get API key from Settings → API Keys",
            "4. Add to environment:",
            "     export LANGSMITH_API_KEY=ls_xxx",
            "     export LANGSMITH_PROJECT=insur-project",
            "     export LANGSMITH_ENDPOINT=https://api.smith.langchain.com  # default",
            "5. (Optional) pip install langsmith  # for SDK · we use REST by default",
            "6. Restart backend",
            "7. Test: curl -X POST http://localhost:8001/api/v1/langsmith/trace -d '{\"name\":\"test\",\"inputs\":{\"q\":\"hi\"}}'",
            "8. Mirror existing gateway calls: POST /api/v1/langsmith/mirror-gateway?hours=24",
        ],
        "secrets_storage_recommendation":
            "Per §42 + §103 · NEVER commit LANGSMITH_API_KEY to git · use secrets_vault table or env-only · per §101.E secrets management",
        "alternative_oss": [
            "Langfuse (self-host · OSS · github.com/langfuse/langfuse)",
            "Phoenix by Arize (self-host · OSS · github.com/Arize-ai/phoenix)",
            "OpenLLMetry by Traceloop (OTel-based · OSS · github.com/traceloop/openllmetry)",
        ],
        "current_status": "scaffold" if not _is_configured() else "live",
    }
