"""Shared §38.3 audit-trail helper for INSUR/* routers under §64.43 #7 federation.

The pattern (first proven on /api/v1/insur/monitoring/* in commit ff0fc9f9):
  - Data layer stays fleet-wide / dept-scoped where appropriate
  - Access trail IS tenant-attributed: every read writes one §38.3 audit
    row with caller's tenant_id + actor + endpoint + path-param tags

This module is the reusable contract so the 7 remaining insur/* routers
(master_data, transactions, pipelines, reports, demo_stories, graph,
downloads) can opt in with three lines:

    from core.insur_audit import log_insur_access
    @router.get("/...")
    def handler(http_request: Request, ...):
        log_insur_access(http_request, "<surface>", "<endpoint>", dept=...)
        ...

Per §57.7: disk failures do NOT crash the request. The audit write is
best-effort; the read path is the contract.

Per §47.6 anti-info-leak: validators (e.g. _validate_dept) MUST run
BEFORE log_insur_access so failed-enumeration attempts don't pollute
the audit trail (matches the existing 404-not-400 pattern).
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any

from fastapi import Request

from core.middleware import current_tenant_id

_AUDIT_PATH = Path(
    os.environ.get("INSUR_AUDIT_PATH", "data/agent-supervisor/insur_reads.jsonl")
)


def log_insur_access(
    http_request: Request,
    surface: str,
    endpoint: str,
    *,
    dept: str | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    """Append one §38.3 audit row attributing the read to caller's tenant + actor.

    Args:
        http_request: the FastAPI Request (carries middleware state)
        surface:      one of "monitoring", "master_data", "transactions", etc.
                      Used as the `tool` prefix in the audit row.
        endpoint:     the specific handler name (e.g. "global_rollup")
        dept:         optional dept tag (most insur/* surfaces are dept-scoped)
        extra:        optional extra fields to merge into the row

    Best-effort persistence — disk errors are swallowed so the read path
    is never broken by the audit layer.
    """
    row: dict[str, Any] = {
        "ts": time.time(),
        "tenant_id": current_tenant_id(http_request),
        "actor": http_request.headers.get("X-Demo-Role", "unknown"),
        "tool": f"insur.{surface}.{endpoint}",
        "request_id": getattr(http_request.state, "correlation_id", ""),
        "surface": surface,
        "endpoint": endpoint,
        "outcome": "executed",
    }
    if dept is not None:
        row["dept"] = dept
    if extra:
        # Don't allow extras to clobber the canonical §38.3 fields
        protected = {"ts", "tenant_id", "actor", "tool", "request_id", "outcome"}
        for k, v in extra.items():
            if k not in protected:
                row[k] = v
    try:
        _AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with _AUDIT_PATH.open("a") as fh:
            fh.write(json.dumps(row, separators=(",", ":")) + "\n")
    except OSError:
        pass
