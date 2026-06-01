"""§68.11 Multi-model comparison — "which model wins?"

Joins functional + cost + safety logs for the requested (model_id,
eval_set) tuples and returns a side-by-side scorecard. Persists the
comparison_id + scorecard to data/agent-supervisor/model_compare/
<comparison_id>/manifest.json so the operator can re-read.

Composes with §68.8 (functional eval source-of-truth) + §68.9 (cost
eval) + §68.10 (safety eval) — this surface is the **join**, not a
new source. Adding §68.11 doesn't introduce any new JSONL log; it
reuses the three existing ones.

Per §57.7: if any source log is missing/unreadable, the matching
sub-scorecard surfaces as `found_in: []` and the comparison still
completes — partial data beats no data.

Composes with §38.3 audit + §47.6 (PII never in row — only hashes)
+ §64.43 #7 (federation).
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
import uuid
from collections import Counter
from pathlib import Path
from typing import Any

from services import cost_eval_service as cost_svc
from services import functional_eval_service as func_svc
from services import safety_eval_service as safety_svc

logger = logging.getLogger(__name__)

_REPO_ROOT = Path(__file__).resolve().parents[2]

_MODEL_ID_RE = re.compile(r"^[A-Za-z0-9._:/-]+$")
_EVAL_SET_RE = re.compile(r"^[A-Za-z0-9._:-]+$")
_COMPARISON_ID_RE = re.compile(r"^cmp-[A-Za-z0-9_-]+$")

# Hard caps to prevent runaway requests.
_MAX_MODELS_PER_COMPARISON = 8


def _manifest_dir() -> Path:
    env = os.environ.get("HOLY_MODEL_COMPARE_DIR")
    if env:
        return Path(env)
    return _REPO_ROOT / "data" / "agent-supervisor" / "model_compare"


def _safety_verdict_rank() -> dict[str, int]:
    """Lower rank = better verdict."""
    return {"safe": 0, "review": 1, "unknown": 2, "unsafe": 3}


def _latest_functional_for(model_id: str, eval_set: str | None) -> dict[str, Any] | None:
    """Find the most-recent functional eval row for (model_id, eval_set)."""
    result = func_svc.model_history(model_id, dataset=eval_set, limit=1)
    if not result or not isinstance(result, dict):
        return None
    runs = result.get("runs", [])
    return runs[0] if runs else None


def _cost_for(model_id: str, tenant_id: str | None) -> dict[str, Any] | None:
    """Aggregate cost across all-time for (model_id, tenant_id)."""
    if tenant_id:
        per_tenant = cost_svc.per_tenant_breakdown(tenant_id)
        if per_tenant and isinstance(per_tenant, dict):
            pm = per_tenant.get("per_model", {})
            return pm.get(model_id)
    # No tenant filter — pull from /by-model ranking
    ranking = cost_svc.by_model_ranking().get("ranking", [])
    return next((r for r in ranking if r["model_id"] == model_id), None)


def _latest_safety_for(model_id: str) -> dict[str, Any] | None:
    """Find the most-recent safety eval row + verdict for model_id."""
    result = safety_svc.per_model_history(model_id, limit=1)
    if not result or not isinstance(result, dict):
        return None
    runs = result.get("runs", [])
    if not runs:
        return None
    row = runs[0]
    verdict_summary = row.get("verdict_summary", {})
    return {
        "verdict": verdict_summary.get("verdict"),
        "fairness_gate": verdict_summary.get("fairness_gate"),
        "hallucination_rate": row.get("hallucination_rate"),
        "toxicity_score": row.get("toxicity_score"),
        "bias_score": row.get("bias_score"),
        "disparate_impact": row.get("disparate_impact"),
        "equal_opportunity_gap": row.get("equal_opportunity_gap"),
        "ts": row.get("ts"),
        "run_id": row.get("run_id"),
    }


def _build_scorecard(
    models: list[str],
    eval_set: str | None,
    tenant_id: str | None,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Build the per-model scorecard rows + winner block."""
    scorecard: list[dict[str, Any]] = []
    for model_id in models:
        functional = _latest_functional_for(model_id, eval_set)
        cost = _cost_for(model_id, tenant_id)
        safety = _latest_safety_for(model_id)

        found_in = []
        if functional:
            found_in.append("functional")
        if cost:
            found_in.append("cost")
        if safety:
            found_in.append("safety")

        # Functional headline metrics
        functional_summary = None
        if functional:
            functional_summary = {
                "accuracy": functional.get("accuracy"),
                "f1": functional.get("f1"),
                "auc": functional.get("auc"),
                "latency_p95_ms": functional.get("latency_p95_ms"),
                "n_examples": functional.get("n_examples"),
                "ts": functional.get("ts"),
                "run_id": functional.get("run_id"),
            }

        scorecard.append({
            "model_id": model_id,
            "functional": functional_summary,
            "cost": cost,
            "safety": safety,
            "found_in": found_in,
        })

    # Winner determination — per-axis, against rows that have data.
    winners: dict[str, str | None] = {}

    def _winner_max(key: str, getter) -> str | None:
        rows = [(r["model_id"], getter(r)) for r in scorecard]
        rows = [(m, v) for m, v in rows if isinstance(v, (int, float))]
        if not rows:
            return None
        return max(rows, key=lambda x: x[1])[0]

    def _winner_min(key: str, getter) -> str | None:
        rows = [(r["model_id"], getter(r)) for r in scorecard]
        rows = [(m, v) for m, v in rows if isinstance(v, (int, float))]
        if not rows:
            return None
        return min(rows, key=lambda x: x[1])[0]

    winners["by_accuracy"] = _winner_max(
        "by_accuracy",
        lambda r: (r.get("functional") or {}).get("accuracy"),
    )
    winners["by_latency_p95"] = _winner_min(
        "by_latency_p95",
        lambda r: (r.get("functional") or {}).get("latency_p95_ms"),
    )
    winners["by_total_cost"] = _winner_min(
        "by_total_cost",
        lambda r: (r.get("cost") or {}).get("total_cost_usd"),
    )
    winners["by_hallucination_rate"] = _winner_min(
        "by_hallucination_rate",
        lambda r: (r.get("safety") or {}).get("hallucination_rate"),
    )

    # Safety verdict winner: lowest rank (best verdict) wins
    rank = _safety_verdict_rank()
    safety_rows = [(r["model_id"], (r.get("safety") or {}).get("verdict")) for r in scorecard]
    safety_rows = [(m, v) for m, v in safety_rows if v in rank]
    if safety_rows:
        winners["by_safety_verdict"] = min(safety_rows, key=lambda x: rank[x[1]])[0]
    else:
        winners["by_safety_verdict"] = None

    return scorecard, winners


def _persist_manifest(manifest: dict[str, Any]) -> Path | None:
    """Write the manifest to data/agent-supervisor/model_compare/<id>/manifest.json.
    Best-effort per §57.7."""
    try:
        dest_dir = _manifest_dir() / manifest["comparison_id"]
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / "manifest.json"
        dest.write_text(json.dumps(manifest, indent=2))
        return dest
    except OSError as exc:
        logger.warning("model_compare: failed to persist manifest (%s)",
                       type(exc).__name__)
        return None


def run_comparison(
    models: list[str],
    *,
    eval_set: str | None = None,
    tenant_id: str | None = None,
    metrics: list[str] | None = None,
    requested_by: str = "unknown",
    request_id: str = "",
) -> dict[str, Any]:
    """Execute a comparison. Returns the manifest + comparison_id."""
    # Validation — all errors collected before execution
    errors: list[str] = []

    if not isinstance(models, list) or not models:
        errors.append("models must be a non-empty list")
    elif len(models) > _MAX_MODELS_PER_COMPARISON:
        errors.append(
            f"too many models: {len(models)} > {_MAX_MODELS_PER_COMPARISON}",
        )
    else:
        for m in models:
            if not isinstance(m, str) or not _MODEL_ID_RE.match(m):
                errors.append(f"invalid model_id: {m!r}")

    if eval_set is not None and not _EVAL_SET_RE.match(eval_set):
        errors.append(f"invalid eval_set: {eval_set!r}")

    if errors:
        return {
            "status": "validation_error",
            "errors": errors,
        }

    comparison_id = f"cmp-{int(time.time())}-{uuid.uuid4().hex[:8]}"
    scorecard, winners = _build_scorecard(models, eval_set, tenant_id)

    manifest = {
        "policy": "§68.11 Multi-model comparison",
        "comparison_id": comparison_id,
        "ts": time.time(),
        "requested_by": requested_by,
        "request_id": request_id,
        "tenant_id": tenant_id or "default",
        "eval_set": eval_set,
        "metrics_requested": metrics or [
            "accuracy", "latency_p95_ms", "total_cost_usd",
            "hallucination_rate", "safety_verdict",
        ],
        "n_models": len(models),
        "models": models,
        "scorecard": scorecard,
        "winners": winners,
    }

    persisted = _persist_manifest(manifest)
    manifest["persisted_path"] = str(persisted) if persisted else None
    manifest["status"] = "executed"
    return manifest


def get_comparison(comparison_id: str) -> dict[str, Any] | None:
    """Read back a persisted comparison manifest."""
    if not _COMPARISON_ID_RE.match(comparison_id):
        return {"status": "invalid_comparison_id"}
    p = _manifest_dir() / comparison_id / "manifest.json"
    if not p.exists():
        return None
    try:
        return {"status": "found", "manifest": json.loads(p.read_text()),
                "persisted_path": str(p), "scanned_at": time.time()}
    except (json.JSONDecodeError, OSError) as exc:
        return {"status": "unreadable", "error_type": type(exc).__name__}


def list_history(limit: int = 50) -> dict[str, Any]:
    """List recent comparisons (newest-first by directory mtime)."""
    base = _manifest_dir()
    if not base.exists():
        return {"n_comparisons": 0, "history": [],
                "manifest_dir": str(base), "scanned_at": time.time()}
    history: list[dict[str, Any]] = []
    try:
        dirs = sorted(
            (d for d in base.iterdir() if d.is_dir()
             and _COMPARISON_ID_RE.match(d.name)),
            key=lambda d: d.stat().st_mtime, reverse=True,
        )[:limit]
        for d in dirs:
            mp = d / "manifest.json"
            if not mp.exists():
                continue
            try:
                m = json.loads(mp.read_text())
                history.append({
                    "comparison_id": m.get("comparison_id"),
                    "ts": m.get("ts"),
                    "eval_set": m.get("eval_set"),
                    "n_models": m.get("n_models"),
                    "models": m.get("models", []),
                    "winners": m.get("winners", {}),
                })
            except (json.JSONDecodeError, OSError):
                continue
    except OSError as exc:
        return {"status": "unreadable", "error_type": type(exc).__name__,
                "history": []}
    return {
        "n_comparisons": len(history),
        "history": history,
        "manifest_dir": str(base),
        "scanned_at": time.time(),
    }
