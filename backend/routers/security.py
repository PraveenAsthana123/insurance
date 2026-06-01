"""§68.7 Security posture router.

3 endpoints under /api/v1/holy/security/* federated via core.holy_audit
(surface=security). Answers "is the system secure?" with three signals:
compliance gates (live probe), vulnerabilities (external snapshot),
attack attempts (audit-log scan).

Composes with §47.6 (the compliance-gate check IS a §47.6 invariant
audit) + §57.7 (graceful when posture snapshot absent) + §64.32
(per-dept HOLY_SECURITY.md spec is the WRITE side) + §68
(Observability Hub iter 3).
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from core.holy_audit import log_holy_access
from services import security_posture_service as sec

router = APIRouter(prefix="/api/v1/holy/security", tags=["holy", "security"])

HOLY_DEPTS = [
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
]


def _validate_dept(dept: str) -> None:
    if dept not in HOLY_DEPTS:
        raise HTTPException(404, f"Unknown dept '{dept}' — must be one of {len(HOLY_DEPTS)} HOLY depts")


# _global BEFORE /{dept} per §66.3 FastAPI greedy-match trap.
@router.get("/_global")
def security_global(http_request: Request) -> dict[str, Any]:
    """Cross-dept security posture summary.

    Returns:
      - compliance: live-probed §47.6 gates + score
      - vulnerabilities: CVE counts from external posture snapshot
      - attack_attempts_24h: count + by_type from audit-log scan
    """
    log_holy_access(http_request, "security", "security_global")
    return sec.global_summary()


# Specific path BEFORE parameterized — `/attacks` is a literal.
@router.get("/attacks")
def security_attacks(
    http_request: Request,
    since: float = Query(0.0, ge=0.0, description="Epoch seconds; 0 = last 7 days"),
    limit: int = Query(100, ge=1, le=500),
) -> dict[str, Any]:
    """Recent attack attempts rejected by middleware (RBAC denial / scope
    denial / malformed-path patterns in audit log)."""
    log_holy_access(http_request, "security", "security_attacks",
                    extra={"since": since, "limit": limit})
    return sec.list_attacks(since_epoch=since, limit=limit)


@router.get("/{dept}")
def security_dept(http_request: Request, dept: str) -> dict[str, Any]:
    """Per-dept security score."""
    _validate_dept(dept)
    log_holy_access(http_request, "security", "security_dept", dept=dept)
    return sec.per_dept_score(dept)
