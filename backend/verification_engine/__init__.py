"""§B5 · 9-gate verification engine · per PENDING_TASKS_PLAN B5.

Each gate runs over an invocation result + emits a trace event row to
agent_trace_event. §57.7 honest: each gate must return either PASS or
FAIL with a structured reason · NEVER fabricated green.

Gates (per the operator's brief):
  1. schema       · output validates against expected JSON shape
  2. citation     · every claim cites a retrievable source
  3. pii          · no PII leaked in output text
  4. bias         · fairness deltas within threshold
  5. cost         · within per-tenant token + dollar budget
  6. safety       · no policy-violating content
  7. confidence   · model confidence ≥ threshold
  8. rollback     · reversible action has a documented undo
  9. audit        · §38.3 audit row was written
"""
from .runner import run_verification_gates, GATE_NAMES

__all__ = ["run_verification_gates", "GATE_NAMES"]
