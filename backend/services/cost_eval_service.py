"""§68.9 Cost eval — "what does the model cost?"

Read-only aggregation over data/agent-supervisor/cost_runs.jsonl
(INSUR_EVAL_COST_LOG env). Each row is one LLM/inference call:

  ts, request_id, tenant_id, model_id, prompt_tokens,
  completion_tokens, total_tokens, cost_usd, dept, surface, endpoint

The WRITE side (LLM-gateway / LiteLLM adapter appending a row per
completion) is a separate iteration. This commit ships the READ
surface so operators can answer "what does the model cost?" + "which
tenant is burning the budget?" the moment any inference path writes
rows.

Composes with §41.1 (FinOps — every project budgets per env), §41.3
(tenant isolation — cost rollup is per-tenant by construction),
§56.2 (LLM gateway is the natural WRITE-side hook), §57.7 (graceful
when log missing) + §68 (Observability Hub iter 5).
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
    Path(__file__).resolve().parents[2] / "data" / "agent-supervisor" / "cost_runs.jsonl",
    Path("/app/data/agent-supervisor/cost_runs.jsonl"),
    Path("/data/agent-supervisor/cost_runs.jsonl"),
]

_TENANT_ID_RE = re.compile(r"^[A-Za-z0-9_.-]+$")
_REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9_.:-]+$")

# Time-window bucket sizes (seconds).
_BUCKET_24H = 24 * 3600
_BUCKET_7D = 7 * 24 * 3600
_BUCKET_30D = 30 * 24 * 3600


def _log_path() -> Path | None:
    env = os.environ.get("INSUR_EVAL_COST_LOG")
    if env:
        p = Path(env)
        if p.exists():
            return p
        return p
    for p in _LOG_CANDIDATES:
        if p.exists():
            return p
    return _LOG_CANDIDATES[0]


def _read_rows(since_epoch: float = 0.0, max_rows: int = 50_000) -> list[dict[str, Any]]:
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
        logger.info("cost_eval: log unreadable (%s)", type(exc).__name__)
        return []
    return rows


def _sum_cost(rows: list[dict[str, Any]]) -> tuple[float, int, int]:
    """Return (total_cost_usd, total_tokens, n_calls)."""
    cost = 0.0
    tokens = 0
    for r in rows:
        c = r.get("cost_usd")
        if isinstance(c, (int, float)):
            cost += float(c)
        t = r.get("total_tokens")
        if isinstance(t, (int, float)):
            tokens += int(t)
        else:
            # Fall back to prompt + completion
            pt = r.get("prompt_tokens", 0)
            ct = r.get("completion_tokens", 0)
            if isinstance(pt, (int, float)) and isinstance(ct, (int, float)):
                tokens += int(pt) + int(ct)
    return round(cost, 6), tokens, len(rows)


def global_summary() -> dict[str, Any]:
    """Total cost over 24h / 7d / 30d + per-window breakdown."""
    rows = _read_rows()
    now = time.time()

    windows: dict[str, dict[str, Any]] = {}
    for label, secs in (("last_24h", _BUCKET_24H),
                        ("last_7d", _BUCKET_7D),
                        ("last_30d", _BUCKET_30D)):
        cutoff = now - secs
        win_rows = [r for r in rows if r.get("ts", 0) >= cutoff]
        cost, tokens, n_calls = _sum_cost(win_rows)
        windows[label] = {
            "n_calls": n_calls,
            "total_tokens": tokens,
            "total_cost_usd": cost,
        }

    # All-time totals
    cost_all, tokens_all, n_all = _sum_cost(rows)

    return {
        "policy": "§68.9 Cost eval",
        "log_path": str(_log_path()),
        "all_time": {
            "n_calls": n_all,
            "total_tokens": tokens_all,
            "total_cost_usd": cost_all,
        },
        "windows": windows,
        "scanned_at": time.time(),
    }


def per_tenant_breakdown(tenant_id: str, *, since_epoch: float = 0.0) -> dict[str, Any] | None:
    """Per-tenant cost breakdown. Returns None if tenant unseen."""
    if not _TENANT_ID_RE.match(tenant_id):
        return {"status": "invalid_tenant_id", "valid_pattern": _TENANT_ID_RE.pattern}
    rows = _read_rows(since_epoch=since_epoch)
    matched = [r for r in rows if str(r.get("tenant_id", "")) == tenant_id]
    if not matched:
        return None

    # Per-model breakdown within this tenant
    per_model: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"n_calls": 0, "total_tokens": 0, "total_cost_usd": 0.0}
    )
    for r in matched:
        mid = str(r.get("model_id", "unknown"))
        bucket = per_model[mid]
        bucket["n_calls"] += 1
        bucket["total_tokens"] += int(r.get("total_tokens", 0)
                                     or (r.get("prompt_tokens", 0) or 0)
                                     + (r.get("completion_tokens", 0) or 0))
        c = r.get("cost_usd")
        if isinstance(c, (int, float)):
            bucket["total_cost_usd"] += float(c)

    # Round costs for response
    per_model_clean = {
        mid: {**b, "total_cost_usd": round(b["total_cost_usd"], 6)}
        for mid, b in per_model.items()
    }

    cost, tokens, n = _sum_cost(matched)
    return {
        "tenant_id": tenant_id,
        "n_calls": n,
        "total_tokens": tokens,
        "total_cost_usd": cost,
        "per_model": per_model_clean,
        "since_epoch": since_epoch,
        "scanned_at": time.time(),
    }


def by_model_ranking(*, since_epoch: float = 0.0) -> dict[str, Any]:
    """Per-model cost ranking, highest-cost first."""
    rows = _read_rows(since_epoch=since_epoch)
    per_model: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"n_calls": 0, "total_tokens": 0, "total_cost_usd": 0.0}
    )
    for r in rows:
        mid = str(r.get("model_id", "unknown"))
        bucket = per_model[mid]
        bucket["n_calls"] += 1
        bucket["total_tokens"] += int(r.get("total_tokens", 0)
                                     or (r.get("prompt_tokens", 0) or 0)
                                     + (r.get("completion_tokens", 0) or 0))
        c = r.get("cost_usd")
        if isinstance(c, (int, float)):
            bucket["total_cost_usd"] += float(c)

    ranking = sorted(
        ({"model_id": mid, **b, "total_cost_usd": round(b["total_cost_usd"], 6)}
         for mid, b in per_model.items()),
        key=lambda x: x["total_cost_usd"], reverse=True,
    )

    return {
        "n_models": len(ranking),
        "ranking": ranking,
        "since_epoch": since_epoch,
        "scanned_at": time.time(),
    }


def by_request(request_id: str) -> dict[str, Any] | None:
    """Single-request cost lookup."""
    if not _REQUEST_ID_RE.match(request_id):
        return {"status": "invalid_request_id"}
    rows = _read_rows()
    for r in rows:
        if str(r.get("request_id", "")) == request_id:
            return {"status": "found", "row": r, "scanned_at": time.time()}
    return None
