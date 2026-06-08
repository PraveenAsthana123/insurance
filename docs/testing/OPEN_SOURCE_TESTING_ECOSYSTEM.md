# Complete Open-Source Testing Ecosystem

This is the broad testing ecosystem reference for this project. It maps each testing area to open-source frameworks, its category, and the current repo status.

Status legend:

- `wired`: currently used by this repo or in the default validation path.
- `partial`: some local capability exists, but not the full toolchain.
- `target`: recommended future tool/category; not installed or wired.
- `not-applicable-now`: only relevant after a platform shift such as Kubernetes, mobile, desktop, or GraphQL/gRPC adoption.

## Ecosystem Matrix

| Testing Area | Open Source Frameworks | Category | Repo Status | Notes |
|---|---|---|---|---|
| Unit Testing | PyTest, JUnit, TestNG, NUnit | Functional | wired | Backend uses PyTest. Java/.NET frameworks are reference options only. |
| UI/E2E Testing | Playwright, Selenium, Cypress | Browser | partial | Frontend has Playwright dependency/scripts; default doctor runs build/lint, not full e2e. |
| AI Browser Automation | Stagehand, Browser Use, Open Operator | Agentic AI | target | Stagehand/Playwright adapters are dry-run stubs; Browser Use/Open Operator not wired. |
| Visual Testing | Argos CI, Needle, BackstopJS | UI Regression | target | No visual regression gate yet. |
| API Testing | Karate, Tavern, REST Assured, Bruno, Hoppscotch | API | partial | FastAPI routes tested with PyTest/TestClient; external API frameworks are not wired. |
| Contract Testing | Pact, Spring Cloud Contract | Service Validation | target | API catalog exists; no Pact/Spring Cloud Contract integration. |
| GraphQL Testing | GraphQL Tester, Postman OSS features | API | not-applicable-now | No GraphQL API in this repo. |
| gRPC Testing | ghz, grpcurl | API | target | gRPC is an architecture target, not wired. |
| Database Testing | DbUnit, SQLTest, pgTAP | DB | partial | Repository tests exist; pgTAP/DbUnit/SQLTest are not wired. |
| Data Quality Testing | Great Expectations, Soda Core, Deequ | Data | target | Data quality policy exists; tools not wired. |
| ETL Testing | dbt tests, Apache Griffin | Data Engineering | target | ETL scripts exist; dbt/Griffin not wired. |
| Data Drift Testing | Evidently AI, WhyLabs OSS | ML | target | Drift is documented as target; not wired in default gate. |
| Feature Store Testing | Feast validation | ML Platform | target | No feature store currently. |
| Load Testing | k6, Apache JMeter, Locust, Gatling | Performance | target | No load-test gate yet. |
| Stress Testing | Locust, Gatling | Performance | target | No stress-test gate yet. |
| Soak Testing | k6, JMeter | Performance | target | No soak-test gate yet. |
| Benchmark Testing | Hyperfine, wrk, hey | Benchmark | target | No benchmark scripts currently. |
| Security Testing | OWASP ZAP, Nikto, Wapiti | Security | target | Security policy exists; ZAP/Nikto/Wapiti not wired. |
| SAST | Semgrep, SonarQube CE, CodeQL | AppSec | target | GitHub Actions exists; SAST tools need explicit jobs. |
| DAST | OWASP ZAP, Wfuzz | AppSec | target | Not wired. |
| Dependency Scanning | Snyk OSS CLI, Trivy, Grype | AppSec | target | Not wired in default doctor. |
| Container Security | Trivy, Clair, Anchore Engine | Cloud Native | target | Docker exists; container scanning not wired. |
| Kubernetes Security | Kubescape, kube-bench, kube-hunter | Cloud Native | not-applicable-now | No Kubernetes deployment manifests yet. |
| IaC Security | Checkov, tfsec, Terrascan | DevSecOps | target | No IaC security gate yet. |
| Secrets Scanning | Gitleaks, TruffleHog | Security | target | Not wired. |
| Accessibility Testing | Axe-core, Pa11y, Lighthouse | Accessibility | target | No accessibility gate yet. |
| Cross-Browser Testing | Selenium Grid | Browser | target | No Selenium Grid setup. |
| Mobile Testing | Appium, Maestro | Mobile | not-applicable-now | No mobile app. |
| Desktop Testing | WinAppDriver, FlaUI | Desktop | not-applicable-now | No desktop app. |
| AI/LLM Evaluation | RAGAS, DeepEval, G-Eval, Promptfoo, BLEU, ROUGE, Fairlearn, Detoxify | AI Testing | partial | RAG eval tests exist but are opt-in/skipped unless local model/data are available. |
| AI Safety Testing | Garak, Lakera OSS tools | AI Security | target | Not wired. |
| Prompt Injection Testing | Garak, Promptfoo | AI Security | target | Not wired. |
| Hallucination Testing | RAGAS, DeepEval, G-Eval, BLEU, ROUGE | AI Quality | partial | RAG eval coverage exists; not default gate. |
| Multi-Agent Testing | LangSmith OSS alternatives, AgentOps OSS | Agentic AI | target | Local agent harness tests exist; AgentOps-style tool not wired. |
| AI Tracing | OpenLIT, Langfuse, Helicone OSS | AI Observability | target | Structured logs/request IDs exist; AI tracing tools not wired. |
| Observability | OpenTelemetry | Observability | target | OpenTelemetry is documented target; not fully wired. |
| Metrics | Prometheus | Monitoring | target | No Prometheus config yet. |
| Visualization | Grafana | Monitoring | target | No Grafana dashboards yet. |
| Distributed Tracing | Jaeger, Zipkin | Monitoring | target | No trace backend yet. |
| Logging | ELK Stack, Loki | Observability | target | Structured logs exist; centralized stack not wired. |
| Chaos Engineering | Chaos Monkey, LitmusChaos, Chaos Mesh | Reliability | target | Not wired. |
| Workflow Testing | Temporal Testing Framework | Workflow | target | Temporal not wired. |
| Event Streaming Testing | Kafka Test Containers | Distributed Systems | target | Kafka not wired; Redis queues currently. |
| Service Virtualization | WireMock, MockServer | Integration | target | Not wired. |
| Synthetic Monitoring | Checkly OSS patterns, Blackbox Exporter | Monitoring | target | Not wired. |
| Governance Testing | OPA, Kyverno | Governance | target | Demo RBAC tests exist; OPA/Kyverno not wired. |
| Policy Testing | Conftest | Governance | target | Not wired. |
| Backup/Restore Testing | Velero | Reliability | not-applicable-now | Velero applies after Kubernetes/backups are defined. |
| Service Mesh Testing | Istio test tools | Cloud Native | not-applicable-now | Istio is not set up; requires Kubernetes. |
| CI/CD Testing | Jenkins, Tekton, Argo Workflows | DevOps | target | GitHub Actions exists; Jenkins/Tekton/Argo not wired. |
| GitOps Validation | ArgoCD, FluxCD | DevOps | target | No GitOps deployment yet. |
| AI Workflow Testing | LangGraph test harnesses | Agentic AI | target | LangGraph not wired; local hub-and-spoke harness exists. |
| Semantic Testing | RAGAS, G-Eval, BLEU, ROUGE | RAG | partial | RAG eval tests exist, opt-in. |
| Vector DB Testing | Custom embedding benchmark tools | AI | target | No vector DB currently. |
| Explainability Testing | SHAP, LIME | Responsible AI | partial | SHAP is in ML stack references; no standard explainability gate across all models. |
| Bias/Fairness Testing | IBM AI Fairness 360, Fairlearn, Detoxify | Responsible AI | target | Not wired. |
| Synthetic Data Testing | SDV | AI/Data | target | Not wired. |
| Network Testing | Toxiproxy | Resilience | target | Not wired. |
| Resilience Testing | Gremlin alternatives, Chaos Mesh | Reliability | target | Circuit breaker partial; resilience testing tools not wired. |

## Current Default Validation Gate

The current local gate is intentionally smaller than the full ecosystem:

```bash
./scripts/project_doctor.sh
```

It currently validates:

- frontend build
- frontend lint
- backend PyTest suite excluding opt-in eval tests
- docs/config consistency checks

## Recommended Adoption Order

| Phase | Add | Why |
|---|---|---|
| 1 | Semgrep, Gitleaks, Trivy | Fast security value with low runtime complexity. |
| 2 | Playwright e2e in CI, Axe-core | Frontend regression and accessibility coverage. |
| 3 | k6 or Locust | API performance baseline before scaling. |
| 4 | RAGAS, DeepEval, G-Eval, Promptfoo, BLEU, ROUGE, Fairlearn, Detoxify | AI quality and prompt regression. |
| 5 | OpenTelemetry, Prometheus, Grafana, Jaeger | Observability across API -> service -> worker -> model. |
| 6 | OPA + Conftest | Policy-as-code and governance testing. |
| 7 | Kafka Test Containers, Toxiproxy | Distributed/event and network resilience once Kafka is wired. |
| 8 | Istio/Kiali/Kubescape/Velero | Only after Kubernetes deployment exists. |

## Mandatory Rule

A tool moves from `target` to `wired` only when all of these exist:

- dependency or container configuration
- runnable command or CI job
- docs/runbook entry
- at least one passing test or smoke check
- failure-mode behavior documented
- owner and rollback/removal path
