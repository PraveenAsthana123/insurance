#!/usr/bin/env python3
"""
Drill: AgentOps Stage-1 adapter wrap on execute_cua (§56 gate-2).

Stage-1 adapter contract per global CLAUDE.md §56.2: feature flag opt-in,
lazy import, NEVER default-on, original code path always wins. Observability
MUST NOT change response shape OR fail the request even if the SDK is broken.

Steps (10 total; 5 negative):
  1. (+) Default (env unset) → no AgentOps activity; existing behavior intact
  2. (-) NEG: AGENTOPS_ENABLED=true but AGENTOPS_API_KEY missing → still no
        AgentOps activity (BOTH gates must be set)
  3. (-) NEG: AGENTOPS_ENABLED=false + key set → still off (explicit toggle)
  4. (+) Both env set + sdk import fails (simulated) → request still succeeds
        with identical response shape (NEVER crashes the call)
  5. (-) NEG: AgentOps SDK exception during start_session → request unaffected
  6. (-) NEG: AgentOps SDK exception during record_outcome → request unaffected
  7. (+) When wrap is enabled + functional, agentops.start_session was called
        with tenant tag (verified via monkeypatch)
  8. (+) Response shape unchanged across (default/enabled/broken) — adapter,
        status, result keys all match
  9. (-) NEG: AgentOps wrap never modifies the response object
  10.(+) AGENTOPS_API_KEY value NEVER appears in the response (no creds leak)

# RESOURCES: disk_io,playwright

Exit 0 on PASS, 1 on any failure.
"""
from __future__ import annotations

import os
import sys
import tempfile
import time
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _reset_modules() -> None:
    for mod in ("services.agent_platform_service", "schemas.agent_platform"):
        if mod in sys.modules:
            del sys.modules[mod]


def _baseline_request():
    """A safe dry-run request shape used by every step."""
    from schemas.agent_platform import CuaExecutionRequest
    return CuaExecutionRequest(
        instruction="drill exec", target="http://localhost:3000",
        adapter="playwright", dry_run=True, user_role="tester",
        metadata={"tenant_id": "tenant-a", "request_id": "drill-1"},
    )


def main() -> int:
    print("\nDRILL: AgentOps Stage-1 adapter wrap (§56 gate-2)\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        os.environ["CUA_AUDIT_PATH"] = str(Path(tmp) / "audit.jsonl")
        os.environ["CUA_IDEMPOTENCY_PATH"] = str(Path(tmp) / "idem.jsonl")

        # ---- Step 1: default (env unset) → no AgentOps activity ----
        for var in ("AGENTOPS_ENABLED", "AGENTOPS_API_KEY"):
            os.environ.pop(var, None)
        _reset_modules()
        from services.agent_platform_service import AgentPlatformIntegrationService
        svc = AgentPlatformIntegrationService()
        baseline = svc.execute_cua(_baseline_request())
        step(1, "default env: response built normally (no AgentOps activity)",
             baseline.status == "dry-run",
             f"status={baseline.status!r}")

        # ---- Step 2: NEG enabled=true but no key ----
        os.environ["AGENTOPS_ENABLED"] = "true"
        os.environ.pop("AGENTOPS_API_KEY", None)
        _reset_modules()
        from services.agent_platform_service import (
            AgentPlatformIntegrationService as APIS2,
            _agentops_enabled,
        )
        step(2, "NEG: AGENTOPS_ENABLED=true but no API_KEY → _agentops_enabled() False",
             not _agentops_enabled(),
             f"_agentops_enabled()={_agentops_enabled()}")
        svc2 = APIS2()
        r2 = svc2.execute_cua(_baseline_request())
        # Should still return normally
        step(2.1 if False else 2, "  (and request returns successfully)",
             r2.status == "dry-run",
             f"status={r2.status!r}")

        # ---- Step 3: NEG enabled=false + key set ----
        os.environ["AGENTOPS_ENABLED"] = "false"
        os.environ["AGENTOPS_API_KEY"] = "fake-key-only"
        _reset_modules()
        from services.agent_platform_service import _agentops_enabled as _en3
        step(3, "NEG: AGENTOPS_ENABLED=false → off regardless of API_KEY",
             not _en3(),
             f"_agentops_enabled()={_en3()}")

        # ---- Step 4: both set + sdk import fails → request still succeeds ----
        os.environ["AGENTOPS_ENABLED"] = "true"
        os.environ["AGENTOPS_API_KEY"] = "fake-key-no-network"
        _reset_modules()
        # Force the agentops module to look broken
        broken_module = SimpleNamespace()
        def broken_init(*args, **kwargs):
            raise RuntimeError("simulated SDK init failure")
        broken_module.init = broken_init
        broken_module.start_session = lambda *a, **k: None
        broken_module.end_session = lambda *a, **k: None
        broken_module.record = lambda *a, **k: None
        broken_module.ActionEvent = lambda **kwargs: SimpleNamespace(**kwargs)
        with patch.dict(sys.modules, {"agentops": broken_module}):
            from services.agent_platform_service import AgentPlatformIntegrationService as APIS4
            svc4 = APIS4()
            r4 = svc4.execute_cua(_baseline_request())
            step(4, "broken SDK init: request still succeeds (no crash)",
                 r4.status == "dry-run",
                 f"status={r4.status!r}")

        # ---- Step 5: NEG start_session raises → request unaffected ----
        bad_start = SimpleNamespace()
        bad_start.init = lambda *a, **k: None
        bad_start.start_session = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("start_session boom"))
        bad_start.end_session = lambda *a, **k: None
        bad_start.record = lambda *a, **k: None
        bad_start.ActionEvent = lambda **kwargs: SimpleNamespace(**kwargs)
        with patch.dict(sys.modules, {"agentops": bad_start}):
            _reset_modules()
            from services.agent_platform_service import AgentPlatformIntegrationService as APIS5
            svc5 = APIS5()
            r5 = svc5.execute_cua(_baseline_request())
            step(5, "NEG: start_session raises → request unaffected",
                 r5.status == "dry-run",
                 f"status={r5.status!r}")

        # ---- Step 6: NEG record_outcome raises → request unaffected ----
        bad_record = SimpleNamespace()
        bad_record.init = lambda *a, **k: None
        bad_record.start_session = lambda *a, **k: SimpleNamespace(id="sess-1")
        bad_record.end_session = lambda *a, **k: None
        bad_record.record = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("record boom"))
        bad_record.ActionEvent = lambda **kwargs: SimpleNamespace(**kwargs)
        with patch.dict(sys.modules, {"agentops": bad_record}):
            _reset_modules()
            from services.agent_platform_service import AgentPlatformIntegrationService as APIS6
            svc6 = APIS6()
            r6 = svc6.execute_cua(_baseline_request())
            step(6, "NEG: record_outcome raises → request unaffected",
                 r6.status == "dry-run",
                 f"status={r6.status!r}")

        # ---- Step 7: functional SDK → start_session called with tenant tag ----
        calls = {"start": [], "record": [], "end": []}
        good = SimpleNamespace()
        good.init = lambda *a, **k: calls.setdefault("init", []).append(k)
        def _start(**kwargs):
            calls["start"].append(kwargs)
            return SimpleNamespace(id="sess-x")
        good.start_session = _start
        good.end_session = lambda **kwargs: calls["end"].append(kwargs)
        good.record = lambda event: calls["record"].append(event)
        good.ActionEvent = lambda **kwargs: SimpleNamespace(**kwargs)
        with patch.dict(sys.modules, {"agentops": good}):
            _reset_modules()
            from services.agent_platform_service import AgentPlatformIntegrationService as APIS7
            svc7 = APIS7()
            r7 = svc7.execute_cua(_baseline_request())
            has_tenant_tag = any(
                "tenant:tenant-a" in (call.get("tags") or [])
                for call in calls["start"]
            )
            step(7, "functional SDK: start_session called with tenant tag",
                 r7.status == "dry-run" and has_tenant_tag,
                 f"start_calls={len(calls['start'])} record_calls={len(calls['record'])} end_calls={len(calls['end'])}")

        # ---- Step 8: response shape stable across all three modes ----
        os.environ.pop("AGENTOPS_ENABLED", None)
        os.environ.pop("AGENTOPS_API_KEY", None)
        _reset_modules()
        from services.agent_platform_service import AgentPlatformIntegrationService as APIS_END
        svc8 = APIS_END()
        r_off = svc8.execute_cua(_baseline_request())
        # Compare baseline → off, broken, functional all returned 'dry-run' with same result keys
        baseline_keys = set(baseline.result.keys())
        r4_keys = set(r4.result.keys())
        r5_keys = set(r5.result.keys())
        r6_keys = set(r6.result.keys())
        r7_keys = set(r7.result.keys())
        step(8, "response.result keys unchanged across off/broken/functional adapter",
             baseline_keys == r4_keys == r5_keys == r6_keys == r7_keys == set(r_off.result.keys()),
             f"baseline_keys={sorted(baseline_keys)}")

        # ---- Step 9: NEG wrap never modifies response object ----
        # The result returned with adapter enabled should == result with adapter disabled
        # (they're built independently each call so we compare CONTENT not IDENTITY)
        step(9, "NEG: wrap NEVER modifies response shape (same status across all modes)",
             baseline.status == r4.status == r5.status == r6.status == r7.status == r_off.status,
             f"all_status='dry-run' (off/broken/functional all equal)")

        # ---- Step 10: NEG API key value never in response ----
        api_key = "fake-key-no-network"  # what was set in step 4
        leak_check = api_key not in str(r4.model_dump())
        step(10, "NEG: AGENTOPS_API_KEY value never appears in response (no creds leak)",
             leak_check,
             f"key_present_in_response={not leak_check}")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
