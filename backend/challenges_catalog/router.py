"""/api/v1/challenges-catalog/* · Iter 58.

Per operator stream: '<X> list of challenges' for frontend · API · data ·
MCP · output · accuracy · benchmarking · plus mitigation plan · agent plan ·
solution plan · cron job · tracking · tracing plan · system crash plan ·
prompt saving · prompt showcasing.

Plus the tool catalog: circuit breaker · pybreaker · service discovery ·
Istio · Kiali · Temporal · SonarQube · CUA · Stagehand · Playwright ·
gRPC · SOLID · microservice.
"""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/challenges-catalog", tags=["challenges-catalog"])


# 7 categories × ~5 challenges each · with mitigation + owner agent + cron
CHALLENGES = {
    "frontend": [
        {"id": "FE-1", "issue": "Bundle size > 500KB", "severity": "Medium",
         "mitigation": "Code splitting · lazy load routes · tree-shake unused libs",
         "owner_agent": "test_frontend_playwright",
         "cron": "weekly · INSUR-FRONTEND-BUNDLE-CHECK",
         "tool": "webpack-bundle-analyzer"},
        {"id": "FE-2", "issue": "Console errors after deploy",
         "severity": "High",
         "mitigation": "ErrorBoundary on every route · capture to Sentry/audit_chain",
         "owner_agent": "test_frontend_cua",
         "cron": "every deploy · Playwright smoke",
         "tool": "Playwright · console capture"},
        {"id": "FE-3", "issue": "Slow first contentful paint",
         "severity": "Medium",
         "mitigation": "SSR · prerender · CDN cache · critical CSS inline",
         "owner_agent": "test_frontend_playwright",
         "cron": "nightly Lighthouse",
         "tool": "Lighthouse · web-vitals"},
        {"id": "FE-4", "issue": "Accessibility violations (a11y)",
         "severity": "High",
         "mitigation": "Axe checks in CI · ARIA roles · keyboard nav · color contrast",
         "owner_agent": "test_frontend_cua",
         "cron": "every PR · axe-core",
         "tool": "axe-core · Pa11y"},
        {"id": "FE-5", "issue": "Stale state / cache after deploy",
         "severity": "Medium",
         "mitigation": "Cache-bust per release · versioned URLs · staleWhileRevalidate",
         "owner_agent": "test_frontend_stagehand",
         "cron": "every deploy",
         "tool": "Workbox · service worker"},
    ],
    "api": [
        {"id": "API-1", "issue": "Breaking changes without contract bump",
         "severity": "Critical",
         "mitigation": "Iter 44 Pydantic→Zod contracts + git diff CI gate",
         "owner_agent": "test_backend_pytest",
         "cron": "every commit · INSUR-CONTRACT-CHECK",
         "tool": "Pydantic + Zod (Iter 44)"},
        {"id": "API-2", "issue": "p95 latency above SLA",
         "severity": "High",
         "mitigation": "Latency middleware (Iter 33) + watchdog perf (Iter 53)",
         "owner_agent": "sys_watchdog_performance",
         "cron": "every 5min · INSUR-WATCHDOG-AGENTS",
         "tool": "Prometheus + OTel"},
        {"id": "API-3", "issue": "Cascading dependency failures",
         "severity": "Critical",
         "mitigation": "Circuit breaker (pybreaker) + retry/backoff + bulkhead",
         "owner_agent": "test_fallback_chain",
         "cron": "chaos · weekly",
         "tool": "pybreaker · Hystrix patterns"},
        {"id": "API-4", "issue": "Rate limit abuse",
         "severity": "High",
         "mitigation": "Per-tenant token bucket · 429 with Retry-After header",
         "owner_agent": "sys_watchdog_security",
         "cron": "live · /admin/rate-limits",
         "tool": "slowapi · Redis token bucket"},
        {"id": "API-5", "issue": "Auth bypass on admin routes",
         "severity": "Critical",
         "mitigation": "JWT verification + RBAC scope check (Iter 31) + audit_chain",
         "owner_agent": "sys_poliai",
         "cron": "every deploy · pen-test",
         "tool": "OAuth2 · JWT · ZAP"},
    ],
    "data": [
        {"id": "DATA-1", "issue": "Schema drift between tenants",
         "severity": "High",
         "mitigation": "Migration tracker (Iter 30) + per-tenant validation",
         "owner_agent": "test_data_quality",
         "cron": "every migration",
         "tool": "Alembic · Great Expectations"},
        {"id": "DATA-2", "issue": "Duplicate rows · idempotency miss",
         "severity": "High",
         "mitigation": "Idempotency key (Iter 31) + UNIQUE constraint",
         "owner_agent": "sys_watchdog_db",
         "cron": "daily · INSUR-DATA-QUALITY",
         "tool": "Postgres unique idx · idempotency middleware"},
        {"id": "DATA-3", "issue": "Stale knowledge base",
         "severity": "Medium",
         "mitigation": "review_date column + weekly re-embed cron",
         "owner_agent": "sys_watchdog_embedding",
         "cron": "weekly Sun · re-embed",
         "tool": "pgvector + cron"},
        {"id": "DATA-4", "issue": "PII in logs / responses",
         "severity": "Critical",
         "mitigation": "Presidio redactor (Iter 27) + response interceptor",
         "owner_agent": "sys_watchdog_pii",
         "cron": "every response · live",
         "tool": "Presidio · regex fallback"},
        {"id": "DATA-5", "issue": "Backup corruption / restore failure",
         "severity": "Critical",
         "mitigation": "Weekly backup_restore_drill.py (Iter 25)",
         "owner_agent": "test_data_quality",
         "cron": "weekly Sun · INSUR-BACKUP-DRILL",
         "tool": "pg_dump + restore drill"},
    ],
    "mcp": [
        {"id": "MCP-1", "issue": "Server auth refresh fails silently",
         "severity": "Critical",
         "mitigation": "OAuth refresh hook + circuit breaker + audit row per call",
         "owner_agent": "sys_watchdog_mcp",
         "cron": "every 5min · liveness probe",
         "tool": "pybreaker + audit_chain"},
        {"id": "MCP-2", "issue": "Tool execution timeout",
         "severity": "High",
         "mitigation": "tool_registry.timeout_seconds + retry_count · §47.7",
         "owner_agent": "sys_watchdog_mcp",
         "cron": "watchdog",
         "tool": "httpx timeout · retry decorator"},
        {"id": "MCP-3", "issue": "Shared credentials reuse across tenants",
         "severity": "Critical",
         "mitigation": "agent_mcp_mapping per-agent secret + vault",
         "owner_agent": "sys_poliai",
         "cron": "every secret rotation",
         "tool": "HashiCorp Vault · per-tenant scoped"},
        {"id": "MCP-4", "issue": "Schema mismatch between MCP versions",
         "severity": "Medium",
         "mitigation": "Tool catalog version pinning + contract tests",
         "owner_agent": "test_backend_pytest",
         "cron": "every release",
         "tool": "MCP Protocol versioning"},
        {"id": "MCP-5", "issue": "Discovery via DNS unreliable",
         "severity": "Medium",
         "mitigation": "Istio mesh service discovery + Kiali topology",
         "owner_agent": "sys_watchdog_mcp",
         "cron": "live",
         "tool": "Istio · Consul · Kiali"},
    ],
    "output": [
        {"id": "OUT-1", "issue": "Hallucination · uncited claims",
         "severity": "High",
         "mitigation": "Stage 17 RAGAS faithfulness gate + citation enforce",
         "owner_agent": "sys_output_evaluator",
         "cron": "every pipeline run",
         "tool": "RAGAS · DeepEval (Iter 57)"},
        {"id": "OUT-2", "issue": "Toxic / biased output reaches user",
         "severity": "Critical",
         "mitigation": "Stage 14 guardrails + Stage 17 toxicity gate · BLOCK if > 0.05",
         "owner_agent": "sys_output_evaluator",
         "cron": "live · stage 17 (Iter 57)",
         "tool": "Detoxify (pending) · wordlist"},
        {"id": "OUT-3", "issue": "PII leaks in response body",
         "severity": "Critical",
         "mitigation": "Stage 14 PII scan · Presidio + Stage 21 audit",
         "owner_agent": "sys_watchdog_pii",
         "cron": "every response",
         "tool": "Presidio · regex"},
        {"id": "OUT-4", "issue": "Prompt injection bypassed guardrail",
         "severity": "Critical",
         "mitigation": "Stage 14 injection check + Garak/Rebuff probe nightly",
         "owner_agent": "test_model_robustness",
         "cron": "nightly",
         "tool": "Garak · Rebuff · LLM Guard"},
        {"id": "OUT-5", "issue": "Inconsistent format · operator confused",
         "severity": "Medium",
         "mitigation": "Pydantic schema enforcement at Stage 19 · §44 contracts",
         "owner_agent": "test_backend_pytest",
         "cron": "every commit",
         "tool": "Pydantic · Iter 44"},
    ],
    "accuracy": [
        {"id": "ACC-1", "issue": "Model accuracy drift over time",
         "severity": "High",
         "mitigation": "Iter 28 drift detection + weekly eval cron",
         "owner_agent": "test_model_accuracy",
         "cron": "weekly + on retrain",
         "tool": "PSI · KS test · Evidently AI"},
        {"id": "ACC-2", "issue": "Bias across protected groups",
         "severity": "Critical",
         "mitigation": "Fairlearn DI ≥ 0.8 + equal opportunity gap < 5%",
         "owner_agent": "test_model_fairness",
         "cron": "every release",
         "tool": "Fairlearn · AIF360"},
        {"id": "ACC-3", "issue": "Confidence miscalibration",
         "severity": "Medium",
         "mitigation": "ECE / Brier score · isotonic regression",
         "owner_agent": "test_model_accuracy",
         "cron": "weekly",
         "tool": "sklearn calibration"},
        {"id": "ACC-4", "issue": "Eval set gets stale / leaks into train",
         "severity": "High",
         "mitigation": "Hash-locked eval set + leakage detector",
         "owner_agent": "test_model_accuracy",
         "cron": "every commit",
         "tool": "Pytest-evaluate · DVC"},
        {"id": "ACC-5", "issue": "Single-fold validation overconfident",
         "severity": "High",
         "mitigation": "Subject-wise CV per §83 · LOSO for clinical",
         "owner_agent": "test_model_accuracy",
         "cron": "every model release",
         "tool": "sklearn StratifiedGroupKFold"},
    ],
    "benchmarking": [
        {"id": "BMK-1", "issue": "No baseline to compare against",
         "severity": "High",
         "mitigation": "Iter 48 baseline catalog + Iter 47 14-agent test suite",
         "owner_agent": "test_model_accuracy",
         "cron": "every model release",
         "tool": "MLflow · baseline scoring"},
        {"id": "BMK-2", "issue": "Regression in p95 unnoticed",
         "severity": "High",
         "mitigation": "Iter 55 k6 5-phase + perf watchdog · alert on > 2% delta",
         "owner_agent": "test_backend_load_k6",
         "cron": "weekly + per-PR",
         "tool": "k6 + Grafana"},
        {"id": "BMK-3", "issue": "Eval too small to be statistically sound",
         "severity": "Medium",
         "mitigation": "≥ 100 examples per agent · bootstrap CI per §83",
         "owner_agent": "test_model_accuracy",
         "cron": "every release",
         "tool": "Ragas · DeepEval (Iter 57)"},
        {"id": "BMK-4", "issue": "Cost regression unnoticed",
         "severity": "Medium",
         "mitigation": "agent_invocation.cost_usd SUM trend · alert > 10%/week",
         "owner_agent": "sys_watchdog_tokens",
         "cron": "daily INSUR-COST-REPORT",
         "tool": "Custom · Langfuse"},
        {"id": "BMK-5", "issue": "No production reference dataset",
         "severity": "High",
         "mitigation": "Shadow-traffic capture · golden set per agent",
         "owner_agent": "test_model_accuracy",
         "cron": "live shadow + weekly review",
         "tool": "Custom · Iter 57 evaluator"},
    ],
}


# Tool catalog · per operator's stream
TOOL_CATALOG = [
    {"tool": "pybreaker",        "category": "Resilience",    "purpose": "Circuit breaker for Python services"},
    {"tool": "Istio",            "category": "Mesh",          "purpose": "Service mesh + mTLS + traffic shaping"},
    {"tool": "Kiali",            "category": "Observability", "purpose": "Istio mesh topology + traces"},
    {"tool": "Temporal",         "category": "Workflow",      "purpose": "Durable workflow orchestration"},
    {"tool": "SonarQube",        "category": "Quality",       "purpose": "SAST + code smell + coverage"},
    {"tool": "CUA",              "category": "Agentic",       "purpose": "Computer-Using Agent (Claude/OpenAI)"},
    {"tool": "Stagehand",        "category": "Agentic",       "purpose": "Semantic browser automation"},
    {"tool": "Playwright",       "category": "Testing",       "purpose": "Browser test automation"},
    {"tool": "gRPC",             "category": "RPC",           "purpose": "High-perf RPC + protobuf"},
    {"tool": "SOLID",            "category": "Principle",     "purpose": "5 OOP design principles (S/O/L/I/D)"},
    {"tool": "Microservice",     "category": "Architecture",  "purpose": "Bounded contexts · independent deploy"},
    {"tool": "Service Discovery","category": "Mesh",          "purpose": "Consul · etcd · Istio K8s svc"},
    {"tool": "RAGAS",            "category": "Quality",       "purpose": "RAG evaluation · faithfulness/context"},
    {"tool": "DeepEval",         "category": "Quality",       "purpose": "LLM evaluation framework"},
]


# Plans · operator's stream
PLANS = {
    "mitigation_plan": "Per challenge: owner agent + cron + tool. See /api/v1/challenges-catalog/by-category",
    "agent_plan":      "/api/v1/agentic/all-blueprints · per-agent purpose + skills + flow",
    "solution_plan":   "/api/v1/challenges-catalog/by-category · each challenge has 'mitigation' field",
    "cron_plan":       "/api/v1/cron-registry · 8 INSUR-* jobs · 5min watchdog · daily/weekly checks",
    "tracking_plan":   "/api/v1/agentic/invocations · live status · /scripts/insur which-working",
    "tracing_plan":    "/api/v1/agentic/invocations/{id}/trace · OTel-style spans · Iter 43",
    "system_crash_plan": "agent_invocation status=Failed → sys_watchdog_errors triggers · INSUR-FIX-PENDING-TASKS cron auto-restarts",
    "prompt_saving_plan": "input_text column on agent_invocation · audit_chain (Iter 29) HMAC-chained",
    "prompt_showcasing_plan": "AgenticHubPage Live Activity tab + /scripts/insur which-working",
}


@router.get("/health")
def health():
    return {"status": "ok", "module": "challenges-catalog",
            "n_categories": len(CHALLENGES),
            "n_challenges_total": sum(len(v) for v in CHALLENGES.values()),
            "n_tools": len(TOOL_CATALOG),
            "n_plans": len(PLANS)}


@router.get("/by-category")
def by_category():
    """Full catalog · 7 categories × 5 challenges = 35 rows."""
    return {
        "categories": CHALLENGES,
        "tools": TOOL_CATALOG,
        "plans": PLANS,
        "n_total": sum(len(v) for v in CHALLENGES.values()),
    }


@router.get("/by-severity")
def by_severity():
    """Aggregate · all challenges by severity."""
    out = {"Critical": [], "High": [], "Medium": [], "Low": []}
    for cat, items in CHALLENGES.items():
        for it in items:
            sev = it.get("severity", "Medium")
            out.setdefault(sev, []).append({**it, "category": cat})
    return {"by_severity": out,
            "counts": {k: len(v) for k, v in out.items()}}


@router.get("/tools")
def tools():
    return {"tools": TOOL_CATALOG, "count": len(TOOL_CATALOG)}


@router.get("/plans")
def plans():
    return {"plans": PLANS, "count": len(PLANS)}
