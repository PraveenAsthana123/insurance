"""DSPy RAG prompt optimizer — §56 Stage-1 adapter (4th in the series).

DSPy (https://dspy.ai/) is the de-facto framework for *systematic* prompt
engineering: you declare a Signature (typed input/output contract), pick
a Module (Predict / ChainOfThought / etc.), and an Optimizer compiles
the prompt — including few-shot demos selected from labelled examples
— by running the program against a validation set and keeping what
scores best.

INSUR's existing prompt path is whatever the caller hand-writes in
`prompts/`. This adapter is the COMPLEMENTARY in-process synchronous
path for *RAG QA* prompts specifically:

  Input  → labelled examples [(question, context, answer), ...]
  Output → an optimized program (signature + bootstrapped few-shot
           demos) the caller can serialize, version, and load later

Per global CLAUDE.md §56.2 Stage-1 contract:
  - Lazy import of dspy (SDK absence → unavailable, never crash)
  - Feature-flag opt-in: INSUR_DSPY_OPTIMIZER_ENABLED=true
  - Default model from INSUR_LLM_MODEL (reuses gateway env contract)
  - Never default-on; existing hand-written prompts keep working

Per §38.3:
  - Every optimization run writes one audit row to
    data/agent-supervisor/dspy_optimizer_runs.jsonl

Per §57.7:
  - Validation failures wrapped → outcome='validation_error'
  - Provider exceptions wrapped → outcome='error'
  - LM credentials NEVER appear in audit row or response

Per §59.4 + §48 (RAG explainability):
  - Optimizer choice + n_demos_compiled + before/after metric are
    persisted so a downstream reviewer can defend why this prompt
    shipped vs the baseline

Drill: tests/drills/drill_dspy_optimizer.py
"""
from __future__ import annotations

import importlib.util
import json
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

_AUDIT_PATH = Path(
    os.environ.get("INSUR_DSPY_AUDIT_PATH", "data/agent-supervisor/dspy_optimizer_runs.jsonl")
)
_DEFAULT_MODEL = os.environ.get("INSUR_LLM_MODEL", "ollama/kivi:local")

# Whitelist of optimizer names exposed via this adapter. Other DSPy
# optimizers exist (MIPROv2, COPRO, BootstrapFinetune, ...) but they
# need additional config (validation set, separate prompt LM, etc.) —
# add them when a caller actually needs them rather than expose them
# half-wired.
_ALLOWED_OPTIMIZERS = frozenset({"BootstrapFewShot", "LabeledFewShot"})

# Whitelist of metrics. Each maps to a callable that takes (example, pred, trace)
# and returns a bool — DSPy's metric contract.
_ALLOWED_METRICS = frozenset({"exact_match", "contains"})

# Limits — guard against runaway compile costs. Caller can scale up
# explicitly if needed.
_MAX_TRAIN_EXAMPLES = 200
_MAX_DEMOS = 16

# Required keys in every training example.
_REQUIRED_KEYS = ("question", "context", "answer")


@dataclass
class DSPyOptimizationResult:
    """Normalized result — never raises out of `run_optimization`."""

    outcome: str   # "executed" | "disabled" | "unavailable" | "validation_error" | "error"
    optimizer_used: str = ""
    optimized_prompt_repr: str = ""
    n_demos_compiled: int = 0
    train_accuracy_before: float | None = None
    train_accuracy_after: float | None = None
    request_id: str = ""
    tenant_id: str = ""
    model: str = ""
    latency_ms: int = 0
    error_type: str | None = None
    error_msg: str | None = None
    validation_errors: list[str] = field(default_factory=list)


def is_enabled() -> bool:
    """True only when explicitly opted-in. Never default-on (§56.2)."""
    return os.environ.get("INSUR_DSPY_OPTIMIZER_ENABLED", "").lower() == "true"


def is_importable() -> bool:
    """Probe the dspy package without triggering side effects."""
    if "dspy" in sys.modules:
        return True
    try:
        return importlib.util.find_spec("dspy") is not None
    except (ValueError, ImportError):
        return False


def _write_audit_row(row: dict[str, Any]) -> None:
    """Best-effort §38.3 audit. Disk errors never crash the request (§57.7)."""
    try:
        _AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with _AUDIT_PATH.open("a") as fh:
            fh.write(json.dumps(row, separators=(",", ":")) + "\n")
    except OSError:
        pass


def _base_row(tenant_id: str, request_id: str, stage: str, model: str) -> dict[str, Any]:
    return {
        "ts": time.time(),
        "request_id": request_id or f"dspy-{int(time.time() * 1000)}",
        "tenant_id": tenant_id,
        "actor": "dspy_optimizer",
        "tool": f"dspy.{stage}",
        "model": model,
    }


def _validate_inputs(
    train_examples: list[dict[str, Any]],
    optimizer: str,
    metric: str,
    max_bootstrapped_demos: int,
) -> list[str]:
    """Return a list of validation errors (empty list = valid)."""
    errors: list[str] = []

    if not isinstance(train_examples, list) or not train_examples:
        errors.append("train_examples must be a non-empty list")
        return errors

    if len(train_examples) > _MAX_TRAIN_EXAMPLES:
        errors.append(
            f"train_examples exceeds limit ({len(train_examples)} > {_MAX_TRAIN_EXAMPLES})"
        )

    for i, ex in enumerate(train_examples[:50]):  # cap deep-check at first 50
        if not isinstance(ex, dict):
            errors.append(f"train_examples[{i}] is not a dict")
            continue
        missing = [k for k in _REQUIRED_KEYS if k not in ex or not str(ex[k]).strip()]
        if missing:
            errors.append(f"train_examples[{i}] missing or empty: {missing}")

    if optimizer not in _ALLOWED_OPTIMIZERS:
        errors.append(
            f"optimizer '{optimizer}' not in allowed set {sorted(_ALLOWED_OPTIMIZERS)}"
        )

    if metric not in _ALLOWED_METRICS:
        errors.append(
            f"metric '{metric}' not in allowed set {sorted(_ALLOWED_METRICS)}"
        )

    if not (1 <= max_bootstrapped_demos <= _MAX_DEMOS):
        errors.append(
            f"max_bootstrapped_demos must be in [1, {_MAX_DEMOS}]; got {max_bootstrapped_demos}"
        )

    return errors


def _build_metric(metric_name: str):
    """Return a callable matching DSPy's metric contract: (example, pred, trace) -> bool."""

    def _norm(s: Any) -> str:
        return str(s or "").strip().lower()

    if metric_name == "exact_match":
        def _metric(example, pred, trace=None):
            return _norm(getattr(pred, "answer", "")) == _norm(example.answer)
        return _metric

    # "contains"
    def _metric(example, pred, trace=None):
        gold = _norm(example.answer)
        return gold in _norm(getattr(pred, "answer", ""))
    return _metric


def _score_program(program, examples, metric) -> float:
    """Compute accuracy of `program` on `examples` using `metric`."""
    if not examples:
        return 0.0
    correct = 0
    for ex in examples:
        try:
            pred = program(question=ex.question, context=ex.context)
            if metric(ex, pred):
                correct += 1
        except Exception:  # noqa: BLE001 — score is best-effort
            continue
    return correct / len(examples)


def run_optimization(
    train_examples: list[dict[str, Any]],
    *,
    tenant_id: str = "default",
    request_id: str = "",
    model: str | None = None,
    optimizer: str = "BootstrapFewShot",
    metric: str = "contains",
    max_bootstrapped_demos: int = 4,
    max_labeled_demos: int = 4,
) -> DSPyOptimizationResult:
    """Compile a RAG QA prompt with DSPy. Returns a result object — never raises.

    Sequencing:
      0. Gate (enabled + importable + validation)
      1. Build dspy.Signature for (question, context) -> answer
      2. Build Predict / ChainOfThought baseline program
      3. Score baseline on train set (train_accuracy_before)
      4. Run optimizer.compile() with metric
      5. Score compiled program on train set (train_accuracy_after)
      6. Serialize the compiled program's repr for the caller
    """
    model = model or _DEFAULT_MODEL
    request_id = request_id or f"dspy-{int(time.time() * 1000)}"
    t0 = time.monotonic()

    # ---- Gate 1: opt-in ----
    if not is_enabled():
        _write_audit_row({
            **_base_row(tenant_id, request_id, "gate", model),
            "outcome": "disabled", "latency_ms": 0,
        })
        return DSPyOptimizationResult(
            outcome="disabled", model=model, tenant_id=tenant_id, request_id=request_id,
            error_msg="INSUR_DSPY_OPTIMIZER_ENABLED is not 'true'",
        )

    # ---- Gate 2: SDK installed ----
    if not is_importable():
        _write_audit_row({
            **_base_row(tenant_id, request_id, "gate", model),
            "outcome": "unavailable", "latency_ms": 0,
        })
        return DSPyOptimizationResult(
            outcome="unavailable", model=model, tenant_id=tenant_id, request_id=request_id,
            error_msg="dspy package not installed",
        )

    # ---- Gate 3: validation BEFORE any LM call ----
    errors = _validate_inputs(train_examples, optimizer, metric, max_bootstrapped_demos)
    if errors:
        latency_ms = int((time.monotonic() - t0) * 1000)
        _write_audit_row({
            **_base_row(tenant_id, request_id, "validate", model),
            "outcome": "validation_error",
            "n_errors": len(errors),
            "first_error": errors[0],
            "latency_ms": latency_ms,
        })
        return DSPyOptimizationResult(
            outcome="validation_error", model=model, tenant_id=tenant_id, request_id=request_id,
            latency_ms=latency_ms, validation_errors=errors,
            error_type="ValidationError", error_msg=errors[0],
        )

    # ---- Compile path ----
    try:
        import dspy  # noqa: F401 — lazy import per §56.2

        # Build signature dynamically; question + context → answer.
        rag_qa_signature = dspy.Signature(
            "question, context -> answer",
            instructions=(
                "Given the question and supporting context, produce a concise "
                "answer grounded in the context. If the context does not "
                "support an answer, say 'unknown'."
            ),
        )

        baseline = dspy.Predict(rag_qa_signature)

        dspy_examples = [
            dspy.Example(
                question=ex["question"],
                context=ex["context"],
                answer=ex["answer"],
            ).with_inputs("question", "context")
            for ex in train_examples
        ]

        metric_fn = _build_metric(metric)

        accuracy_before = _score_program(baseline, dspy_examples, metric_fn)

        # Select the optimizer from the whitelist.
        if optimizer == "BootstrapFewShot":
            from dspy.teleprompt import BootstrapFewShot
            tele = BootstrapFewShot(
                metric=metric_fn,
                max_bootstrapped_demos=max_bootstrapped_demos,
                max_labeled_demos=max_labeled_demos,
            )
        else:  # LabeledFewShot
            from dspy.teleprompt import LabeledFewShot
            tele = LabeledFewShot(k=max_bootstrapped_demos)

        compiled = tele.compile(baseline, trainset=dspy_examples)

        accuracy_after = _score_program(compiled, dspy_examples, metric_fn)

        # Count demos compiled into the program (each predictor stores demos).
        n_demos = 0
        for _name, pred in compiled.named_predictors():
            n_demos += len(getattr(pred, "demos", []) or [])

        latency_ms = int((time.monotonic() - t0) * 1000)
        _write_audit_row({
            **_base_row(tenant_id, request_id, "compile", model),
            "outcome": "executed",
            "optimizer": optimizer,
            "metric": metric,
            "n_train_examples": len(train_examples),
            "n_demos_compiled": n_demos,
            "train_accuracy_before": accuracy_before,
            "train_accuracy_after": accuracy_after,
            "latency_ms": latency_ms,
        })

        return DSPyOptimizationResult(
            outcome="executed",
            optimizer_used=optimizer,
            optimized_prompt_repr=str(compiled),
            n_demos_compiled=n_demos,
            train_accuracy_before=accuracy_before,
            train_accuracy_after=accuracy_after,
            request_id=request_id, tenant_id=tenant_id, model=model,
            latency_ms=latency_ms,
        )

    except Exception as exc:  # noqa: BLE001 — wrap all SDK/provider exceptions
        latency_ms = int((time.monotonic() - t0) * 1000)
        exc_type = type(exc).__name__
        _write_audit_row({
            **_base_row(tenant_id, request_id, "exception", model),
            "outcome": "error",
            "error_type": exc_type,
            "error_msg": str(exc)[:300],
            "latency_ms": latency_ms,
        })
        return DSPyOptimizationResult(
            outcome="error", model=model, tenant_id=tenant_id, request_id=request_id,
            latency_ms=latency_ms,
            error_type=exc_type, error_msg=str(exc)[:300],
        )


def status() -> dict[str, Any]:
    """Snapshot of the DSPy optimizer adapter for the agent-platform status surface."""
    return {
        "key": "dspy-optimizer",
        "name": "DSPy RAG prompt optimizer (BootstrapFewShot / LabeledFewShot)",
        "enabled": is_enabled(),
        "importable": is_importable(),
        "default_model": _DEFAULT_MODEL,
        "audit_path": str(_AUDIT_PATH),
        "allowed_optimizers": sorted(_ALLOWED_OPTIMIZERS),
        "allowed_metrics": sorted(_ALLOWED_METRICS),
        "limits": {
            "max_train_examples": _MAX_TRAIN_EXAMPLES,
            "max_demos": _MAX_DEMOS,
        },
        "detail": (
            "Stage-1 adapter; opt-in via INSUR_DSPY_OPTIMIZER_ENABLED=true. "
            "Compiles a signature(question, context -> answer) into a few-shot "
            "program with demos selected by metric. Audit row carries the "
            "optimizer used + before/after train accuracy so a reviewer can "
            "defend why this prompt shipped vs the baseline (§48 + §59.4)."
        ),
    }
