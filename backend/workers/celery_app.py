"""Celery application factory for BEV Analytics background workers."""
from __future__ import annotations

import sys
import os

# Allow imports from the backend package when running workers directly
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from celery import Celery  # noqa: E402

from core.config import get_settings  # noqa: E402

settings = get_settings()

celery_app = Celery(
    "insur_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,          # hard limit: 60 minutes
    task_soft_time_limit=3000,     # soft limit: 50 minutes — triggers SoftTimeLimitExceeded
    worker_prefetch_multiplier=1,  # fair dispatch — one task per worker at a time
    task_acks_late=True,           # ack after completion so tasks aren't lost on crash
    result_expires=86400,          # results expire after 24 h
)

# ---------------------------------------------------------------------------
# Beat schedule — periodic INSUR reference-pipeline runs
# ---------------------------------------------------------------------------
# Operator request 2026-05-22: full ML + RAG lifecycle must run on a schedule
# so the eval artifacts stay fresh. Disable per-pipeline via env if needed.
# Start beat with: celery -A workers.celery_app beat --loglevel=info
celery_app.conf.beat_schedule = {
    "insur-churn-lifecycle-daily": {
        "task": "insur.run_structured_lifecycle",
        "schedule": 24 * 60 * 60,  # daily
        "kwargs": {
            "dataset": "/data/customer-analytics/WA_Fn-UseC_-Telco-Customer-Churn.csv",
            "target": "Churn",
            "task_type": "classification",
            "dept": "sales",
            "pipeline_name": "churn_reference",
            "drop_cols": ["customerID"],
            "n_trials": 10,
            "sample_rows": 2000,
        },
        "options": {"expires": 12 * 60 * 60},
    },
    "insur-demand-lifecycle-daily": {
        "task": "insur.run_structured_lifecycle",
        "schedule": 24 * 60 * 60,
        "kwargs": {
            "dataset": "/data/kaggle/rossmann/train.csv",
            "target": "Sales",
            "task_type": "regression",
            "dept": "sales",
            "pipeline_name": "demand_forecast_reference",
            "date_cols": ["Date"],
            "drop_cols": ["Store"],
            "n_trials": 10,
            "sample_rows": 10000,
        },
        "options": {"expires": 12 * 60 * 60},
    },
    "insur-rag-lifecycle-daily": {
        "task": "insur.run_rag_lifecycle",
        "schedule": 24 * 60 * 60,
        "kwargs": {
            "corpus": [
                "/data/customer-context",
                "/data/sales-context",
                "/data/supply-chain-context",
            ],
            "dept": "customer-experience",
            "pipeline_name": "rag_reference",
            "chunking": "sentence_aware",
            "llm": "gemma3:1b",
        },
        "options": {"expires": 12 * 60 * 60},
    },
}


# ---------------------------------------------------------------------------
# Test-tier auto-dispatch beat schedule per global §65.8.5
# ---------------------------------------------------------------------------
# Every tier has a cadence; the dispatcher task enqueues into Redis test_tasks
# fan-out across all 19 depts (or a subset via env override).
# Disable an individual schedule by setting BEV_DISABLE_<NAME>=1.

_INSUR_DEPARTMENTS = [
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce",
    "customer-support", "engineering", "it-operations", "legal", "marketing",
    "operations", "security-operations",
]

celery_app.conf.beat_schedule.update({
    # Unit + process tiers — every 30 min (cheap, fast feedback)
    "insur-tests-unit-30min": {
        "task": "insur.dispatch_test_fanout",
        "schedule": 30 * 60,
        "kwargs": {"tier": "unit", "depts": _INSUR_DEPARTMENTS, "timeout_seconds": 300},
        "options": {"expires": 25 * 60},
    },
    "insur-tests-process-30min": {
        "task": "insur.dispatch_test_fanout",
        "schedule": 30 * 60,
        "kwargs": {"tier": "process", "depts": _INSUR_DEPARTMENTS, "timeout_seconds": 600},
        "options": {"expires": 25 * 60},
    },
    # API + integration — hourly (medium cost)
    "insur-tests-api-hourly": {
        "task": "insur.dispatch_test_fanout",
        "schedule": 60 * 60,
        "kwargs": {"tier": "api", "depts": _INSUR_DEPARTMENTS, "timeout_seconds": 600},
        "options": {"expires": 55 * 60},
    },
    "insur-tests-integration-hourly": {
        "task": "insur.dispatch_test_fanout",
        "schedule": 60 * 60,
        "kwargs": {"tier": "integration", "depts": _INSUR_DEPARTMENTS, "timeout_seconds": 900},
        "options": {"expires": 55 * 60},
    },
    # Boundary — every 4h (property-based; slower)
    "insur-tests-boundary-4h": {
        "task": "insur.dispatch_test_fanout",
        "schedule": 4 * 60 * 60,
        "kwargs": {"tier": "boundary", "depts": _INSUR_DEPARTMENTS, "timeout_seconds": 1200},
        "options": {"expires": 3 * 60 * 60},
    },
    # Perf — nightly (heavy; k6/locust)
    "insur-tests-perf-nightly": {
        "task": "insur.dispatch_test_fanout",
        "schedule": 24 * 60 * 60,
        "kwargs": {"tier": "perf", "depts": _INSUR_DEPARTMENTS, "timeout_seconds": 1800},
        "options": {"expires": 23 * 60 * 60},
    },
    # Smoke — every deploy (manual trigger usually; here daily as fallback)
    "insur-tests-smoke-daily": {
        "task": "insur.dispatch_test_fanout",
        "schedule": 24 * 60 * 60,
        "kwargs": {"tier": "smoke", "depts": _INSUR_DEPARTMENTS, "timeout_seconds": 900},
        "options": {"expires": 23 * 60 * 60},
    },
    # Security — weekly + §42 gated to auth env only via TIER_ROLE=security-agent
    "insur-tests-security-weekly": {
        "task": "insur.dispatch_test_fanout",
        "schedule": 7 * 24 * 60 * 60,
        "kwargs": {"tier": "security", "depts": _INSUR_DEPARTMENTS, "timeout_seconds": 3600},
        "options": {"expires": 6 * 24 * 60 * 60},
    },
})

# ---------------------------------------------------------------------------
# Data + Model + Accuracy + Analysis cron jobs (operator 2026-05-23)
# ---------------------------------------------------------------------------
# Four broad categories of recurring AI ops work — each fans across all 19 depts.
# Per global CLAUDE.md §65.1 + §64.20 (per-dept ML lifecycle types).
# Disable per-job via env: BEV_DISABLE_<NAME>=1.

celery_app.conf.beat_schedule.update({
    # DATA — refresh per-dept input data (re-ingest, dedup, IQR-flag, impute, freshness)
    # Hourly because data sources update throughout the day; cheap if no-op.
    "insur-data-refresh-hourly": {
        "task": "insur.refresh_data_artifacts",
        "schedule": 60 * 60,  # hourly
        "kwargs": {"depts": _INSUR_DEPARTMENTS, "max_minutes": 30},
        "options": {"expires": 55 * 60},
    },
    # MODEL — re-train reference pipelines per dept (drift-triggered + scheduled)
    # Daily because retraining costs are real; nightly is the standard cadence.
    "insur-model-retrain-daily": {
        "task": "insur.retrain_models",
        "schedule": 24 * 60 * 60,  # daily
        "kwargs": {"depts": _INSUR_DEPARTMENTS, "pipelines": ["full_lifecycle", "anomaly", "recommendation"]},
        "options": {"expires": 12 * 60 * 60},
    },
    # ACCURACY — re-compute accuracy on latest test sets (drift detection)
    # Every 4h: enough to catch fast-moving drift, not so frequent that it spams.
    "insur-accuracy-eval-4h": {
        "task": "insur.eval_accuracy_drift",
        "schedule": 4 * 60 * 60,  # every 4h
        "kwargs": {"depts": _INSUR_DEPARTMENTS},
        "options": {"expires": 3 * 60 * 60},
    },
    # ANALYSIS — periodic rollup analytics (KPI computation, dashboard refresh)
    # Daily morning rollup so executive dashboards are fresh for board hours.
    "insur-analysis-rollup-daily": {
        "task": "insur.analysis_rollup",
        "schedule": 24 * 60 * 60,  # daily
        "kwargs": {"depts": _INSUR_DEPARTMENTS},
        "options": {"expires": 12 * 60 * 60},
    },
})
