"""§68.6 PII inventory router.

3 endpoints under /api/v1/insur/pii/* federated via core.insur_audit
(surface=pii). Answers operator's question: "Where does PII live? Which
columns are redacted? Has PII appeared in plaintext anywhere it
shouldn't have?"

Composes with §38.3 (audit on read) + §47.6 (SOC2 CC6.2 PII handling) +
§57.7 (best-effort persistence) + §64.43 #7 (federation) + §68
(Observability Hub iter 2).
"""
from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from core.insur_audit import log_insur_access
from services import pii_inventory_service as pii

router = APIRouter(prefix="/api/v1/insur/pii", tags=["insur", "pii"])

INSUR_DEPTS = [
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
]


def _validate_dept(dept: str) -> None:
    if dept not in INSUR_DEPTS:
        raise HTTPException(404, f"Unknown dept '{dept}' — must be one of {len(INSUR_DEPTS)} INSUR depts")


# _global BEFORE /{dept} per §66.3 FastAPI greedy-match trap.
@router.get("/_global")
def pii_global(http_request: Request) -> dict[str, Any]:
    """Cross-dept PII inventory + entity-level PII fields."""
    log_insur_access(http_request, "pii", "pii_global")
    return pii.cross_dept_inventory()


# Specific path BEFORE parameterized — `/leaks` is a literal, must be first.
@router.get("/leaks")
def pii_leaks(
    http_request: Request,
    since: float = Query(0.0, ge=0.0, description="Epoch seconds; 0 = scan all"),
    limit: int = Query(100, ge=1, le=500),
) -> dict[str, Any]:
    """Scan recent audit-log lines for plaintext PII patterns.

    Hit = either a real leak (operator investigates) OR an over-redaction
    elsewhere (heuristic adjustment needed). Both are actionable. The
    matched PII string is NEVER returned in plaintext — only a redacted
    first/last char + length + position metadata.
    """
    log_insur_access(http_request, "pii", "pii_leaks",
                    extra={"since": since, "limit": limit})
    return pii.scan_leaks(since_epoch=since, limit=limit)


@router.get("/{dept}")
def pii_dept(http_request: Request, dept: str) -> dict[str, Any]:
    """Per-dept PII inventory."""
    _validate_dept(dept)
    log_insur_access(http_request, "pii", "pii_dept", dept=dept)
    result = pii.per_dept_inventory(dept)
    if result is None:
        raise HTTPException(404, f"No processes annotated for dept '{dept}' in catalog")
    return {**result, "scanned_at": time.time()}
