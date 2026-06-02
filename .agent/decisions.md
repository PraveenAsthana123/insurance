# decisions.md — locked-in design decisions

2026-06-01 § Council pattern (§77 row 1415)
  Decision: 3-stage author/reviewer/chair with diverse Ollama models
  Code: backend/core/council_v77.py
  Why: §50.3 model diversity catches mis-interpretations

2026-06-01 § HITL approval gate (§77 row 1416)
  Decision: SQLite-backed state machine (pending/approved/denied/expired)
  Code: backend/core/hitl_approval.py
  Why: §75.5 approval gates; SQLite WAL for multi-process safety

2026-06-01 § Reflection loop (§77 row 1419)
  Decision: 4 termination criteria — threshold met, plateau, max iters, cost cap
  Code: backend/core/reflection_loop.py
  Why: §64.43 #10 prevents infinite loops

2026-06-01 § Blackboard CAS (§77 row 1431)
  Decision: SQLite + version-on-read CAS write
  Code: backend/core/blackboard.py
  Why: §64.43 #5 multi-process safety

2026-06-01 § OPA priority chain
  Decision: helper rules (hard_denied_in_prod / sensitive_data / high_risk)
  Code: infra/policy/policies/approval.rego
  Why: Single rule fires per input; eval_conflict_error impossible

2026-06-01 § pytest importlib mode
  Decision: --import-mode=importlib in pytest.ini
  Code: pytest.ini
  Why: 19 depts × 8 tiers all use identical filenames (test_unit.py etc.)

2026-06-01 § Ragas vertexai shim
  Decision: Write 12-line shim to langchain_community/chat_models/vertexai.py
  Code: shim re-applied by `fix_all_runner.sh ragas-shim`
  Why: ragas wheel pins removed langchain module; shim is reversible

2026-06-01 § §77 stack adoption tier
  Decision: Target Tier 2 (Enterprise OSS) — no paid SaaS for now
  Why: Lakera + Purview = operator billing decision (deferred)
