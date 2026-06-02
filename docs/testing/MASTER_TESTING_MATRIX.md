# Master Testing Framework Matrix — INSUR Beverage

> **Status:** canonical testing tool catalog for the INSUR Beverage project.
> **Compose with:** global §64.30 (12-tier per-dept testing policy), §43 (drill testing), §47.6 (security 4-lens), §47.10 (5-phase load testing).
> **Last updated:** 2026-05-22.

This document is the **tool-choice reference** that backs the 12-tier per-dept
testing policy in global §64.30. Per-dept tier folders (`tests/<dept>/unit/`,
`tests/<dept>/perf/`, etc.) pick their framework from this catalog.

When to update this doc: a new testing tool category emerges, an existing
choice becomes deprecated, or a tier in §64.30 needs concrete tooling.
When NOT to update this doc: implementation details — those live in
per-dept `tests/<dept>/README.md`.

---

## 1. The matrix — 50+ testing areas (open-source first)

| Testing Area | Purpose | Open-Source Frameworks | §64.30 Tier |
|---|---|---|---|
| Unit Testing | Validate functions/classes | PyTest, JUnit, TestNG, NUnit | 1 |
| UI/E2E Testing | Browser workflows | Playwright, Selenium, Cypress | 8 |
| AI Browser Automation | Agentic browser actions | Stagehand, Browser Use, Open Operator | 7 (process) |
| Visual Testing | UI visual regression | Argos CI, Needle, BackstopJS | 8 |
| API Testing | REST/gRPC/GraphQL | Karate, Tavern, REST Assured, Bruno, Hoppscotch | 3 |
| Contract Testing | Service compatibility | Pact, Spring Cloud Contract | 2 |
| GraphQL Testing | GraphQL APIs | GraphQL Tester, Postman OSS | 3 |
| gRPC Testing | gRPC services | ghz, grpcurl | 3 |
| Database Testing | Data validation | DbUnit, SQLTest, pgTAP | 2 |
| Data Quality Testing | Data correctness | Great Expectations, Soda Core, Deequ | 2 |
| ETL/Pipeline Testing | Data quality & lineage | dbt tests, Apache Griffin | 2 |
| Data Drift Testing | ML drift validation | Evidently AI, WhyLabs OSS | 7 (process) |
| Feature Store Testing | Feature consistency | Feast validation | 2 |
| Load Testing | Traffic simulation | k6, Apache JMeter, Locust, Gatling | 10 |
| Performance Testing | Latency/throughput | k6, Gatling | 9 |
| Stress Testing | Breaking limits | Locust, k6 | 10 |
| Soak Testing | Long-duration stability | k6, JMeter | 10 |
| Benchmark Testing | Performance baselines | Hyperfine, wrk, hey | 9 |
| Scalability Testing | Auto-scaling | Kubernetes + k6 | 10 |
| Security Testing | Vulnerability scanning | OWASP ZAP, Nikto, Wapiti | 11 |
| SAST | Static security scan | Semgrep, SonarQube CE, CodeQL | 11 |
| DAST | Runtime attack testing | OWASP ZAP, Wfuzz | 11 |
| Dependency Scanning | Package vulnerabilities | Snyk OSS CLI, Trivy, Grype | 11 |
| Container Security | Docker/K8s security | Trivy, Clair, Anchore Engine | 11 |
| Kubernetes Security | K8s posture | Kubescape, kube-bench, kube-hunter | 11 |
| IaC Security | Cloud/IaC validation | Checkov, tfsec, Terrascan | 11 |
| Secrets Scanning | Leaked credentials | Gitleaks, TruffleHog | 11 |
| Accessibility Testing | WCAG compliance | Axe-core, Pa11y, Lighthouse | 8 |
| Cross-Browser Testing | Multi-browser | Selenium Grid | 8 |
| Mobile Testing | Android/iOS | Appium, Maestro | 8 |
| Desktop App Testing | Native apps | WinAppDriver, FlaUI | 8 |
| AI/LLM Evaluation | Hallucination, grounding | RAGAS, DeepEval, Promptfoo | 7 (process) |
| AI Safety Testing | Jailbreak detection | Garak, Lakera OSS | 11 |
| Prompt Injection Testing | Prompt attacks | Garak, Promptfoo, Rebuff, LLM Guard | 11 |
| Hallucination Testing | LLM grounding | RAGAS, DeepEval | 7 (process) |
| Multi-Agent Testing | Agent workflow validation | LangSmith OSS alts, AgentOps OSS | 7 (process) |
| AI Tracing | LLM observability | OpenLIT, Langfuse, Helicone OSS | (cross-cutting) |
| Observability Testing | Logs/traces/metrics | OpenTelemetry | (cross-cutting) |
| Distributed Tracing | Per-request spans | Jaeger, Zipkin, Tempo | (cross-cutting) |
| Metrics | Time-series | Prometheus | (cross-cutting) |
| Visualization | Dashboards | Grafana | (cross-cutting) |
| Logging | Centralized logs | ELK Stack, Loki | (cross-cutting) |
| Chaos Engineering | Failure simulation | LitmusChaos, Chaos Mesh, Chaos Monkey | 10 |
| Resilience Testing | Recovery validation | Chaos Mesh, Toxiproxy | 10 |
| Network Testing | Network failure injection | Toxiproxy | 10 |
| Workflow Testing | Multi-step orchestration | Temporal Testing Framework | 7 (process) |
| Event Streaming Testing | Kafka/queues | Kafka Test Containers | 2 |
| Service Virtualization | Mocking | WireMock, MockServer | 2 |
| Synthetic Monitoring | Continuous validation | Checkly OSS patterns, Blackbox Exporter | (cross-cutting) |
| Governance Testing | RBAC/ABAC/policy | OPA, Kyverno | 11 |
| Policy Testing | Policy-as-code | Conftest | 11 |
| Backup/Restore Testing | DR | Velero | (cross-cutting) |
| Service Mesh Testing | mTLS, routing | Istio test tools | (cross-cutting) |
| CI/CD Testing | Pipeline validation | Jenkins, Tekton, Argo Workflows | (cross-cutting) |
| GitOps Validation | Continuous reconciliation | ArgoCD, FluxCD | (cross-cutting) |
| AI Workflow Testing | LangGraph DAGs | LangGraph test harnesses | 7 (process) |
| Semantic Testing | RAG relevance | RAGAS | 7 (process) |
| Vector DB Testing | Embedding retrieval | Custom semantic benchmarks | 2 |
| Explainability Testing | XAI validation | SHAP, LIME | 7 (process) |
| Bias/Fairness Testing | Responsible AI | Fairlearn, IBM AI Fairness 360 | 7 (process) |
| Synthetic Data Testing | Test-data generation | SDV | 6 (boundary) |
| Cost Testing | FinOps validation | Kubecost | (cross-cutting) |

---

## 2. Top-1% open-source stack (recommended defaults)

When a dept's tier needs a single choice, pick from this column unless a dept-specific reason overrides:

| Domain | Default OSS choice |
|---|---|
| Browser Automation | **Playwright** |
| AI Browser Agent | **Browser Use + Stagehand** |
| API Testing | **Karate** |
| Performance | **k6** |
| Security | **OWASP ZAP** |
| Accessibility | **Axe-core** |
| Data Quality | **Great Expectations** |
| AI Evaluation | **RAGAS + DeepEval** |
| Prompt Testing | **Promptfoo** |
| AI Observability | **Langfuse** |
| Distributed Tracing | **Jaeger** |
| Metrics | **Prometheus** |
| Dashboard | **Grafana** |
| Logging | **ELK + Loki** |
| Chaos Engineering | **LitmusChaos** |
| Governance | **OPA + Kyverno** |
| Container Security | **Trivy** |
| K8s Security | **Kubescape** |
| Workflow Engine | **Temporal OSS** |
| CI/CD | **Jenkins + ArgoCD** |
| GitOps | **FluxCD** |
| Service Mesh | **Istio** |
| Multi-Agent Framework | **LangGraph + CrewAI + AutoGen** |
| Event Streaming | **Apache Kafka** |
| Explainability | **SHAP + LIME** |
| Responsible AI | **Fairlearn + IBM AI Fairness 360** |

---

## 3. Open-source AI testing — the must-haves

These are the AI/LLM testing tools every dept that ships AI features MUST evaluate:

| Tool | Purpose | Where it plugs in |
|---|---|---|
| **RAGAS** | RAG evaluation (faithfulness, context-precision, answer-relevance) | §59.4 ORF gate; per-dept §64 artifact #16 (RAG pipeline) |
| **DeepEval** | LLM regression testing | §43 drill suite per AI pipeline |
| **Promptfoo** | Prompt regression + injection | §64.20 (per-dept ML/DL lifecycle) |
| **Langfuse** | LLM observability (traces, costs, eval) | §57.6 canonical logging fields |
| **OpenLIT** | OpenTelemetry for LLMs | §47 architecture observability layer |
| **Helicone OSS** | LLM cost + latency monitoring | §41.1 FinOps |
| **Evidently AI** | Drift monitoring | §64.21 RAI + drift dashboards |
| **Garak** | AI vulnerability scanning (jailbreak, injection) | §64.30 tier 11 (penetration) + §64.32 attack-sim |
| **SHAP** | Tree/linear-model explainability | §48.2 local explanation |
| **LIME** | Black-box explainability | §48.2 local explanation |
| **Fairlearn** | Bias testing + mitigation | §48.8 fairness gate |
| **IBM AI Fairness 360** | Fairness metric library | §48.8 fairness gate |

---

## 4. Open-source agentic AI testing stack

For INSUR's §64.40 10-layer agentic execution stack:

| Layer | OSS recommendation |
|---|---|
| Browser Automation (layer 8) | Playwright |
| AI Browser Agent (layers 6-7) | Browser Use + Stagehand |
| Agent Framework (layers 2-4) | LangGraph + CrewAI + AutoGen |
| AI Evaluation | RAGAS + DeepEval |
| Prompt Testing | Promptfoo |
| AI Tracing | Langfuse |
| Observability | OpenTelemetry |
| Metrics | Prometheus |
| Dashboard | Grafana |
| Distributed Tracing | Jaeger |
| Logging | ELK + Loki |
| Chaos Engineering | LitmusChaos |
| Governance (layer 5) | OPA + Kyverno |
| Security | OWASP ZAP |
| Container Security | Trivy |
| K8s Security | Kubescape |
| Workflow Engine | Temporal OSS |
| Service Mesh | Istio |

---

## 5. Pipeline ordering (canonical)

```
Developer Commit
   ↓ Unit Testing (PyTest / JUnit)
   ↓ API Testing (Karate)
   ↓ Contract Testing (Pact)
   ↓ Playwright E2E
   ↓ Accessibility Testing (Axe)
   ↓ Security Scanning (OWASP ZAP + Semgrep)
   ↓ Container Security (Trivy)
   ↓ Kubernetes Security (Kubescape)
   ↓ Performance Testing (k6)
   ↓ Chaos Engineering (LitmusChaos)
   ↓ AI Evaluation (RAGAS + DeepEval)
   ↓ Prompt Injection Testing (Garak)
   ↓ Governance Validation (OPA)
   ↓ Observability Validation (Jaeger + Prometheus)
   ↓ Production Deployment (ArgoCD)
   ↓ Continuous AI Monitoring (Langfuse + Evidently)
```

Each arrow = a CI gate. A red gate blocks the next step.

---

## 6. The gaps most AI teams miss (INSUR release blockers)

Per §38.2 hard stops and §64 per-dept artifacts, the following MUST be tested
in every INSUR release. Most enterprise teams ship without them — INSUR does not:

| Missing capability | Risk if absent | INSUR tool/policy |
|---|---|---|
| AI Agent Memory Testing | Cross-session leakage | §64.40 layer-5 policy engine + tenant-isolation drill |
| Semantic Cache Validation | Wrong cached responses | RAGAS regression + cache-invalidation drill |
| Multi-Agent Coordination Testing | Deadlock / livelock | LangGraph test harness + §43 drill |
| LLM Cost Governance Testing | Budget explosion | Langfuse + §41.1 token-budget alert |
| GPU Queue Testing | AI bottlenecks | k6 against inference endpoint + §47.10 5-phase |
| Context Window Overflow Testing | Model crashes | Boundary test (tier 6) + DeepEval |
| Embedding Drift Testing | Retrieval degradation | Evidently AI + per-RAG-pipeline drift score |
| Tool Permission Testing | Unsafe execution | §64.40 layer-5 scope grant + negative drill |
| Tenant Isolation Testing | Security breach | §63 tenant-id RLS + cross-tenant drill |
| AI Rollback Validation | Broken production | §47.7 4-layer rollback + model registry rollback drill |
| AI Explainability Validation | Compliance failure | §48 + per-prediction `/api/v1/explain` |
| Trace Correlation Testing | Impossible debugging | §57.6 canonical fields + OpenTelemetry baggage |
| Prompt Version Regression | Inconsistent output | Promptfoo + §38.4 prompt versioning |
| Event Ordering Validation | Distributed failure | Kafka Test Containers + idempotency drill |
| Kafka Retry Testing | Message duplication | Idempotency-key drill + dead-letter queue |
| Circuit Breaker Testing | Cascading failure | §47 circuit-breaker pattern + chaos test |
| RAG Citation Validation | Hallucinated references | RAGAS citation accuracy = 100% gate |
| HITL Workflow Testing | Governance gaps | §40 decision-tier + human-in-loop drill |
| Autonomous Action Approval Testing | Unsafe automation | §64.40 layer-5 approve-before-act drill |

---

## 7. Per-dept testing folder convention (recap from §64.30)

```
tests/<dept>/
├── unit/         # tier 1  — PyTest / vitest / jest
├── integration/  # tier 2  — PyTest + real DB + real cache + WireMock
├── api/          # tier 3  — Karate + httpx + schemathesis
├── boundary/     # tier 6  — Hypothesis / Faker / SDV
├── process/      # tier 7  — §43 drills + RAGAS + DeepEval + Promptfoo
├── perf/         # tiers 9-10 — k6 + Locust + Gatling
├── smoke/        # tier 8  — Playwright + curl + Axe
└── security/     # tiers 11-12 — OWASP ZAP + Trivy + Kubescape + Garak + LitmusChaos
```

Per-tier `README.md` MUST cite the tool chosen from §1's matrix.

---

## 8. Composes with

| INSUR Policy / Section | Contribution |
|---|---|
| §38 (AI governance) | Every test run emits a §38.3 audit row |
| §43 (drill testing) | Every "added a tool" commit ships a paired drill |
| §47 (architecture) | Tools placed on the 7 design surfaces; load-testing maps to §47.10 |
| §48 (explainability) | SHAP/LIME + RAGAS citations satisfy §48.5 |
| §52 (40-row brutal tool review) | Each new tool added here gets a 40-row review file in `docs/architecture/tool-reviews/` |
| §53 (maturity stack) | Tool coverage feeds §44 (production validation) maturity score |
| §57.5 (5-question runbook) | Test failures surface in scorecard → drill reject → audit row |
| §63 (global-ai-org structure) | Per-dept tests/ folder layout matches §63 scaffold |
| §64.30 (12-tier policy) | This catalog is the **tool layer** under §64.30's **tier layer** |
| §64.32 (security tab) | Attack generators (Garak, ZAP, sqlmap) listed here drive per-dept simulation |

---

## 9. The brutal rule

> A tier with no named tool is theatre. A tool with no tier is shopping.
> Every entry in §64.30's 12-tier policy must map to one row in §1 of this
> doc — and every row in §1 must map to at least one §64.30 tier (or be
> marked cross-cutting). No floating tools, no floating tiers.

---

## 10. Maintenance

- **Adding a tool:** add a row in §1 with the tier mapping, and (if it's a new domain) update §2.
- **Deprecating a tool:** strike through the row in §1 + note the replacement in §2.
- **Per-tier file:** when a dept picks a specific tool for a tier, create `tests/<dept>/<tier>/README.md` citing this doc.
- **Quarterly review:** audit §6 (gaps) — any new "everyone misses this" risk class goes here.
