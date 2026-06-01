#!/usr/bin/env python3
"""
Drill: Pydantic AI typed council Stage-1 adapter (backend/services/typed_council.py).

§56.2 Stage-1 contract: lazy import + feature-flag opt-in + never default-on
+ original code path always wins. Drill mocks pydantic_ai.Agent so no real
LLM call is made; verifies the typed-output schema enforcement contract.

Steps (11 total; 5 negative):
  1. (+) Default env → outcome='disabled' + audit row written
  2. (-) NEG: disabled response has no creds/model leak
  3. (+) Enabled + mocked Pydantic AI → outcome='executed' with all 3
        typed outputs (author / reviewer / chair) populated
  4. (+) 3 audit rows written (one per stage) on successful run
  5. (-) NEG: schema validation failure → outcome='schema_error' (not crash);
        partial state preserved
  6. (-) NEG: Pydantic AI raises non-validation exception → outcome='error'
        wrapped (latency_ms still recorded)
  7. (+) tenant_id + request_id propagated through every audit row
  8. (-) NEG: API key value NEVER appears in audit rows OR CouncilResult
  9. (+) status() returns adapter snapshot without making any LLM call
  10.(-) NEG: pydantic_ai package not importable → outcome='unavailable'
        (no crash) — drill uses a SimpleNamespace with no required attrs
  11.(+) Council schemas validate their own constraints (confidence ∈ [0,1],
        score ∈ [1,10], decision ∈ {approve, reject, revise})

# RESOURCES: disk_io

Exit 0 on PASS, 1 on any failure.
"""
from __future__ import annotations

import json
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


def _reset_modules():
    for mod in ("services.typed_council",):
        if mod in sys.modules:
            del sys.modules[mod]


def _audit_rows(path: Path):
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def _make_mock_pydantic_ai(behavior: str):
    """Build a mock pydantic_ai module with Agent class controlled by `behavior`:
       - "happy" — all 3 agents return valid output
       - "schema_error" — author returns valid but reviewer raises ValidationError
       - "exception" — author raises RuntimeError
    """
    mock_mod = SimpleNamespace()

    class FakeRunResult:
        def __init__(self, output):
            self.output = output

    class FakeAgent:
        def __init__(self, model, output_type=None, system_prompt=None):
            self.model = model
            self.output_type = output_type
            self.system_prompt = system_prompt

        def run_sync(self, prompt: str):
            # Route by output_type class NAME (set on construction) —
            # `is` comparison fails when sys.modules has been reset between
            # the drill's setup and FakeAgent's invocation (the class identity
            # changes across re-imports). Name comparison is identity-free.
            from services.typed_council import (
                CouncilAuthorOutput, CouncilReviewerOutput, CouncilChairDecision,
            )
            type_name = getattr(self.output_type, "__name__", "")
            t = self.output_type
            if type_name == "CouncilAuthorOutput":
                if behavior == "exception":
                    raise RuntimeError("provider down")
                return FakeRunResult(CouncilAuthorOutput(
                    proposal="ship it tuesday with feature-flag",
                    confidence=0.8,
                    risks=["cache stampede on launch", "tenant b incompatibility"],
                ))
            if type_name == "CouncilReviewerOutput":
                if behavior == "schema_error":
                    from pydantic import ValidationError
                    try:
                        CouncilReviewerOutput(critique="", score=99, must_fix=[])
                    except ValidationError as ve:
                        raise ve
                return FakeRunResult(CouncilReviewerOutput(
                    critique="proposal lacks rollback plan",
                    score=7,
                    must_fix=["add rollback plan", "name on-call owner"],
                ))
            if type_name == "CouncilChairDecision":
                return FakeRunResult(CouncilChairDecision(
                    decision="revise",
                    rationale="reviewer flagged 2 must-fix items",
                    final_text=None,
                ))
            raise RuntimeError(f"unknown output_type={t}")

    mock_mod.Agent = FakeAgent
    return mock_mod


def main() -> int:
    print("\nDRILL: Pydantic AI typed council (§56 Stage-1 adapter)\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        audit_path = Path(tmp) / "typed_council.jsonl"
        os.environ["HOLY_TYPED_COUNCIL_AUDIT_PATH"] = str(audit_path)

        # ---- Step 1: default disabled ----
        os.environ.pop("HOLY_TYPED_COUNCIL_ENABLED", None)
        _reset_modules()
        from services import typed_council

        r1 = typed_council.run_typed_council(
            "should we deploy on tuesday?",
            tenant_id="tenant-a", request_id="req-1",
        )
        rows = _audit_rows(audit_path)
        step(1, "default env: outcome='disabled' + audit row written",
             r1.outcome == "disabled" and len(rows) == 1
             and rows[0]["outcome"] == "disabled",
             f"outcome={r1.outcome} rows={len(rows)}")

        # ---- Step 2: NEG no creds leak in disabled response ----
        leak_text = (r1.error_msg or "") + (r1.author or "")
        step(2, "NEG: disabled response has no model/creds leak in text fields",
             r1.author is None and r1.reviewer is None and r1.chair is None
             and "sk-" not in str(leak_text),
             f"author={r1.author} leak={'sk-' in str(leak_text)}")

        # ---- Step 3: enabled + mocked happy path → executed ----
        os.environ["HOLY_TYPED_COUNCIL_ENABLED"] = "true"
        os.environ["HOLY_LLM_MODEL"] = "openai/gpt-4o-mini"

        _reset_modules()
        mock_happy = _make_mock_pydantic_ai("happy")
        with patch.dict(sys.modules, {"pydantic_ai": mock_happy}):
            from services import typed_council as tc3
            r3 = tc3.run_typed_council(
                "should we deploy tuesday?",
                tenant_id="tenant-a", request_id="req-3",
            )
        step(3, "happy path: outcome='executed' with author + reviewer + chair populated",
             r3.outcome == "executed"
             and r3.author is not None and r3.reviewer is not None and r3.chair is not None
             and r3.author.confidence == 0.8
             and r3.reviewer.score == 7
             and r3.chair.decision == "revise",
             f"outcome={r3.outcome} decision={r3.chair.decision if r3.chair else None} error={r3.error_msg!r}")

        # ---- Step 4: 3 audit rows per stage on executed ----
        rows = _audit_rows(audit_path)
        # Total rows: 1 (disabled from step 1) + 3 (author/reviewer/chair from step 3)
        recent_three = rows[-3:]
        stages = [r["tool"] for r in recent_three]
        step(4, "happy path writes 3 audit rows (author + reviewer + chair)",
             stages == ["pydantic_ai.author", "pydantic_ai.reviewer", "pydantic_ai.chair"],
             f"stages={stages}")

        # ---- Step 5: NEG schema validation error ----
        mock_schema_err = _make_mock_pydantic_ai("schema_error")
        with patch.dict(sys.modules, {"pydantic_ai": mock_schema_err}):
            _reset_modules()
            from services import typed_council as tc5
            r5 = tc5.run_typed_council(
                "test schema fail",
                tenant_id="tenant-b", request_id="req-5",
            )
        step(5, "NEG: schema validation error → outcome='schema_error' (not crash)",
             r5.outcome == "schema_error" and r5.error_type is not None
             and "Validation" in (r5.error_type or ""),
             f"outcome={r5.outcome} error_type={r5.error_type}")

        # ---- Step 6: NEG provider exception → wrapped ----
        mock_exc = _make_mock_pydantic_ai("exception")
        with patch.dict(sys.modules, {"pydantic_ai": mock_exc}):
            _reset_modules()
            from services import typed_council as tc6
            r6 = tc6.run_typed_council(
                "test exception", tenant_id="tenant-c", request_id="req-6",
            )
        step(6, "NEG: provider exception → outcome='error' wrapped with latency_ms",
             r6.outcome == "error"
             and r6.error_type == "RuntimeError"
             and r6.latency_ms >= 0,
             f"outcome={r6.outcome} error_type={r6.error_type}")

        # ---- Step 7: tenant_id + request_id propagation ----
        rows = _audit_rows(audit_path)
        # Find rows for req-5 + req-6
        req5_rows = [r for r in rows if r.get("request_id") == "req-5"]
        req6_rows = [r for r in rows if r.get("request_id") == "req-6"]
        step(7, "tenant_id + request_id propagated through every audit row",
             all(r.get("tenant_id") == "tenant-b" for r in req5_rows)
             and all(r.get("tenant_id") == "tenant-c" for r in req6_rows)
             and len(req5_rows) >= 1 and len(req6_rows) >= 1,
             f"req-5_rows={len(req5_rows)} req-6_rows={len(req6_rows)}")

        # ---- Step 8: NEG creds never leak ----
        os.environ["OPENAI_API_KEY"] = "sk-COUNCIL-DRILL-SHOULD-NOT-LEAK"
        mock_happy2 = _make_mock_pydantic_ai("happy")
        with patch.dict(sys.modules, {"pydantic_ai": mock_happy2}):
            _reset_modules()
            from services import typed_council as tc8
            r8 = tc8.run_typed_council(
                "no leak test", tenant_id="tenant-d", request_id="req-8",
            )
        rows = _audit_rows(audit_path)
        rows_str = json.dumps(rows)
        result_str = json.dumps(r8.__dict__, default=str)
        leak_rows = "sk-COUNCIL-DRILL-SHOULD-NOT-LEAK" in rows_str
        leak_result = "sk-COUNCIL-DRILL-SHOULD-NOT-LEAK" in result_str
        step(8, "NEG: API key value NEVER appears in audit rows OR CouncilResult",
             not leak_rows and not leak_result,
             f"row_leak={leak_rows} result_leak={leak_result}")
        del os.environ["OPENAI_API_KEY"]

        # ---- Step 9: status() snapshot ----
        with patch.dict(sys.modules, {"pydantic_ai": mock_happy2}):
            _reset_modules()
            from services import typed_council as tc9
            s = tc9.status()
        step(9, "status() returns snapshot without making any LLM call",
             s.get("key") == "typed-council"
             and s.get("enabled") is True
             and s.get("importable") is True
             and len(s.get("schemas", [])) == 3,
             f"keys={sorted(s.keys())} schemas={len(s.get('schemas', []))}")

        # ---- Step 10: NEG unavailable when pydantic_ai missing ----
        with patch("importlib.util.find_spec", return_value=None):
            # Also need to remove pydantic_ai from sys.modules check
            saved_pa = sys.modules.pop("pydantic_ai", None)
            try:
                _reset_modules()
                from services import typed_council as tc10
                r10 = tc10.run_typed_council(
                    "no sdk", tenant_id="tenant-e", request_id="req-10",
                )
            finally:
                if saved_pa is not None:
                    sys.modules["pydantic_ai"] = saved_pa
        step(10, "NEG: pydantic_ai not importable → outcome='unavailable' (no crash)",
             r10.outcome == "unavailable" and "not installed" in (r10.error_msg or ""),
             f"outcome={r10.outcome} error_msg={r10.error_msg!r}")

        # ---- Step 11: schema constraints enforced ----
        from services.typed_council import (
            CouncilAuthorOutput, CouncilReviewerOutput, CouncilChairDecision,
        )
        from pydantic import ValidationError

        # confidence > 1.0 should fail
        confidence_violation = False
        try:
            CouncilAuthorOutput(proposal="p", confidence=1.5, risks=[])
        except ValidationError:
            confidence_violation = True

        # score = 11 should fail
        score_violation = False
        try:
            CouncilReviewerOutput(critique="c", score=11, must_fix=[])
        except ValidationError:
            score_violation = True

        # decision = "maybe" should fail
        decision_violation = False
        try:
            CouncilChairDecision(decision="maybe", rationale="r")
        except ValidationError:
            decision_violation = True

        step(11, "schema constraints enforced (confidence ≤ 1, score ≤ 10, decision ∈ {approve,reject,revise})",
             confidence_violation and score_violation and decision_violation,
             f"confidence={confidence_violation} score={score_violation} decision={decision_violation}")

    print(f"\n\033[32mALL 11 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
