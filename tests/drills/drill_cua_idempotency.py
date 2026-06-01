#!/usr/bin/env python3
"""
Drill: §10.3 idempotency keys on /api/v1/agent-platform/cua/execute.

A network retry, double-click, or queued-publisher dedup should NOT cause
a second real Chromium navigation, a second Stripe-like side-effect, or a
duplicated audit row. The idempotency cache holds the first executed
response per (tenant_id, idempotency_key) and replays it for subsequent
calls within the TTL window.

Steps (12 total; 5 negative):
  1. (+) Fresh call without key → status='dry-run', no idempotent_replay flag
  2. (+) Fresh call with key='K1' → executes; result missing idempotent_replay
  3. (+) Replay with same key='K1' → returns SAME response + idempotent_replay=True
  4. (+) Replay preserves the FIRST call's target (not the replay's target)
  5. (-) NEG: same key='K1' but different X-Tenant-ID → fresh execution
        (cross-tenant cache isolation)
  6. (-) NEG: different key='K2' for same tenant → fresh execution
  7. (-) NEG: no key submitted → never cached, always fresh
  8. (+) Idempotency-Key header honored when body field is absent
  9. (+) Body idempotency_key wins over Idempotency-Key header when both set
  10.(-) NEG: failed exec (status='blocked' from policy denial) is NOT cached
        — retry after fixing the cause should re-execute
  11.(-) NEG: status='error' (dead localhost) is NOT cached
  12.(+) TTL expiry: after CUA_IDEMPOTENCY_TTL_SECONDS, replay is fresh again

# RESOURCES: disk_io

Exit 0 on PASS, 1 on any failure.
"""
from __future__ import annotations

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


def _build_app(ttl_seconds: float = 300.0):
    """Minimal app with TenantId + agent-platform router, configurable TTL."""
    os.environ["CUA_IDEMPOTENCY_TTL_SECONDS"] = str(ttl_seconds)
    os.environ.pop("TENANT_ID_STRICT", None)

    for mod in (
        "core.middleware", "core.rbac_middleware",
        "routers.agent_platform", "services.agent_platform_service",
        "schemas.agent_platform",
    ):
        if mod in sys.modules:
            del sys.modules[mod]

    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from routers.agent_platform import router as agent_platform_router

    app = FastAPI()
    app.add_middleware(TenantIdMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.include_router(agent_platform_router)
    return app


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: §10.3 CUA idempotency keys (replay + isolation + TTL)\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        os.environ["CUA_AUDIT_PATH"] = str(Path(tmp) / "cua_runs.jsonl")
        os.environ["PLAYWRIGHT_ALLOWLIST"] = "about:,http://localhost"

        client = TestClient(_build_app(ttl_seconds=300.0))
        body_a_dry = {
            "instruction": "first call",
            "target": "http://localhost:3000",
            "adapter": "playwright",
            "dry_run": True,
            "user_role": "tester",
        }

        # ---- Step 1: no key, no replay flag ----
        r = client.post("/api/v1/agent-platform/cua/execute",
                        headers={"X-Tenant-ID": "tenant-a"},
                        json=body_a_dry)
        body = r.json()
        step(1, "no key → no idempotent_replay flag",
             r.status_code == 200 and body["status"] == "dry-run"
             and "idempotent_replay" not in body["result"],
             f"status={body.get('status')} replay={body['result'].get('idempotent_replay')}")

        # ---- Step 2: fresh with key K1 ----
        r = client.post("/api/v1/agent-platform/cua/execute",
                        headers={"X-Tenant-ID": "tenant-a"},
                        json={**body_a_dry, "idempotency_key": "K1"})
        body = r.json()
        first_response_target = body["result"].get("target")
        step(2, "fresh call with key=K1 → executes; no idempotent_replay yet",
             r.status_code == 200 and body["status"] == "dry-run"
             and "idempotent_replay" not in body["result"],
             f"status={body.get('status')} replay={body['result'].get('idempotent_replay')}")

        # ---- Step 3: replay with SAME key returns idempotent_replay=True ----
        r = client.post("/api/v1/agent-platform/cua/execute",
                        headers={"X-Tenant-ID": "tenant-a"},
                        json={**body_a_dry, "idempotency_key": "K1",
                              "target": "http://localhost:8888/DIFFERENT"})  # diff target
        body = r.json()
        step(3, "replay same key K1 → idempotent_replay=True",
             r.status_code == 200 and body["result"].get("idempotent_replay") is True,
             f"replay={body['result'].get('idempotent_replay')}")

        # ---- Step 4: replay preserves FIRST call's content (not replay's) ----
        step(4, "replay returns FIRST call's target (not the replay's)",
             body["result"].get("target") == first_response_target,
             f"replay.target={body['result'].get('target')!r} (first was {first_response_target!r})")

        # ---- Step 5: NEG cross-tenant same key K1 → fresh ----
        r = client.post("/api/v1/agent-platform/cua/execute",
                        headers={"X-Tenant-ID": "tenant-b"},
                        json={**body_a_dry, "idempotency_key": "K1"})
        body = r.json()
        step(5, "NEGATIVE: tenant-b with same key K1 → fresh execution (cross-tenant cache isolation)",
             r.status_code == 200 and "idempotent_replay" not in body["result"],
             f"replay={body['result'].get('idempotent_replay')} (must be absent for fresh)")

        # ---- Step 6: NEG different key K2 same tenant → fresh ----
        r = client.post("/api/v1/agent-platform/cua/execute",
                        headers={"X-Tenant-ID": "tenant-a"},
                        json={**body_a_dry, "idempotency_key": "K2"})
        body = r.json()
        step(6, "NEGATIVE: different key K2 same tenant → fresh execution",
             r.status_code == 200 and "idempotent_replay" not in body["result"],
             f"replay={body['result'].get('idempotent_replay')}")

        # ---- Step 7: NEG no key submitted → never cached ----
        # We already showed step 1 had no replay. Run another no-key call to
        # confirm it's still fresh (not somehow cached by key-less identity).
        r = client.post("/api/v1/agent-platform/cua/execute",
                        headers={"X-Tenant-ID": "tenant-a"},
                        json=body_a_dry)
        body = r.json()
        step(7, "NEGATIVE: no key → never cached (always fresh)",
             r.status_code == 200 and "idempotent_replay" not in body["result"],
             f"replay={body['result'].get('idempotent_replay')}")

        # ---- Step 8: Idempotency-Key HEADER honored when body absent ----
        r = client.post("/api/v1/agent-platform/cua/execute",
                        headers={"X-Tenant-ID": "tenant-c", "Idempotency-Key": "HDR-K1"},
                        json=body_a_dry)
        body_hdr_first = r.json()
        r = client.post("/api/v1/agent-platform/cua/execute",
                        headers={"X-Tenant-ID": "tenant-c", "Idempotency-Key": "HDR-K1"},
                        json={**body_a_dry, "instruction": "DIFFERENT"})
        body = r.json()
        step(8, "Idempotency-Key HEADER honored → second call is a replay",
             r.status_code == 200 and body["result"].get("idempotent_replay") is True,
             f"replay={body['result'].get('idempotent_replay')}")

        # ---- Step 9: body field WINS over header when both set ----
        # tenant-c already has HDR-K1 cached. If body's idempotency_key is BODY-K1
        # the body field is used (no cache hit yet for BODY-K1) — so result is fresh.
        r = client.post("/api/v1/agent-platform/cua/execute",
                        headers={"X-Tenant-ID": "tenant-c", "Idempotency-Key": "HDR-K1"},
                        json={**body_a_dry, "idempotency_key": "BODY-K1"})
        body = r.json()
        step(9, "body idempotency_key wins over header → fresh (because BODY-K1 not yet cached)",
             r.status_code == 200 and "idempotent_replay" not in body["result"],
             f"replay={body['result'].get('idempotent_replay')}")

        # ---- Step 10: NEG blocked status NOT cached ----
        # Off-allowlist target → status='blocked'. Should NOT be cached.
        blocked_body = {
            "instruction": "read external",
            "target": "https://example.com/",
            "adapter": "playwright",
            "dry_run": False,  # real exec path — will trigger allowlist check
            "user_role": "tester",
            "idempotency_key": "BLOCK-K1",
        }
        r1 = client.post("/api/v1/agent-platform/cua/execute",
                         headers={"X-Tenant-ID": "tenant-d"}, json=blocked_body)
        r2 = client.post("/api/v1/agent-platform/cua/execute",
                         headers={"X-Tenant-ID": "tenant-d"}, json=blocked_body)
        body1, body2 = r1.json(), r2.json()
        step(10, "NEGATIVE: blocked exec NOT cached → retry produces fresh response (no idempotent_replay)",
             body1["status"] == "blocked" and body2["status"] == "blocked"
             and "idempotent_replay" not in body1["result"]
             and "idempotent_replay" not in body2["result"],
             f"r1.replay={body1['result'].get('idempotent_replay')} r2.replay={body2['result'].get('idempotent_replay')}")

        # ---- Step 11: NEG error status NOT cached ----
        error_body = {
            "instruction": "read dead localhost",
            "target": "http://localhost:9999/never-running",
            "adapter": "playwright",
            "dry_run": False,
            "user_role": "tester",
            "idempotency_key": "ERR-K1",
            "metadata": {"timeout_ms": 1000},
        }
        r1 = client.post("/api/v1/agent-platform/cua/execute",
                         headers={"X-Tenant-ID": "tenant-e"}, json=error_body)
        r2 = client.post("/api/v1/agent-platform/cua/execute",
                         headers={"X-Tenant-ID": "tenant-e"}, json=error_body)
        body1, body2 = r1.json(), r2.json()
        step(11, "NEGATIVE: error exec NOT cached → retry is fresh",
             body1["status"] == "error" and body2["status"] == "error"
             and "idempotent_replay" not in body1["result"]
             and "idempotent_replay" not in body2["result"],
             f"r1.status={body1['status']} r2.status={body2['status']} r2.replay={body2['result'].get('idempotent_replay')}")

        # ---- Step 12: TTL expiry — rebuild app with TINY TTL so we can hit it ----
        client_short_ttl = TestClient(_build_app(ttl_seconds=0.2))
        r1 = client_short_ttl.post("/api/v1/agent-platform/cua/execute",
                                    headers={"X-Tenant-ID": "tenant-ttl"},
                                    json={**body_a_dry, "idempotency_key": "TTL-K1"})
        # Sleep PAST TTL expiry
        time.sleep(0.4)
        r2 = client_short_ttl.post("/api/v1/agent-platform/cua/execute",
                                    headers={"X-Tenant-ID": "tenant-ttl"},
                                    json={**body_a_dry, "idempotency_key": "TTL-K1"})
        body2 = r2.json()
        step(12, "TTL expiry (200ms+sleep 400ms): second call is FRESH (not a replay)",
             r2.status_code == 200 and "idempotent_replay" not in body2["result"],
             f"replay={body2['result'].get('idempotent_replay')}")

    print(f"\n\033[32mALL 12 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
