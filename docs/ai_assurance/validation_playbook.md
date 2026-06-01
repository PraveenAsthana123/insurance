# Responsible AI Validation Playbook

> **Framework × Process × Verification × Quality Evidence.**
>
> The 5 pillars from [`responsible_by_design.md`](responsible_by_design.md)
> answered *what* must hold. This playbook answers *how it is verified
> and what evidence proves it.* Audit-ready by construction.
>
> Each row resolves to: a validation technique, the verification
> mechanism, the external framework reference, and the artefact that
> survives in `data/eval/<pillar>/<run_id>/`.

## Reading the tables

| Column | Meaning |
|---|---|
| **Layer** | Where the check fires (data / model / runtime / user) |
| **Validation Technique** | What is actually measured |
| **How Verified** | The concrete check mechanism |
| **Framework** | External standard (NIST AI RMF / ISO 42001 / GDPR / SOC2 / etc.) |
| **Quality Evidence** | The artefact persisted as proof |

## 1️⃣ FAIRNESS — Validation

**What is validated:** data fairness · model fairness · outcome fairness · drift over time.

| Layer | Validation Technique | How Verified | Framework | Quality Evidence |
|---|---|---|---|---|
| Data | Representation analysis | Group distribution comparison | IBM AIF360 | Bias audit report |
| Data | Missingness parity test | Missing-value % by group | ISO 23894 | Data quality log |
| Model | Demographic parity | Outcome rate comparison | NIST AI RMF | Metric threshold report |
| Model | Equal opportunity | TPR parity | AIF360 / Fairlearn | Model evaluation sheet |
| Model | Counterfactual testing | Same input, group changed | XAI fairness tests | Counterfactual log |
| Runtime | Fairness drift detection | Time-series fairness metrics | MLOps governance | Monitoring dashboard |
| User | Complaint parity | Complaints per segment | Product governance | User feedback log |

✅ **Pass:** all fairness metrics within approved tolerance.
❌ **Fail:** model blocked or routed to human review.

## 2️⃣ PRIVACY — Validation

**What is validated:** data minimization · no unauthorized sharing · secure processing.

| Layer | Validation Technique | How Verified | Framework | Quality Evidence |
|---|---|---|---|---|
| Input | PII detection test | Inject known PII + verify block | GDPR / ISO 27701 | DLP test report |
| Input | Redaction validation | Hash before/after prompts | Privacy-by-design | Redaction logs |
| Storage | Retention enforcement | TTL expiry validation | ISO 27001 | Retention audit |
| Model | No-training check | Vendor config + contract | SOC2 | Provider attestation |
| Access | RBAC validation | Unauthorized access attempts | Zero Trust | Access logs |
| User | Data-deletion test | Right-to-erasure request | GDPR | Deletion certificate |

✅ **Pass:** zero raw sensitive data reaches the model.
❌ **Fail:** immediate incident + halt.

## 3️⃣ TRANSPARENCY — Validation

**What is validated:** user awareness · explainability · traceability.

| Layer | Validation Technique | How Verified | Framework | Quality Evidence |
|---|---|---|---|---|
| UI | Notification coverage | Every operation emits notice | UX governance | UI audit |
| Decision | Explanation quality | Human review of explanations | XAI standards | Explanation scorecard |
| System | Trace completeness | Event → actor → model → output | ISO 42001 | Audit trail |
| Model | Version traceability | Model + policy version tagging | MLOps | Model registry |
| User | Consent trace | Explicit approvals logged | Privacy law | Consent logs |

✅ **Pass:** user can reconstruct "what happened + why."
❌ **Fail:** operation invalidated.

## 4️⃣ ROBUSTNESS — Validation

**What is validated:** reliability · resilience · error handling.

| Layer | Validation Technique | How Verified | Framework | Quality Evidence |
|---|---|---|---|---|
| Input | Schema validation | Invalid inputs rejected | Secure SDLC | Input validation logs |
| Model | Stress testing | Extreme / adversarial prompts | NIST | Stress test report |
| System | Fault injection | Simulated failures (Chaos Mesh) | Chaos engineering | Recovery logs |
| Runtime | Fallback verification | Model failure → backup model | Resilience design | Failover report |
| Ops | Drift detection | Performance decay tracking | MLOps | Monitoring charts |

✅ **Pass:** graceful degradation.
❌ **Fail:** uncontrolled failure.

## 5️⃣ SAFETY — Validation

**What is validated:** harm prevention · misuse resistance · human oversight.

| Layer | Validation Technique | How Verified | Framework | Quality Evidence |
|---|---|---|---|---|
| Content | Policy violation tests | Unsafe prompts blocked | Safety policy | Violation logs |
| Action | Permission gating | Role escalation required | RBAC | Access logs |
| System | Kill-switch test | Emergency stop works | Functional safety | Test certificate |
| User | HITL validation | Human approval enforced | ISO 26262-style | Approval records |
| Incident | Response drill | Incident simulation | Risk management | Incident report |

✅ **Pass:** harm prevented or mitigated.
❌ **Fail:** system halted.

## 6️⃣ ACCOUNTABILITY — Validation

**What is validated:** ownership · traceability · auditability.

| Layer | Validation Technique | How Verified | Framework | Quality Evidence |
|---|---|---|---|---|
| Identity | Actor verification | Authenticated user / system | IAM | Identity logs |
| Audit | Immutability check | Append-only audit store + hash chain | ISO 27001 | Hash validation |
| Governance | RACI enforcement | Named owner per system | ISO 42001 | Ownership registry |
| User | Action acknowledgment | User confirmations | Legal compliance | Confirmation logs |
| Review | Independent audit | Periodic audit reviews | External audit | Audit report |

✅ **Pass:** every action attributable.
❌ **Fail:** compliance breach.

## 7️⃣ Responsible-by-Design — Lifecycle Validation

| Phase | Validation Method | Gate Owner |
|---|---|---|
| **Design** | Ethics + risk review checklist | RAI Office |
| **Build** | CI/CD fairness + safety gates | DevSecOps |
| **Test** | Bias, privacy, robustness, hallucination test suites | QA + AI Eng |
| **Deploy** | Go/no-go governance approval | Compliance + Product |
| **Run** | Continuous monitoring (§68) | MLOps / SRE |
| **Review** | Periodic re-certification (quarterly) | Auditor |

## CI/CD wiring (so this becomes real, not paper)

Every pull request that touches an AI surface MUST:

```yaml
# .github/workflows/responsible_ai_gates.yml
- name: Privacy — DLP outbound drill
  run: python tests/drills/drill_dlp_outbound.py

- name: Fairness — demographic + equal-opportunity
  run: python tests/drills/drill_fairness_gates.py

- name: Robustness — adversarial prompt suite
  run: python tests/drills/drill_adversarial_prompts.py    # Garak

- name: Safety — guardrail violation tests
  run: python tests/drills/drill_safety_guardrails.py

- name: Accountability — audit row schema
  run: python tests/drills/drill_audit_row_schema.py

- name: Hallucination — RAG faithfulness
  run: python tests/drills/drill_rag_faithfulness.py       # Ragas
```

A failed gate **blocks merge**, not just files a warning. This is the
operational meaning of "fairness is a gating criterion, not a KPI."

## Audit-ready statement (reusable)

> Each Responsible AI pillar is validated through defined technical
> tests, governance processes, and measurable quality checks,
> producing verifiable evidence across the full system lifecycle.

## Composes with

- **§38.2** — hard-stop list (no AI guardrails → no deploy)
- **§43** — every validation row resolves to a drill (≥3 negative)
- **§47.6** — STRIDE + SOC2 + OWASP lenses already required; this maps the pillars onto them
- **§48** — explainability evidence per decision
- **§57.5** — 5-question runbook reuses these tables to answer WHY
- **§64.30** — 12-tier testing (this playbook IS the tier-content layer)
- **§64.42** — testing matrix provides the OSS tools (Fairlearn, AIF360, Garak, Ragas, Promptfoo, etc.)
- **§68.6** — guardrails surface displays runtime violations
- **§68.8/9/10** — functional / cost / safety eval surfaces are the read-side of §43-§57 sections in this playbook
- All 11 frameworks (101–111) — each validation row maps to ≥ 1 framework module
