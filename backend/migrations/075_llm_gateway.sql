-- Migration 075 · Iter 87 · LLM Gateway · 3 new tables.

-- 1. llm_gateway_call · every gateway request audited per §38.3 + §107
CREATE TABLE IF NOT EXISTS llm_gateway_call (
    call_id          VARCHAR(100) PRIMARY KEY,
    tenant_id        VARCHAR(100) DEFAULT 'default',
    actor_user       VARCHAR(100),
    actor_host       VARCHAR(200),
    model_requested  VARCHAR(100),
    model_used       VARCHAR(100),
    routing_reason   VARCHAR(200),
    fallback_used    BOOLEAN DEFAULT false,
    cache_hit        BOOLEAN DEFAULT false,
    rate_limited     BOOLEAN DEFAULT false,
    guardrail_blocked VARCHAR(100),
    prompt_tokens    INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    cost_usd         DECIMAL(10, 6) DEFAULT 0,
    latency_ms       INT,
    status           VARCHAR(50),
    error_text       TEXT,
    correlation_id   VARCHAR(100),
    ts_utc           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ts_local         VARCHAR(50),
    tz               VARCHAR(20),
    CONSTRAINT chk_gw_status CHECK (status IN ('ok', 'fallback_ok', 'failed',
                                                 'rate_limited', 'guardrail_blocked',
                                                 'cache_hit'))
);
CREATE INDEX IF NOT EXISTS idx_gw_tenant_ts ON llm_gateway_call(tenant_id, ts_utc DESC);
CREATE INDEX IF NOT EXISTS idx_gw_model ON llm_gateway_call(model_used);
CREATE INDEX IF NOT EXISTS idx_gw_status ON llm_gateway_call(status, ts_utc DESC);

-- 2. llm_gateway_cache · content-hash → cached response
CREATE TABLE IF NOT EXISTS llm_gateway_cache (
    cache_key        VARCHAR(64) PRIMARY KEY,
    tenant_id        VARCHAR(100) DEFAULT 'default',
    model            VARCHAR(100),
    prompt_hash      VARCHAR(64),
    response_text    TEXT,
    response_tokens  INT,
    hit_count        INT DEFAULT 0,
    last_hit_at      TIMESTAMP,
    ttl_seconds      INT DEFAULT 3600,
    ts_utc           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cache_ttl ON llm_gateway_cache(ts_utc);

-- 3. rate_limit_bucket · per-tenant per-model token bucket
CREATE TABLE IF NOT EXISTS rate_limit_bucket (
    bucket_id        VARCHAR(100) PRIMARY KEY,
    tenant_id        VARCHAR(100) DEFAULT 'default',
    model            VARCHAR(100),
    window_seconds   INT DEFAULT 60,
    max_requests     INT DEFAULT 100,
    max_tokens       INT DEFAULT 100000,
    current_requests INT DEFAULT 0,
    current_tokens   INT DEFAULT 0,
    window_start     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ts_utc           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rl_tenant_model ON rate_limit_bucket(tenant_id, model);

-- Seed 4 default buckets (per-tenant + per-model)
INSERT INTO rate_limit_bucket (bucket_id, tenant_id, model, max_requests, max_tokens)
VALUES
  ('default__llama3.2:3b', 'default', 'llama3.2:3b',       200, 200000),
  ('default__gpt-4o-mini', 'default', 'gpt-4o-mini',        50,  50000),
  ('default__claude-3-5-haiku', 'default', 'claude-3-5-haiku', 50,  50000),
  ('default__fallback',   'default', 'fallback',           500, 500000)
ON CONFLICT (bucket_id) DO NOTHING;
