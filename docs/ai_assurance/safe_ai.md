# Safe AI (Framework 103)

> **Core question:** Can the AI cause harm — and if so, can harm be prevented or contained?
>
> **Owner:** Safety Engineering · **Family:** `ai_assurance` · **DB ID:** 103

## Why this framework

Safety is the question reliability ducks: *what does the system do
when it's wrong?* Reliability covers "is the system up?"; safety
covers "is being-up actually a good thing right now?" An LLM that
serves p99 < 200ms hallucinated medical advice is reliable AND unsafe.

## Modules (18)

Live source is `analysis_module WHERE phase_id=103`. Typical modules:
input guardrails (prompt injection, jailbreak attempts), output
guardrails (PII leak, toxic content, IP / copyright), agent-action
scope checks (per §64.40 layer 5), HITL escalation paths, kill-switch
verification, circuit-breakers on irreversible actions, content
moderation, blast-radius caps, adversarial robustness, anomaly /
outlier detection on inputs + outputs, threat-model coverage.

## Required outputs (per release)

- `safety_card.md` enumerating known harms + mitigations
- `guardrail_decisions.jsonl` — every guardrail fire logged (§68.6)
- Penetration-test report (per §64.30 tier 11)
- Adversarial-eval report (Garak / Lakera per §64.42)
- HITL escalation drill log

## Composes with

- §38.2 (HARD STOP — no AI guardrails → no deploy)
- §47.6 (OWASP Top 10 + AI threats — A11 Prompt Injection, A12 Insecure Output, A13 Poisoning, A14 Model Theft, A15 Excessive Agency)
- §64.32 (per-dept security tab) — runtime surface of this framework
- §64.40 layer 5 (Policy / Governance) — agentic action enforcement
- §68.11 (safety eval) — automated regression coverage
