"""/api/v1/tempo/* · Iter 90 · Grafana Tempo Stage-1 adapter."""
import httpx
from fastapi import APIRouter
from _adapter_helpers import stamp, configured_when, env_config, scaffold_note, conn
router = APIRouter(prefix="/api/v1/tempo", tags=["tempo"])
ENV_KEY = "TEMPO_URL"

@router.get("/health")
def health():
    url = env_config(ENV_KEY, "http://localhost:3200")
    live = False
    if configured_when(ENV_KEY):
        try: live = httpx.get(f"{url}/ready", timeout=2).status_code == 200
        except: live = False
    return {**stamp(), "module": "tempo-adapter", "vendor": "Grafana Tempo (AGPL · OSS)",
            "configured": configured_when(ENV_KEY), "live_at": url if live else None,
            "scaffold_note": None if live else scaffold_note(ENV_KEY, "Tempo"),
            "fallback": "agent_trace_event (Iter 43)",
            "capabilities": ["distributed traces (TraceQL query)", "trace search",
                             "metrics generator (RED · spans → metrics)",
                             "Grafana integration"],
            "spec": "§56 Stage-1 · CNCF · pairs with Loki+Mimir for L+T+M stack"}

@router.get("/traces/{trace_id}")
def get_trace(trace_id: str):
    if configured_when(ENV_KEY):
        try:
            url = env_config(ENV_KEY)
            r = httpx.get(f"{url}/api/traces/{trace_id}", timeout=5)
            return {**stamp(), "status": "live", "trace": r.json()}
        except Exception as e:
            return {**stamp(), "status": "error", "error": str(e)[:200]}
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            SELECT event_name, span_kind, duration_ms, created_at, attributes
            FROM agent_trace_event WHERE trace_id=%s ORDER BY created_at
        """, (trace_id,))
        spans = [{"name": r[0], "kind": r[1], "duration_ms": r[2],
                  "at": str(r[3]), "attrs": r[4]} for r in cur.fetchall()]
    return {**stamp(), "status": "scaffold",
            "fallback": "agent_trace_event",
            "trace_id": trace_id, "n_spans": len(spans), "spans": spans}

@router.get("/config-example")
def config_example():
    return {**stamp(), "vendor": "Grafana Tempo",
            "setup_steps": [
                "1. docker run -d --name tempo -p 3200:3200 -p 4317:4317 grafana/tempo:latest",
                "2. export TEMPO_URL=http://localhost:3200",
                "3. Add Tempo datasource in Grafana → query via TraceQL"],
            "oss_url": "https://github.com/grafana/tempo",
            "stack_position": "L (Loki) + T (Tempo) + M (Mimir) · Grafana observability"}
