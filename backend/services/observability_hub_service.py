"""§68 Observability Hub aggregator — single discovery view across all
7 §68 read surfaces (dbviewer / pii / guardrails / security /
evals_functional / evals_cost / evals_safety).

Answers operator's question: "Are all the §68 surfaces wired, are they
reading from real data, are any of them broken right now?" Without
this, the operator hits 7 endpoints to learn the same.

The aggregator is intentionally CHEAP: each surface contributes just
its source-of-truth log status (path + exists + n_rows + last_ts),
NOT its full aggregation. Click-through to the specific surface for
detail. This keeps the overview snappy under load.

Per §57.7: a single broken surface NEVER breaks the aggregator —
each surface is probed with try/except so the bad one shows up as
status='error' + error_type, others surface normally.

Mirrors §56's /api/v1/agent-platform/adapters aggregator shape — same
discipline applied to §68's read surfaces.

Composes with §38.3 (audit on read) + §43 (drill-locked) + §47.6 +
§57.7 + §64.43 #7 (federation) + §68.
"""
from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Per-surface registry: each entry describes how to probe one §68 surface.
#
#   key:             stable short name for the surface
#   policy:          the §68.x clause it implements
#   endpoint_prefix: caller's click-through path
#   source_env_var:  env override for the underlying JSONL log
#   source_default:  canonical fallback path
#   write_status:    "operator-action-required" | "shipped"
#
# Source-of-truth logs that aren't JSONL (dbviewer uses a JSON catalog,
# security uses a JSON snapshot) get probed with surface-specific logic.
_SURFACES: list[dict[str, Any]] = [
    {
        "key": "dbviewer",
        "policy": "§68.1 + §68.2",
        "endpoint_prefix": "/api/v1/insur/dbviewer",
        "source_kind": "json_catalog",
        "source_relpath": "data/dbviewer/per_process_tables.json",
        "write_status": "shipped",  # catalog file ships from iter 1
    },
    {
        "key": "pii",
        "policy": "§68.6",
        "endpoint_prefix": "/api/v1/insur/pii",
        "source_kind": "audit_log",   # PII inventory READS the insur_reads audit log
        "source_env_var": "INSUR_AUDIT_PATH",
        "source_default": "data/agent-supervisor/insur_reads.jsonl",
        "write_status": "shipped",
    },
    {
        "key": "guardrails",
        "policy": "§68.5",
        "endpoint_prefix": "/api/v1/insur/guardrails",
        "source_kind": "jsonl",
        "source_env_var": "INSUR_GUARDRAIL_LOG",
        "source_default": "data/agent-supervisor/guardrail_decisions.jsonl",
        "write_status": "operator-action-required",  # write side pending
    },
    {
        "key": "security",
        "policy": "§68.7",
        "endpoint_prefix": "/api/v1/insur/security",
        "source_kind": "json_snapshot",
        "source_env_var": "INSUR_SECURITY_POSTURE_PATH",
        "source_default": "data/agent-supervisor/security_posture.json",
        "write_status": "operator-action-required",  # pip-audit/bandit job
    },
    {
        "key": "evals_functional",
        "policy": "§68.8",
        "endpoint_prefix": "/api/v1/insur/evals/functional",
        "source_kind": "jsonl",
        "source_env_var": "INSUR_EVAL_FUNCTIONAL_LOG",
        "source_default": "data/agent-supervisor/functional_eval_runs.jsonl",
        "write_status": "operator-action-required",  # MLflow / scheduled eval
    },
    {
        "key": "evals_cost",
        "policy": "§68.9",
        "endpoint_prefix": "/api/v1/insur/evals/cost",
        "source_kind": "jsonl",
        "source_env_var": "INSUR_EVAL_COST_LOG",
        "source_default": "data/agent-supervisor/cost_runs.jsonl",
        "write_status": "operator-action-required",  # LLM-gateway hook
    },
    {
        "key": "evals_safety",
        "policy": "§68.10",
        "endpoint_prefix": "/api/v1/insur/evals/safety",
        "source_kind": "jsonl",
        "source_env_var": "INSUR_EVAL_SAFETY_LOG",
        "source_default": "data/agent-supervisor/safety_eval_runs.jsonl",
        "write_status": "operator-action-required",  # DeepEval/Ragas/Garak
    },
]

_REPO_ROOT = Path(__file__).resolve().parents[2]


def _resolve_path(surface: dict[str, Any]) -> Path:
    """Resolve a surface's source-of-truth log path.
    Env override wins (matches the federation helper pattern)."""
    env_var = surface.get("source_env_var")
    if env_var:
        env_val = os.environ.get(env_var)
        if env_val:
            return Path(env_val)
    relpath = surface.get("source_relpath") or surface.get("source_default")
    if not relpath:
        return _REPO_ROOT
    p = Path(relpath)
    if p.is_absolute():
        return p
    return _REPO_ROOT / relpath


def _probe_jsonl(path: Path) -> dict[str, Any]:
    """Probe a JSONL source: exists? n_rows? last_ts? corrupt lines?"""
    if not path.exists():
        return {"status": "absent", "n_rows": 0, "last_ts": None}
    try:
        n_rows = 0
        n_corrupt = 0
        last_ts: float | None = None
        for line in path.read_text(errors="replace").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                n_corrupt += 1
                continue
            n_rows += 1
            ts = row.get("ts") if isinstance(row, dict) else None
            if isinstance(ts, (int, float)) and (last_ts is None or ts > last_ts):
                last_ts = ts
        return {
            "status": "present",
            "n_rows": n_rows,
            "n_corrupt_lines": n_corrupt,
            "last_ts": last_ts,
        }
    except OSError as exc:
        return {"status": "unreadable", "error_type": type(exc).__name__}


def _probe_json(path: Path) -> dict[str, Any]:
    """Probe a JSON catalog/snapshot: exists? parsable? size?"""
    if not path.exists():
        return {"status": "absent"}
    try:
        text = path.read_text(errors="replace")
        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            return {"status": "malformed", "error": str(exc)[:120]}
        return {
            "status": "present",
            "size_bytes": len(text),
            "top_keys": sorted(data.keys())[:8] if isinstance(data, dict) else None,
        }
    except OSError as exc:
        return {"status": "unreadable", "error_type": type(exc).__name__}


def _probe_one(surface: dict[str, Any]) -> dict[str, Any]:
    """Probe one §68 surface — defensive: any exception caught + reported."""
    try:
        path = _resolve_path(surface)
        kind = surface.get("source_kind", "jsonl")
        if kind == "jsonl" or kind == "audit_log":
            source = _probe_jsonl(path)
        elif kind in ("json_catalog", "json_snapshot"):
            source = _probe_json(path)
        else:
            source = {"status": "unknown_kind"}

        return {
            "key": surface["key"],
            "policy": surface["policy"],
            "endpoint_prefix": surface["endpoint_prefix"],
            "write_status": surface["write_status"],
            "source": {
                "kind": kind,
                "path": str(path),
                **source,
            },
        }
    except Exception as exc:  # noqa: BLE001 — aggregator survives any per-surface bug
        logger.warning("observability_hub: probe failed for %s (%s)",
                       surface.get("key"), type(exc).__name__)
        return {
            "key": surface.get("key", "unknown"),
            "policy": surface.get("policy", ""),
            "endpoint_prefix": surface.get("endpoint_prefix", ""),
            "write_status": surface.get("write_status", "unknown"),
            "source": {"status": "probe_error", "error_type": type(exc).__name__},
        }


def overview() -> dict[str, Any]:
    """Aggregated snapshot of all 7 §68 read surfaces.

    Per §57.7: NEVER let a single surface's probe failure break the
    aggregator. The defense is at THIS call site (not inside
    `_probe_one`) so even a monkeypatched / replaced probe function
    that raises gets caught — the bad row surfaces as status='probe_error'.
    """
    surfaces: list[dict[str, Any]] = []
    for s in _SURFACES:
        try:
            surfaces.append(_probe_one(s))
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "observability_hub.overview: probe raised for %s (%s)",
                s.get("key"), type(exc).__name__,
            )
            surfaces.append({
                "key": s.get("key", "unknown"),
                "policy": s.get("policy", ""),
                "endpoint_prefix": s.get("endpoint_prefix", ""),
                "write_status": s.get("write_status", "unknown"),
                "source": {
                    "status": "probe_error",
                    "error_type": type(exc).__name__,
                    "error_msg": str(exc)[:200],
                },
            })

    n_present = sum(1 for s in surfaces if s["source"].get("status") == "present")
    n_absent = sum(1 for s in surfaces if s["source"].get("status") == "absent")
    n_errored = sum(1 for s in surfaces
                    if s["source"].get("status") in {"malformed", "unreadable",
                                                      "probe_error", "unknown_kind"})
    n_shipped_writes = sum(1 for s in surfaces if s["write_status"] == "shipped")

    return {
        "policy": "§68 INSUR Observability Hub — aggregator",
        "stage": "iter 7 of 7 read surfaces shipped",
        "n_surfaces": len(surfaces),
        "n_source_present": n_present,
        "n_source_absent": n_absent,
        "n_source_errored": n_errored,
        "n_write_sides_shipped": n_shipped_writes,
        "surfaces": surfaces,
        "scanned_at": time.time(),
    }
