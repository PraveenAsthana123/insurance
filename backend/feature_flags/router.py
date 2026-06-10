"""/api/v1/feature-flags/* · Iter 28 · K4 · simple feature flag store."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.role_dependency import require_admin

router = APIRouter(prefix="/api/v1/feature-flags", tags=["feature-flags"])

FLAGS_PATH = Path(os.environ.get("INSUR_FLAGS_PATH", "data/feature_flags.json"))
FLAGS_PATH.parent.mkdir(parents=True, exist_ok=True)


# Default flags · operator can override via POST or by editing the file.
_DEFAULTS = {
    "ui.dark_mode_default":          {"enabled": False, "rollout_pct": 0,   "description": "Default theme is dark"},
    "ui.cmdk_facets_enabled":        {"enabled": True,  "rollout_pct": 100, "description": "Cmd-K shows facet chips"},
    "alerts.sse_enabled":            {"enabled": True,  "rollout_pct": 100, "description": "Server-Sent Events for alerts (vs polling)"},
    "hitl.bulk_actions_enabled":     {"enabled": True,  "rollout_pct": 100, "description": "HITL bulk approve/reject"},
    "data_pipeline.run_button_async": {"enabled": False, "rollout_pct": 0,   "description": "Async run mode for data pipeline tasks"},
    "vuln_scanner.daily_cron":       {"enabled": True,  "rollout_pct": 100, "description": "Daily pip-audit cron"},
    "etag.enabled":                  {"enabled": True,  "rollout_pct": 100, "description": "ETag middleware on GET (Iter 27)"},
    "pii.redact_on_audit_write":     {"enabled": False, "rollout_pct": 0,   "description": "Auto-redact PII before audit row write"},
    "compare_runs.enabled":          {"enabled": True,  "rollout_pct": 100, "description": "Side-by-side compare in AutomaticPipelinePanel"},
    "feedback.optimistic_ui":        {"enabled": True,  "rollout_pct": 100, "description": "Optimistic HITL feedback (Iter 24)"},
}


def _load() -> dict[str, dict]:
    if FLAGS_PATH.exists():
        try:
            return json.loads(FLAGS_PATH.read_text())
        except Exception:
            pass
    return dict(_DEFAULTS)


def _save(flags: dict[str, dict]) -> None:
    FLAGS_PATH.write_text(json.dumps(flags, indent=2))


class FlagUpdate(BaseModel):
    enabled: bool | None = None
    rollout_pct: int | None = None
    description: str | None = None


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "feature-flags",
        "spec": "K4 · simple file-backed flag store · Iter 28",
        "store_path": str(FLAGS_PATH),
    }


@router.get("")
def list_flags():
    return {"flags": _load()}


@router.get("/{key}")
def get_flag(key: str):
    flags = _load()
    if key not in flags:
        raise HTTPException(404, {"detail": f"flag not found: {key}",
                                   "error_code": "FLAG_404"})
    return flags[key]


@router.put("/{key}", dependencies=[Depends(require_admin)])
def update_flag(key: str, body: FlagUpdate):
    flags = _load()
    cur = flags.get(key, {"enabled": False, "rollout_pct": 0, "description": ""})
    if body.enabled is not None: cur["enabled"] = body.enabled
    if body.rollout_pct is not None:
        if body.rollout_pct < 0 or body.rollout_pct > 100:
            raise HTTPException(400, {"detail": "rollout_pct must be 0-100",
                                       "error_code": "BAD_PCT"})
        cur["rollout_pct"] = body.rollout_pct
    if body.description is not None: cur["description"] = body.description
    flags[key] = cur
    _save(flags)
    return cur


@router.get("/check/{key}")
def check_flag(key: str):
    """Public check · returns just {enabled, rollout_pct} · safe for UI."""
    flags = _load()
    f = flags.get(key, {"enabled": False, "rollout_pct": 0})
    return {"key": key, "enabled": f["enabled"], "rollout_pct": f.get("rollout_pct", 0)}
