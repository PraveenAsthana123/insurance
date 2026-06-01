# EU AI Act — Compliance Mapping for insur_project

Per global §38 + §48 + operator 2026-06-01 production-readiness.
Maps the insurance AI surfaces in this project to EU AI Act (Regulation
(EU) 2024/1689) obligations.

## Risk classification (Art. 6)

Insurance use cases overwhelmingly fall under **High-Risk** AI under Annex III §5:
> "AI systems intended to be used to evaluate the creditworthiness of natural
> persons or establish their credit score, with the exception of AI systems
> used for the purpose of detecting financial fraud."

**Per dept classification:**

| Dept | Risk tier | Annex III ref | Justification |
|---|---|---|---|
| Claims | High-Risk | §5(b) | Affects access to essential service (insurance payout) |
| Underwriting | **High-Risk** | §5(a) | Risk scoring → pricing decisions affect customer rights |
| Customer-Service | Limited Risk | Art. 50 | Chatbot must disclose AI status |
| Fraud-SIU | Not high-risk for fraud detection (Annex III §5 exception) | n/a | But still subject to Art. 50 transparency |

## Article-by-Article obligations

### Art. 9 — Risk management system

- [ ] Document AI risk register per dept
- [ ] Continuous risk assessment lifecycle (build → deploy → monitor → retire)
- [x] Decision audit row per §38.3 captures every regulated decision
- [ ] Quarterly risk review with documented updates

### Art. 10 — Data + data governance

- [x] Training data lineage (per [INSUR_DATA_MGMT.md](../../global-ai-org/departments/claims/business-layer/INSUR_DATA_MGMT.md))
- [ ] Bias scan on training data (Fairlearn / AIF360 installed; not in CI gate yet)
- [x] Test sets representative of deployment context
- [ ] PII / PHI minimization documented per dataset

### Art. 11 — Technical documentation

- [x] System architecture per [INSUR_ARCHITECTURE_FLOW.md](../../global-ai-org/departments/claims/business-layer/INSUR_ARCHITECTURE_FLOW.md)
- [x] System design per [INSUR_SYSTEM_DESIGN.md](../../global-ai-org/departments/claims/business-layer/INSUR_SYSTEM_DESIGN.md)
- [x] Data governance per [INSUR_DATA_MGMT.md](../../global-ai-org/departments/claims/business-layer/INSUR_DATA_MGMT.md)
- [ ] Model cards per deployed model (template needed)
- [ ] Performance metrics per model
- [ ] Risk management documentation

### Art. 12 — Logging

> "High-risk AI systems shall technically allow for the automatic recording of
> events (logs) over their lifetime"

- [x] Decision audit row per §38.3 (request_id / tenant_id / model_version / prompt_version / decision / confidence)
- [x] Structured logs via OpenTelemetry per §57.6
- [x] Retention: **7 years** for regulated decisions (per project policy)
- [ ] Tamper-evident log storage (append-only DB or S3 Object Lock — TBD)

### Art. 13 — Transparency + provision of information

- [ ] User-facing notice that they are interacting with AI (chatbot, RAG answer)
- [ ] Per-decision explanation surfacing on demand
- [x] Citation trail for RAG answers per [INSUR_PIPELINES.md](../../global-ai-org/departments/claims/business-layer/INSUR_PIPELINES.md)

### Art. 14 — Human oversight (HITL)

- [x] Policy engine routes scope-deny + low-confidence decisions to humans (§64.40 layer 5)
- [x] Confidence-tier routing per §40 (high → auto / med → review / low → reject)
- [ ] Documented escalation path per dept (in INSUR_INCIDENT_MGMT.md but needs HITL-specific section)
- [ ] HITL response-time SLO per dept

### Art. 15 — Accuracy, robustness, cybersecurity

- [x] Eval gate per pipeline (Ragas + DeepEval) — installed
- [ ] Drift monitoring deployed (modules exist; gates not wired)
- [x] Adversarial / penetration testing planned (k6 + Garak — Garak installed)
- [x] Circuit breaker per external call (§47.7)

### Art. 26 — Obligations of deployers

(Insurance carrier IS the deployer for in-house systems.)
- [ ] Register the AI system in EU database before deployment
- [ ] Inform employees subject to AI-driven decisions
- [ ] Designate human oversight contact
- [ ] Notify supervisory authority of serious incidents within 15 days

### Art. 50 — Transparency obligations (limited-risk + high-risk)

- [ ] Chatbot disclosure: "You are speaking with an AI assistant"
- [ ] Deepfake / synthetic content labeled (if used in marketing)
- [ ] Affected persons informed when AI is used in decision-making

### Art. 86 — Right to explanation

> "Affected persons … have the right to obtain from the deployer clear and
> meaningful explanation of the role of the AI system in the decision-making
> procedure"

- [ ] `/api/v1/explain?prediction_id=<id>` endpoint (planned, not yet built)
- [x] Counterfactual generation per §48.7 (template)
- [x] SHAP / Integrated Gradients per model output (planned in pipelines)
- [ ] Plain-language explanation generator (LLM-driven; not yet wired)

## Per-Dept compliance status

| Dept | Risk tier | Art. 9 RMS | Art. 11 docs | Art. 12 logs | Art. 14 HITL | Art. 86 explain | Overall |
|---|---|---|---|---|---|---|---|
| Claims | High | ⚠ partial | ✅ | ✅ | ⚠ partial | ❌ | C |
| Underwriting | High | ⚠ partial | ✅ | ✅ | ⚠ partial | ❌ | C |
| Customer-Service | Limited | n/a | ✅ | ✅ | ⚠ partial | n/a | B |
| Fraud-SIU | Excluded | n/a | ✅ | ✅ | ⚠ partial | n/a | B |

## Pre-deployment hard-stops

Per §38.2 — DO NOT deploy claims or UW to production without:
- [ ] EU AI database registration
- [ ] Art. 86 explanation endpoint live
- [ ] Art. 14 HITL escalation tested
- [ ] Art. 13 user notice in UI
- [ ] Art. 15 drift monitor running for 30 days pre-deploy

## Timeline reference

- **2 Feb 2025** — Prohibited AI practices ban in force
- **2 Aug 2025** — GPAI model rules in force
- **2 Aug 2026** — High-risk AI obligations in force (most relevant for this project)
- **2 Aug 2027** — Annex III high-risk + product-safety rules in force

## Composes with

- §38 AI production governance
- §48 AI explainability + interpretability
- §53 enterprise AI maturity stack (item 12 Reliability, 14 Governance, 15 Documentation)
- HIPAA mapping at [docs/compliance/HIPAA.md](HIPAA.md)
- State DOI rate filing at [docs/compliance/STATE_DOI_RATE_FILING.md](STATE_DOI_RATE_FILING.md)
