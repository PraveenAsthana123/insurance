"""/api/v1/agentops/* · Iter 89 · AgentOps Stage-1 adapter."""
from __future__ import annotations

import httpx
import json
from fastapi import APIRouter
from pydantic import BaseModel

from _adapter_helpers import stamp, configured_when, env_config, scaffold_note, conn

router = APIRouter(prefix="/api/v1/agentops", tags=["agentops"])
ENV_KEY = "AGENTOPS_API_KEY"


@router.get("/health")
def health():
    return {**stamp(), "module": "agentops-adapter", "vendor": "AgentOps",
            "configured": configured_when(ENV_KEY),
            "endpoint": "https://api.agentops.ai",
            "scaffold_note": None if configured_when(ENV_KEY) else scaffold_note(ENV_KEY, "AgentOps"),
            "capabilities": ["session tracking", "agent step recording",
                             "token/cost tracking", "error monitoring"],
            "spec": "§56 Stage-1 · §57.7 honest"}


class Session(BaseModel):
    agent_id: str
    session_name: str
    metadata: dict | None = None


@router.post("/session/start")
def session_start(body: Session):
    if not configured_when(ENV_KEY):
        with conn() as c, c.cursor() as cur:
            cur.execute("""
                INSERT INTO audit_log (actor, action, resource, payload)
                VALUES ('sys_agentops_adapter', 'scaffold_session_start', %s, %s::jsonb)
            """, (body.agent_id, json.dumps(body.model_dump())))
        return {**stamp(), "status": "scaffold", "session_id": f"local-{body.session_name}",
                "sent_to": "audit_log", "note": scaffold_note(ENV_KEY, "AgentOps")}
    try:
        r = httpx.post("https://api.agentops.ai/v1/sessions",
                       headers={"x-api-key": env_config(ENV_KEY)},
                       json=body.model_dump(), timeout=5)
        return {**stamp(), "status": "live", "http_status": r.status_code,
                "session_id": r.json().get("id") if r.status_code < 300 else None}
    except Exception as e:
        return {**stamp(), "status": "error", "error": str(e)[:200]}


@router.get("/config-example")
def config_example():
    return {**stamp(), "vendor": "AgentOps",
            "setup_steps": [
                "1. Sign up at https://agentops.ai",
                "2. Get API key from project settings",
                "3. export AGENTOPS_API_KEY=ag_xxx",
                "4. (Optional) pip install agentops",
                "5. Restart backend",
            ],
            "current_fallback": "audit_log (sessions captured locally)",
            "oss_url": "https://github.com/AgentOps-AI/agentops",
            "alternative": "Langfuse (also wired · Iter 89)"}
