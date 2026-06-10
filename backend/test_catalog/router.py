"""/api/v1/test-catalog/* · Iter 47 · pipelines + test agents + responsibility table."""
from __future__ import annotations

import subprocess
from pathlib import Path

import psycopg2
import psycopg2.extras
from fastapi import APIRouter

from core.config import get_settings

router = APIRouter(prefix="/api/v1/test-catalog", tags=["test-catalog"])

BACKEND = Path(__file__).resolve().parent.parent
REPO = BACKEND.parent


def _conn():
    return psycopg2.connect(get_settings().database_url)


# ──────────────────────────────────────────────────────────────────────
# Static catalogs

PIPELINE_CATEGORIES = {
    "inference": [
        "agentic_core/runtime.py · LLM plan + skill execute (Iter 41)",
        "agentic_core/llm_client.py · OpenAI/Anthropic/stub fallback (Iter 41)",
        "webllm_cdp_rag_langgraph · browser-side LLM (§91)",
        "voice_ai · STT → LLM → TTS (Iter 18)",
    ],
    "training": [
        "ml_runtime/router.py · MLflow + sklearn pipelines",
        "data_pipeline/router.py · Phase 1-10 lifecycle (§74)",
        "pipeline/router.py · process IPO (§93)",
        "marketing_kpis · training cron (Iter 19)",
    ],
    "data": [
        "data_quality_runner.py · Great Expectations probes (Iter 27)",
        "data_pipeline · ETL/ELT lifecycle",
        "input_events · GLOBAL_INPUT_PERSISTENCE_POLICY (§64)",
        "audit_chain · HMAC-chained event log (Iter 29)",
    ],
    "testing": [
        "Playwright e2e · frontend/e2e/ (Iter 22)",
        "k6 load · load-testing/insur-smoke.js (Iter 26)",
        "pytest · backend/tests/ (legacy)",
        "vitest · frontend/src/components/__tests__/ (Iter 28)",
        "drill scripts · tests/drills/ (§43)",
    ],
    "fallback": [
        "circuit-breaker · backend/ml/reference/rag_lifecycle.py",
        "tier_b_fallback · §55 autonomous fix-bot",
        "stub LLM client when no API key (Iter 41)",
        "ILIKE fallback when sklearn unavailable (Iter 43)",
        "regex PII fallback when Presidio fails (Iter 27)",
    ],
    "job_queue": [
        "agent_queue · 5-priority work queue (Iter 38)",
        "celery_app · backend/workers/celery_app.py",
        "job_queue · Redis + JSONL fallback (Iter 29)",
        "approval_workflow · admin-gated state machine (Iter 31)",
    ],
}


RESPONSIBILITY_TABLE = [
    # (process, owner_agent, supporting_skills, data_source, model_used)
    ("Frontend E2E",         "test_frontend_playwright",  ["smoke_test", "screenshot_diff"],
     "Playwright recorder",     "(no LLM · DOM-based)"),
    ("Frontend visual",      "test_frontend_cua",         ["visual_regression", "a11y_audit"],
     "Browser screenshots",     "Claude 3.5 Sonnet vision"),
    ("Frontend semantic",    "test_frontend_stagehand",   ["semantic_navigate", "extract_structured_data"],
     "Browserbase headless",    "GPT-4o or Claude"),
    ("Backend API",          "test_backend_pytest",       ["unit_test", "integration_test", "contract_test"],
     "TestClient · in-process",  "(no LLM)"),
    ("Backend load",         "test_backend_load_k6",      ["smoke_load", "stress_test", "soak_test", "spike_test"],
     "k6 virtual users",        "(no LLM)"),
    ("Model accuracy",       "test_model_accuracy",       ["eval_set_run", "confusion_matrix", "ece_brier"],
     "Eval set + holdout",      "Per-model registry"),
    ("Model fairness",       "test_model_fairness",       ["disparate_impact", "equal_opportunity"],
     "Stratified by group",     "Fairlearn metrics"),
    ("Model robustness",     "test_model_robustness",     ["prompt_injection_test", "jailbreak_test"],
     "Adversarial corpus",      "Garak + custom prompts"),
    ("Data quality",         "test_data_quality",         ["null_check", "range_check", "ref_integrity"],
     "All Postgres tables",     "(no LLM · rule-based)"),
    ("Pipeline E2E",         "test_data_pipeline",        ["pipeline_smoke", "intermediate_validate"],
     "Trigger + capture state", "Per-pipeline metric"),
    ("Inference runtime",    "test_inference_runner",     ["inference_smoke", "latency_p95", "cost_per_request"],
     "Production traffic",      "Live LLM endpoint"),
    ("Training runtime",     "test_training_runner",      ["submit_training_job", "capture_metrics"],
     "Feature store",           "Per-training job"),
    ("Job queue",            "test_job_runner",           ["dispatch_job", "monitor_queue_depth", "dlq_review"],
     "agent_queue table",       "(no LLM)"),
    ("Fallback chain",       "test_fallback_chain",       ["primary_fail_simulate", "fallback_activates"],
     "Chaos engineering",       "(no LLM · injection)"),
]


# ──────────────────────────────────────────────────────────────────────
# Endpoints

@router.get("/health")
def health():
    return {"status": "ok", "module": "test-catalog",
            "spec": "Iter 47 · test agents + pipeline catalog + responsibility table"}


@router.get("/pipelines")
def pipelines():
    """Categorized pipeline catalog · counts per category + entries."""
    total = sum(len(v) for v in PIPELINE_CATEGORIES.values())
    return {
        "categories": {k: {"count": len(v), "entries": v}
                       for k, v in PIPELINE_CATEGORIES.items()},
        "n_categories": len(PIPELINE_CATEGORIES),
        "n_total": total,
    }


@router.get("/responsibility-table")
def responsibility_table():
    """Per-process · owner agent · supporting skills · data source · model."""
    rows = [
        {"process": p, "owner_agent": a, "supporting_skills": s,
         "data_source": d, "model_used": m}
        for (p, a, s, d, m) in RESPONSIBILITY_TABLE
    ]
    return {"rows": rows, "count": len(rows)}


@router.get("/test-agents")
def test_agents():
    """Live test agents from DB + their skill counts."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT a.agent_id, a.agent_name, a.business_domain,
                   a.risk_level, a.runtime_framework, a.status, a.purpose,
                   COUNT(m.skill_id) AS n_skills
            FROM agent_registry a
            LEFT JOIN agent_skill_mapping m ON m.agent_id = a.agent_id AND m.status='Active'
            WHERE a.agent_id LIKE 'test\\_%' ESCAPE '\\'
            GROUP BY a.agent_id
            ORDER BY a.agent_id
        """)
        rows = [dict(r) for r in cur.fetchall()]
    return {"agents": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# Top-1% testing plan (Ollama-driven · cron-scheduled)

TOP_1_PCT_PLAN = {
    "spec": "Top-1% testing plan · cron + Ollama local LLM · all 14 test processes",
    "runner": "scripts/top1pct_testing_pipeline.py",
    "schedule": "daily 04:00 UTC · INSUR-TOP1PCT-TESTING",
    "llm": "Ollama (local · llama3.2 or qwen2.5) · no API key required",
    "ollama_endpoint": "http://localhost:11434",
    "phases": [
        {
            "phase": 1, "name": "Frontend",
            "agents": ["test_frontend_playwright", "test_frontend_cua", "test_frontend_stagehand"],
            "tools": ["Playwright", "Anthropic CUA / OpenAI Operator", "Stagehand"],
            "trigger": "every deploy + nightly",
            "pass_gate": "0 console errors · 0 a11y violations · screenshot diff <2%",
        },
        {
            "phase": 2, "name": "Backend",
            "agents": ["test_backend_pytest", "test_backend_load_k6"],
            "tools": ["pytest + httpx TestClient", "k6 5-phase per §47.10"],
            "trigger": "every commit + nightly",
            "pass_gate": "All assertions pass · p95 < 500ms · error_rate < 1%",
        },
        {
            "phase": 3, "name": "Model",
            "agents": ["test_model_accuracy", "test_model_fairness", "test_model_robustness"],
            "tools": ["sklearn + RAGAS", "Fairlearn + AIF360", "Garak"],
            "trigger": "every model release + weekly",
            "pass_gate": "F1 ≥ baseline · DI ≥ 0.8 · adversarial pass rate ≥ 90%",
        },
        {
            "phase": 4, "name": "Data",
            "agents": ["test_data_quality", "test_data_pipeline"],
            "tools": ["Great Expectations + Soda", "Custom pipeline runner"],
            "trigger": "every ingest + daily",
            "pass_gate": "0 NULL in NOT NULL · 0 FK orphans · 0 schema drift",
        },
        {
            "phase": 5, "name": "Runtime",
            "agents": ["test_inference_runner", "test_training_runner", "test_job_runner"],
            "tools": ["LLM client probe", "MLflow registry", "Celery + RQ"],
            "trigger": "continuous",
            "pass_gate": "Inference p95 < 5s · training accuracy ≥ baseline · DLQ = 0",
        },
        {
            "phase": 6, "name": "Resilience",
            "agents": ["test_fallback_chain"],
            "tools": ["Chaos injection · circuit breaker validation"],
            "trigger": "weekly + pre-release",
            "pass_gate": "Primary fail → fallback activates < 5s · no data loss",
        },
    ],
}


@router.get("/top-1pct-plan")
def top_1pct_plan():
    return TOP_1_PCT_PLAN


@router.get("/stats")
def stats():
    """One-shot rollup · test agents + pipeline counts + invocation history."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT COUNT(*) AS n FROM agent_registry WHERE agent_id LIKE 'test\\_%' ESCAPE '\\' AND status='Active'")
        n_test_agents = cur.fetchone()["n"]
        cur.execute("""
            SELECT COUNT(*) FILTER (WHERE skill_id LIKE 'test\\_%' ESCAPE '\\') AS n
            FROM skill_registry WHERE status='Active'
        """)
        n_test_skills = cur.fetchone()["n"]
        cur.execute("""
            SELECT status, COUNT(*) AS n
            FROM agent_invocation
            WHERE agent_id LIKE 'test\\_%' ESCAPE '\\'
            GROUP BY status
        """)
        by_status = {r["status"]: r["n"] for r in cur.fetchall()}
    return {
        "n_test_agents": n_test_agents,
        "n_test_skills": n_test_skills,
        "test_invocations_by_status": by_status,
        "n_pipeline_categories": len(PIPELINE_CATEGORIES),
        "n_pipelines_total": sum(len(v) for v in PIPELINE_CATEGORIES.values()),
        "n_responsibility_rows": len(RESPONSIBILITY_TABLE),
    }
