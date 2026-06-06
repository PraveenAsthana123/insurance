#!/usr/bin/env python3
"""
Drill: §64.43 #7 + §41.3 federated multi-tenant request scoping.

Verifies TenantIdMiddleware in backend/core/middleware.py + the CUA execute
router-side injection in backend/routers/agent_platform.py. The drill
locks the security-critical invariants that a downstream incident would
otherwise surface only at audit time.

Steps (9 total; 4 negative):
  1. (+) Default tenant_id='default' when X-Tenant-ID header absent
  2. (+) X-Tenant-ID respected (case-insensitive); echoed in response header
  3. (-) NEGATIVE: invalid tenant_id (uppercase / path-traversal) → 400 TENANT_ID_INVALID
  4. (-) NEGATIVE: TENANT_ID_ALLOWLIST='tenant-a' + 'tenant-b' header → 403 TENANT_ID_FORBIDDEN
  5. (-) NEGATIVE: TENANT_ID_STRICT=true + no header → 400 TENANT_ID_MISSING
  6. (-) NEGATIVE: bypass paths (/api/health) skip strict mode (probes survive)
  7. (+) CUA execute audit row carries middleware tenant_id (NOT body metadata)
  8. (+) Body-metadata tenant_id is OVERRIDDEN by middleware (anti-spoof)
  9. (+) request_id propagated from CorrelationIdMiddleware into audit row

# RESOURCES: disk_io,playwright

Exit 0 on PASS, 1 on any failure.
"""
from __future__ import annotations

import importlib
import json
import os
import sys
import tempfile
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _build_app(strict: bool = False, allowlist: str = ""):
    """Build a minimal FastAPI app with only the middlewares + agent-platform
    router we need for federation testing. Avoids the project-wide ``prophet``
    import that blocks ``from main import app``.
    """
    if strict:
        os.environ["TENANT_ID_STRICT"] = "true"
    else:
        os.environ.pop("TENANT_ID_STRICT", None)
    if allowlist:
        os.environ["TENANT_ID_ALLOWLIST"] = allowlist
    else:
        os.environ.pop("TENANT_ID_ALLOWLIST", None)

    # Force re-import so env-derived module globals take effect.
    for mod in ("core.middleware", "core.rbac_middleware", "routers.agent_platform"):
        if mod in sys.modules:
            del sys.modules[mod]

    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from routers.agent_platform import router

    app = FastAPI()
    app.add_middleware(TenantIdMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.include_router(router)

    # Bypass-path probe: register a tiny /api/health handler matching real app.
    @app.get("/api/health")
    def health():
        return {"ok": True}

    return app


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: §64.43 #7 tenant_id federation\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        os.environ["CUA_AUDIT_PATH"] = str(Path(tmp) / "cua_runs.jsonl")
        # Extend allowlist so the executed-path test (step 9) works.
        os.environ["PLAYWRIGHT_ALLOWLIST"] = "about:,http://localhost"

        # ---- Steps 1-3, 6 use a non-strict app, no allowlist ----
        client = TestClient(_build_app(strict=False, allowlist=""))

        # ---- Step 1: default tenant when header absent ----
        r = client.post(
            "/api/v1/agent-platform/cua/execute",
            json={"instruction": "read homepage", "target": "http://localhost:3000",
                  "adapter": "playwright", "dry_run": True, "user_role": "tester"},
        )
        step(1, "default tenant_id='default' when X-Tenant-ID header absent",
             r.status_code == 200 and r.headers.get("X-Tenant-ID") == "default",
             f"status={r.status_code} echo={r.headers.get('X-Tenant-ID')!r}")

        # ---- Step 2: header honored (case-insensitive); echo header ----
        r = client.post(
            "/api/v1/agent-platform/cua/execute",
            headers={"x-tenant-id": "Tenant-A"},  # mixed case + uppercase
            json={"instruction": "read homepage", "target": "http://localhost:3000",
                  "adapter": "playwright", "dry_run": True, "user_role": "tester"},
        )
        step(2, "X-Tenant-ID header lowercased + echoed in response",
             r.status_code == 200 and r.headers.get("X-Tenant-ID") == "tenant-a",
             f"status={r.status_code} echo={r.headers.get('X-Tenant-ID')!r}")

        # ---- Step 3: NEGATIVE invalid id (path traversal / underscores) ----
        r = client.post(
            "/api/v1/agent-platform/cua/execute",
            headers={"X-Tenant-ID": "../etc/passwd"},
            json={"instruction": "read homepage", "target": "http://localhost:3000",
                  "adapter": "playwright", "dry_run": True, "user_role": "tester"},
        )
        body = r.json() if r.status_code != 200 else {}
        step(3, "NEGATIVE: path-traversal tenant_id → 400 TENANT_ID_INVALID",
             r.status_code == 400 and body.get("error_code") == "TENANT_ID_INVALID",
             f"status={r.status_code} code={body.get('error_code')}")

        # ---- Step 6: bypass path (/api/health) survives strict mode ----
        strict_client = TestClient(_build_app(strict=True, allowlist=""))
        r = strict_client.get("/api/health")
        step(6, "NEGATIVE: bypass path /api/health skips strict mode (probes survive)",
             r.status_code == 200,
             f"status={r.status_code}")

        # ---- Step 5: strict + missing header → 400 ----
        r = strict_client.post(
            "/api/v1/agent-platform/cua/execute",
            json={"instruction": "x", "target": "http://localhost", "dry_run": True, "user_role": "tester"},
        )
        body = r.json() if r.status_code != 200 else {}
        step(5, "NEGATIVE: TENANT_ID_STRICT + no header → 400 TENANT_ID_MISSING",
             r.status_code == 400 and body.get("error_code") == "TENANT_ID_MISSING",
             f"status={r.status_code} code={body.get('error_code')}")

        # ---- Step 4: allowlist + off-list header → 403 ----
        allowlist_client = TestClient(_build_app(strict=False, allowlist="tenant-a,tenant-b"))
        r = allowlist_client.post(
            "/api/v1/agent-platform/cua/execute",
            headers={"X-Tenant-ID": "tenant-zzz"},
            json={"instruction": "x", "target": "http://localhost", "dry_run": True, "user_role": "tester"},
        )
        body = r.json() if r.status_code != 200 else {}
        step(4, "NEGATIVE: off-allowlist tenant → 403 TENANT_ID_FORBIDDEN",
             r.status_code == 403 and body.get("error_code") == "TENANT_ID_FORBIDDEN",
             f"status={r.status_code} code={body.get('error_code')}")

        # ---- Step 7+8: audit row uses MIDDLEWARE tenant_id, not body metadata ----
        # Use a real-execution path (about:blank, dry_run=false) so audit row is written.
        client_for_audit = TestClient(_build_app(strict=False, allowlist=""))
        r = client_for_audit.post(
            "/api/v1/agent-platform/cua/execute",
            headers={"X-Tenant-ID": "tenant-a"},
            json={
                "instruction": "read about:blank",
                "target": "about:blank",
                "adapter": "playwright",
                "dry_run": False,
                "user_role": "tester",
                "metadata": {"tenant_id": "EVIL-SPOOFED-TENANT"},  # MUST be ignored
            },
        )
        audit_path = Path(os.environ["CUA_AUDIT_PATH"])
        rows = [json.loads(line) for line in audit_path.read_text().splitlines() if line.strip()]
        last = rows[-1] if rows else {}
        step(7, "CUA audit row carries middleware tenant_id (not body)",
             last.get("tenant_id") == "tenant-a",
             f"audit.tenant_id={last.get('tenant_id')!r} status={r.status_code}")
        step(8, "NEGATIVE: body metadata.tenant_id ignored (anti-spoof — middleware wins)",
             last.get("tenant_id") != "EVIL-SPOOFED-TENANT",
             f"audit.tenant_id={last.get('tenant_id')!r} (good: middleware overrode body)")

        # ---- Step 9: request_id propagated from CorrelationIdMiddleware ----
        step(9, "audit row has non-empty request_id from CorrelationIdMiddleware",
             bool(last.get("request_id")) and len(last.get("request_id", "")) >= 8,
             f"request_id={last.get('request_id')!r}")

    print(f"\n\033[32mALL 9 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
