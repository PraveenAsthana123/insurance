from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from core.config import get_settings
from core.error_handlers import register_error_handlers
from core.logging_config import setup_logging
from core.middleware import (
    CorrelationIdMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
    TenantIdMiddleware,
)
from core.rbac_middleware import RBACMiddleware
from database import run_migrations

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    setup_logging()
    logger.info("Starting Insur Analytics Dashboard")

    # Optional skip for local dev when schema state is known-good.
    # Default behavior unchanged (migrations run on every startup).
    skip = os.environ.get("INSUR_SKIP_MIGRATIONS", "").lower() in ("1", "true", "yes")
    if skip:
        logger.info("INSUR_SKIP_MIGRATIONS set — skipping run_migrations()")
    else:
        run_migrations()
        logger.info("Migrations complete")

    if not skip:
        from seeds.seed_runner import run_seeds
        run_seeds()
        logger.info("Seed data check complete")

    yield

    logger.info("Shutting down Insur Analytics Dashboard")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Insur Analytics Dashboard API",
        version="1.0.0",
        description="AI-powered BEV analytics platform covering all 11 business departments",
        lifespan=lifespan,
    )

    # ── Middleware (outermost first — CorrelationId wraps everything) ──────────
    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RateLimitMiddleware, requests_per_minute=settings.rate_limit_api)
    app.add_middleware(SecurityHeadersMiddleware)
    # RBAC runs INSIDE CorrelationId so request.state.correlation_id is set
    # before RBAC returns 403/400. add_middleware stacks in reverse: last-added
    # is outermost. CorrelationId (added last) wraps RBAC (added just before).
    app.add_middleware(RBACMiddleware)
    # TenantId sits BETWEEN RBAC and CorrelationId: it needs correlation_id in
    # error responses, and RBAC may eventually read tenant_id from request.state.
    # Per §64.43 #7 + §41.3 — federated multi-tenant scoping.
    app.add_middleware(TenantIdMiddleware)
    app.add_middleware(CorrelationIdMiddleware)

    # ── Error handlers ─────────────────────────────────────────────────────────
    register_error_handlers(app)

    # ── Routers ────────────────────────────────────────────────────────────────
    from routers.health import router as health_router, unversioned_router as health_unversioned_router
    from routers.departments import router as dept_router
    from routers.processes import router as process_router
    from routers.datasets import router as dataset_router
    from routers.models import router as model_router
    from routers.jobs import router as job_router, schedule_router
    from routers.sales import router as sales_router
    from routers.supply_chain import router as supply_chain_router
    from routers.customer import router as customer_router
    from routers.ai_explain import router as ai_explain_router
    from routers.insur import router as insur_router
    from routers.openclaw import router as openclaw_router
    from routers.paperclip import router as paperclip_router
    from routers.agent_platform import router as agent_platform_router
    from routers.agent_supervisor import router as agent_supervisor_router
    from routers.admin import router as admin_router
    from routers.monitoring import router as monitoring_router
    from routers.holy_components import router as holy_components_router
    from routers.master_data import router as master_data_router
    from routers.transactions import router as transactions_router
    from routers.pipelines import router as pipelines_router
    from routers.reports import router as reports_router
    from routers.demo_stories import router as demo_stories_router
    from routers.graph import router as graph_router
    from routers.downloads import router as downloads_router
    from routers.dbviewer import router as dbviewer_router
    from routers.pii import router as pii_router
    from routers.guardrails import router as guardrails_router
    from routers.security import router as security_router
    from routers.evals_functional import router as evals_functional_router
    from routers.evals_cost import router as evals_cost_router
    from routers.evals_safety import router as evals_safety_router
    from routers.observability_hub import router as observability_hub_router
    from routers.evals_model_compare import router as evals_model_compare_router
    from routers.catalogs import router as catalogs_router
    from routers.tenants_admin import router as tenants_admin_router
    from routers.insurance import router as insurance_router
    from routers.input_events import router as input_events_router  # GLOBAL_INPUT_PERSISTENCE_POLICY
    from webllm_cdp_rag_langgraph.router import router as webllm_agent_router  # §91 WebLLM+CDP+RAG+LangGraph
    from routers.admin_feedback import router as admin_feedback_router  # /api/v1/admin/feedback rollup
    from routers.audit import router as audit_router  # /api/v1/insur/audit/* — audit triad (§64.22 + §64.29 + §58/§63 + §90 L15)
    from voice_ai.router import router as voice_ai_router  # /api/v1/voice-ai/* — §90 L15 E2E demo + campaigns + observability
    from marketing_campaigns.router import router as marketing_campaigns_router
    from content_ops.router import router as content_ops_router
    from marketing_kpis.router import router as marketing_kpis_router
    from ai_tool_registry.router import router as ai_tool_registry_router
    from attribution.router import router as attribution_router
    from autonomous_dept_registry.router import router as autonomous_dept_router
    from corrections.router import router as corrections_router
    from ml_runtime.router import router as ml_runtime_router  # /api/v1/ml/*
    from hitl.router import router as hitl_router  # /api/v1/hitl/* — gate #3
    from feedback.router import router as feedback_router  # /api/v1/feedback/* — gate #4
    from pipeline.router import router as pipeline_router  # /api/v1/pipeline/* — §93
    from use_cases.router import router as use_cases_router  # /api/v1/use-cases/* — §94
    from responsible_ai.router import router as responsible_ai_router  # /api/v1/responsible-ai/* — 12-lens
    from data_pipeline.router import router as data_pipeline_router  # /api/v1/data-pipeline/* — 5-phase
    from test_status.router import router as test_status_router  # /api/v1/test-status/* — §64.30 12-tier
    from regulatory.router import router as regulatory_router  # /api/v1/regulatory/* — P1 #16
    from comments.router import router as comments_router  # /api/v1/comments/* — P1 #18
    from alerts.router import router as alerts_router  # /api/v1/alerts/* — Iter 21  # /api/v1/comments/* — P1 #18  # /api/v1/test-status/* — §64.30 12-tier  # /api/v1/data-pipeline/* — 5-phase  # /api/v1/responsible-ai/* — 12-lens  # /api/v1/use-cases/* — §94  # /api/v1/pipeline/* — §93 Manual + Automatic  # /api/v1/feedback/* — gate #4  # /api/v1/hitl/* — gate #3  # /api/v1/ml/* — model registry · SHAP · eval  # /api/v1/corrections/* — T7.10 RLHF DB  # /api/v1/autonomous-dept/*  # /api/v1/attribution/* — T5.9 multi-touch  # /api/v1/ai-tools/* — tool landscape  # /api/v1/marketing-kpis/* — KPI registry  # /api/v1/content-ops/* — job+blog postings · contacts · schedules  # /api/v1/marketing-campaigns/* — 4 channels (email/banner/survey/form)

    app.include_router(health_router)
    app.include_router(health_unversioned_router)  # /api/health alias for Docker healthcheck
    app.include_router(dept_router)
    app.include_router(process_router)
    app.include_router(dataset_router)
    app.include_router(model_router)
    app.include_router(job_router)
    app.include_router(schedule_router)
    app.include_router(sales_router)
    app.include_router(supply_chain_router)
    app.include_router(customer_router)
    app.include_router(ai_explain_router)
    app.include_router(insur_router)
    app.include_router(openclaw_router)    # /api/v1/openclaw/* (parallel-agent integration)
    app.include_router(paperclip_router)   # /api/v1/paperclip/* (parallel-agent integration)
    app.include_router(agent_platform_router)  # /api/v1/agent-platform/* (unified agent tool setup/status)
    app.include_router(agent_supervisor_router)  # /api/v1/agent-supervisor/* (live agent fleet queues, heartbeats, schedules, results)
    app.include_router(admin_router)            # /api/v1/admin/* (cross-tenant compliance/reporting reads — RBAC-gated)
    app.include_router(monitoring_router)  # /api/v1/insur/monitoring/* (per-dept cron + pipeline health)
    app.include_router(holy_components_router)  # /api/v1/holy/components/<op> — workspace SpecComponentCard ops (run/view/edit/validate)
    app.include_router(master_data_router) # /api/v1/insur/master-data/* (per-dept SAP-style master data)
    app.include_router(transactions_router) # /api/v1/insur/transactions/* (unified chronological audit feed per dept)
    app.include_router(pipelines_router)    # /api/v1/insur/pipelines/* (5-phase automated pipeline catalog per dept)
    app.include_router(reports_router)      # /api/v1/insur/reports/* (dept-level reports catalog: 15 standard archetypes per §64.37.2)
    app.include_router(demo_stories_router) # /api/v1/insur/demo-stories/* (per-dept × per-role demo scripts: 15 roles × 19 depts = 285 total)
    app.include_router(graph_router)        # /api/v1/insur/graph/* (per-dept relationship graph: entities + processes + pipelines + roles + reports + demos + audit + dashboards)
    app.include_router(downloads_router)    # /api/v1/insur/downloads/* (per-dept sample data: CSV + JSON + before/after SVG, path-traversal-hardened)
    app.include_router(dbviewer_router)     # /api/v1/insur/dbviewer/* (§68 INSUR Observability Hub: DB browse + per-function primary/secondary tables, PII-redacted + tenant-scoped)
    app.include_router(pii_router)          # /api/v1/insur/pii/* (§68.6 PII inventory: cross-dept PII columns + per-dept slice + leak scan over audit log)
    app.include_router(guardrails_router)   # /api/v1/insur/guardrails/* (§68.5 Guardrails: cross-dept rollup + per-dept decisions + single decision lookup; reads from data/agent-supervisor/guardrail_decisions.jsonl)
    app.include_router(security_router)     # /api/v1/insur/security/* (§68.7 Security posture: compliance gates + CVE snapshot + attack-attempt audit scan)
    app.include_router(evals_functional_router) # /api/v1/insur/evals/functional/* (§68.8 Functional eval: leaderboard + per-model history + drift; reads from data/agent-supervisor/functional_eval_runs.jsonl)
    app.include_router(evals_cost_router)       # /api/v1/insur/evals/cost/* (§68.9 Cost eval: 24h/7d/30d windows + per-tenant + per-model ranking + per-request lookup; reads from data/agent-supervisor/cost_runs.jsonl)
    app.include_router(evals_safety_router)     # /api/v1/insur/evals/safety/* (§68.10 Safety eval: hallucination + toxicity + bias + fairness with verdict classification; reads from data/agent-supervisor/safety_eval_runs.jsonl)
    app.include_router(observability_hub_router) # /api/v1/insur/observability-hub/* (§68 aggregator: one GET surfacing health of all 7 §68 read surfaces — dbviewer + pii + guardrails + security + evals_{functional,cost,safety})
    app.include_router(evals_model_compare_router) # /api/v1/insur/evals/model-compare/* (§68.11 Multi-model comparison: POST joins §68.8/9/10 logs and persists scorecard; GET _history + GET {comparison_id})
    app.include_router(catalogs_router)             # /api/v1/catalogs/* (analysis_phase + analysis_module reads + raw markdown serve for AI assurance / ML methodology / DT)
    app.include_router(tenants_admin_router)        # /api/v1/admin/{tenants,departments,tenant-departments} — migration 017 surfaces
    app.include_router(insurance_router)            # /api/v1/insurance/* — 4 insurance depts: spec + role dashboards/reports + pipeline runner + sim/system-design/manual-vs-auto markdown
    app.include_router(input_events_router)         # /api/v1/input-events/* — GLOBAL_INPUT_PERSISTENCE_POLICY · append-only user input capture (POST/GET/list)
    app.include_router(webllm_agent_router)         # /api/v1/webllm-agent/* — §91 browser-native agentic AI (WebLLM + CDP + RAG + LangGraph)
    app.include_router(admin_feedback_router)       # /api/v1/admin/feedback/* — rollup view over user_input_events (summary + comments)
    app.include_router(audit_router)                # /api/v1/insur/audit/* — audit triad + L15
    app.include_router(voice_ai_router)             # /api/v1/voice-ai/* — E2E + campaigns + observability (28 endpoints)
    app.include_router(marketing_campaigns_router)  # /api/v1/marketing-campaigns/* — multi-channel (email/banner/survey/form)
    app.include_router(content_ops_router)
    app.include_router(marketing_kpis_router)
    app.include_router(ai_tool_registry_router)
    app.include_router(attribution_router)
    app.include_router(autonomous_dept_router)
    app.include_router(corrections_router)        # /api/v1/corrections/* — T7.10
    app.include_router(ml_runtime_router)          # /api/v1/ml/* — honest stubs P0.3+P0.4+P0.5
    app.include_router(hitl_router)                # /api/v1/hitl/* — Tier 7 gate #3
    app.include_router(feedback_router)            # /api/v1/feedback/* — Tier 7 gate #4
    app.include_router(pipeline_router)            # /api/v1/pipeline/* — §93
    app.include_router(use_cases_router)           # /api/v1/use-cases/* — §94
    app.include_router(responsible_ai_router)      # /api/v1/responsible-ai/* — 12-lens
    app.include_router(data_pipeline_router)       # /api/v1/data-pipeline/* — 5-phase
    app.include_router(test_status_router)         # /api/v1/test-status/* — §64.30 12-tier
    app.include_router(regulatory_router)          # /api/v1/regulatory/* — P1 #16
    app.include_router(comments_router)            # /api/v1/comments/* — P1 #18
    app.include_router(alerts_router)              # /api/v1/alerts/* — Iter 21            # /api/v1/comments/* — P1 #18         # /api/v1/test-status/* — §64.30 12-tier       # /api/v1/data-pipeline/* — 5-phase      # /api/v1/responsible-ai/* — 12-lens           # /api/v1/use-cases/* — §94            # /api/v1/pipeline/* — §93 process modes            # /api/v1/feedback/* — Tier 7 gate #4                # /api/v1/hitl/* — Tier 7 gate #3          # /api/v1/ml/* — honest stubs P0.3+P0.4+P0.5        # /api/v1/corrections/* — T7.10    # /api/v1/autonomous-dept/* — framework registry        # /api/v1/attribution/* — T5.9   # /api/v1/ai-tools/* — Enterprise AI Tool Landscape     # /api/v1/marketing-kpis/* — KPI registry (read-only)          # /api/v1/content-ops/* — postings + contacts + schedules

    return app


app = create_app()
