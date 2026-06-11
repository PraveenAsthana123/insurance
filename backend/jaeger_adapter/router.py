"""/api/v1/jaeger/* · Iter 90 · Jaeger Stage-1 adapter."""
import httpx
from fastapi import APIRouter
from _adapter_helpers import stamp, configured_when, env_config, scaffold_note, conn
router = APIRouter(prefix="/api/v1/jaeger", tags=["jaeger"])
ENV_KEY = "JAEGER_URL"

@router.get("/health")
def health():
    url = env_config(ENV_KEY, "http://localhost:16686")
    live = False
    if configured_when(ENV_KEY):
        try: live = httpx.get(url, timeout=2).status_code == 200
        except: live = False
    return {**stamp(), "module": "jaeger-adapter", "vendor": "Jaeger (OSS · CNCF)",
            "configured": configured_when(ENV_KEY), "live_at": url if live else None,
            "scaffold_note": None if live else scaffold_note(ENV_KEY, "Jaeger"),
            "fallback": "agent_trace_event table (Iter 43 OTel-style spans)",
            "capabilities": ["distributed traces", "service map", "span search",
                             "trace comparison"],
            "spec": "§56 Stage-1 · §57.7 honest · CNCF Apache 2.0"}

@router.get("/traces/recent")
def recent(limit: int = 20):
    if configured_when(ENV_KEY):
        try:
            url = env_config(ENV_KEY)
            r = httpx.get(f"{url}/api/traces?service=insur-project&limit={limit}", timeout=5)
            return {**stamp(), "status": "live", "traces": r.json().get("data", [])}
        except Exception as e:
            return {**stamp(), "status": "error", "error": str(e)[:200]}
    with conn() as c, c.cursor() as cur:
        cur.execute("""
            SELECT trace_id, COUNT(*) AS spans, MIN(created_at) AS started,
                   MAX(created_at) - MIN(created_at) AS duration
            FROM agent_trace_event
            WHERE trace_id IS NOT NULL AND created_at > NOW() - INTERVAL '1 hour'
            GROUP BY trace_id ORDER BY started DESC LIMIT %s
        """, (limit,))
        rows = [{"trace_id": r[0], "spans": r[1], "started": str(r[2]),
                 "duration": str(r[3])} for r in cur.fetchall()]
    return {**stamp(), "status": "scaffold",
            "fallback": "agent_trace_event (Iter 43)",
            "traces": rows, "count": len(rows)}

@router.get("/config-example")
def config_example():
    return {**stamp(), "vendor": "Jaeger",
            "setup_steps": [
                "1. docker run -d --name jaeger -p 16686:16686 -p 4317:4317 jaegertracing/all-in-one:latest",
                "2. export JAEGER_URL=http://localhost:16686",
                "3. Backend already emits OTel spans (Iter 43 · trace_id col)",
                "4. UI at http://localhost:16686"],
            "oss_url": "https://github.com/jaegertracing/jaeger",
            "alternative": "Tempo (also wired · Iter 90)"}
