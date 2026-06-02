# Production Agent Platform Architecture

This document maps target architecture patterns to the tools that should be studied or integrated when this project moves from local Docker Compose demos into a production-grade agent platform.

It is intentionally explicit about status. Some items are working locally. Many are target architecture components and must not be claimed as wired until code, deployment manifests, tests, and runbooks exist.

## Architecture To Tool Map

| Architecture | Best Tool | Purpose | Repo Status | Production Gate |
|---|---|---|---|---|
| Multi-Agent Systems | Microsoft AutoGen | General multi-agent conversation, tool use, and collaboration | Not wired | Add package, adapter boundary, tests, security review, and runbook |
| Council of Agents | CrewAI | Role-based agent crews, review chains, consensus patterns | Local council implemented without CrewAI | Decide whether to keep lightweight local council or replace with CrewAI adapter |
| Hub-and-Spoke | LangGraph | Central graph/supervisor controls worker nodes and state transitions | Local hub-and-spoke exists through OpenClaw bridge -> Redis -> workers | Add explicit DAG/state graph before claiming LangGraph integration |
| Durable Workflow | Temporal | Durable retries, schedules, long-running workflows, compensation | Not wired | Add Temporal server, workers, workflow tests, retry policy, and visibility runbook |
| Persistent Agent OS | OpenClaw GitHub | External/persistent agent operating gateway | Local OpenClaw-compatible bridge exists; external OpenClaw SDK/gateway not bundled | Select official repo/runtime, wire secrets/RBAC/audit, and document adapter |
| Observability | OpenTelemetry | Distributed traces, metrics, span correlation, service maps | Structured logs and request IDs exist; OpenTelemetry not wired | Add OTEL SDK/exporter, trace propagation, collector config, and dashboard docs |
| Governance | Open Policy Agent | Policy-as-code authorization and guardrails | Demo RBAC middleware only | Add OPA sidecar/server, Rego policies, policy tests, and deny-by-default rules |
| Event Bus | Apache Kafka | Pub/sub events, streaming agent jobs, DLQ, replay | Redis queues only | Add Kafka broker, topics, schema registry policy, consumers, DLQ, and replay tests |
| Service Mesh | Istio | mTLS, ingress, traffic shaping, retries, telemetry | Not applicable to current Docker Compose stack | Requires Kubernetes manifests and mesh test plan |
| Mesh Observability | Kiali | Istio topology, traffic graph, mTLS visibility | Not wired | Requires Istio and Kubernetes deployment |
| Resilience | Circuit Breaker | Prevent cascading failures and isolate broken downstreams | Working only in RAG lifecycle | Extract shared resilience module and apply to OpenClaw, Ollama, API clients, workers |
| Semantic Knowledge | RDF / OWL | Formal ontology, relationships, reasoning, vocabulary control | Not wired | Define domain ontology, RDF triples, OWL classes, validation, and data ownership |
| Graph Database | Neo4j / RDF Store | Relationship traversal, lineage, knowledge graph, dependency maps | Not wired | Pick graph backend, schema, ingestion, query API, and access controls |
| Ontology Layer | OWL / SHACL | Governed business vocabulary and schema validation | Not wired | Add ontology repo, SHACL constraints, CI validation, and API mapping |
| Simulation Tooling | SimPy / Mesa / AnyLogic-style adapter | Digital twin, process simulation, agent-based modeling | Business simulation services exist, not a full simulation engine | Add simulation contracts, scenario store, reproducibility seed, and result evaluation |

## Enterprise Dark Factory Architecture

This is the full enterprise target architecture. It extends the local BMAD/Archon/Codex flow into a production-grade control plane, execution plane, runtime plane, observability plane, and governance plane.

```text
Users / APIs / Events
  -> CDN + Load Balancer + API Gateway
  -> Identity + Auth + RBAC + Policy Layer
  -> Control Plane
       BMAD, Archon, LangGraph, Temporal, Paperclip,
       workflow governance, approval engine, task routing,
       agent orchestration
  -> Intelligence Plane
       Council of Agents:
       Planner, Architect, Developer, QA, Security,
       Compliance, Infra, Evaluation
  -> Execution Plane
       OpenHands, OpenClaw, CUA, Stagehand, Playwright,
       Harness, GitHub Actions, sandboxed runtimes
  -> Tool / MCP Plane
       MCP servers, database tools, cloud APIs, GitHub,
       Jira, Slack, browser tools, terminal tools, RAG systems
  -> Runtime Plane
       Kubernetes, Istio, Kafka, Neo4j, vector DB, ArgoCD,
       service mesh, circuit breakers
  -> Observability Plane
       OpenTelemetry, LangSmith, Phoenix, AgentOps,
       Prometheus, Grafana, Jaeger, Kiali, DeepEval, Ragas
  -> Trust / Governance Plane
       Guardrails, OPA, human approval, audit logs,
       PII protection, security validation, compliance engine
```

Production ingress and runtime view:

```text
Users / Apps / Events
  -> CDN + Load Balancer + API Gateway
  -> Istio Service Mesh + Circuit Breaker
  -> Control Plane
       Temporal = durable workflow engine
       Harness Agent = DevOps / CI-CD automation
       Paperclip = agent company / org / budget / task management
       OpenClaw = long-running autonomous agent runtime target
  -> Agent Tool Plane
       MCP = standard tool connector layer
       CUA = computer/browser/action agent
       Strands or lightweight agent framework = local agent framework option
       Policy AI / OPA = policy, governance, safety
  -> Execution Plane
       Kubernetes, GitHub Actions / Harness, ArgoCD, sandboxed workers
  -> Observability Plane
       OpenTelemetry, Prometheus + Grafana, Jaeger, Loki / ELK, Kiali
```

Current repo status: this is a target architecture. The working local subset is BMAD methodology, Archon local workflows, approval broker, Codex/Claude/Copilot developer tooling, OpenClaw/Paperclip local adapters, selected Playwright paths, structured logs, and `project_doctor`. Kubernetes, Istio, Kafka, ArgoCD, Temporal, OpenHands, full OTel, and full observability dashboards remain target/operator-gated until manifests, credentials, tests, and runbooks exist.

## Recommended End-To-End Enterprise Flow

```text
Idea / Ticket
  -> BMAD
  -> PRD + User Stories + Acceptance Criteria
  -> Archon
  -> Planner Agent
  -> Developer Agent / OpenHands / Cline
  -> Code Commit / Git Worktree
  -> Playwright + Unit Tests
  -> SonarQube + Semgrep + Trivy
  -> DeepEval / LangSmith Validation
  -> GitHub PR
  -> Harness / GitHub Actions
  -> Kubernetes Deployment
  -> Istio + Kiali + OpenTelemetry Monitoring
```

| Step | Current repo substitute | Target enterprise tool | Gate |
|---|---|---|---|
| Idea / ticket | Manual prompt, issue, BMAD brief | Jira/GitHub Issues/ServiceNow | Human owns priority and scope. |
| BMAD PRD/stories | `_bmad/` skills and docs | BMAD operating layer | Planning only, no runtime authority. |
| Archon workflow | `.archon/workflows/insur-*.yaml` | Archon or workflow UI | Local approvals cannot bypass CI/CODEOWNERS. |
| Planner/developer agents | Codex, Claude, Copilot | OpenHands/Cline/sandboxed coding agents | Repo sandbox, least privilege, no production secrets. |
| Code commit/worktree | Git worktree and PR flow | GitHub protected branch | PR review and CODEOWNERS required. |
| Tests | `project_doctor`, backend pytest, frontend lint/build, focused Playwright/drills | Playwright, unit, integration, contract suites | Default gate must stay deterministic. |
| Security validation | Current governance checks and targeted drills | SonarQube, Semgrep, Trivy | Required before release when wired. |
| AI validation | Opt-in AI/RAG evals | DeepEval, LangSmith, Ragas, Phoenix | Not default until stable local models/datasets exist. |
| CI/CD | GitHub Actions examples | Harness, GitHub Actions, ArgoCD | Deployment requires operator-approved environment. |
| Runtime | Docker Compose local stack | Kubernetes, Istio, Kafka, vector DB, graph DB | Operator-owned infra and runbooks. |
| Monitoring | Structured logs, request IDs, audit logs | OpenTelemetry, Prometheus, Grafana, Jaeger, Kiali, Loki/ELK | Trace propagation and dashboards required before production claim. |

## Workflow And Approval Tool Shortlist

| Tool | Best For | Key features | INSUR status |
|---|---|---|---|
| Temporal | Durable workflows | Retries, pause/resume, approval, long-running workflows | Target durable approval/workflow engine; not wired. |
| LangGraph Studio | Agent graph workflows | Execution graph, state visualization, agent DAG debugging | Target graph UI; LangGraph itself is not wired. |
| Argo Workflows | Kubernetes workflows | DAG orchestration, container-native jobs | Target only; requires Kubernetes. |
| Prefect | AI/data workflows | Python flows, monitoring UI, retries | Installed stage-2 candidate; slot conflicts with Dagster. |
| Dagster | Data/asset workflows | Asset lineage, observability, typed assets | Installed stage-2 candidate; slot conflicts with Prefect. |
| Kestra | Event-driven orchestration | Visual workflows, triggers, event-oriented automation | SDK installed; server adoption deferred. |
| Windmill | Workflow UI + approval | Scripts, flows, apps, approval steps | SDK installed; server requires legal/AGPL review. |
| n8n | Low-code automation | Connectors, low-code orchestration, webhooks | Candidate only; needs secrets, tenancy, and egress review. |
| Harness | CI/CD workflow monitoring | Deployment pipelines, approvals, execution visibility | Target CI/CD control; not wired into runtime. |

## Agent And LLM Observability Shortlist

| Tool | Best For | Key features | INSUR status |
|---|---|---|---|
| AgentOps | Multi-agent observability | Agent sessions, tool tracking, failures | Installed candidate; SaaS key required for dashboard. |
| LangSmith | LangGraph/LangChain monitoring | Traces, workflows, evaluation datasets | Installed candidate; SaaS and opt-in only. |
| Langfuse | Open-source LLM observability | Prompts, traces, cost tracking, eval datasets | Installed candidate; preferred self-host option when server exists. |
| Phoenix Arize | RAG + agent debugging | Retrieval analysis, hallucination/debug traces | Installed candidate; local trace viewer target. |
| Helicone | LLM request monitoring | Latency, token usage, caching, gateway headers | Documented candidate; gateway/header integration only. |
| Humanloop | Prompt + agent evaluation | Human feedback workflows, eval management | Candidate only; SaaS/data retention review required. |
| Laminar | AI tracing | Distributed AI traces and workflow visibility | Candidate only; evaluate against OTel/Langfuse. |
| Braintrust | AI eval + monitoring | Experiment tracking, datasets, evals | Candidate only; SaaS/data retention review required. |
| OpenLIT | OpenTelemetry for LLMs | Tracing, metrics, auto-instrumentation | Installed candidate; requires OTel collector endpoint. |
| WhyLabs | ML/LLM observability | Drift, anomaly detection, data quality | Candidate for model/data monitoring; not wired. |

## Target Production Reference Architecture

```text
Users / Codex / Claude / External Systems
  -> API Gateway / Ingress
  -> AuthN/AuthZ + OPA policy check
  -> OpenClaw / LangGraph / Temporal orchestration boundary
  -> Kafka event bus for async jobs and replay
  -> Agent workers: simple, council, specialist, simulation
  -> Model/RAG/tool adapters with circuit breakers
  -> Postgres + Redis + Graph DB / RDF store
  -> OpenTelemetry collector
  -> Dashboards: logs, traces, metrics, Kiali when on Istio
```

## Recommended Evolution Path

| Phase | Goal | Tools | Exit Criteria |
|---|---|---|---|
| 1. Local hub-and-spoke | Make 100 workers visible and operable | Redis, Docker Compose, `scripts/agent_fleet.sh` | Tasks can be submitted, processed, monitored, and scheduled locally |
| 2. Shared resilience | Stop cascading failures | Shared circuit breaker, retries, timeouts | OpenClaw, Ollama, API clients, and workers use common resilience policy |
| 3. Workflow graph | Make orchestration explicit | LangGraph or internal DAG | Workflows have nodes, edges, state, retries, and run manifests |
| 4. Durable workflows | Support long-running production jobs | Temporal | Workflows survive restarts, support schedules, and expose visibility |
| 5. Event platform | Move from queues to events | Apache Kafka | Topics, consumer groups, DLQ, replay, schema/version policy exist |
| 6. Policy-as-code | Centralize governance | Open Policy Agent | Rego policies gate sensitive actions and are tested in CI |
| 7. Distributed observability | Trace every request/job | OpenTelemetry | Trace IDs follow API -> service -> queue -> worker -> model calls |
| 8. Semantic graph | Add explainable relationship layer | RDF, OWL, SHACL, graph DB | Business ontology and graph queries support lineage/explainability |
| 9. Kubernetes mesh | Production traffic governance | Istio, Kiali | mTLS, traffic policy, topology, and mesh telemetry work in K8s |
| 10. Simulation/digital twin | Model operational scenarios | SimPy/Mesa/custom adapter | Simulations are reproducible, validated, and linked to business KPIs |

## Tool Responsibilities

### Microsoft AutoGen

Use for research and general multi-agent experiments when agents need rich conversation, tool calling, and code-oriented collaboration.

Do not wire it directly into production data or deployment paths until it has:

- adapter boundary
- deterministic test harness
- policy checks
- audit logging
- budget and tool permissions

### CrewAI

Use for structured role crews such as author, reviewer, chair, compliance, risk, and evaluator. The current `agents/council_agent.py` is a lightweight local version of this idea.

Decision needed later:

- keep the local council for simplicity, or
- wrap CrewAI behind a `CouncilAdapter` interface.

### LangGraph

Use for explicit hub-and-spoke and DAG workflows. Good fit for supervisor-worker orchestration where a parent graph controls task state.

Production expectations:

- workflow state schema
- node contracts
- retry policy
- checkpointing
- run manifest
- graph-level tests

### Temporal

Use when workflows must survive process restarts or span minutes/hours/days. Good for scheduled jobs, ML pipelines, approval workflows, and retry-heavy integrations.

Required before adoption:

- Temporal server in local/dev stack
- Python worker service
- workflow/activity definitions
- schedule runbook
- visibility dashboard docs

### OpenClaw

Current repo status:

- local OpenClaw-compatible bridge is wired through FastAPI and Redis
- external OpenClaw GitHub/runtime is not bundled

Next production work:

- select official runtime/repo
- define adapter contract
- add secrets and tenant isolation
- enforce OPA/RBAC before task execution
- add end-to-end harness tests

### OpenTelemetry

Use for traces, metrics, and correlation across API, queues, workers, and model calls.

Minimum spans:

- API request span
- service method span
- Redis enqueue/dequeue span
- worker task span
- Ollama/model call span
- database query span where applicable

### Open Policy Agent

Use for policy-as-code. OPA should own production authorization decisions that outgrow the current demo `X-Demo-Role` middleware.

Policy examples:

- who can submit agent tasks
- who can run scheduled jobs
- who can trigger external tools
- which departments a tenant/user can access
- when human approval is required

### Apache Kafka

Use when Redis lists are no longer enough. Kafka should carry durable event streams, consumer groups, replay, DLQ, and cross-service integration events.

Initial topic candidates:

- `agent.task.requested`
- `agent.task.started`
- `agent.task.completed`
- `agent.task.failed`
- `workflow.schedule.triggered`
- `model.inference.requested`
- `governance.policy.denied`

### Istio And Kiali

Use only after Kubernetes exists. Istio is not useful for the current Docker Compose-only local stack.

Istio should provide:

- mTLS between services
- ingress gateway
- traffic splitting
- retries/timeouts
- telemetry
- authorization policy where appropriate

Kiali should provide:

- mesh topology
- traffic graph
- mTLS status
- service health visualization

### Circuit Breaker

Current repo status:

- RAG lifecycle has a local circuit breaker
- OpenClaw, agent workers, API clients, and broader Ollama calls still need shared resilience

Target shared module:

```text
backend/core/resilience.py
  CircuitBreaker
  RetryPolicy
  TimeoutPolicy
  Bulkhead/Semaphore guard
```

### RDF, OWL, Ontology, And Graph DB

Use for semantic governance and explainability, not as a replacement for relational operational data.

Recommended split:

- PostgreSQL: transactional app data
- Redis/Kafka: queues/events
- Graph DB/RDF store: relationships, lineage, ontology, semantic search
- OWL/SHACL: vocabulary, classes, constraints, validation

Ontology candidates:

- Department
- Process
- KPI
- Dataset
- Model
- Agent
- Task
- Policy
- Risk
- Control
- Workflow
- Event

### Simulation Tools

Use simulation for digital twins, supply chain risk, manufacturing throughput, staffing, inventory, and demand shocks.

Recommended local-first tools:

- SimPy for process/discrete-event simulation
- Mesa for agent-based simulation
- custom domain adapters when simple scenarios are enough

Every simulation run should produce:

- scenario id
- seed
- assumptions
- input parameters
- output KPIs
- confidence/limitations
- reproducible artifact path

## Implementation Status Snapshot

| Capability | Status |
|---|---|
| 100-agent local worker fleet | Working via `scripts/agent_fleet.sh` and Docker Compose scaling |
| OpenClaw-compatible bridge | Working locally through FastAPI/Redis |
| Council of agents | Working locally through `agents/council_agent.py` |
| Recurring scheduled agent jobs | Working locally through `scripts/agent_scheduler.py` |
| Live queue/heartbeat monitoring | Working locally through `scripts/agent_monitor.py` |
| AutoGen | Not wired |
| CrewAI | Not wired |
| LangGraph | Not wired |
| Temporal | Not wired |
| OpenTelemetry | Not wired as full tracing; structured logs/request IDs exist |
| OPA | Not wired; demo RBAC only |
| Kafka | Not wired; Redis queues only |
| Istio/Kiali | Not wired; requires Kubernetes |
| Shared circuit breaker | Partial; RAG lifecycle only |
| RDF/OWL/Graph DB/Ontology | Not wired |
| Simulation engine | Partial business simulation services; no generic simulation platform |

## Readiness Checklist Before Claiming Production

- Architecture decision record exists for the selected tool.
- Dependency and license review completed.
- Threat model and data-access scope documented.
- Auth/RBAC/OPA policy enforced.
- Secrets are isolated and rotated.
- OpenTelemetry trace propagation works across service boundaries.
- Tests cover success, failure, timeout, retry, and policy-denied paths.
- Runbook explains start, stop, monitor, debug, rollback.
- README and governance index link the new capability.
- Project doctor or CI validates the integration.
