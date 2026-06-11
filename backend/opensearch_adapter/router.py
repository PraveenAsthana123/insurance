"""/api/v1/opensearch/* · Iter 89 · OpenSearch Stage-1 adapter."""
from __future__ import annotations

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from _adapter_helpers import stamp, configured_when, env_config, scaffold_note, conn

router = APIRouter(prefix="/api/v1/opensearch", tags=["opensearch"])
ENV_KEY = "OPENSEARCH_URL"


@router.get("/health")
def health():
    url = env_config(ENV_KEY, "http://localhost:9200")
    is_live = False
    if configured_when(ENV_KEY):
        try:
            r = httpx.get(url, timeout=2)
            is_live = r.status_code == 200
        except Exception:
            is_live = False
    return {**stamp(), "module": "opensearch-adapter",
            "vendor": "OpenSearch (Apache 2.0 · OSS Elasticsearch fork)",
            "configured": configured_when(ENV_KEY),
            "live_at": url if is_live else None,
            "scaffold_note": None if is_live else scaffold_note(ENV_KEY, "OpenSearch"),
            "fallback": "Postgres ILIKE search (per Iter 43 TF-IDF stub)",
            "capabilities": ["full-text search", "vector search (k-NN)",
                             "log aggregation", "observability (Dashboards)",
                             "ML anomaly detection"],
            "spec": "§56 Stage-1 · §57.7 honest"}


class SearchRequest(BaseModel):
    query: str
    index: str = "knowledge_base"
    size: int = 10


@router.post("/search")
def search(body: SearchRequest):
    if configured_when(ENV_KEY):
        try:
            url = env_config(ENV_KEY, "http://localhost:9200")
            r = httpx.post(f"{url}/{body.index}/_search",
                           json={"query": {"match": {"_all": body.query}},
                                 "size": body.size}, timeout=5)
            if r.status_code == 200:
                return {**stamp(), "status": "live", "vendor": "OpenSearch",
                        "results": r.json().get("hits", {}).get("hits", []),
                        "took_ms": r.json().get("took", 0)}
        except Exception as e:
            return {**stamp(), "status": "error", "error": str(e)[:200]}

    # Scaffold path · Postgres ILIKE on knowledge_base
    from psycopg2.extras import RealDictCursor
    with conn() as c, c.cursor(cursor_factory=RealDictCursor) as cur:
        try:
            cur.execute("""
                SELECT id, title, content, tenant_id, created_at
                FROM knowledge_base
                WHERE content ILIKE %s OR title ILIKE %s
                ORDER BY created_at DESC LIMIT %s
            """, (f"%{body.query}%", f"%{body.query}%", body.size))
            rows = [dict(r) for r in cur.fetchall()]
        except Exception:
            rows = []
    return {**stamp(), "status": "scaffold",
            "fallback": "knowledge_base ILIKE search (per Iter 43)",
            "results": rows, "count": len(rows)}


@router.get("/config-example")
def config_example():
    return {**stamp(), "vendor": "OpenSearch (Apache 2.0)",
            "setup_steps": [
                "1. docker run -d -p 9200:9200 -e 'discovery.type=single-node' opensearchproject/opensearch:latest",
                "2. (Optional · UI) docker run -d -p 5601:5601 opensearchproject/opensearch-dashboards",
                "3. export OPENSEARCH_URL=http://localhost:9200",
                "4. Restart backend",
                "5. Indices auto-created on first POST",
            ],
            "current_fallback": "Postgres ILIKE search on knowledge_base",
            "oss_url": "https://github.com/opensearch-project/OpenSearch",
            "use_cases": ["RAG vector search", "log search",
                          "audit_log aggregation", "incident timeline correlation"],
            "alternative": "Elasticsearch (commercial license)"}
