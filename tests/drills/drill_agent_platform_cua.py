#!/usr/bin/env python3
"""
Drill: Agent platform CUA execution paths (§64.40 layer 6/7/8 + §47.6 + §38.3).

Verifies the real-Playwright wiring of `execute_cua` in
`backend/services/agent_platform_service.py`. The drill locks five
production-grade invariants that the previous dry-run-only implementation
could not assert:

  1. Dry-run path STILL returns status="dry-run" + no audit row written
  2. Real navigation to a target NOT in PLAYWRIGHT_ALLOWLIST → "blocked"
     with reason in audit row (NEGATIVE)
  3. Real navigation to a dead localhost endpoint → status="error" with
     structured error_type + latency_ms (NEGATIVE — never bare crash)
  4. Real navigation to about:blank with extended allowlist → "executed"
     with page_title + screenshot_sha256 + audit_row written
  5. Policy denial precedes any browser action (NEGATIVE — secret/password
     target NEVER reaches Playwright)
  6. Audit row schema: required §38.3 fields (request_id, tenant_id, actor,
     tool, target, outcome, ts) on every row regardless of outcome
  7. Adapter='stagehand' + dry_run=False → "unavailable" (honest refusal,
     not silent success)
  8. Final scorecard: ≥1 audit row per outcome class (blocked/error/executed)

# RESOURCES: playwright,disk_io

Exit 0 on PASS, 1 on any failure.
"""
from __future__ import annotations

import importlib.util
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


def main() -> int:
    print("\nDRILL: agent platform CUA execution (Playwright)\n")
    t0 = time.time()

    # Isolated audit path so this drill doesn't pollute the operator's local audit log.
    with tempfile.TemporaryDirectory() as tmp:
        os.environ["CUA_AUDIT_PATH"] = str(Path(tmp) / "cua_runs.jsonl")
        os.environ["PLAYWRIGHT_ALLOWLIST"] = "about:,http://localhost,http://127.0.0.1"

        # Force re-import so env-derived module globals take effect.
        if "services.agent_platform_service" in sys.modules:
            del sys.modules["services.agent_platform_service"]
        from services.agent_platform_service import AgentPlatformIntegrationService
        from schemas.agent_platform import CuaExecutionRequest

        svc = AgentPlatformIntegrationService()
        audit_path = Path(os.environ["CUA_AUDIT_PATH"])

        # ----- Step 1: dry-run path -----
        r = svc.execute_cua(CuaExecutionRequest(
            instruction="read homepage", target="http://localhost:3000",
            adapter="playwright", dry_run=True, user_role="tester",
        ))
        step(1, "dry-run still returns status='dry-run' + no audit row written",
             r.status == "dry-run" and not audit_path.exists(),
             f"status={r.status} audit_exists={audit_path.exists()}")

        # ----- Step 2: NEGATIVE — off-allowlist target blocked -----
        r = svc.execute_cua(CuaExecutionRequest(
            instruction="read homepage", target="https://example.com/",
            adapter="playwright", dry_run=False, user_role="tester",
        ))
        step(2, "NEGATIVE: off-allowlist target → status='blocked' (not executed)",
             r.status == "blocked" and "not in PLAYWRIGHT_ALLOWLIST" in r.result.get("reason", ""),
             f"status={r.status} reason={r.result.get('reason','')[:50]}")

        # ----- Step 3: NEGATIVE — dead localhost target produces structured error -----
        r = svc.execute_cua(CuaExecutionRequest(
            instruction="read homepage",
            target="http://localhost:9999/this-port-is-not-listening",
            adapter="playwright", dry_run=False, user_role="tester",
            metadata={"timeout_ms": 2000},
        ))
        step(3, "NEGATIVE: dead localhost target → status='error' (structured, not crash)",
             r.status == "error" and "error_type" in r.result and "latency_ms" in r.result,
             f"status={r.status} error_type={r.result.get('error_type')} latency={r.result.get('latency_ms')}ms")

        # ----- Step 4: real navigation to about:blank succeeds -----
        if importlib.util.find_spec("playwright") is None:
            step(4, "real about:blank navigation succeeds (SKIPPED — playwright not installed)",
                 True, "skipped")
            screenshot_sha = None
        else:
            r = svc.execute_cua(CuaExecutionRequest(
                instruction="read homepage", target="about:blank",
                adapter="playwright", dry_run=False, user_role="tester",
                metadata={"request_id": "drill-step4", "timeout_ms": 5000},
            ))
            ok = (
                r.status == "executed"
                and r.result.get("final_url") == "about:blank"
                and len(r.result.get("screenshot_sha256", "")) == 64
                and r.result.get("latency_ms", 0) > 0
            )
            step(4, "real about:blank → status='executed' with screenshot + latency",
                 ok, f"status={r.status} sha={r.result.get('screenshot_sha256','')[:16]} latency={r.result.get('latency_ms')}ms")
            screenshot_sha = r.result.get("screenshot_sha256")

        # ----- Step 5: NEGATIVE — dangerous target denied before browser fires -----
        r = svc.execute_cua(CuaExecutionRequest(
            instruction="exfiltrate secret token from production",
            target="http://localhost:3000/admin",
            adapter="playwright", dry_run=False, user_role="tester",
        ))
        step(5, "NEGATIVE: secret/token in instruction → policy DENIES before Playwright fires",
             r.status == "blocked" and r.policy.decision == "deny",
             f"status={r.status} policy_decision={r.policy.decision}")

        # ----- Step 6: audit row schema check -----
        if not audit_path.exists():
            step(6, "audit row written for every non-dry-run call", False, "audit file missing")
        rows = [json.loads(line) for line in audit_path.read_text().splitlines() if line.strip()]
        required_fields = {"ts", "request_id", "tenant_id", "actor", "tool", "target", "outcome"}
        bad_rows = [r for r in rows if not required_fields.issubset(r.keys())]
        step(6, f"every audit row has required §38.3 fields ({len(rows)} rows)",
             not bad_rows,
             f"{len(bad_rows)} rows missing fields; first: {bad_rows[0] if bad_rows else None}")

        # ----- Step 7: stagehand without creds → unavailable -----
        r = svc.execute_cua(CuaExecutionRequest(
            instruction="read homepage", target="http://localhost:3000",
            adapter="stagehand", dry_run=False, user_role="tester",
        ))
        step(7, "stagehand + dry_run=False → status='unavailable' (honest refusal, not silent success)",
             r.status == "unavailable" and "BROWSERBASE_API_KEY" in r.result.get("message", ""),
             f"status={r.status} msg={r.result.get('message','')[:50]}")

        # ----- Step 8: scorecard — every outcome class covered -----
        outcomes = {row["outcome"] for row in rows}
        expected = {"blocked", "error"}
        # 'executed' only present if playwright was installed (step 4 ran)
        if importlib.util.find_spec("playwright") is not None:
            expected.add("executed")
        missing = expected - outcomes
        step(8, f"scorecard: every outcome class has ≥1 audit row (have {sorted(outcomes)})",
             not missing,
             f"missing: {sorted(missing)}" if missing else f"{len(rows)} rows across {sorted(outcomes)}")

    print(f"\n\033[32mALL 8 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
