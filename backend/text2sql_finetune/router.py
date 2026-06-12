"""/api/v1/text2sql/* + /api/v1/finetune/* · §141."""
from __future__ import annotations
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1", tags=["text2sql", "finetune"])

R = Path("/mnt/deepa/insur_project")
DEEPA_MODELS = Path("/mnt/deepa/models")


def stamp() -> dict:
    return {"ts_utc": datetime.utcnow().isoformat() + "Z",
            "ts_local": datetime.now().isoformat(),
            "tz": os.environ.get("TZ", "America/Edmonton"),
            "spec": "§141"}


# ───── TEXT2SQL ─────
class T2SBody(BaseModel):
    question: str
    model: str = "llama3.2:1b"


@router.post("/text2sql/run")
def text2sql_run(body: T2SBody):
    """Run text2sql query against live Postgres."""
    sys.path.insert(0, str(R / "scripts/text2sql"))
    from text2sql_runner import run
    out = run(body.question, body.model)
    return {**stamp(), **out}


@router.get("/text2sql/demos")
def text2sql_demos():
    demos_path = R / "data/text2sql/demo_runs.json"
    if not demos_path.exists():
        raise HTTPException(404, "Run scripts/text2sql/text2sql_runner.py first")
    return {**stamp(), "demos": json.loads(demos_path.read_text())}


@router.get("/text2sql/schema")
def text2sql_schema():
    sys.path.insert(0, str(R / "scripts/text2sql"))
    from text2sql_runner import schema_summary
    return {**stamp(), "schema": schema_summary()}


# ───── FINETUNE ─────
@router.get("/finetune/scenarios")
def finetune_scenarios():
    """List all 7 finetune scenarios + state per."""
    base = R / "data/finetune"
    scenarios = {}
    for f in sorted(base.glob("*.json")):
        scenarios[f.stem] = json.loads(f.read_text())
    return {**stamp(), "n_scenarios": len(scenarios),
            "scenarios": scenarios,
            "real_runs": [k for k, v in scenarios.items()
                          if not v.get("honest_scaffold")],
            "scaffolds": [k for k, v in scenarios.items()
                          if v.get("honest_scaffold")]}


@router.get("/finetune/lora-status")
def finetune_lora_status():
    p = R / "data/finetune/lora_metrics.json"
    if not p.exists():
        return {**stamp(), "trained": False,
                "note": "Run scripts/finetune/lora_demo.py first"}
    return {**stamp(), "trained": True, "metrics": json.loads(p.read_text())}


# ───── SLM library on deepa ─────
@router.get("/slm/library")
def slm_library():
    """List SLM models · CPU-friendly · on deepa drive."""
    out = {**stamp(), "deepa_root": str(DEEPA_MODELS),
            "subdirs": {}}
    if not DEEPA_MODELS.exists():
        out["error"] = "DEEPA_MODELS dir missing"
        return out
    for sub in ["slm", "code", "vision", "reasoning", "finetuned", "datasets"]:
        p = DEEPA_MODELS / sub
        if p.exists():
            items = []
            for d in p.iterdir():
                if d.is_dir():
                    n_files = sum(1 for _ in d.rglob("*") if _.is_file())
                    items.append({"name": d.name, "n_files": n_files})
            out["subdirs"][sub] = items
        else:
            out["subdirs"][sub] = []
    return out


# ───── Image denoise ─────
@router.get("/image-clean/log")
def image_clean_log():
    p = R / "data/image_clean/log.json"
    if not p.exists():
        raise HTTPException(404)
    return {**stamp(), **json.loads(p.read_text())}


# ───── Time series scenarios ─────
@router.get("/time-series/scenarios")
def time_series_scenarios():
    p = R / "data/time_series/scenarios.md"
    return {**stamp(), "scenarios_md": p.read_text() if p.exists() else "(missing)"}


# ───── §122 score-card for §141 surface ─────
@router.get("/141/score-card")
def score_card():
    dims = {
        "text2sql_demo_runs":        1.0 if (R / "data/text2sql/demo_runs.json").exists() else 0.0,
        "finetune_lora_real":        1.0 if (R / "data/finetune/lora_metrics.json").exists() else 0.0,
        "finetune_qlora_scaffold":   0.5 if (R / "data/finetune/qlora_scaffold.json").exists() else 0.0,
        "finetune_full_scaffold":    0.5 if (R / "data/finetune/full_scaffold.json").exists() else 0.0,
        "finetune_ppo_scaffold":     0.5 if (R / "data/finetune/ppo_scaffold.json").exists() else 0.0,
        "finetune_dpo_scaffold":     0.5 if (R / "data/finetune/dpo_scaffold.json").exists() else 0.0,
        "finetune_distillation":     0.5 if (R / "data/finetune/distillation_scaffold.json").exists() else 0.0,
        "slm_on_deepa":              1.0 if DEEPA_MODELS.exists() else 0.0,
        "image_denoise":             1.0 if (R / "data/image_clean/log.json").exists() else 0.0,
        "time_series_catalog":       1.0 if (R / "data/time_series/scenarios.md").exists() else 0.0,
    }
    score = round(sum(dims.values()) / len(dims), 4)
    band = ("TOP_1_PCT" if score >= 0.92 else
            "TOP_5_PCT" if score >= 0.82 else
            "TOP_25_PCT" if score >= 0.70 else "MID")
    return {**stamp(), "dims": dims, "score": score, "band": band}
