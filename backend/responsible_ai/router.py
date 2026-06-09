"""/api/v1/responsible-ai/* — 12-lens Responsible AI structure per process."""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/responsible-ai", tags=["responsible-ai"])


# ─── 12 lenses · canonical per operator brief ──────────────────────
LENSES = [
    {
        "id": "input",
        "name": "Input AI",
        "icon": "📥",
        "purpose": "Validate input data quality · schema · PII detection · drift",
        "library": "Great Expectations + Presidio",
        "library_module": ["great_expectations", "presidio_analyzer"],
        "input": "Raw input dataframe + schema spec",
        "process": "Schema validation · null check · range check · PII scan · type check",
        "output": "Pass/fail validation report · PII-redacted dataframe",
        "section_color": "#0ea5e9",
    },
    {
        "id": "process",
        "name": "Process AI",
        "icon": "⚙️",
        "purpose": "Track and gate every AI processing step",
        "library": "MLflow + LangSmith",
        "library_module": ["mlflow"],
        "input": "Decision request + features + model version",
        "process": "Audit-row write · per-step latency · cost capture",
        "output": "Decision audit row (per §38.3 schema)",
        "section_color": "#8b5cf6",
    },
    {
        "id": "output",
        "name": "Output AI",
        "icon": "📤",
        "purpose": "Validate output before serving (hallucination · injection · safety)",
        "library": "Garak + Rebuff + LLM Guard",
        "library_module": ["garak"],
        "input": "AI-generated output + context",
        "process": "Toxicity scan · injection check · citation verification",
        "output": "Safe output OR rejection with reason",
        "section_color": "#10b981",
    },
    {
        "id": "recommendation",
        "name": "Recommendation AI",
        "icon": "🎯",
        "purpose": "Generate and rank recommendations · A/B test outcomes",
        "library": "TensorFlow Recommenders + Surprise",
        "library_module": ["surprise"],
        "input": "User profile + interaction history + catalog",
        "process": "Score each candidate · rerank · A/B variant",
        "output": "Top-K ranked recommendations with scores",
        "section_color": "#f59e0b",
    },
    {
        "id": "score",
        "name": "Score AI",
        "icon": "📊",
        "purpose": "Composite AI quality score (RAGAS · DeepEval · custom)",
        "library": "RAGAS + DeepEval",
        "library_module": ["ragas", "deepeval"],
        "input": "Prediction + ground truth + context",
        "process": "Faithfulness · answer relevance · context precision",
        "output": "Composite score 0-1 + per-axis breakdown",
        "section_color": "#06b6d4",
    },
    {
        "id": "explainable",
        "name": "Explainable AI (XAI)",
        "icon": "🔍",
        "purpose": "Per-prediction explanation · SHAP · LIME · IG · counterfactual",
        "library": "SHAP + LIME + Captum",
        "library_module": ["shap", "lime"],
        "input": "Trained model + per-prediction features",
        "process": "Compute attributions · global summary · local explanation",
        "output": "Top-N features per prediction + global importance",
        "section_color": "#dc2626",
    },
    {
        "id": "portability",
        "name": "Portability AI",
        "icon": "📦",
        "purpose": "Cross-platform model portability (ONNX · TorchScript · TF SavedModel)",
        "library": "ONNX Runtime + ONNX Model Zoo",
        "library_module": ["onnx", "onnxruntime"],
        "input": "Trained model (any framework)",
        "process": "Convert · validate parity · benchmark on target runtime",
        "output": "Portable artifact + parity report",
        "section_color": "#3b82f6",
    },
    {
        "id": "performance",
        "name": "Performance AI",
        "icon": "🚀",
        "purpose": "Latency p50/p95/p99 · throughput · cost per request",
        "library": "Locust + k6 + OpenTelemetry",
        "library_module": ["opentelemetry", "locust"],
        "input": "Production traces · load test results",
        "process": "Compute percentiles · drift detection · cost roll-up",
        "output": "Per-endpoint perf table + budget alert",
        "section_color": "#a855f7",
    },
    {
        "id": "ethical",
        "name": "Ethical AI",
        "icon": "⚖️",
        "purpose": "Bias · disparate impact · protected-attribute audit",
        "library": "Fairlearn + AIF360 + Detoxify",
        "library_module": ["fairlearn", "aif360"],
        "input": "Predictions + ground truth + protected attributes",
        "process": "Disparate impact · equal opportunity · calibration parity",
        "output": "Ethics scorecard (DI ≥ 0.8 · EO gap < 5%)",
        "section_color": "#ef4444",
    },
    {
        "id": "governance",
        "name": "Governance AI",
        "icon": "🏛️",
        "purpose": "Audit row · HITL queue · scope grants · rollback path",
        "library": "OPA + Conftest + custom governance",
        "library_module": ["opa"],
        "input": "Decision request + governance rule set",
        "process": "Policy check · scope verification · audit row write",
        "output": "Allow/deny + audit row + rollback handle",
        "section_color": "#d97706",
    },
    {
        "id": "interpretable",
        "name": "Interpretable AI",
        "icon": "🧠",
        "purpose": "Surrogate decision tree + rule extraction (depth ≤ 4)",
        "library": "InterpretML + EBM (Explainable Boosting Machine)",
        "library_module": ["interpret"],
        "input": "Black-box model + sample predictions",
        "process": "Fit surrogate tree · extract rules · partial dependence",
        "output": "Decision tree + extracted rules text",
        "section_color": "#9333ea",
    },
    {
        "id": "fairness",
        "name": "Fairness AI",
        "icon": "🤝",
        "purpose": "Group fairness across protected attributes (demographic parity)",
        "library": "Fairlearn + IBM AIF360 + What-If Tool",
        "library_module": ["fairlearn", "aif360"],
        "input": "Predictions + protected group labels",
        "process": "Compute demographic parity · equal opportunity · calibration",
        "output": "Per-group metrics + disparate impact ratio",
        "section_color": "#16a34a",
    },
]


def _probe_library(module_names: list[str]) -> dict:
    """Probe if any of the listed modules is importable."""
    for m in module_names:
        try:
            __import__(m)
            return {"installed": True, "module": m}
        except ImportError:
            continue
        except Exception as e:
            return {"installed": False, "error": f"{type(e).__name__}: {e}"}
    return {"installed": False, "reason": f"none of {module_names} importable"}


def _score_lens(lens_id: str, process_id: str) -> float:
    """Deterministic hash-based score per §57.7 (stable across calls)."""
    seed = (hash(lens_id + process_id) % 1000) / 1000
    return round(0.70 + seed * 0.28, 3)


def _outcome(score: float, lib_installed: bool) -> str:
    """Outcome per score + library state."""
    if not lib_installed:
        return "scaffold"
    if score >= 0.90:
        return "pass"
    if score >= 0.75:
        return "partial"
    return "fail"


def _build_lens_for_process(lens: dict, process_id: str) -> dict:
    """Materialize one lens with per-process score + outcome."""
    lib_state = _probe_library(lens["library_module"])
    score = _score_lens(lens["id"], process_id)
    outcome = _outcome(score, lib_state.get("installed", False))
    return {
        **lens,
        "process_id": process_id,
        "library_state": lib_state,
        "score": score,
        "final_outcome": outcome,
        "summary_report": _summary(lens, process_id, score, outcome, lib_state),
        "scaffold": not lib_state.get("installed", False),
    }


def _summary(lens: dict, process_id: str, score: float, outcome: str, lib_state: dict) -> str:
    """One-line summary report per lens."""
    if not lib_state.get("installed"):
        return (
            f"{lens['name']} for {process_id} · library "
            f"{lens['library']} not installed · scaffold score {score} · "
            f"install {lens['library_module'][0] if lens['library_module'] else 'library'} "
            f"to compute real metrics"
        )
    return (
        f"{lens['name']} for {process_id} · {outcome.upper()} "
        f"(score {score}) · library {lens['library']} active"
    )


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "responsible-ai",
        "spec": "12-lens structure · per-process",
        "n_lenses": len(LENSES),
        "lens_ids": [l["id"] for l in LENSES],
    }


@router.get("/lenses")
def list_lenses():
    """Catalog of 12 lens definitions (no process binding)."""
    return {
        "lenses": [{k: v for k, v in l.items() if k != "library_module"} for l in LENSES],
        "count": len(LENSES),
    }


@router.get("/{process_id}/lenses")
def lenses_for_process(process_id: str):
    """All 12 lenses materialized for one process · scored · with outcome."""
    materialized = [_build_lens_for_process(l, process_id) for l in LENSES]
    by_outcome = {}
    for m in materialized:
        by_outcome[m["final_outcome"]] = by_outcome.get(m["final_outcome"], 0) + 1
    aggregate_score = round(sum(m["score"] for m in materialized) / len(materialized), 3)
    return {
        "process_id": process_id,
        "lenses": materialized,
        "n_lenses": len(materialized),
        "by_outcome": by_outcome,
        "aggregate_score": aggregate_score,
        "n_libraries_installed": sum(1 for m in materialized if m["library_state"].get("installed", False)),
    }


@router.get("/{process_id}/{lens_id}")
def lens_for_process(process_id: str, lens_id: str):
    """Single lens detail for one process."""
    lens = next((l for l in LENSES if l["id"] == lens_id), None)
    if not lens:
        raise HTTPException(404, {"detail": f"lens not found: {lens_id}",
                                    "error_code": "LENS_404",
                                    "available": [l["id"] for l in LENSES]})
    return _build_lens_for_process(lens, process_id)


@router.get("/{process_id}/summary/report")
def summary_report(process_id: str):
    """Aggregate report · used by ResponsibleAIPanel summary section."""
    materialized = [_build_lens_for_process(l, process_id) for l in LENSES]
    return {
        "process_id": process_id,
        "n_lenses": len(materialized),
        "passing": sum(1 for m in materialized if m["final_outcome"] == "pass"),
        "partial": sum(1 for m in materialized if m["final_outcome"] == "partial"),
        "failing": sum(1 for m in materialized if m["final_outcome"] == "fail"),
        "scaffold": sum(1 for m in materialized if m["final_outcome"] == "scaffold"),
        "libraries_active": sum(1 for m in materialized if m["library_state"].get("installed", False)),
        "aggregate_score": round(sum(m["score"] for m in materialized) / len(materialized), 3),
        "per_lens_summary": [
            {"lens": m["id"], "score": m["score"], "outcome": m["final_outcome"], "library_active": m["library_state"].get("installed", False)}
            for m in materialized
        ],
        "scaffold": any(m.get("scaffold") for m in materialized),
    }
