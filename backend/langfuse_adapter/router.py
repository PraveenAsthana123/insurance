"""/api/v1/langfuse/* · Iter 89 · Langfuse Stage-1 adapter (OSS LangSmith alternative)."""
from __future__ import annotations

import base64
import json
import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from _adapter_helpers import stamp, configured_when, env_config, scaffold_note, conn

router = APIRouter(prefix="/api/v1/langfuse", tags=["langfuse"])
PK_ENV = "LANGFUSE_PUBLIC_KEY"
SK_ENV = "LANGFUSE_SECRET_KEY"
HOST_ENV = "LANGFUSE_HOST"


def _is_configured() -> bool:
    return configured_when(PK_ENV) and configured_when(SK_ENV)


def _auth_header() -> dict:
    creds = f"{env_config(PK_ENV)}:{env_config(SK_ENV)}"
    return {"Authorization": f"Basic {base64.b64encode(creds.encode()).decode()}"}


@router.get("/health")
def health():
    host = env_config(HOST_ENV, "https://cloud.langfuse.com")
    return {**stamp(), "module": "langfuse-adapter", "vendor": "Langfuse (OSS)",
            "configured": _is_configured(), "host": host,
            "self_host_ready": True,
            "scaffold_note": None if _is_configured() else scaffold_note(PK_ENV, "Langfuse"),
            "capabilities": ["traces", "spans", "generations", "scores", "datasets"],
            "spec": "§56 Stage-1 · §57.7 honest"}


class Trace(BaseModel):
    name: str
    user_id: str | None = None
    metadata: dict | None = None
    input: dict | None = None
    output: dict | None = None


@router.post("/trace")
def trace(body: Trace):
    host = env_config(HOST_ENV, "https://cloud.langfuse.com")
    if not _is_configured():
        with conn() as c, c.cursor() as cur:
            cur.execute("""
                INSERT INTO audit_log (actor, action, resource, payload)
                VALUES ('sys_langfuse_adapter', 'scaffold_trace', %s, %s::jsonb)
            """, (body.name, json.dumps(body.model_dump())))
        return {**stamp(), "status": "scaffold", "sent_to": "audit_log",
                "note": scaffold_note(PK_ENV, "Langfuse")}
    try:
        r = httpx.post(f"{host}/api/public/traces",
                       headers=_auth_header(), json=body.model_dump(), timeout=5)
        return {**stamp(), "status": "live", "http_status": r.status_code,
                "trace_id": r.json().get("id") if r.status_code < 300 else None}
    except Exception as e:
        return {**stamp(), "status": "error", "error": str(e)[:200]}


@router.get("/config-example")
def config_example():
    return {**stamp(), "vendor": "Langfuse (OSS · self-host OR cloud)",
            "self_host_setup": [
                "1. docker-compose up langfuse-server postgres",
                "2. Open http://localhost:3000 · sign up",
                "3. Create project · note public + secret keys",
                "4. export LANGFUSE_HOST=http://localhost:3000",
                "5. export LANGFUSE_PUBLIC_KEY=pk-lf-xxx",
                "6. export LANGFUSE_SECRET_KEY=sk-lf-xxx",
            ],
            "cloud_setup": "Same as above · use cloud.langfuse.com",
            "oss_url": "https://github.com/langfuse/langfuse",
            "advantages_over_langsmith": ["Self-hostable OSS", "No vendor lock-in",
                                          "Same trace/dataset semantics"]}
