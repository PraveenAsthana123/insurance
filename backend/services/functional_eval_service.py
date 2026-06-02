"""§68.8 Functional eval — "does the model still work?"

Read-only aggregation over data/agent-supervisor/functional_eval_runs.jsonl
(env-overridable via INSUR_EVAL_FUNCTIONAL_LOG). Each row is one eval run:

  ts, run_id, model_id, model_version, dataset, dept, tenant_id,
  accuracy, f1, auc, precision, recall, n_examples, latency_p95_ms,
  drift_score, ground_truth_hash, eval_set_hash

PII never appears — only hashes for dataset + ground truth.

The WRITE side (MLflow integration / scheduled eval job that appends a
row per run) is a separate iteration. This commit ships the READ
surface so operators can answer "which model wins on rag_qa_v1?"
"what's the accuracy trend for kivi:local?" the moment any eval job
starts writing rows.

Per §57.7: missing log → empty envelope. Per §48 explainability:
every row carries enough metadata (model_version + eval_set_hash +
ground_truth_hash) to reproduce the eval that produced the number.

Composes with §38.3 (audit on read) + §47.6 (read-only at boundary) +
§57.7 (graceful degradation) + §64.20 (per-dept ML lifecycle —
functional eval surface IS the per-pipeline scorecard) + §68
(Observability Hub iter 4).
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_LOG_CANDIDATES = [
    Path(__file__).resolve().parents[2] / "data" / "agent-supervisor" / "functional_eval_runs.jsonl",
    Path("/app/data/agent-supervisor/functional_eval_runs.jsonl"),
    Path("/data/agent-supervisor/functional_eval_runs.jsonl"),
]

# Metric names we expose first-class. Other fields pass through but
# don't get aggregated under these canonical keys.
_KNOWN_METRICS = ("accuracy", "f1", "auc", "precision", "recall",
                  "mae", "rmse", "ndcg", "map", "drift_score",
                  "latency_p95_ms")

_MODEL_ID_RE = re.compile(r"^[A-Za-z0-9._:/-]+$")
_RUN_ID_RE = re.compile(r"^[A-Za-z0-9._:-]+$")


def _log_path() -> Path | None:
    env = os.environ.get("INSUR_EVAL_FUNCTIONAL_LOG")
    if env:
        p = Path(env)
        if p.exists():
            return p
        return p  # honor override even when missing — first write creates it
    for p in _LOG_CANDIDATES:
        if p.exists():
            return p
    return _LOG_CANDIDATES[0]


def _read_rows(since_epoch: float = 0.0, max_rows: int = 10_000) -> list[dict[str, Any]]:
    """Read JSONL rows. Missing file / corrupt lines → graceful (§57.7)."""
    p = _log_path()
    if p is None or not p.exists():
        return []
    rows: list[dict[str, Any]] = []
    try:
        for line in p.read_text(errors="replace").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(row, dict):
                continue
            if since_epoch and row.get("ts", 0) < since_epoch:
                continue
            rows.append(row)
    except OSError as exc:
        logger.info("functional_eval: log unreadable (%s)", type(exc).__name__)
        return []
    return rows


def _latest_per_model(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return one latest-ts row per model_id."""
    by_model: dict[str, dict[str, Any]] = {}
    for row in rows:
        mid = str(row.get("model_id", ""))
        if not mid:
            continue
        if mid not in by_model or row.get("ts", 0) > by_model[mid].get("ts", 0):
            by_model[mid] = row
    return list(by_model.values())


def global_summary(since_epoch: float = 0.0) -> dict[str, Any]:
    """Cross-model leaderboard + dataset coverage."""
    rows = _read_rows(since_epoch=since_epoch)
    latest = _latest_per_model(rows)

    # Leaderboard sorts by accuracy desc when present, else f1, else map
    def _score(r: dict[str, Any]) -> float:
        for k in ("accuracy", "f1", "auc", "map", "ndcg"):
            v = r.get(k)
            if isinstance(v, (int, float)):
                return float(v)
        return -1.0

    leaderboard = sorted(latest, key=_score, reverse=True)
    leaderboard_summary = [
        {
            "model_id": r.get("model_id"),
            "model_version": r.get("model_version"),
            "dataset": r.get("dataset"),
            "accuracy": r.get("accuracy"),
            "f1": r.get("f1"),
            "auc": r.get("auc"),
            "drift_score": r.get("drift_score"),
            "n_examples": r.get("n_examples"),
            "ts": r.get("ts"),
            "run_id": r.get("run_id"),
        }
        for r in leaderboard
    ]

    datasets = sorted({str(r.get("dataset", "")) for r in rows if r.get("dataset")})
    depts = sorted({str(r.get("dept", "")) for r in rows if r.get("dept")})

    return {
        "policy": "§68.8 Functional eval",
        "log_path": str(_log_path()),
        "n_runs_total": len(rows),
        "n_models": len(latest),
        "n_datasets": len(datasets),
        "datasets": datasets,
        "depts": depts,
        "leaderboard": leaderboard_summary,
        "known_metrics": list(_KNOWN_METRICS),
        "scanned_at": time.time(),
    }


def model_history(
    model_id: str,
    *,
    dataset: str | None = None,
    since_epoch: float = 0.0,
    limit: int = 100,
) -> dict[str, Any] | None:
    """Per-model eval history, newest-first. Returns None if model unseen."""
    if not _MODEL_ID_RE.match(model_id):
        return {"status": "invalid_model_id", "valid_pattern": _MODEL_ID_RE.pattern}
    rows = _read_rows(since_epoch=since_epoch)
    matched = [r for r in rows if str(r.get("model_id", "")) == model_id]
    if not matched:
        return None
    if dataset is not None:
        matched = [r for r in matched if str(r.get("dataset", "")) == dataset]
    matched.sort(key=lambda r: r.get("ts", 0), reverse=True)
    matched = matched[:limit]

    # Drift summary: most recent two rows' delta on accuracy/f1
    drift_summary = None
    if len(matched) >= 2:
        cur = matched[0]
        prev = matched[1]
        drift_summary = {}
        for k in ("accuracy", "f1", "auc", "drift_score"):
            if isinstance(cur.get(k), (int, float)) and isinstance(prev.get(k), (int, float)):
                drift_summary[k] = {
                    "current": cur[k],
                    "previous": prev[k],
                    "delta": round(cur[k] - prev[k], 4),
                }

    return {
        "model_id": model_id,
        "dataset_filter": dataset,
        "n_runs": len(matched),
        "runs": matched,
        "drift_summary": drift_summary,
        "scanned_at": time.time(),
    }


def run_detail(model_id: str, run_id: str) -> dict[str, Any] | None:
    """Single eval run by (model_id, run_id)."""
    if not _MODEL_ID_RE.match(model_id):
        return {"status": "invalid_model_id"}
    if not _RUN_ID_RE.match(run_id):
        return {"status": "invalid_run_id"}
    rows = _read_rows()
    for row in rows:
        if (str(row.get("model_id", "")) == model_id
                and str(row.get("run_id", "")) == run_id):
            return {"status": "found", "row": row, "scanned_at": time.time()}
    return None
