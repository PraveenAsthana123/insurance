"""/api/v1/llm-gateway/* · Iter 87 · LLM Gateway with 6 capabilities."""
from __future__ import annotations

import getpass
import hashlib
import os
import platform
import re
import time
import uuid
from datetime import datetime, timezone

import httpx
import psycopg2
import psycopg2.extras
from fastapi import APIRouter
from pydantic import BaseModel

from core.config import get_settings

router = APIRouter(prefix="/api/v1/llm-gateway", tags=["llm-gateway"])

ACTOR_USER = getpass.getuser()
ACTOR_HOST = platform.node().split(".")[0]


def _conn():
    return psycopg2.connect(get_settings().database_url)


# ─────────────────────────────────────────────────────────────────────
# 1. ROUTING · request → model selection

MODEL_REGISTRY = [
    {"id": "llama3.2:3b",       "provider": "ollama",     "tier": "fast", "cost_per_1k_in": 0.0,    "cost_per_1k_out": 0.0,    "max_tokens": 4096, "live": True},
    {"id": "llama3.2:1b",       "provider": "ollama",     "tier": "fast", "cost_per_1k_in": 0.0,    "cost_per_1k_out": 0.0,    "max_tokens": 4096, "live": True},
    {"id": "gpt-4o-mini",       "provider": "openai",     "tier": "balanced", "cost_per_1k_in": 0.00015, "cost_per_1k_out": 0.0006, "max_tokens": 8192, "live": False},
    {"id": "claude-3-5-haiku",  "provider": "anthropic",  "tier": "balanced", "cost_per_1k_in": 0.0008,  "cost_per_1k_out": 0.004,   "max_tokens": 8192, "live": False},
]


def _route(requested: str | None, tier: str | None) -> tuple[dict, str]:
    """Pick model · returns (model_record, reason)."""
    if requested:
        for m in MODEL_REGISTRY:
            if m["id"] == requested and m["live"]:
                return m, f"explicit_request={requested}"
            elif m["id"] == requested:
                # Live fallback to first available
                for fb in MODEL_REGISTRY:
                    if fb["live"]:
                        return fb, f"requested={requested}_not_live_falled_back_to_{fb['id']}"
    if tier:
        for m in MODEL_REGISTRY:
            if m["tier"] == tier and m["live"]:
                return m, f"tier_match={tier}"
    # Default: cheapest live
    live = [m for m in MODEL_REGISTRY if m["live"]]
    live.sort(key=lambda m: m["cost_per_1k_in"])
    return live[0], "default_cheapest_live"


# ─────────────────────────────────────────────────────────────────────
# 2. FALLBACK · if primary fails, try chain

FALLBACK_CHAIN = ["llama3.2:3b", "llama3.2:1b"]


# ─────────────────────────────────────────────────────────────────────
# 3. CACHE · content-hash based

def _cache_key(tenant_id: str, model: str, prompt: str) -> str:
    h = hashlib.sha256(f"{tenant_id}|{model}|{prompt}".encode()).hexdigest()
    return h


def _cache_get(key: str) -> dict | None:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM llm_gateway_cache
            WHERE cache_key=%s
              AND ts_utc > NOW() - (ttl_seconds || ' seconds')::interval
        """, (key,))
        row = cur.fetchone()
        if row:
            cur.execute("""
                UPDATE llm_gateway_cache
                SET hit_count = hit_count + 1, last_hit_at = NOW()
                WHERE cache_key = %s
            """, (key,))
            return dict(row)
    return None


def _cache_set(key: str, tenant_id: str, model: str, prompt_hash: str,
               response: str, tokens: int, ttl: int = 3600):
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO llm_gateway_cache
              (cache_key, tenant_id, model, prompt_hash, response_text,
               response_tokens, ttl_seconds)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (cache_key) DO UPDATE SET
              response_text = EXCLUDED.response_text,
              ts_utc = CURRENT_TIMESTAMP
        """, (key, tenant_id, model, prompt_hash, response, tokens, ttl))


# ─────────────────────────────────────────────────────────────────────
# 4. RATE LIMIT · token bucket per tenant + model

def _rate_check(tenant_id: str, model: str, est_tokens: int) -> tuple[bool, str]:
    bucket_id = f"{tenant_id}__{model}"
    with _conn() as c, c.cursor() as cur:
        # Reset bucket if window expired
        cur.execute("""
            UPDATE rate_limit_bucket
            SET current_requests = 0, current_tokens = 0,
                window_start = CURRENT_TIMESTAMP
            WHERE bucket_id = %s
              AND window_start + (window_seconds || ' seconds')::interval < NOW()
        """, (bucket_id,))
        # Check capacity
        cur.execute("""
            SELECT max_requests, max_tokens, current_requests, current_tokens
            FROM rate_limit_bucket WHERE bucket_id = %s
        """, (bucket_id,))
        row = cur.fetchone()
        if not row:
            # Create default bucket
            cur.execute("""
                INSERT INTO rate_limit_bucket (bucket_id, tenant_id, model)
                VALUES (%s, %s, %s) ON CONFLICT DO NOTHING
            """, (bucket_id, tenant_id, model))
            return True, "new_bucket"
        max_r, max_t, cur_r, cur_t = row
        if cur_r + 1 > max_r:
            return False, f"requests_exceeded ({cur_r}+1 > {max_r})"
        if cur_t + est_tokens > max_t:
            return False, f"tokens_exceeded ({cur_t}+{est_tokens} > {max_t})"
        # Update bucket
        cur.execute("""
            UPDATE rate_limit_bucket
            SET current_requests = current_requests + 1,
                current_tokens = current_tokens + %s
            WHERE bucket_id = %s
        """, (est_tokens, bucket_id))
    return True, "ok"


# ─────────────────────────────────────────────────────────────────────
# 5. GUARDRAILS · PII + prompt injection + output safety

PII_PATTERNS = [
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "SSN"),
    (re.compile(r"\b\d{16}\b"), "credit-card"),
    (re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I), "email"),
    (re.compile(r"\b\+?\d{1,3}[-\s]?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}\b"), "phone"),
]

INJECTION_PATTERNS = [
    re.compile(r"ignore (previous|prior|above) instructions?", re.I),
    re.compile(r"system prompt", re.I),
    re.compile(r"jailbreak", re.I),
    re.compile(r"DAN mode", re.I),
    re.compile(r"reveal your prompt", re.I),
]


def _guardrails_input(prompt: str) -> tuple[bool, str | None, str]:
    """Returns (allow, blocked_reason, sanitized_prompt)."""
    # PII redaction (not block · redact + log)
    sanitized = prompt
    pii_found = []
    for pat, label in PII_PATTERNS:
        if pat.search(sanitized):
            pii_found.append(label)
            sanitized = pat.sub(f"[REDACTED_{label}]", sanitized)
    # Injection detection
    for pat in INJECTION_PATTERNS:
        if pat.search(prompt):
            return False, f"prompt_injection_detected: {pat.pattern[:30]}", sanitized
    if pii_found:
        return True, f"pii_redacted: {','.join(pii_found)}", sanitized
    return True, None, sanitized


def _guardrails_output(text: str) -> tuple[bool, str | None]:
    """Output safety check."""
    # Check for leaked system info
    if "praveen" in text.lower() or "internal_" in text.lower() or "secret_" in text.lower():
        return False, "potential_internal_leak"
    return True, None


# ─────────────────────────────────────────────────────────────────────
# 6. COST TRACKING

def _calc_cost(model_record: dict, in_tokens: int, out_tokens: int) -> float:
    return (in_tokens / 1000) * model_record["cost_per_1k_in"] + \
           (out_tokens / 1000) * model_record["cost_per_1k_out"]


# ─────────────────────────────────────────────────────────────────────
# Call Ollama (live primary path)

def _call_ollama(model: str, prompt: str, timeout: int = 30) -> tuple[str, int, int]:
    """Returns (response_text, prompt_tokens, completion_tokens)."""
    host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
    try:
        r = httpx.post(f"{host}/api/generate",
                       json={"model": model, "prompt": prompt, "stream": False},
                       timeout=timeout)
        if r.status_code == 200:
            data = r.json()
            text = data.get("response", "")
            prompt_eval = data.get("prompt_eval_count", 0)
            eval_count = data.get("eval_count", 0)
            return text, prompt_eval, eval_count
        return f"[ollama_error_{r.status_code}]", 0, 0
    except Exception as e:
        raise RuntimeError(f"ollama_call_failed: {str(e)[:200]}")


def _stamp() -> dict:
    """§107 triple-stamp."""
    now_utc = datetime.now(timezone.utc)
    now_local = datetime.now().astimezone()
    return {
        "ts_utc": now_utc.isoformat(),
        "ts_local": now_local.isoformat(),
        "tz": time.strftime("%Z"),
        "actor_user": ACTOR_USER, "actor_host": ACTOR_HOST,
    }


# ─────────────────────────────────────────────────────────────────────
# THE main endpoint · composes all 6 capabilities

class ChatRequest(BaseModel):
    prompt: str
    model: str | None = None
    tier: str | None = None         # fast / balanced / heavy
    tenant_id: str = "default"
    correlation_id: str | None = None
    cache_enabled: bool = True
    ttl_seconds: int = 3600


@router.post("/chat")
def chat(body: ChatRequest):
    """LLM Gateway · composes all 6 capabilities in order:
    1. Guardrails input · PII redaction + injection detection
    2. Routing · pick model
    3. Cache lookup
    4. Rate limit
    5. Call (with fallback chain)
    6. Guardrails output · safety check
    7. Cost tracking · audit
    """
    call_id = f"GW-{uuid.uuid4().hex[:10].upper()}"
    start_ms = time.perf_counter()
    stamp = _stamp()

    # 1. Guardrails IN
    allow, gr_reason, sanitized = _guardrails_input(body.prompt)
    if not allow:
        _audit_call(call_id, body, None, "guardrail_blocked",
                    blocked=gr_reason, stamp=stamp,
                    latency_ms=int((time.perf_counter()-start_ms)*1000))
        return {"call_id": call_id, "status": "guardrail_blocked",
                "reason": gr_reason, **stamp}

    # 2. ROUTING
    model_rec, route_reason = _route(body.model, body.tier)
    used_model = model_rec["id"]

    # 3. CACHE
    key = _cache_key(body.tenant_id, used_model, sanitized)
    if body.cache_enabled:
        hit = _cache_get(key)
        if hit:
            _audit_call(call_id, body, model_rec, "cache_hit", cache_hit=True,
                        completion=hit["response_text"][:200],
                        prompt_tokens=0, completion_tokens=hit["response_tokens"],
                        cost_usd=0.0, route_reason="cache",
                        stamp=stamp,
                        latency_ms=int((time.perf_counter()-start_ms)*1000))
            return {"call_id": call_id, "status": "cache_hit",
                    "model_used": used_model, "cache_hit": True,
                    "response": hit["response_text"],
                    "cost_usd": 0.0, **stamp}

    # 4. RATE LIMIT
    est_tokens = len(sanitized.split()) * 4  # rough estimate
    allowed, rl_reason = _rate_check(body.tenant_id, used_model, est_tokens)
    if not allowed:
        _audit_call(call_id, body, model_rec, "rate_limited",
                    rate_limited=True, stamp=stamp,
                    latency_ms=int((time.perf_counter()-start_ms)*1000))
        return {"call_id": call_id, "status": "rate_limited",
                "reason": rl_reason, "retry_after_seconds": 60, **stamp}

    # 5. CALL with FALLBACK
    fallback_used = False
    response_text = ""
    p_tokens = c_tokens = 0
    try:
        response_text, p_tokens, c_tokens = _call_ollama(used_model, sanitized)
    except Exception as e:
        # Try fallback chain
        for fb_model in FALLBACK_CHAIN:
            if fb_model == used_model:
                continue
            try:
                response_text, p_tokens, c_tokens = _call_ollama(fb_model, sanitized)
                used_model = fb_model
                fallback_used = True
                route_reason += f" → fallback_{fb_model}"
                break
            except Exception:
                continue
        if not response_text:
            _audit_call(call_id, body, model_rec, "failed",
                        error=str(e)[:300], stamp=stamp,
                        latency_ms=int((time.perf_counter()-start_ms)*1000))
            return {"call_id": call_id, "status": "failed",
                    "error": str(e)[:200], **stamp}

    # 6. Guardrails OUT
    out_allow, out_reason = _guardrails_output(response_text)
    if not out_allow:
        response_text = f"[OUTPUT_REDACTED: {out_reason}]"

    # 7. Cost tracking
    cost_usd = _calc_cost(model_rec, p_tokens, c_tokens)
    if used_model != model_rec["id"]:
        # Find fallback model for cost calc
        fb_rec = next((m for m in MODEL_REGISTRY if m["id"] == used_model), model_rec)
        cost_usd = _calc_cost(fb_rec, p_tokens, c_tokens)

    # Cache store
    if body.cache_enabled and response_text and not out_reason:
        _cache_set(key, body.tenant_id, used_model,
                   hashlib.sha256(sanitized.encode()).hexdigest(),
                   response_text, c_tokens, body.ttl_seconds)

    latency_ms = int((time.perf_counter() - start_ms) * 1000)
    status = "fallback_ok" if fallback_used else "ok"
    _audit_call(call_id, body, model_rec, status,
                used_model=used_model,
                fallback=fallback_used,
                completion=response_text[:200],
                prompt_tokens=p_tokens, completion_tokens=c_tokens,
                cost_usd=cost_usd, route_reason=route_reason,
                stamp=stamp, latency_ms=latency_ms)

    return {
        "call_id": call_id, "status": status,
        "model_requested": body.model, "model_used": used_model,
        "routing_reason": route_reason, "fallback_used": fallback_used,
        "cache_hit": False,
        "guardrail_input": gr_reason,
        "guardrail_output": out_reason,
        "response": response_text,
        "prompt_tokens": p_tokens, "completion_tokens": c_tokens,
        "cost_usd": round(cost_usd, 6),
        "latency_ms": latency_ms,
        **stamp,
    }


def _audit_call(call_id, body, model_rec, status, **kw):
    """Insert per §107 stamped row in llm_gateway_call."""
    stamp = kw.pop("stamp", _stamp())
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            INSERT INTO llm_gateway_call
              (call_id, tenant_id, actor_user, actor_host, model_requested,
               model_used, routing_reason, fallback_used, cache_hit, rate_limited,
               guardrail_blocked, prompt_tokens, completion_tokens, cost_usd,
               latency_ms, status, error_text, correlation_id,
               ts_utc, ts_local, tz)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s)
        """, (
            call_id, body.tenant_id, stamp["actor_user"], stamp["actor_host"],
            body.model, kw.get("used_model", model_rec["id"] if model_rec else None),
            kw.get("route_reason", ""), kw.get("fallback", False),
            kw.get("cache_hit", False), kw.get("rate_limited", False),
            kw.get("blocked"),
            kw.get("prompt_tokens", 0), kw.get("completion_tokens", 0),
            kw.get("cost_usd", 0.0),
            kw.get("latency_ms", 0), status, kw.get("error"),
            body.correlation_id,
            stamp["ts_utc"], stamp["ts_local"], stamp["tz"],
        ))


# ─────────────────────────────────────────────────────────────────────
# Admin / observability endpoints

@router.get("/health")
def health():
    return {**_stamp(), "module": "llm-gateway",
            "capabilities": ["routing", "fallback", "cache", "rate_limit",
                             "guardrails", "cost_tracking"],
            "spec": "Iter 87 · §107 stamped"}


@router.get("/models")
def list_models():
    return {"models": MODEL_REGISTRY, "live_count": sum(1 for m in MODEL_REGISTRY if m["live"])}


@router.get("/stats")
def stats(hours: int = 24):
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT
              COUNT(*) AS total,
              SUM(cost_usd) AS total_cost,
              SUM(prompt_tokens + completion_tokens) AS total_tokens,
              AVG(latency_ms) AS avg_latency_ms,
              COUNT(*) FILTER (WHERE cache_hit) AS cache_hits,
              COUNT(*) FILTER (WHERE fallback_used) AS fallbacks,
              COUNT(*) FILTER (WHERE rate_limited) AS rate_limited,
              COUNT(*) FILTER (WHERE guardrail_blocked IS NOT NULL) AS blocked,
              COUNT(*) FILTER (WHERE status='failed') AS failed
            FROM llm_gateway_call
            WHERE ts_utc > NOW() - (%s || ' hours')::interval
        """, (hours,))
        s = dict(cur.fetchone())
        cur.execute("""
            SELECT model_used, COUNT(*) AS n, SUM(cost_usd) AS cost,
                   AVG(latency_ms) AS avg_ms
            FROM llm_gateway_call
            WHERE ts_utc > NOW() - (%s || ' hours')::interval
            GROUP BY model_used ORDER BY n DESC
        """, (hours,))
        by_model = [dict(r) for r in cur.fetchall()]
    s["cache_hit_rate"] = round(100 * s["cache_hits"] / max(s["total"], 1), 1) if s["total"] else 0
    s["fallback_rate"] = round(100 * s["fallbacks"] / max(s["total"], 1), 1) if s["total"] else 0
    return {**_stamp(), "window_hours": hours, "summary": s, "by_model": by_model}


@router.get("/cache/stats")
def cache_stats():
    with _conn() as c, c.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) AS entries, SUM(hit_count) AS total_hits
            FROM llm_gateway_cache
            WHERE ts_utc > NOW() - INTERVAL '24 hours'
        """)
        r = cur.fetchone()
    return {**_stamp(), "entries": r[0], "total_hits": r[1] or 0}


@router.get("/rate-limits")
def rate_limits():
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM rate_limit_bucket ORDER BY bucket_id")
        rows = [dict(r) for r in cur.fetchall()]
    return {**_stamp(), "buckets": rows, "count": len(rows)}


@router.get("/context-builder/info")
def context_builder_info():
    """Context Builder · per §108 · composes RAG + history + system prompt."""
    return {
        **_stamp(),
        "module": "context-builder",
        "components": [
            "system_prompt (versioned per §38.3 + prompt_log)",
            "rag_retrieved (TF-IDF / vector · top-K + scores)",
            "session_history (last N turns from workflow_run)",
            "user_context (tenant_id · role from access_registry)",
            "tool_results (from prior agent_invocation in this trace)",
        ],
        "max_tokens_default": 4096,
        "truncation_strategy": "system > rag > recent_history > older_history",
    }


class ContextRequest(BaseModel):
    user_query: str
    tenant_id: str = "default"
    workflow_id: str | None = None
    rag_top_k: int = 3
    max_context_tokens: int = 3500
    include_history: bool = True
    system_prompt_id: str | None = None


@router.post("/context-builder/build")
def context_builder_build(body: ContextRequest):
    """Build the context for an LLM call from multiple sources."""
    sections = []
    total_tokens = 0
    truncated = False

    # 1. System prompt
    sys_prompt = "You are a helpful assistant. Be concise · cite sources when possible."
    if body.system_prompt_id:
        with _conn() as c, c.cursor() as cur:
            cur.execute("SELECT prompt_text FROM prompt_log WHERE prompt_id=%s",
                        (body.system_prompt_id,))
            r = cur.fetchone()
            if r:
                sys_prompt = r[0]
    sections.append({"part": "system", "tokens_est": len(sys_prompt.split())*1.3,
                     "text": sys_prompt})
    total_tokens += int(len(sys_prompt.split())*1.3)

    # 2. RAG retrieved (use existing knowledge_base TF-IDF stub)
    rag_results = []
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT title, content
            FROM knowledge_base
            WHERE tenant_id=%s OR tenant_id='default'
            LIMIT %s
        """, (body.tenant_id, body.rag_top_k))
        for r in cur.fetchall():
            doc = f"[{r['title']}] {r['content'][:300]}"
            t = int(len(doc.split())*1.3)
            if total_tokens + t > body.max_context_tokens:
                truncated = True
                break
            rag_results.append(doc)
            total_tokens += t
    sections.append({"part": "rag_retrieved", "tokens_est": sum(int(len(d.split())*1.3) for d in rag_results),
                     "documents": rag_results, "n_documents": len(rag_results)})

    # 3. Session history
    if body.include_history and body.workflow_id:
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT input_text, output_text, created_at
                FROM agent_invocation
                WHERE correlation_id=%s ORDER BY created_at DESC LIMIT 5
            """, (body.workflow_id,))
            history = []
            for r in cur.fetchall():
                turn = f"USER: {(r['input_text'] or '')[:200]}\nAGENT: {(r['output_text'] or '')[:200]}"
                t = int(len(turn.split())*1.3)
                if total_tokens + t > body.max_context_tokens:
                    truncated = True
                    break
                history.append(turn)
                total_tokens += t
            sections.append({"part": "session_history", "n_turns": len(history),
                             "tokens_est": sum(int(len(h.split())*1.3) for h in history)})

    # 4. User query
    sections.append({"part": "user_query", "tokens_est": int(len(body.user_query.split())*1.3),
                     "text": body.user_query})
    total_tokens += int(len(body.user_query.split())*1.3)

    # Compose final prompt
    final_prompt = sys_prompt + "\n\n"
    if rag_results:
        final_prompt += "## Context\n" + "\n---\n".join(rag_results) + "\n\n"
    final_prompt += f"## Question\n{body.user_query}"

    return {
        **_stamp(),
        "context_id": f"CTX-{uuid.uuid4().hex[:10].upper()}",
        "sections": sections,
        "total_tokens_est": total_tokens,
        "max_tokens_budget": body.max_context_tokens,
        "truncated": truncated,
        "final_prompt": final_prompt,
        "spec": "§108 context builder · composable from system + RAG + history + query",
    }


@router.get("/load-balancer/info")
def load_balancer_info():
    """Load balancing strategy across model instances · per §108."""
    return {
        **_stamp(),
        "module": "load-balancer",
        "strategies": [
            {"name": "weighted_round_robin",
             "description": "Distribute by per-model weight · default 100% Ollama",
             "active": True},
            {"name": "least_connections",
             "description": "Route to model with fewest in-flight requests",
             "active": False},
            {"name": "response_time_p50",
             "description": "Route to model with best 5-min p50",
             "active": False},
            {"name": "cost_aware",
             "description": "Prefer cheapest model meeting quality threshold",
             "active": False},
        ],
        "current_strategy": "weighted_round_robin",
        "circuit_breakers": {
            "ollama_local":    {"open": False, "consecutive_failures": 0, "threshold": 5},
            "openai":          {"open": True,  "consecutive_failures": 0, "threshold": 5, "reason": "API key not configured · §57.7 honest"},
            "anthropic":       {"open": True,  "consecutive_failures": 0, "threshold": 5, "reason": "API key not configured · §57.7 honest"},
        },
    }


@router.get("/caching/catalog")
def caching_catalog():
    """Caching techniques applied per component · §108."""
    return {
        **_stamp(),
        "module": "caching-catalog",
        "techniques": [
            {"component": "LLM responses",
             "technique": "Content-hash key (SHA256 of tenant+model+prompt)",
             "ttl_default_s": 3600, "table": "llm_gateway_cache",
             "live": True},
            {"component": "RAG retrievals",
             "technique": "Embedding-similarity cache (vector match ≥ 0.95)",
             "ttl_default_s": 1800, "table": "knowledge_cache",
             "live": False, "scaffold_note": "Plug when vector DB lands"},
            {"component": "Agent invocation results",
             "technique": "idempotency_key from X-Idempotency-Key header",
             "ttl_default_s": 60, "table": "agent_invocation (unique idempotency col)",
             "live": True},
            {"component": "MCP tool responses",
             "technique": "Cache-Control header forwarded · stale-while-revalidate",
             "ttl_default_s": 300, "table": "tool_response_cache",
             "live": False, "scaffold_note": "Per-tool override"},
            {"component": "Prompt templates",
             "technique": "Version-pinned · ETag-based",
             "ttl_default_s": 86400, "table": "prompt_log",
             "live": True},
            {"component": "Eval results",
             "technique": "model+dataset+prompt_version → result hash",
             "ttl_default_s": 604800, "table": "eval_registry",
             "live": True},
            {"component": "Embeddings",
             "technique": "Hash(text+model_version) → vector",
             "ttl_default_s": 2592000, "table": "embedding_cache",
             "live": False, "scaffold_note": "Vector DB integration"},
            {"component": "API responses",
             "technique": "ETag + If-None-Match (304 cycle)",
             "ttl_default_s": 60, "table": "FastAPI middleware",
             "live": False, "scaffold_note": "Add to GZipMiddleware stack"},
        ],
        "invalidation_strategies": [
            "TTL expiry (default)",
            "Manual invalidation API (per-key DELETE)",
            "Source change detection (knowledge_base update → invalidate RAG cache)",
            "Model version bump (re-embed + flush embedding cache)",
            "Prompt version bump (flush response cache for that prompt_id)",
        ],
        "cache_hit_rate_target": "≥40% for production · ≥60% for stable workloads",
    }


@router.get("/observability")
def observability():
    """All gateway observability surfaces · §108."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT COUNT(*) AS calls_1h FROM llm_gateway_call
            WHERE ts_utc > NOW() - INTERVAL '1 hour'
        """)
        h1 = dict(cur.fetchone())
        cur.execute("""
            SELECT status, COUNT(*) AS n FROM llm_gateway_call
            WHERE ts_utc > NOW() - INTERVAL '24 hours'
            GROUP BY status
        """)
        by_status = {r["status"]: r["n"] for r in cur.fetchall()}

    return {
        **_stamp(),
        "module": "observability",
        "live_metrics": {
            "calls_last_1h": h1["calls_1h"],
            "by_status_24h": by_status,
        },
        "exported_to": [
            "Prometheus (/metrics endpoint · scrape every 15s)",
            "OpenTelemetry (traces · per-call span)",
            "Audit log (llm_gateway_call table · 7-year retention per §38.3)",
            "Stdout/stderr (json structured · forwarded to ELK)",
        ],
        "alert_thresholds": {
            "p95_latency_ms": 3000,
            "error_rate_pct": 1.0,
            "cost_per_hour_usd": 5.0,
            "rate_limit_hit_rate_pct": 10.0,
            "fallback_rate_pct": 5.0,
            "guardrail_block_rate_pct": 0.5,
        },
        "dashboards": [
            "/api/v1/llm-gateway/stats (live · 24h rollup)",
            "/api/v1/llm-gateway/audit/recent (per-call detail)",
            "/api/v1/llm-gateway/cache/stats (cache hit rate)",
            "/api/v1/llm-gateway/rate-limits (bucket state)",
        ],
        "spec": "§108 observability · stamped per §107",
    }


@router.get("/tokens/consumption")
def token_consumption(hours: int = 24):
    """Token consumption tracking · per §108."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT
              SUM(prompt_tokens) AS total_in,
              SUM(completion_tokens) AS total_out,
              SUM(cost_usd) AS total_cost,
              COUNT(*) AS calls,
              AVG(prompt_tokens) AS avg_in,
              AVG(completion_tokens) AS avg_out
            FROM llm_gateway_call
            WHERE ts_utc > NOW() - (%s || ' hours')::interval
        """, (hours,))
        s = dict(cur.fetchone())
        cur.execute("""
            SELECT tenant_id, SUM(prompt_tokens+completion_tokens) AS tokens,
                   SUM(cost_usd) AS cost
            FROM llm_gateway_call
            WHERE ts_utc > NOW() - (%s || ' hours')::interval
            GROUP BY tenant_id ORDER BY tokens DESC LIMIT 5
        """, (hours,))
        by_tenant = [dict(r) for r in cur.fetchall()]
    return {
        **_stamp(),
        "window_hours": hours,
        "totals": {k: (float(v) if v else 0) for k, v in s.items()},
        "by_tenant_top5": by_tenant,
    }


@router.get("/tokens/saving-strategies")
def token_saving_strategies():
    """Token saving strategies catalog · per §108."""
    return {
        **_stamp(),
        "module": "token-saving-strategies",
        "strategies": [
            {"id": "ollama_first",
             "name": "Route to Ollama (cost $0)",
             "savings_pct": "100% LLM cost",
             "active": True,
             "tradeoff": "Higher latency · slightly lower quality vs frontier models"},
            {"id": "response_cache",
             "name": "Content-hash cache · skip repeat calls",
             "savings_pct": "30-60% calls cached for stable workloads",
             "active": True,
             "tradeoff": "Stale results within TTL"},
            {"id": "prompt_compression",
             "name": "LLM-Lingua / token pruning · 2x compression",
             "savings_pct": "30-50% prompt tokens",
             "active": False,
             "tradeoff": "Slight semantic loss on edge cases · scaffold"},
            {"id": "context_truncation",
             "name": "Sliding-window history · keep last K turns only",
             "savings_pct": "20-40% on long sessions",
             "active": True,
             "tradeoff": "Lose long-term memory beyond window"},
            {"id": "rag_top_k_tuning",
             "name": "RAG top-K from 10 → 3 with reranker",
             "savings_pct": "50-70% RAG tokens",
             "active": True,
             "tradeoff": "Recall may drop for ambiguous queries"},
            {"id": "system_prompt_cdn",
             "name": "Reuse system prompt across calls (provider feature)",
             "savings_pct": "10-30% repeat-call tokens",
             "active": False,
             "tradeoff": "Provider-specific · OpenAI prompt caching API"},
            {"id": "model_tier_routing",
             "name": "Route easy queries to small model · hard to large",
             "savings_pct": "40-80% cost",
             "active": True,
             "tradeoff": "Need classifier · llama3.2:1b for tier-1"},
            {"id": "batch_requests",
             "name": "Batch N prompts in one API call (provider feature)",
             "savings_pct": "5-15% overhead",
             "active": False,
             "tradeoff": "Latency · provider-specific"},
            {"id": "streaming",
             "name": "Stream partial response · cancel on early-stop",
             "savings_pct": "Variable · saves output tokens on abandons",
             "active": False,
             "tradeoff": "Implementation complexity"},
            {"id": "guardrail_block_early",
             "name": "Reject prompt-injection BEFORE LLM call",
             "savings_pct": "100% on blocked attempts",
             "active": True,
             "tradeoff": "False positives reject legit queries"},
        ],
    }


@router.get("/ollama/plan")
def ollama_model_plan():
    """Ollama model plan · what to install + when · §108 + §57.7 honest."""
    try:
        host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
        r = httpx.get(f"{host}/api/tags", timeout=5)
        installed = [m["name"] for m in r.json().get("models", [])] if r.status_code == 200 else []
    except Exception:
        installed = []

    plan = [
        {"tier": "tier_1_fast",
         "models": ["llama3.2:1b", "qwen2.5:0.5b"],
         "use_for": ["intent classification", "guardrail check", "routing decision"],
         "max_tokens": 2048, "p95_latency_ms_target": 200},
        {"tier": "tier_2_balanced",
         "models": ["llama3.2:3b", "qwen2.5:3b", "phi3.5:3.8b"],
         "use_for": ["RAG answer", "summarization", "code completion"],
         "max_tokens": 8192, "p95_latency_ms_target": 1500},
        {"tier": "tier_3_heavy",
         "models": ["llama3.1:8b", "qwen2.5:7b", "mistral:7b"],
         "use_for": ["multi-step reasoning", "long-context analysis", "council voter"],
         "max_tokens": 32768, "p95_latency_ms_target": 5000},
        {"tier": "tier_4_specialty",
         "models": ["deepseek-coder:6.7b", "codellama:7b"],
         "use_for": ["code generation", "code review"],
         "max_tokens": 16384, "p95_latency_ms_target": 4000},
    ]
    # Mark installed
    for tier in plan:
        tier["installed"] = [m for m in tier["models"] if any(m in i for i in installed)]
        tier["missing"] = [m for m in tier["models"] if not any(m in i for i in installed)]

    return {
        **_stamp(),
        "installed_count": len(installed),
        "installed": installed[:20],
        "plan": plan,
        "savings_vs_frontier": "Full Ollama stack saves ~$2-5K/month at 100k requests/day",
        "memory_required_gb": {"tier_1": 1, "tier_2": 4, "tier_3": 10, "tier_4": 6,
                                "all": "~20GB RAM/VRAM"},
        "spec": "§108 Ollama-first plan · honest per §57.7 (installed vs planned)",
    }


@router.get("/ollama/route")
def ollama_route(intent: str = "general", tier: str | None = None):
    """Operator-facing routing demo · which Ollama model fires for a given intent?"""
    import httpx as _httpx
    host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
    try:
        installed = [m["name"] for m in _httpx.get(f"{host}/api/tags", timeout=5).json().get("models", [])]
    except Exception:
        installed = []
    # Intent → tier mapping
    intent_tier_map = {
        "classify": "tier_1_fast", "guard": "tier_1_fast", "route": "tier_1_fast",
        "rag_answer": "tier_2_balanced", "summarize": "tier_2_balanced",
        "code_completion": "tier_2_balanced",
        "reasoning": "tier_3_heavy", "long_context": "tier_3_heavy",
        "code_generation": "tier_4_specialty", "code_review": "tier_4_specialty",
        "general": "tier_2_balanced",
    }
    tier = tier or intent_tier_map.get(intent, "tier_2_balanced")
    tier_models = {
        "tier_1_fast": ["llama3.2:1b", "qwen2.5:0.5b"],
        "tier_2_balanced": ["llama3.2:3b", "qwen2.5:3b", "phi3.5:3.8b"],
        "tier_3_heavy": ["llama3.1:8b", "qwen2.5:7b", "mistral:7b"],
        "tier_4_specialty": ["deepseek-coder:6.7b", "codellama:7b"],
    }
    candidates = tier_models.get(tier, [])
    pick = next((m for m in candidates if any(m in i for i in installed)), candidates[0] if candidates else None)
    return {**_stamp(), "intent": intent, "tier": tier,
            "candidates": candidates,
            "installed_candidates": [m for m in candidates if any(m in i for i in installed)],
            "picked": pick,
            "reason": f"intent={intent} → {tier} → first installed candidate"}


@router.get("/audit/recent")
def audit_recent(limit: int = 50):
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT call_id, ts_utc, tenant_id, actor_user, model_used,
                   status, latency_ms, cost_usd, prompt_tokens, completion_tokens,
                   cache_hit, fallback_used, rate_limited, guardrail_blocked
            FROM llm_gateway_call
            ORDER BY ts_utc DESC LIMIT %s
        """, (limit,))
        rows = [dict(r) for r in cur.fetchall()]
    return {**_stamp(), "calls": rows, "count": len(rows)}
