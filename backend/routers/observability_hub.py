"""§68 Observability Hub aggregator router.

One endpoint: GET /api/v1/holy/observability-hub/_overview that surfaces
the health of all 7 §68 read surfaces in one call. Mirrors the §56
/api/v1/agent-platform/adapters aggregator shape.

Composes with §38.3 + §47.6 + §57.7 + §64.43 #7 + §68.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from core.holy_audit import log_holy_access
from services import observability_hub_service as ohub

router = APIRouter(
    prefix="/api/v1/holy/observability-hub",
    tags=["holy", "observability-hub"],
)


@router.get("/_overview")
def hub_overview(http_request: Request) -> dict[str, Any]:
    """Aggregated health view across all 7 §68 read surfaces.

    Each surface contributes its source-of-truth probe (path / exists /
    n_rows / last_ts). A broken surface NEVER breaks the aggregator
    (per-surface try/except in service); the bad one surfaces with
    status='probe_error' + error_type.

    Use this to answer: "Are the §68 surfaces wired? Which ones have
    data flowing in? Which ones are missing their write side?"
    """
    log_holy_access(http_request, "observability_hub", "hub_overview")
    return ohub.overview()
