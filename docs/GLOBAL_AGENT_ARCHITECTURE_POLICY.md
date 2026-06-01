# Global Agent Architecture Policy

This is a reusable global architecture policy for AI agent platforms. It can be applied to this repo or used as a baseline for other projects.

It defines the required layers, components, flows, roles, runtime responsibilities, security controls, observability, orchestration patterns, and production gates for an enterprise AI-native multi-agent system.

## 1. Architecture Flow

```text
User / API / Event / Orchestration Layer
  -> Gateway, authentication, session, routing, request validation
  -> Planner engine, workflow engine, policy engine
  -> Agent runtime, agent registry, tool manager
  -> Execution layer, memory/RAG layer, external systems
  -> Governance, guardrails, observability, audit
  -> Results, streaming output, events, reports, incident records
```

## 2. End-To-End Layer Model

| Layer | Responsibilities | Target Components |
|---|---|---|
| User interaction layer | Web UI, REST API, CLI, chat, event trigger, webhook | React UI, CLI, API clients, event sources |
| API gateway layer | Authentication, rate limiting, request validation, websocket server, session router | API gateway, auth service, rate limiter, WebSocket server |
| Channel layer | User channel, API channel, event channel, orchestration channel | REST, WebSocket, CLI, Kafka/RabbitMQ target |
| Orchestration layer | Task decomposition, routing, dependency tracking, retry, scheduling, governance | OpenClaw local bridge now, LangGraph/Temporal target |
| Planner/workflow/policy layer | Planning, deterministic workflow, policy enforcement, approvals | Planner engine, workflow engine, policy engine, OPA target |
| Multi-agent runtime | Agent registry, role assignment, collaboration, fallback, context propagation | Planner, researcher, coder, reviewer, security, executor agents |
| Tool execution layer | Shell, file, browser, API, device, Docker, Kubernetes, SQL, message ingestion | Tool manager, tool registry, sandbox, validators |
| Memory/RAG layer | Short-term memory, long-term memory, semantic retrieval, context injection | Redis/local memory now; vector DB/RDF/graph target |
| Communication layer | Event bus, message broker, pub/sub, workflow queue, event broadcasting | Redis now; Kafka/RabbitMQ target |
| Security layer | AuthN, AuthZ, RBAC/ABAC, secret manager, encryption, audit logger | Demo RBAC now; Vault/OAuth/OPA target |
| Guardrail layer | Prompt injection detection, unsafe command validation, secret leakage prevention | Policy validators, human approval, content filters |
| Observability layer | Logs, metrics, traces, token use, tool output, API calls, CPU/memory/thread monitoring | Structured logs now; OpenTelemetry/Prometheus/Grafana target |
| State persistence layer | Workflow state, session state, task status, retry state, incident state | Redis/Postgres now; durable workflow store target |
| Deployment layer | Docker, Kubernetes, service mesh, scaling, rollback | Docker Compose now; Kubernetes/Istio/Kiali target |

## 3. Required Runtime Components

| Component | Required Capability |
|---|---|
| Tool calling | Register tools, validate schemas, check permissions, execute safely, log output. |
| Communication layer | Route messages across agents, tools, workflows, and users. |
| Gateway | Normalize requests from UI/API/events and enforce auth/rate limits. |
| Routing | Route tasks to planner, specialist agent, council, or external workflow. |
| WebSocket server | Stream progress, tool output, and partial responses. |
| Session management | Maintain user/session/workspace state and isolation. |
| Authentication | API keys, OAuth/JWT, service identities, non-human agent identity. |
| Concurrency control | Prevent duplicate execution, retry storms, deadlocks, and race conditions. |
| Event broadcasting | Publish task started/completed/failed/escalated events. |
| Agent orchestration | Decompose tasks, assign agents, coordinate dependencies, manage fallback. |
| Heartbeat scheduling | Track liveness and health of agent workers and tool executors. Local implementation: `scripts/agent_supervisor.py` reads Redis `agent:heartbeat:*` keys, queue backlog, schedules, and recent results. |

## 4. Agent Runtime Contract

Every agent runtime must support:

- receive task
- validate task envelope
- maintain context
- plan actions
- execute tools
- stream output
- handle retrieval
- retry or escalate on failure
- summarize result
- emit telemetry and audit events

Runtime subcomponents:

| Subcomponent | Responsibility |
|---|---|
| Planner | Break task into steps and dependencies. |
| Executor | Run planned steps and report progress. |
| Tool caller | Call tools through a governed manager, never directly by raw unchecked access. |
| Context manager | Maintain current task context, memory, retrieval snippets, and token budget. |
| Reasoner | Evaluate options, make decisions, and explain rationale. |
| Verifier | Check output quality, safety, evidence, and policy compliance. |

## 5. Execution Layer

The execution layer must handle:

- shell execution
- file operations
- browser automation
- API calls
- device automation
- Docker execution
- Kubernetes execution target
- SQL execution
- message ingestion
- format normalization
- reasoning and tool planning
- decision making
- multi-step execution
- summarization

All execution must pass through:

```text
request -> permission check -> risk analysis -> sandbox/validator -> execution -> audit -> result normalization
```

## 6. AI Components And Agent Roles

Every agent must have:

- identity
- personality/behavior contract
- skills
- goals
- tool access policy
- token budget
- memory policy
- context pruning policy
- retrieval ingestion policy
- fallback policy

Recommended agent collection:

| Agent | Purpose |
|---|---|
| Planner agent | Decomposes goals into executable plans. |
| Research agent | Retrieves external/internal context and summarizes evidence. |
| Coding agent | Implements code changes and tests. |
| Security agent | Reviews risks, unsafe actions, secrets, and permissions. |
| Reviewer agent | Reviews outputs and validates acceptance criteria. |
| Executor agent | Performs controlled tool execution. |
| Verification agent | Runs checks, tests, and postconditions. |
| RCA agent | Performs incident root cause analysis. |
| Governance agent | Applies policy, compliance, and audit requirements. |
| Fallback agent | Handles failed, overloaded, or unavailable primary agents. |

## 7. Memory Architecture

| Memory Type | Stores | Controls |
|---|---|---|
| Short-term memory | Current conversation, recent actions, temporary state, active plan | TTL, token pruning, session isolation |
| Long-term memory | Persistent user/project state, learnings, operational history, incident reports, runbooks | consent, retention, tenant isolation, audit |
| Semantic memory | Embeddings, retrieved chunks, entity relations, ontology links | freshness, retrieval eval, provenance, access control |
| Working memory | Intermediate reasoning and tool results during one run | redaction, summarization, lifecycle cleanup |

## 8. Skill System

| Component | Responsibility |
|---|---|
| Skill registry | Installed skills, versions, permissions, metadata, owner, trust level. |
| Skill loader | Load YAML config, Python modules, JavaScript plugins, markdown prompts. |
| Skill permission manager | Decide which agent/user/workspace can use the skill. |
| Skill evaluator | Test skill output quality and regression behavior. |

## 9. Tooling Component

Required tool lifecycle:

```text
register -> validate schema -> assign permission -> risk score -> approve -> execute -> normalize result -> audit -> monitor
```

Tool categories:

- shell executor
- Python runtime
- Docker runtime
- browser runtime
- Kubernetes executor
- SQL executor
- API executor
- GitHub/Jenkins/Terraform/Prometheus/Grafana integrations
- file and artifact tools
- Paperclip context-pack tools
- MCP tools

## 10. Browser Automation

Browser automation must support:

- navigation
- scraping/extraction
- form filling
- GUI automation
- screenshots/evidence
- target allowlist
- human approval for destructive actions

Target tools:

- Playwright for deterministic browser tests
- Stagehand/Browser Use/Open Operator as future agentic browser tools

## 11. Scheduler And Queue System

Scheduler responsibilities:

- health checks
- daily reports
- monitoring jobs
- auto cleanup
- cron jobs
- delayed execution
- priority jobs
- retry handling
- task queue management
- supervisor status, health, task inspection, and JSON reporting

Queue requirements:

| Feature | Requirement |
|---|---|
| Task queue | Accept pending agent/tool/workflow tasks. |
| Retry queue | Preserve retry count, last error, backoff. |
| Dead-letter queue | Capture failed tasks for review. |
| Delayed execution | Schedule future tasks. |
| Priority job | Run urgent tasks first. |
| Event replay | Required when Kafka/event bus is adopted. |

## 12. Security Architecture

Required controls:

- API key support
- OAuth/JWT target
- token validation
- RBAC and ABAC
- agent permissions
- tool permissions
- workspace access checks
- secret manager
- vault integration target
- encryption layer
- audit logger
- code sharing controls

Never allow an agent to access raw secrets directly. Secrets must flow through a secret manager and be masked in logs.

## 13. Sandbox Architecture

Execution must be isolated by risk level:

| Risk | Sandbox |
|---|---|
| Low | process sandbox and allowlisted commands |
| Medium | Docker container |
| High | VM/Firecracker/microVM target |
| Kubernetes production | namespace, network policy, service account, admission policy |

Sandbox candidates:

- Docker
- virtual machine
- Firecracker
- Linux namespaces
- Kubernetes namespace/pod security policy target

## 14. Guardrails

Guardrails must detect and block:

- prompt injection
- unsafe execution
- dangerous shell commands
- secret leakage
- PII leakage
- unauthorized tool calls
- unapproved external network access
- high-risk autonomous actions
- hallucinated tool arguments

High-risk actions require human approval.

## 15. Observability Requirements

Every run must emit:

- request id
- trace id
- session id
- workspace id
- user/agent id
- tool call id
- workflow id
- token usage
- latency
- retry count
- cost estimate where applicable
- CPU/memory/thread metrics where available
- input/output hashes for sensitive artifacts
- error and stack trace if failed

Target stack:

- OpenTelemetry for traces
- Prometheus for metrics
- Grafana for dashboards
- Jaeger/Tempo for trace UI
- Loki/ELK for logs
- Langfuse/OpenLIT for AI tracing target

## 16. Infrastructure Fallbacks

Required fallback systems:

| Capability | Purpose |
|---|---|
| Cache layer | Reduce repeated calls and provide degraded reads. |
| Token manager | Enforce budget and prevent context overflow. |
| Rate limiter | Prevent service overload. |
| Context limiter | Trim/prune context safely. |
| Circuit breaker | Stop cascading failures. |
| Provider router | Fail over model/API providers. |
| Queue fallback | Move failed work to retry/DLQ. |

## 17. MCP Integration Layer

MCP target responsibilities:

- tool standardization
- shared agent capability discovery
- external context provider integration
- knowledge graph access
- policy engine integration
- safety policy and compliance rule distribution
- MCP gateway
- MCP registry
- MCP client
- service discovery
- capability negotiation
- session manager

MCP server categories:

- infrastructure
- DevOps
- monitoring
- business systems
- database
- knowledge graph
- policy/governance

## 18. Knowledge Graph And Ontology

Knowledge graph layer must model:

- relationships
- dependencies
- entity graph
- department/process/KPI relationships
- agent/tool capability graph
- workflow dependency graph
- incident/root-cause graph
- policy/risk/control graph

Target technologies:

- RDF/OWL/SHACL
- graph DB or RDF store
- vector memory for semantic retrieval

## 19. Policy Engine

Policy engine must decide:

- allow/deny actions
- tool permission
- workspace access
- user role access
- agent permission
- risk scoring
- escalation need
- human approval requirement
- compliance rule enforcement

Target tools:

- OPA/Rego
- Kyverno for Kubernetes admission policies
- PolisAI-style AI governance layer as target concept

## 20. Target Tool Mapping

| Concern | Current Repo | Target Tooling |
|---|---|---|
| Local agent OS / bridge | OpenClaw-compatible local bridge | external OpenClaw runtime if selected |
| Artifact/context pack | local Paperclip adapter | external Paperclip/Piperclip only if selected |
| Agent harness | `scripts/agent_fleet.sh`, Redis workers | AgentOps/LangGraph/Temporal target |
| Governance | demo RBAC | OPA, PolisAI-style governance, audit service |
| Event bus | Redis queues | Kafka/RabbitMQ |
| Workflow durability | local scheduler/cron | Temporal/Airflow target |
| Service mesh | not wired | Istio/Kiali on Kubernetes |
| Circuit breaker | partial RAG lifecycle | shared resilience module |
| Observability | structured logs/request ids | OpenTelemetry, Prometheus, Grafana, Jaeger |
| Memory | Redis/local artifacts/RAG refs | vector DB, RDF/OWL graph DB |
| MCP | not wired | MCP gateway/registry/client/server layer |

## 21. Production Gates

A component is production-ready only when:

- code exists
- config exists
- tests exist
- runbook exists
- monitoring exists
- security review exists
- rollback exists
- docs state input/process/output/security/observability
- `project_doctor` or CI validates it

Until then, mark it as target or partial, not wired.
