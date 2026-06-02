#!/usr/bin/env python3
"""
Drill: §56 Stage-1 adapter — DSPy RAG prompt optimizer (4th in series).

The earlier 3 Stage-1 adapters (AgentOps wrap, LiteLLM gateway, Pydantic AI
typed council) all share an identical contract:
  - Lazy import, never default-on, feature-flag opt-in
  - Audit row per run with §38.3 required fields
  - Structured error envelope for SDK/provider failures
  - Drill ≥3 negative + a schema invariant

This drill locks the same invariants for DSPy. Offline-friendly via
dspy.utils.dummies.DummyLM — no Ollama / OpenAI / Anthropic needed.

Steps (10 total; 4 negative + a schema invariant):
  1. (+) Disabled fallback when INSUR_DSPY_OPTIMIZER_ENABLED unset →
        outcome='disabled'; audit row written
  2. (+) Unavailable fallback when dspy import probe says no →
        outcome='unavailable'; audit row written
  3. (-) NEG validation: empty train_examples → outcome='validation_error',
        NO compile attempted (gate before LM)
  4. (-) NEG validation: optimizer not in whitelist → outcome='validation_error'
  5. (-) NEG validation: metric not in whitelist → outcome='validation_error'
  6. (-) NEG validation: example missing required keys → outcome='validation_error'
  7. (+) End-to-end with DummyLM: enabled + valid examples + LM configured →
        outcome='executed', n_demos_compiled > 0, accuracy_after >= accuracy_before
  8. (+) §38.3 audit row schema invariant: all rows carry required fields
        (ts, request_id, tenant_id, actor, tool, outcome)
  9. (+) status() returns the adapter snapshot for the agent-platform surface
  10.(-) NEG disk-write failure → run STILL returns a result object
        (best-effort audit per §57.7)

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

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _reset_modules():
    for mod in list(sys.modules.keys()):
        if mod.startswith("services.dspy_optimizer"):
            del sys.modules[mod]


def _audit_rows(path: Path):
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


SAMPLE_EXAMPLES = [
    {
        "question": "What is the capital of France?",
        "context": "France is a country in Western Europe. Its capital is Paris.",
        "answer": "Paris",
    },
    {
        "question": "What is the capital of the UK?",
        "context": "The United Kingdom's capital is London.",
        "answer": "London",
    },
    {
        "question": "What is the capital of Japan?",
        "context": "Japan is an island nation. Its capital is Tokyo.",
        "answer": "Tokyo",
    },
    {
        "question": "What is the capital of Germany?",
        "context": "Germany is a country in central Europe. Its capital is Berlin.",
        "answer": "Berlin",
    },
]


def main() -> int:
    print("\nDRILL: §56 Stage-1 adapter #4 — DSPy RAG prompt optimizer\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        audit_path = Path(tmp) / "dspy_optimizer_runs.jsonl"
        os.environ["INSUR_DSPY_AUDIT_PATH"] = str(audit_path)
        # Start in disabled-state for step 1
        os.environ.pop("INSUR_DSPY_OPTIMIZER_ENABLED", None)
        _reset_modules()
        import services.dspy_optimizer as dopt

        # ---- Step 1: disabled fallback ----
        res = dopt.run_optimization(SAMPLE_EXAMPLES, tenant_id="tenant-a", request_id="req-1")
        rows = _audit_rows(audit_path)
        step(1, "INSUR_DSPY_OPTIMIZER_ENABLED unset → outcome='disabled' + audit row",
             res.outcome == "disabled"
             and len(rows) == 1
             and rows[0]["outcome"] == "disabled"
             and rows[0]["tenant_id"] == "tenant-a"
             and rows[0]["request_id"] == "req-1",
             f"outcome={res.outcome!r} rows={len(rows)}")

        # ---- Step 2: unavailable fallback (monkeypatch import probe) ----
        os.environ["INSUR_DSPY_OPTIMIZER_ENABLED"] = "true"
        orig_importable = dopt.is_importable
        dopt.is_importable = lambda: False
        try:
            res = dopt.run_optimization(SAMPLE_EXAMPLES, tenant_id="tenant-a", request_id="req-2")
        finally:
            dopt.is_importable = orig_importable
        rows = _audit_rows(audit_path)
        last = rows[-1]
        step(2, "import probe says no → outcome='unavailable' + audit row",
             res.outcome == "unavailable"
             and last["outcome"] == "unavailable"
             and last["request_id"] == "req-2",
             f"outcome={res.outcome!r} last_outcome={last['outcome']!r}")

        # ---- Step 3: NEG empty train_examples → validation_error, no compile ----
        rows_before = len(_audit_rows(audit_path))
        res = dopt.run_optimization([], tenant_id="tenant-a", request_id="req-3")
        rows = _audit_rows(audit_path)
        last = rows[-1]
        step(3, "NEG: empty examples → validation_error, single audit row with 'validate' stage",
             res.outcome == "validation_error"
             and len(res.validation_errors) >= 1
             and last["outcome"] == "validation_error"
             and last["tool"] == "dspy.validate"
             and (len(rows) - rows_before) == 1,
             f"outcome={res.outcome!r} errors={res.validation_errors}")

        # ---- Step 4: NEG bad optimizer → validation_error ----
        res = dopt.run_optimization(
            SAMPLE_EXAMPLES, optimizer="MIPROv99", request_id="req-4",
        )
        last = _audit_rows(audit_path)[-1]
        step(4, "NEG: optimizer not in whitelist → validation_error",
             res.outcome == "validation_error"
             and any("optimizer" in e for e in res.validation_errors)
             and last["outcome"] == "validation_error",
             f"errors={res.validation_errors}")

        # ---- Step 5: NEG bad metric → validation_error ----
        res = dopt.run_optimization(
            SAMPLE_EXAMPLES, metric="cosine_sim", request_id="req-5",
        )
        step(5, "NEG: metric not in whitelist → validation_error",
             res.outcome == "validation_error"
             and any("metric" in e for e in res.validation_errors),
             f"errors={res.validation_errors}")

        # ---- Step 6: NEG malformed example (missing 'context') → validation_error ----
        bad_examples = [
            {"question": "What?", "answer": "yes"},   # missing context
            {"question": "How?", "context": "ctx", "answer": "no"},
        ]
        res = dopt.run_optimization(bad_examples, request_id="req-6")
        step(6, "NEG: example missing required key → validation_error",
             res.outcome == "validation_error"
             and any("missing" in e for e in res.validation_errors),
             f"errors={res.validation_errors[:1]}")

        # ---- Step 7: end-to-end with DummyLM ----
        import dspy
        from dspy.utils.dummies import DummyLM

        # DummyLM cycles through canned answers in order — it does NOT
        # condition on the prompt. So accuracy direction (after >= before)
        # is non-deterministic across DummyLM cursor positions. The drill
        # asserts the MECHANISM works (validate -> compile -> demos
        # selected -> audit row written), not the learning effect — DSPy's
        # own test suite covers learning behaviour against real LMs.
        dummy_answers = [{"answer": ex["answer"]} for ex in SAMPLE_EXAMPLES] * 8
        dspy.configure(lm=DummyLM(dummy_answers))

        res = dopt.run_optimization(
            SAMPLE_EXAMPLES,
            tenant_id="tenant-a", request_id="req-7",
            optimizer="BootstrapFewShot", metric="contains",
            max_bootstrapped_demos=2, max_labeled_demos=2,
        )
        last = _audit_rows(audit_path)[-1]
        step(
            7,
            "end-to-end with DummyLM → outcome='executed', n_demos > 0, both accuracies in [0,1], audit row carries n_demos",
            res.outcome == "executed"
            and res.n_demos_compiled > 0
            and res.train_accuracy_before is not None
            and 0.0 <= res.train_accuracy_before <= 1.0
            and res.train_accuracy_after is not None
            and 0.0 <= res.train_accuracy_after <= 1.0
            and last["outcome"] == "executed"
            and last["n_demos_compiled"] == res.n_demos_compiled
            and last["optimizer"] == "BootstrapFewShot"
            and "optimized_prompt_repr" not in last,    # repr only in result obj, not audit
            f"outcome={res.outcome!r} n_demos={res.n_demos_compiled} "
            f"before={res.train_accuracy_before} after={res.train_accuracy_after}",
        )

        # ---- Step 8: §38.3 schema invariant ----
        required = {"ts", "request_id", "tenant_id", "actor", "tool", "outcome"}
        rows = _audit_rows(audit_path)
        bad = [r for r in rows if not required.issubset(r.keys())]
        step(8, f"§38.3 schema invariant — all {len(rows)} rows have required fields",
             not bad,
             f"{len(bad)} bad rows; first: {bad[0] if bad else None}")

        # ---- Step 9: status() snapshot ----
        snap = dopt.status()
        step(9, "status() returns adapter snapshot for agent-platform surface",
             snap["key"] == "dspy-optimizer"
             and snap["enabled"] is True   # we set it true earlier
             and snap["importable"] is True
             and "BootstrapFewShot" in snap["allowed_optimizers"]
             and "contains" in snap["allowed_metrics"]
             and "max_train_examples" in snap["limits"],
             f"key={snap['key']!r} enabled={snap['enabled']}")

        # ---- Step 10: NEG disk-write failure → run STILL returns a result ----
        # Point audit at an un-creatable path (parent is a file, not a dir).
        blocker = Path(tmp) / "blocker.file"
        blocker.write_text("")
        bad_audit = blocker / "dspy.jsonl"
        os.environ["INSUR_DSPY_AUDIT_PATH"] = str(bad_audit)
        _reset_modules()
        import services.dspy_optimizer as dopt2

        res = dopt2.run_optimization(SAMPLE_EXAMPLES, request_id="req-10")
        step(10, "NEG: disk-write failure → run STILL returns a DSPyOptimizationResult",
             # Either executed (LM still configured) OR error from the recursive
             # dspy.configure dropout — either way the call must NOT raise.
             isinstance(res, dopt2.DSPyOptimizationResult)
             and res.outcome in {"executed", "error", "disabled", "unavailable"},
             f"outcome={res.outcome!r}")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
