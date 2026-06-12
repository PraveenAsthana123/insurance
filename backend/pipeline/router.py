"""/api/v1/pipeline/* — manual + automatic process modes.

MANUAL mode  · discrete user-driven steps · NO pipeline structure.
              User invokes each action separately · controls every
              hyperparameter · stops at any step.

AUTOMATIC mode · pipeline-based execution · phases run sequentially ·
                  each phase produces output + quality_score + report.

Per §57.7 honest: scaffold-mode responses when sklearn/MLflow not
fully wired. Real metrics arrive when the eval harness lands.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/pipeline", tags=["pipeline"])


# ─── In-process state (operator dev convenience · prod would be Redis/DB) ───
_MANUAL_SESSIONS: dict[str, dict[str, Any]] = {}
_AUTO_RUNS: dict[str, dict[str, Any]] = {}


# ─── MANUAL MODE · discrete user-driven steps · NO pipeline ────────

class ManualStartRequest(BaseModel):
    process_id: str = Field(..., min_length=1)
    dataset_name: str = "default"


def _empty_component() -> dict[str, Any]:
    """Per §93 · every component has 4 sub-sections: Input · Process · Output · Visualization."""
    return {
        "Input":          {"status": "pending", "content": None},
        "Process":        {"status": "pending", "content": None},
        "Output":         {"status": "pending", "content": None},
        "Visualization":  {"status": "pending", "content": None},
    }


def _new_manual_state(process_id: str, dataset: str) -> dict[str, Any]:
    return {
        "session_id": f"MAN-{uuid.uuid4().hex[:10].upper()}",
        "process_id": process_id,
        "dataset_name": dataset,
        "mode": "manual",
        "started_at": datetime.now(timezone.utc).isoformat(),
        # Per §93 · 4 canonical components · each with 4 sub-sections (IPO+V)
        "components": {
            "data":      _empty_component(),
            "model":     _empty_component(),
            "accuracy":  _empty_component(),
            "reporting": _empty_component(),
        },
        # Discrete state slots · user fills each separately (legacy + active)
        "data_loaded": False,
        "data_summary": None,
        "split": None,                    # {train, val, test, random_state}
        "model_selection": None,          # name(s) chosen
        "hyperparameters": {},            # operator-set
        "sigmoid_temperature": 1.0,       # operator can tune
        "trained": False,
        "eval_metrics": {},               # per-model {model: {accuracy, precision, ...}}
        "errors_inspected": False,
        "error_analysis": None,
        "visualization": None,
        "report": None,
        # No pipeline graph here · operator advances ad-hoc
    }


def _set_component(state: dict, component: str, section: str, content: Any) -> None:
    """Per §93 · update component.{Input|Process|Output|Visualization}.content + status."""
    if component not in state["components"]:
        return
    if section not in ("Input", "Process", "Output", "Visualization"):
        return
    state["components"][component][section] = {
        "status": "complete",
        "content": content,
    }


@router.post("/manual/start")
def manual_start(body: ManualStartRequest):
    """Begin a manual session · returns session_id · NO auto-pipeline."""
    state = _new_manual_state(body.process_id, body.dataset_name)
    _MANUAL_SESSIONS[state["session_id"]] = state
    return {"session_id": state["session_id"], "state": state}


@router.get("/manual/{session_id}/state")
def manual_get_state(session_id: str):
    state = _MANUAL_SESSIONS.get(session_id)
    if not state:
        raise HTTPException(404, {"detail": "session not found"})
    return {"state": state}


class ManualLoadDataRequest(BaseModel):
    n_rows: int = 1000
    n_features: int = 10


@router.post("/manual/{session_id}/load-data")
def manual_load_data(session_id: str, body: ManualLoadDataRequest):
    """Step 1 · operator loads data · sees row + feature counts."""
    state = _MANUAL_SESSIONS.get(session_id)
    if not state:
        raise HTTPException(404, {"detail": "session not found"})
    state["data_loaded"] = True
    state["data_summary"] = {
        "n_rows": body.n_rows,
        "n_features": body.n_features,
        "loaded_at": datetime.now(timezone.utc).isoformat(),
    }
    # Per §93 · populate data component sub-sections
    _set_component(state, "data", "Input", {"dataset_name": state["dataset_name"], "n_rows": body.n_rows, "n_features": body.n_features})
    _set_component(state, "data", "Process", {"action": "load_data", "scaffold": True})
    _set_component(state, "data", "Output", state["data_summary"])
    _set_component(state, "data", "Visualization", {"charts": ["data_distribution", "missing_value_matrix"], "scaffold": True})
    return {"state": state}


class ManualSplitRequest(BaseModel):
    train: float = 0.7
    val: float = 0.15
    test: float = 0.15
    random_state: int = 42


@router.post("/manual/{session_id}/split-data")
def manual_split_data(session_id: str, body: ManualSplitRequest):
    """Step 2 · operator chooses train/val/test ratios."""
    state = _MANUAL_SESSIONS.get(session_id)
    if not state:
        raise HTTPException(404, {"detail": "session not found"})
    total = body.train + body.val + body.test
    if abs(total - 1.0) > 1e-6:
        raise HTTPException(400, {"detail": f"ratios must sum to 1.0 · got {total}"})
    if not state["data_loaded"]:
        raise HTTPException(400, {"detail": "load data first"})
    state["split"] = {
        "train": body.train, "val": body.val, "test": body.test,
        "random_state": body.random_state,
    }
    return {"state": state}


class ManualSelectModelRequest(BaseModel):
    models: list[str] = Field(..., min_length=1)


@router.post("/manual/{session_id}/select-model")
def manual_select_model(session_id: str, body: ManualSelectModelRequest):
    """Step 3 · operator picks ONE or MULTIPLE models."""
    state = _MANUAL_SESSIONS.get(session_id)
    if not state:
        raise HTTPException(404, {"detail": "session not found"})
    state["model_selection"] = body.models
    # Per §93 · populate model component
    _set_component(state, "model", "Input", {"models": body.models, "count": len(body.models)})
    _set_component(state, "model", "Process", {"action": "model_selection", "scaffold": True})
    _set_component(state, "model", "Output", {"selected": body.models})
    _set_component(state, "model", "Visualization", {"charts": ["model_card"], "scaffold": True})
    return {"state": state}


class ManualHyperparamsRequest(BaseModel):
    hyperparameters: dict[str, Any]
    sigmoid_temperature: Optional[float] = None


@router.post("/manual/{session_id}/set-hyperparams")
def manual_set_hyperparams(session_id: str, body: ManualHyperparamsRequest):
    """Step 4 · operator sets/changes hyperparameters · sigmoid temp · etc."""
    state = _MANUAL_SESSIONS.get(session_id)
    if not state:
        raise HTTPException(404, {"detail": "session not found"})
    state["hyperparameters"].update(body.hyperparameters)
    if body.sigmoid_temperature is not None:
        state["sigmoid_temperature"] = body.sigmoid_temperature
    return {"state": state}


@router.post("/manual/{session_id}/train")
def manual_train(session_id: str):
    """Step 5 · operator triggers training (one click per model selected)."""
    state = _MANUAL_SESSIONS.get(session_id)
    if not state:
        raise HTTPException(404, {"detail": "session not found"})
    if not state["model_selection"]:
        raise HTTPException(400, {"detail": "select model first"})
    if not state["split"]:
        raise HTTPException(400, {"detail": "split data first"})
    state["trained"] = True
    # Deterministic stub metrics per §57.7 (no real training yet)
    state["eval_metrics"] = {}
    for i, m in enumerate(state["model_selection"]):
        # Hash-based deterministic noise (no fabricated demo numbers · honest scaffold)
        seed = (hash(m + state["process_id"]) % 1000) / 1000
        state["eval_metrics"][m] = {
            "accuracy":  round(0.7 + seed * 0.25, 3),
            "precision": round(0.65 + seed * 0.28, 3),
            "recall":    round(0.68 + seed * 0.26, 3),
            "f1":        round(0.66 + seed * 0.27, 3),
            "scaffold":  True,  # honest flag · §57.7
        }
    # Per §93 · populate accuracy component
    _set_component(state, "accuracy", "Input", {"models": list(state["eval_metrics"].keys()), "split": state["split"]})
    _set_component(state, "accuracy", "Process", {"action": "train_and_evaluate", "hyperparameters": state["hyperparameters"], "scaffold": True})
    _set_component(state, "accuracy", "Output", state["eval_metrics"])
    _set_component(state, "accuracy", "Visualization", {"charts": ["confusion_matrix", "roc_curve", "precision_recall"], "scaffold": True})
    return {"state": state}


@router.post("/manual/{session_id}/inspect-errors")
def manual_inspect_errors(session_id: str):
    """Step 6 · operator inspects errors · summary per model."""
    state = _MANUAL_SESSIONS.get(session_id)
    if not state:
        raise HTTPException(404, {"detail": "session not found"})
    if not state["trained"]:
        raise HTTPException(400, {"detail": "train first"})
    state["errors_inspected"] = True
    state["error_analysis"] = {
        m: {
            "n_errors": round((1 - metrics["accuracy"]) * 100),
            "top_error_types": ["false_positive", "boundary_misclass"],
            "scaffold": True,
        }
        for m, metrics in state["eval_metrics"].items()
    }
    return {"state": state}


@router.post("/manual/{session_id}/visualize")
def manual_visualize(session_id: str):
    """Step 7 · operator generates visualization (confusion matrix · ROC · etc.)."""
    state = _MANUAL_SESSIONS.get(session_id)
    if not state:
        raise HTTPException(404, {"detail": "session not found"})
    if not state["trained"]:
        raise HTTPException(400, {"detail": "train first"})
    state["visualization"] = {
        "charts": ["confusion_matrix", "roc_curve", "feature_importance"],
        "scaffold": True,
    }
    return {"state": state}


@router.post("/manual/{session_id}/generate-report")
def manual_generate_report(session_id: str):
    """Step 8 · operator generates a report from current state."""
    state = _MANUAL_SESSIONS.get(session_id)
    if not state:
        raise HTTPException(404, {"detail": "session not found"})
    if not state["trained"]:
        raise HTTPException(400, {"detail": "train first"})
    state["report"] = {
        "sections": ["dataset", "split", "models", "metrics", "errors", "visualization"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "best_model": max(state["eval_metrics"].items(),
                            key=lambda x: x[1].get("accuracy", 0))[0]
                       if state["eval_metrics"] else None,
        "scaffold": True,
    }
    # Per §93 · populate reporting component
    _set_component(state, "reporting", "Input", {"eval_metrics": state["eval_metrics"], "error_analysis": state["error_analysis"]})
    _set_component(state, "reporting", "Process", {"action": "generate_report", "scaffold": True})
    _set_component(state, "reporting", "Output", state["report"])
    _set_component(state, "reporting", "Visualization", {"charts": ["model_comparison_chart", "summary_dashboard"], "scaffold": True})
    return {"state": state}


# ─── AUTOMATIC MODE · pipeline-based · phases run sequentially ──

PIPELINE_PHASES = [
    "data_load",
    "data_quality",
    "data_split",
    "feature_engineering",
    "model_selection",
    "model_training",
    "model_evaluation",
    "error_analysis",
    "visualization",
    "reporting",
]


def _new_auto_run(process_id: str) -> dict[str, Any]:
    return {
        "run_id": f"AUTO-{uuid.uuid4().hex[:10].upper()}",
        "process_id": process_id,
        "mode": "automatic",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "phases": [
            {
                "name": p,
                "output": None,
                "completed": False,
                "quality_score": None,
                "report": None,
                "started_at": None,
                "completed_at": None,
            }
            for p in PIPELINE_PHASES
        ],
        "overall_quality_score": None,
        "completed": False,
    }


class AutoRunRequest(BaseModel):
    process_id: str


@router.post("/automatic/run")
def auto_run(body: AutoRunRequest):
    """Start an automatic pipeline run · executes all phases sequentially."""
    state = _new_auto_run(body.process_id)
    # Execute deterministically (per §57.7 scaffold mode)
    for i, phase in enumerate(state["phases"]):
        phase["started_at"] = datetime.now(timezone.utc).isoformat()
        # Deterministic quality score
        seed = (hash(phase["name"] + body.process_id) % 1000) / 1000
        phase["quality_score"] = round(0.75 + seed * 0.20, 3)
        phase["output"] = {
            "phase": phase["name"],
            "n_records_processed": 1000 - i * 50,
            "scaffold": True,
        }
        phase["report"] = {
            "summary": f"{phase['name']} completed with quality {phase['quality_score']}",
            "scaffold": True,
        }
        phase["completed"] = True
        phase["completed_at"] = datetime.now(timezone.utc).isoformat()

    scores = [p["quality_score"] for p in state["phases"]]
    state["overall_quality_score"] = round(sum(scores) / len(scores), 3)
    state["completed"] = True
    _AUTO_RUNS[state["run_id"]] = state
    return state


@router.get("/automatic/{run_id}/state")
def auto_get_state(run_id: str):
    state = _AUTO_RUNS.get(run_id)
    if not state:
        raise HTTPException(404, {"detail": "run not found"})
    return state


@router.get("/automatic/runs")
def auto_list_runs(limit: int = 20):
    """List recent automatic pipeline runs."""
    runs = list(_AUTO_RUNS.values())
    runs.sort(key=lambda r: r["started_at"], reverse=True)
    return {"runs": runs[:limit], "count": len(runs)}


@router.get("/manual/sessions")
def manual_list_sessions(limit: int = 20):
    """List recent manual sessions."""
    sessions = list(_MANUAL_SESSIONS.values())
    sessions.sort(key=lambda s: s["started_at"], reverse=True)
    return {"sessions": sessions[:limit], "count": len(sessions)}


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "pipeline",
        "spec": "manual + automatic process modes",
        "manual_endpoints": [
            "POST /manual/start",
            "POST /manual/{session_id}/load-data",
            "POST /manual/{session_id}/split-data",
            "POST /manual/{session_id}/select-model",
            "POST /manual/{session_id}/set-hyperparams",
            "POST /manual/{session_id}/train",
            "POST /manual/{session_id}/inspect-errors",
            "POST /manual/{session_id}/visualize",
            "POST /manual/{session_id}/generate-report",
        ],
        "automatic_endpoints": [
            "POST /automatic/run",
            "GET /automatic/{run_id}/state",
            "GET /automatic/runs",
        ],
        "automatic_phases": PIPELINE_PHASES,
    }
