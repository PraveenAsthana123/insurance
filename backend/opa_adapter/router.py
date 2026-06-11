"""/api/v1/opa/* · Iter 89 · OPA Stage-1 adapter."""
from __future__ import annotations

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from _adapter_helpers import stamp, configured_when, env_config, scaffold_note

router = APIRouter(prefix="/api/v1/opa", tags=["opa"])
ENV_KEY = "OPA_URL"


@router.get("/health")
def health():
    url = env_config(ENV_KEY, "http://localhost:8181")
    is_live = False
    if configured_when(ENV_KEY) or url:
        try:
            r = httpx.get(f"{url}/health", timeout=2)
            is_live = r.status_code == 200
        except Exception:
            is_live = False
    return {**stamp(), "module": "opa-adapter", "vendor": "Open Policy Agent",
            "configured": configured_when(ENV_KEY),
            "live_at": url if is_live else None,
            "scaffold_note": None if is_live else scaffold_note(ENV_KEY, "OPA"),
            "capabilities": ["evaluate Rego policies", "decision logs",
                             "data documents", "bundle reload"],
            "spec": "§56 Stage-1 · §57.7 honest"}


class Eval(BaseModel):
    package: str
    input: dict


@router.post("/evaluate")
def evaluate(body: Eval):
    url = env_config(ENV_KEY, "http://localhost:8181")
    try:
        r = httpx.post(f"{url}/v1/data/{body.package.replace('.', '/')}",
                       json={"input": body.input}, timeout=5)
        return {**stamp(), "status": "live", "package": body.package,
                "result": r.json() if r.status_code == 200 else None,
                "http_status": r.status_code}
    except Exception as e:
        # Fallback to our ABAC policy table (already lives per §101 + Iter 68)
        from psycopg2.extras import RealDictCursor
        from _adapter_helpers import conn
        with conn() as c, c.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT policy_id, policy_name, effect FROM abac_policy
                WHERE status='active' ORDER BY priority LIMIT 5
            """)
            local = [dict(r) for r in cur.fetchall()]
        return {**stamp(), "status": "scaffold",
                "fallback": "abac_policy table (Iter 68 · §101.A.5)",
                "reason": str(e)[:200],
                "local_policies_available": len(local), "sample": local}


@router.get("/config-example")
def config_example():
    return {**stamp(), "vendor": "OPA · Open Policy Agent",
            "setup_steps": [
                "1. docker run -d -p 8181:8181 openpolicyagent/opa run --server",
                "2. export OPA_URL=http://localhost:8181",
                "3. Restart backend",
                "4. Write Rego policies + POST to /v1/policies/{name}",
                "5. POST /api/v1/opa/evaluate to test",
            ],
            "current_fallback": "abac_policy table (Iter 68)",
            "oss_url": "https://github.com/open-policy-agent/opa"}
