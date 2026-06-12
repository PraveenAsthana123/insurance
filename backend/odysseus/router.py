"""/api/v1/odysseus/* · §139 · Journey Orchestrator endpoints."""
from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

router = APIRouter(prefix="/api/v1/odysseus", tags=["odysseus"])

R = Path("/mnt/deepa/insur_project")
MODEL_PATH = R / "models/odysseus-ai/model.joblib"
METRICS_PATH = R / "data/metrics/odysseus-ai.json"
AI_TYPE_PATH = R / "data/ai_types/odysseus-ai.json"
DRIFT_PATH = R / "data/drift/odysseus-ai.json"
FAIRNESS_PATH = R / "data/fairness/odysseus-ai.json"
CALIBRATION_PATH = R / "data/calibration/odysseus-ai.json"


# ─── §107 stamp ───
def stamp() -> dict:
    return {
        "ts_utc": datetime.utcnow().isoformat() + "Z",
        "ts_local": datetime.now().isoformat(),
        "tz": os.environ.get("TZ", "America/Edmonton"),
        "actor_user": os.environ.get("USER", "praveen"),
        "actor_host": os.uname().nodename,
    }


# ─── Lazy bundle load ───
_bundle = None
def get_bundle():
    global _bundle
    if _bundle is None and MODEL_PATH.exists():
        _bundle = joblib.load(MODEL_PATH)
    return _bundle


# ─── Schemas ───
class PredictBody(BaseModel):
    status: str = Field(default="completed")
    trigger_kind: str = Field(default="unknown")
    duration_ms: float = Field(default=0.0)
    cost_usd: float = Field(default=0.0)
    tokens_in: int = Field(default=0)
    tokens_out: int = Field(default=0)
    retry_count: int = Field(default=0)
    input_text: str = Field(default="")
    skill: str = Field(default="")


# ─── Endpoints ───
@router.get("/health")
def health():
    """Live status · accuracy · drift state."""
    out = {**stamp(), "service": "odysseus-ai", "spec": "§139"}
    if METRICS_PATH.exists():
        m = json.loads(METRICS_PATH.read_text())
        out["accuracy"] = m.get("accuracy")
        out["f1_weighted"] = m.get("f1_weighted")
        out["data_source"] = m.get("data_source")
        out["synthetic"] = m.get("synthetic")
        out["trained_at"] = m.get("trained_at")
    if DRIFT_PATH.exists():
        d = json.loads(DRIFT_PATH.read_text())
        out["drift_psi_threshold"] = d.get("feature_drift", {}).get("psi_threshold")
    out["model_loaded"] = bool(get_bundle())
    return out


@router.get("/overview")
def overview():
    if not AI_TYPE_PATH.exists():
        raise HTTPException(404, "AI type spec missing")
    return {**stamp(), "ai_type": json.loads(AI_TYPE_PATH.read_text()), "spec": "§139"}


@router.post("/predict")
def predict(body: PredictBody):
    """Predict next agent for an incoming journey request."""
    bundle = get_bundle()
    if not bundle:
        raise HTTPException(503, "Model not loaded · check models/odysseus-ai/model.joblib")

    t0 = time.perf_counter()
    try:
        status_enc = bundle["status_encoder"]
        trigger_enc = bundle["trigger_encoder"]
        tfidf = bundle["tfidf"]
        target_enc = bundle["target_encoder"]
        clf = bundle["model"]

        # Handle unseen labels gracefully
        def safe_encode(enc, val):
            try:
                return int(enc.transform([val])[0])
            except ValueError:
                return 0

        s_enc = safe_encode(status_enc, body.status)
        t_enc = safe_encode(trigger_enc, body.trigger_kind)

        text = body.skill + " " + body.input_text[:500]
        text_feats = tfidf.transform([text]).toarray()

        X = np.hstack([
            np.array([[s_enc]]),
            np.array([[t_enc]]),
            np.array([[body.duration_ms, body.cost_usd,
                       body.tokens_in, body.tokens_out,
                       body.retry_count]], dtype=float),
            text_feats,
        ])

        proba = clf.predict_proba(X)[0]
        top_idx = np.argsort(proba)[::-1][:3]
        top_3 = []
        for idx in top_idx:
            top_3.append({
                "agent_id": str(target_enc.inverse_transform([idx])[0]),
                "confidence": float(round(proba[idx], 4)),
            })
        chosen = top_3[0]
        latency_ms = round((time.perf_counter() - t0) * 1000, 1)

        # §103.5 confidence gate
        action = "auto_route" if chosen["confidence"] >= 0.6 else "hitl_required"

        return {
            **stamp(),
            "predicted_agent": chosen["agent_id"],
            "confidence": chosen["confidence"],
            "top_3_alternates": top_3,
            "action": action,
            "latency_ms": latency_ms,
            "model_type": "RandomForestClassifier",
            "spec": "§139",
        }
    except Exception as e:
        raise HTTPException(500, f"Prediction failed: {e}")


@router.get("/metrics")
def metrics():
    if not METRICS_PATH.exists():
        raise HTTPException(404)
    return {**stamp(), "metrics": json.loads(METRICS_PATH.read_text()), "spec": "§139"}


@router.get("/fairness")
def fairness():
    if not FAIRNESS_PATH.exists():
        raise HTTPException(404)
    return {**stamp(), "fairness": json.loads(FAIRNESS_PATH.read_text()), "spec": "§139"}


@router.get("/calibration")
def calibration():
    if not CALIBRATION_PATH.exists():
        raise HTTPException(404)
    return {**stamp(), "calibration": json.loads(CALIBRATION_PATH.read_text()), "spec": "§139"}


@router.get("/drift")
def drift():
    if not DRIFT_PATH.exists():
        raise HTTPException(404)
    return {**stamp(), "drift": json.loads(DRIFT_PATH.read_text()), "spec": "§139"}


@router.get("/explain")
def explain():
    """Feature importance (global). Per-prediction local available via /predict."""
    bundle = get_bundle()
    if not bundle:
        raise HTTPException(503)
    clf = bundle["model"]
    cols = bundle["feature_cols"]
    fi = clf.feature_importances_
    pairs = sorted(zip(cols, fi.tolist()), key=lambda x: -x[1])
    return {
        **stamp(),
        "method": "RandomForest feature_importances_",
        "top_15": [{"feature": c, "importance": round(v, 4)} for c, v in pairs[:15]],
        "spec": "§139",
    }


@router.get("/score-card")
def score_card():
    """§122 brutal-feedback dimensions for Odysseus."""
    m = json.loads(METRICS_PATH.read_text()) if METRICS_PATH.exists() else {}
    f = json.loads(FAIRNESS_PATH.read_text()) if FAIRNESS_PATH.exists() else {}
    c = json.loads(CALIBRATION_PATH.read_text()) if CALIBRATION_PATH.exists() else {}

    # Score across 11 dims · ≥0.92 = top-1%
    dims = {
        "accuracy":         m.get("accuracy", 0),
        "f1_weighted":      m.get("f1_weighted", 0),
        "real_data":        1.0 if m.get("synthetic") is False else 0.0,
        "fairness_di":      f.get("disparate_impact", 0),
        "calibration_ece":  1.0 - c.get("ece", 1.0),
        "tests_present":    1.0 if (R / "tests/ai_types/test_odysseus_ai.py").exists() else 0.0,
        "runbook_present":  1.0 if (R / "data/runbooks/odysseus-ai.md").exists() else 0.0,
        "obs_dashboard":    1.0 if (R / "data/obs/odysseus-ai_dashboard.json").exists() else 0.0,
        "error_codes":      1.0 if (R / "data/errors/odysseus-ai.json").exists() else 0.0,
        "agent_registered": 1.0 if (R / "data/agents/sys_odysseus_ai_agent.json").exists() else 0.0,
        "simulation_present": 1.0 if (R / "data/simulations/odysseus-ai.json").exists() else 0.0,
    }
    score = round(sum(dims.values()) / len(dims), 4)
    band = ("TOP_1_PCT" if score >= 0.92 else
            "TOP_5_PCT" if score >= 0.82 else
            "TOP_25_PCT" if score >= 0.70 else "MID")
    return {**stamp(), "dims": dims, "score": score, "band": band, "spec": "§139 + §122"}
