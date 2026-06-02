"""INSUR automated-pipelines router — 5-phase per-process catalog per dept.

Each pipeline runs through:
  Phase 1 INPUT        → data source + contract
  Phase 2 DATA PROCESS → clean / normalize / feature-eng
  Phase 3 MODEL        → algorithm + hyperparams + training
  Phase 4 OUTPUT       → raw model output + decision-system routing (§40)
  Phase 5 REPORT       → summary view + KPIs + persona who sees it

Composes with global §38 (audit per phase boundary) + §40 (decision tier
in Phase 4) + §47 (C4 L3 dynamic flow) + §57.5 (5-question runbook) +
§57.6 (canonical envelope on every phase audit row) + §64.20 (lifecycle
types) + §66 (operational AI surface).

Endpoints:
  GET /api/v1/insur/pipelines/{dept}                — dept catalog
  GET /api/v1/insur/pipelines/{dept}/{process_id}   — single 5-phase spec
  GET /api/v1/insur/pipelines/_global               — cross-dept inventory
"""
from __future__ import annotations

import re
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from core.insur_audit import log_insur_access

router = APIRouter(prefix="/api/v1/insur/pipelines", tags=["insur", "pipelines"])

INSUR_DEPTS = [
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
]

PHASES = ("input", "data_process", "model", "output", "report")

# Per-dept pipeline catalog — keep aligned with
# ~/.claude/scripts/scaffold-insur-pipelines.py DEPT_PIPELINES dict.
# Schema per pipeline:
#   {"process_id": str, "process_name": str, "lifecycle_type": str,
#    "phases": {phase_name: text}}
# When a dept lacks a detailed catalog, falls back to one stub pipeline.
PIPELINE_CATALOG: dict[str, list[dict[str, Any]]] = {
    "sales": [
        {
            "process_id": "lead_scoring",
            "process_name": "Lead Scoring",
            "lifecycle_type": "Tabular ML",
            "phases": {
                "input": "CRM leads stream + enrichment API (Clearbit/Zoominfo) — 30+ features",
                "data_process": "Drop PII at boundary; one-hot encode industry; impute company-size; scale revenue",
                "model": "XGBoost classifier, n_trials=20 Optuna, 5-fold CV, calibration sigmoid",
                "output": "Probability 0-1 + top-5 SHAP features per lead",
                "report": "Per-rep Lead Quality Dashboard: top-N leads + score trend + conversion lift",
            },
        },
        {
            "process_id": "churn_prediction",
            "process_name": "Churn Prediction",
            "lifecycle_type": "Tabular ML",
            "phases": {
                "input": "Customer subscription + usage events + support tickets",
                "data_process": "Drop customerID; encode contract type; impute tenure; clip outliers",
                "model": "LightGBM + class-weight, early-stop, AUC-PR optimization",
                "output": "Risk tier (High/Med/Low) + per-customer SHAP explanation",
                "report": "Manager dashboard: at-risk accounts ranked + recommended save-action",
            },
        },
        {
            "process_id": "demand_forecast",
            "process_name": "Demand Forecast",
            "lifecycle_type": "Time-Series",
            "phases": {
                "input": "POS transactions (Rossmann CSV) + promo calendar + holiday calendar",
                "data_process": "Lag features (1d/7d/28d); rolling means; date decomposition; outlier flag",
                "model": "Prophet + ARIMA ensemble; per-store separate models",
                "output": "12-week ahead forecast + 80% prediction interval",
                "report": "S&OP planner dashboard: forecast vs actual + MAPE per store + stockout risk",
            },
        },
    ],
    "finance": [
        {
            "process_id": "fraud_detection",
            "process_name": "Fraud Detection",
            "lifecycle_type": "Anomaly + ML",
            "phases": {
                "input": "Transaction stream (Kafka topic) — amount, merchant, location, velocity",
                "data_process": "Velocity features per card; rule layer first; ML risk score; LLM narrative classifier",
                "model": "Isolation Forest + XGBoost ensemble; rule engine; cost-sensitive eval",
                "output": "Risk score + decision tier (auto-approve / human review / reject)",
                "report": "Fraud analyst console: review-tier txns + investigation tooling",
            },
        },
        {
            "process_id": "cash_flow_forecast",
            "process_name": "Cash Flow Forecast",
            "lifecycle_type": "Time-Series",
            "phases": {
                "input": "AR/AP ledger + bank balances + invoice schedule",
                "data_process": "Categorize transactions; aggregate to weekly; handle seasonality",
                "model": "Prophet + linear regression baseline; ensemble",
                "output": "13-week forward forecast + scenarios (base/up/down)",
                "report": "CFO dashboard: cash position + variance vs plan + alert thresholds",
            },
        },
        {
            "process_id": "month_end_close",
            "process_name": "Month-End Close",
            "lifecycle_type": "Process Automation",
            "phases": {
                "input": "GL entries + sub-ledger reconciliations + accruals",
                "data_process": "Match candidate pairs (vendor invoice ↔ PO ↔ receipt); flag exceptions",
                "model": "Rule-based matcher + NLP narrative classifier for unmatched items",
                "output": "Reconciliation status per account + exception list",
                "report": "Controller dashboard: close progress + open exceptions + auto-resolved count",
            },
        },
    ],
    "manufacturing": [
        {
            "process_id": "defect_detection_cv",
            "process_name": "Defect Detection (CV)",
            "lifecycle_type": "Computer Vision",
            "phases": {
                "input": "Production line camera frames + product metadata",
                "data_process": "Resize 640x640; normalize per-camera; rolling baseline brightness adjust",
                "model": "YOLOv8 fine-tuned on labeled defects; per-line specialized models",
                "output": "Bounding boxes + defect class + confidence per frame",
                "report": "Line supervisor display: defect rate trend + heatmap + diverted unit count",
            },
        },
        {
            "process_id": "predictive_maintenance",
            "process_name": "Predictive Maintenance",
            "lifecycle_type": "Tabular ML + Time-Series",
            "phases": {
                "input": "Sensor telemetry (temp/vibration/current) + maintenance log",
                "data_process": "Resample to 1-min; FFT for vibration frequency features; lag features",
                "model": "Random Forest survival + autoencoder for anomaly",
                "output": "Remaining-useful-life estimate + maintenance recommendation",
                "report": "Maintenance planner: machines ranked by failure risk + recommended action",
            },
        },
        {
            "process_id": "oee_optimization",
            "process_name": "OEE Optimization",
            "lifecycle_type": "Process Analytics",
            "phases": {
                "input": "Production logs (per shift, per line) — availability, performance, quality",
                "data_process": "Compute OEE = A × P × Q; decompose losses by category",
                "model": "Descriptive analytics + benchmarking (no ML)",
                "output": "OEE % + loss-tree breakdown + benchmark vs target",
                "report": "Plant director dashboard: OEE trend + bottleneck analysis + improvements",
            },
        },
    ],
    "customer-experience": [
        {
            "process_id": "ticket_auto_reply",
            "process_name": "Ticket Auto-Reply",
            "lifecycle_type": "NLP + RAG",
            "phases": {
                "input": "Inbound ticket text + customer history + product context",
                "data_process": "Tokenize; intent classifier; retrieve top-3 KB articles via vector search",
                "model": "BERT intent classifier + LLM (gemma3:1b) for response generation",
                "output": "Suggested response + confidence + cited KB articles",
                "report": "CX manager: deflection rate + CSAT on auto-replies + escalation patterns",
            },
        },
    ],
    "supply-chain": [
        {
            "process_id": "demand_sensing",
            "process_name": "Demand Sensing",
            "lifecycle_type": "Time-Series + ML",
            "phases": {
                "input": "POS data + weather + macroeconomic + competitor pricing",
                "data_process": "Aggregate to SKU-DC-week; lag features; weather lookup",
                "model": "LightGBM with categorical encoding + Prophet ensemble",
                "output": "Per-SKU-DC-week forecast + uncertainty band",
                "report": "S&OP weekly forecast vs plan + reorder recommendations",
            },
        },
    ],
}

# Fallback stub for depts not in PIPELINE_CATALOG above.
_GENERIC_STUB = {
    "process_id": "default_pipeline",
    "process_name": "Default Automated Pipeline",
    "lifecycle_type": "Tabular ML (extend per dept lifecycle)",
    "phases": {
        "input": "Upstream system events (extend per dept's primary data source)",
        "data_process": "Standard preprocessing per global §64.19 data-prep stack",
        "model": "XGBoost baseline (extend per process — see §64.20 lifecycle types)",
        "output": "Prediction routed through §40 decision system (auto / review / reject)",
        "report": "Per-role dashboard per §64.37",
    },
}


def _catalog_for(dept: str) -> list[dict[str, Any]]:
    return PIPELINE_CATALOG.get(dept, [_GENERIC_STUB])


def _validate_dept(dept: str) -> None:
    if dept not in INSUR_DEPTS:
        raise HTTPException(404, f"Unknown dept '{dept}' — must be one of {len(INSUR_DEPTS)} INSUR depts")


# IMPORTANT — _global BEFORE /{dept} per §66.3 FastAPI greedy-match trap.
@router.get("/_global")
def global_inventory(http_request: Request) -> dict[str, Any]:
    """Cross-dept process inventory — names + counts per dept."""
    log_insur_access(http_request, "pipelines", "global_inventory")
    inventory: dict[str, list[str]] = {}
    for dept in INSUR_DEPTS:
        inventory[dept] = [p["process_id"] for p in _catalog_for(dept)]
    return {
        "n_depts": len(INSUR_DEPTS),
        "depts": INSUR_DEPTS,
        "n_processes_total": sum(len(v) for v in inventory.values()),
        "per_dept_processes": inventory,
        "phase_sequence": list(PHASES),
        "scanned_at": time.time(),
    }


@router.get("/{dept}")
def dept_catalog(http_request: Request, dept: str) -> dict[str, Any]:
    """Per-dept pipeline catalog with 5-phase spec for every process."""
    _validate_dept(dept)
    log_insur_access(http_request, "pipelines", "dept_catalog", dept=dept)
    catalog = _catalog_for(dept)
    return {
        "dept": dept,
        "n_pipelines": len(catalog),
        "pipelines": catalog,
        "phase_sequence": list(PHASES),
        "scanned_at": time.time(),
    }


@router.get("/{dept}/{process_id}")
def process_detail(http_request: Request, dept: str, process_id: str) -> dict[str, Any]:
    """Single-process 5-phase detail."""
    _validate_dept(dept)
    # Validate process_id format to avoid injection vibes
    if not re.match(r"^[a-z0-9_]+$", process_id):
        raise HTTPException(400, f"Malformed process_id '{process_id}' (must be lowercase + underscores)")
    log_insur_access(http_request, "pipelines", "process_detail",
                    dept=dept, extra={"process_id": process_id})
    catalog = _catalog_for(dept)
    match = next((p for p in catalog if p["process_id"] == process_id), None)
    if match is None:
        available = [p["process_id"] for p in catalog]
        raise HTTPException(
            404, f"Unknown process '{process_id}' for dept '{dept}' — available: {available}"
        )
    # Add per-phase audit-row stub for the response (operator-friendly)
    return {
        "dept": dept,
        "pipeline": match,
        "phase_sequence": list(PHASES),
        "audit_row_template": {
            "request_id": "<uuid>",
            "tenant_id": "default",
            "pipeline_id": f"{dept}.{process_id}",
            "phase": "<1-5>",
            "latency_ms": "<int>",
            "outcome": "<phase-specific outcome>",
            "model_v": "<set in phase 3>",
            "confidence": "<set in phase 4>",
        },
        "scanned_at": time.time(),
    }
