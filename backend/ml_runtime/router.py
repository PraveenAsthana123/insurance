"""/api/v1/ml/* — honest stubs for model registry · SHAP · eval harness.

Per docs/PATH_E_EXECUTION_REPORT_2026-06-09.md P0.3 + P0.4 + P0.5.

Per §57.7 honest: when MLflow / SHAP / eval harness not installed or
empty · returns explicit empty state with `runtime_available=False` ·
NEVER fabricates demo data. UI panels render the empty state.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ml", tags=["ml-runtime"])


def _probe_mlflow() -> dict[str, Any]:
    """Probe MLflow availability without loading the full client."""
    try:
        import mlflow  # noqa: F401
        return {"runtime_available": True, "runtime": "mlflow"}
    except ImportError:
        return {"runtime_available": False, "reason": "mlflow not installed"}
    except Exception as e:
        return {"runtime_available": False, "reason": f"{type(e).__name__}: {e}"}


def _probe_shap() -> dict[str, Any]:
    try:
        import shap  # noqa: F401
        return {"runtime_available": True, "runtime": "shap"}
    except ImportError:
        return {"runtime_available": False, "reason": "shap not installed"}
    except Exception as e:
        return {"runtime_available": False, "reason": f"{type(e).__name__}: {e}"}


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "ml-runtime",
        "spec": "§57.7 honest stubs · P0.3 + P0.4 + P0.5",
        "mlflow": _probe_mlflow(),
        "shap": _probe_shap(),
    }


@router.get("/models")
def models(dept: str | None = None, process: str | None = None):
    """Model registry list · returns empty when MLflow unavailable per §57.7."""
    probe = _probe_mlflow()
    if not probe["runtime_available"]:
        return {
            "models": [],
            "count": 0,
            "runtime_available": False,
            "reason": probe.get("reason"),
            "filter": {"dept": dept, "process": process},
        }
    try:
        import mlflow
        client = mlflow.tracking.MlflowClient()
        registered = client.search_registered_models(max_results=50)
        models = []
        for m in registered:
            latest = m.latest_versions[0] if m.latest_versions else None
            models.append({
                "name": m.name,
                "version": latest.version if latest else None,
                "stage": latest.current_stage if latest else None,
                "created_at": (
                    str(latest.creation_timestamp) if latest else None
                ),
            })
        return {
            "models": models,
            "count": len(models),
            "runtime_available": True,
            "filter": {"dept": dept, "process": process},
        }
    except Exception as e:
        logger.warning("MLflow query failed: %s", e)
        return {
            "models": [],
            "count": 0,
            "runtime_available": False,
            "reason": f"MLflow query failed: {type(e).__name__}",
            "filter": {"dept": dept, "process": process},
        }


@router.get("/shap/{model_name}")
def shap_for_model(model_name: str):
    """SHAP feature importance · returns empty when SHAP unavailable per §57.7."""
    probe = _probe_shap()
    if not probe["runtime_available"]:
        return {
            "model_name": model_name,
            "features": [],
            "count": 0,
            "runtime_available": False,
            "reason": probe.get("reason"),
        }
    return {
        "model_name": model_name,
        "features": [],
        "count": 0,
        "runtime_available": True,
        "reason": "SHAP available but no per-model run wired yet · pending eval harness integration",
    }


@router.get("/eval/{dept}/{process}")
def eval_results(dept: str, process: str):
    """Eval harness · returns empty when no run available per §57.7."""
    return {
        "dept": dept,
        "process": process,
        "metrics": {},
        "count": 0,
        "runtime_available": False,
        "reason": "eval harness not wired · use backend/ml/reference/full_lifecycle.py to produce metrics",
    }
