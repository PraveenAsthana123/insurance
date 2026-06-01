"""rbac_middleware — demo-mode RBAC. Reads X-Demo-Role header, enforces matrix.

NOT real auth — no token signing, no session. For demo + portfolio purposes.
Real RBAC is Phase 2b (see roadmap §12).

Permission matrix is a list of (method, path-regex, allowed-roles-set) tuples.
If no entry matches the incoming request, the request is allowed (so health,
docs, departments, processes, datasets, etc. continue to work).

Default role when header absent = "manager" so existing unauthenticated flows
(e.g., server-to-server tests) still work without modification.
"""
from __future__ import annotations

import logging
import re
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger(__name__)

# ----- Permission matrix for Sales + Supply Chain + AI endpoints -----
# Each entry: (method, path-regex) -> set of roles allowed.
# If no entry matches, request is ALLOWED (so /health, /docs, etc. stay open).

# Read-only endpoints are open to all four original roles + the Phase ζ "tester".
# Write/simulate endpoints remain manager-only.
_READ_ROLES = {"manager", "team-member", "compliance", "reporting-monitoring", "tester"}

PERMS_MATRIX: list[tuple[str, re.Pattern, set[str]]] = [
    # -------- Sales --------
    ("GET",  re.compile(r"^/api/v1/sales/stores$"),           _READ_ROLES),
    ("POST", re.compile(r"^/api/v1/sales/forecast$"),         _READ_ROLES),
    # Simulation is manager-only per spec §10.8 (tester NOT included).
    ("POST", re.compile(r"^/api/v1/sales/simulate$"),         {"manager"}),
    ("POST", re.compile(r"^/api/v1/ai/explain$"),             _READ_ROLES),

    # -------- Supply Chain (Wave 3 η) --------
    ("GET",  re.compile(r"^/api/v1/supply-chain/skus$"),            _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/supply-chain/suppliers$"),       _READ_ROLES),
    ("POST", re.compile(r"^/api/v1/supply-chain/stockout-risk$"),   _READ_ROLES),
    ("POST", re.compile(r"^/api/v1/supply-chain/eta$"),             _READ_ROLES),
    # Network simulation is manager-only (same pattern as Sales simulate).
    ("POST", re.compile(r"^/api/v1/supply-chain/simulate$"),        {"manager"}),

    # -------- Customer (Wave 4 depth-pilot) --------
    # Read-focused analytics — all five roles (incl. tester) can view churn predictions.
    ("POST", re.compile(r"^/api/v1/customer/churn-predict$"),   _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/customer/churn-top$"),       _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/customer/churn-metrics$"),   _READ_ROLES),

    # -------- Agent platform setup/status/governance --------
    ("GET",  re.compile(r"^/api/v1/agent-platform/status$"),             _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/agent-platform/manifest$"),           _READ_ROLES),
    ("POST", re.compile(r"^/api/v1/agent-platform/governance/evaluate$"), _READ_ROLES),
    ("POST", re.compile(r"^/api/v1/agent-platform/cua/execute$"),         {"manager", "tester"}),
    ("POST", re.compile(r"^/api/v1/agent-platform/approval-broker/decide$"), {"manager", "tester"}),
    ("POST", re.compile(r"^/api/v1/agent-platform/typed-council/run$"), {"manager", "tester"}),
    ("GET",  re.compile(r"^/api/v1/agent-platform/cua/audit$"),           _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/agent-platform/activity$"),            _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/agent-platform/adapters$"),            _READ_ROLES),

    # -------- HOLY monitoring (fleet ML pipeline health) --------
    # Data is fleet-wide infrastructure telemetry, not tenant-scoped — but
    # every READ is attributed to caller's tenant for §38.3 / SOC2 CC4 trail.
    ("GET",  re.compile(r"^/api/v1/holy/monitoring/_global$"),            _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/holy/monitoring/[^/]+$"),              _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/holy/monitoring/[^/]+/jobs/[^/]+/runs$"), _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/holy/monitoring/[^/]+/jobs/[^/]+/runs/[^/]+$"), _READ_ROLES),

    # -------- HOLY federated read surfaces (§64.43 #7) --------
    # Pattern: catch-all prefix per surface — fleet data, tenant-attributed
    # access trail via core.holy_audit.log_holy_access. Read-only in MVP;
    # mutations land elsewhere or stay gated per §42.
    ("GET",  re.compile(r"^/api/v1/holy/master-data(/.*)?$"),  _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/holy/transactions(/.*)?$"), _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/holy/pipelines(/.*)?$"),    _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/holy/reports(/.*)?$"),      _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/holy/demo-stories(/.*)?$"), _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/holy/graph(/.*)?$"),        _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/holy/downloads(/.*)?$"),    _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/holy/dbviewer(/.*)?$"),     _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/holy/pii(/.*)?$"),          _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/holy/guardrails(/.*)?$"),   _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/holy/security(/.*)?$"),     _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/holy/evals(/.*)?$"),        _READ_ROLES),
    ("GET",  re.compile(r"^/api/v1/holy/observability-hub(/.*)?$"), _READ_ROLES),
    # §68.11 multi-model compare — POST creates a persisted manifest, so
    # restricted to manager/tester (matches the typed-council/run +
    # cua/execute pattern). GET endpoints are covered by the /evals/* catch-all above.
    ("POST", re.compile(r"^/api/v1/holy/evals/model-compare$"),  {"manager", "tester"}),

    # -------- Admin: cross-tenant compliance/reporting reads --------
    # Intentionally NOT in _READ_ROLES — compliance + reporting-monitoring
    # are the only roles that can bypass tenant scoping. Manager + tester +
    # team-member roles MUST use the per-tenant /agent-platform/cua/audit.
    ("GET",  re.compile(r"^/api/v1/admin/cua/audit$"),
     {"compliance", "reporting-monitoring"}),
]

# Backwards-compatible alias — earlier commits referenced SALES_PERMS.
SALES_PERMS = PERMS_MATRIX

VALID_ROLES = {"manager", "team-member", "compliance", "reporting-monitoring", "tester"}
DEFAULT_ROLE = "manager"


class RBACMiddleware(BaseHTTPMiddleware):
    """Enforces the PERMS_MATRIX against the X-Demo-Role header."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        method = request.method
        path = request.url.path

        match = next(
            (
                (m, rx, roles)
                for (m, rx, roles) in PERMS_MATRIX
                if m == method and rx.match(path)
            ),
            None,
        )

        if match is None:
            # Path not in matrix → allow (covers /health, /docs, /openapi.json, etc.)
            return await call_next(request)

        _, _, allowed = match
        role = request.headers.get("x-demo-role", DEFAULT_ROLE)

        if role not in VALID_ROLES:
            return JSONResponse(
                status_code=400,
                content={
                    "detail": f"Unknown role '{role}'. Valid: {sorted(VALID_ROLES)}",
                    "error_code": "INVALID_ROLE",
                    "correlation_id": getattr(request.state, "correlation_id", ""),
                },
            )

        if role not in allowed:
            logger.info(
                "rbac.denied role=%s method=%s path=%s correlation_id=%s",
                role, method, path,
                getattr(request.state, "correlation_id", ""),
            )
            return JSONResponse(
                status_code=403,
                content={
                    "detail": f"Role '{role}' not permitted on {method} {path}",
                    "error_code": "FORBIDDEN",
                    "correlation_id": getattr(request.state, "correlation_id", ""),
                },
            )

        return await call_next(request)
