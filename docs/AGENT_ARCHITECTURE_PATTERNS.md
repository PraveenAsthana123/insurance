# Agent Architecture Patterns

This document is the study and selection guide for agent architecture in this repo. Use it before adding new agent frameworks, worker pools, recursive delegation, Kafka/event agents, or multi-agent governance flows.

## Pattern Matrix

| Architecture | Purpose | Best Use Case | Current Repo Fit | Implementation Status |
|---|---|---|---|---|
| Hub-and-Spoke | Central orchestrator controls workers | Enterprise workflow | Best default for Codex/Claude/OpenClaw submitting tasks to Redis-backed workers | Working locally through `scripts/agent_fleet.sh`, OpenClaw bridge, Redis queues, and Docker Compose scaling |
| Council of Agents | Consensus decision making | Governance and validation | Best for review, risk, policy, and high-value business answers | Working through `agents/council_agent.py`, `council_tasks`, `council_done` |
| Swarm Architecture | Decentralized collaboration | Robotics and simulation | Useful later for simulation, not primary enterprise control plane | Not implemented |
| Hierarchical Agents | Parent-child delegation | Enterprise orchestration | Good next step after hub-and-spoke when tasks need planning/subtasks | Partially represented by council stages; no dynamic parent-child planner yet |
| Blackboard Architecture | Shared memory space | Research agents | Good for shared context, evidence packs, and multi-agent state | Redis is a simple queue store only; no blackboard memory model yet |
| Event-Driven Agents | Kafka/pub-sub agents | Real-time systems | Future production path for event streams and domain events | Not implemented; Redis lists only |
| Federated Agent System | Multi-tenant isolation | Enterprise SaaS | Required for SaaS or tenant-specific departments | Not implemented; needs tenant IDs, auth scopes, and data partitions |
| DAG Agent Workflow | Structured execution | LangGraph-style flows | Good for repeatable workflows with explicit dependencies | Not implemented as DAG; current scheduler is interval-based |
| Debate Architecture | Agents challenge each other | Risk validation | Useful for security, compliance, financial, and AI governance reviews | Partially implemented through author/reviewer/chair council flow |
| Reflection Architecture | Self-evaluation loops | Autonomous improvement | Useful for output quality checks and retry loops | Not implemented as persistent loop |
| Society of Mind | Specialized micro-agents | Cognitive AI | Useful for specialized business departments and role agents | Conceptual fit with HOLY departments; not fully wired as role-specialized runtime |
| Mixture-of-Agents | Ensemble intelligence | Reliability and accuracy | Useful for model/provider redundancy and answer scoring | Not implemented; council approximates one ensemble pattern |
| Supervisor-Worker | Central planner/executor | Task automation | Same practical family as hub-and-spoke; best current operating model | Working through OpenClaw/FastAPI -> Redis -> worker containers |
| Recursive Delegation | Agents spawn agents | Deep research | High risk; only allow behind budgets, depth limits, and approvals | Not implemented |
| Digital Twin Agents | Simulated environments | Manufacturing/IoT | Useful for manufacturing, supply chain, and process simulation | Not implemented as agents; simulation services exist separately |

## Recommended Pattern For This Repo Now

Use `Hub-and-Spoke / Supervisor-Worker` as the operational baseline.

```text
Codex / Claude / external orchestrator
  -> OpenClaw bridge or agent_fleet.sh
  -> Redis queues
  -> 100 simple agents and/or council agents
  -> Redis result queues
  -> monitor/status/logs
```

Why this is the baseline:

- simple to run locally with Docker Compose
- easy to monitor through queue depth and heartbeats
- clear security boundary at API/RBAC before task creation
- easy to scale workers horizontally
- avoids unsafe recursive agent spawning

## Where Each Pattern Should Be Used

| Need | Preferred Pattern | Repo Entry Point |
|---|---|---|
| Execute 100 small independent tasks | Hub-and-spoke / supervisor-worker | `./scripts/agent_fleet.sh start-simple 100 100` |
| Validate one important answer | Council of agents / debate | `./scripts/agent_fleet.sh submit-council "..."` |
| Run recurring task every N seconds | Event-like scheduled workflow | `./scripts/agent_fleet.sh schedule-add ...` + `schedule-run` |
| Watch agent activity | Observability/control plane | `./scripts/agent_fleet.sh watch` |
| Submit from Codex/Claude | Hub API bridge | `./scripts/agent_fleet.sh submit-simple` or `submit-council` |
| Future Kafka integration | Event-driven agents | Add Kafka adapter, topic contracts, consumer groups, DLQ |
| Future LangGraph-style flow | DAG workflow | Add explicit graph state, node retries, and run manifest |

## Tool Matrix

| Tool | Primary Focus | Best For | Weakness | Repo Decision |
|---|---|---|---|---|
| Hermes Agent | Self-learning autonomous AI agent | Persistent AI teammate | Younger ecosystem | Research candidate only |
| OpenClaw | Multi-channel orchestration gateway | Automation + integrations | Complex setup/security overhead | Local OpenClaw-compatible bridge is working; external gateway/SDK not bundled |
| Kilo Code | AI coding workflow/runtime ecosystem | Dev productivity and orchestration | Narrower ecosystem maturity | Candidate for developer harness only |
| Descript | AI media/audio/video editing | Podcasts/video/content creation | Not a true autonomous agent platform | Media/demo tooling only |

## Production Controls Required Before Expansion

- RBAC/JWT authorization before task submission
- tenant and department isolation
- trace ID on every task
- heartbeat and liveness monitor for workers
- task status, retry count, and dead-letter queue
- output schema validation
- prompt/data redaction policy
- budget and recursion limits
- audit trail for Codex/Claude/external orchestrator submissions
- run report for every scheduled or batch execution

## Papers And Search Terms To Study

Use these search terms when collecting papers or references:

- hub-and-spoke multi-agent orchestration
- supervisor worker multi-agent systems
- hierarchical multi-agent reinforcement learning survey
- blackboard architecture artificial intelligence systems
- debate and reflection in large language model agents
- mixture of agents ensemble large language models
- event-driven multi-agent systems Kafka pub/sub
- federated multi-agent systems tenant isolation
- DAG-based agent workflow orchestration LangGraph
- digital twin agents manufacturing IoT

When adding a paper to this repo, record:

```text
Paper title:
Authors:
Year:
Architecture pattern:
Main idea:
What applies to HOLY:
What does not apply:
Implementation risk:
Repo decision:
```

## Production Tool Mapping

For the production target map from architecture pattern to tool, see `docs/PRODUCTION_AGENT_PLATFORM_ARCHITECTURE.md`. Summary:

| Architecture | Best Tool | Current Status |
|---|---|---|
| Multi-Agent Systems | Microsoft AutoGen | Not wired |
| Council of Agents | CrewAI | Local council exists without CrewAI |
| Hub-and-Spoke | LangGraph | Local Redis/OpenClaw hub exists; LangGraph not wired |
| Durable Workflow | Temporal | Not wired |
| Persistent Agent OS | OpenClaw GitHub | Local bridge wired; external runtime not bundled |
| Observability | OpenTelemetry | Structured logs/request IDs only |
| Governance | Open Policy Agent | Demo RBAC only |
| Event Bus | Apache Kafka | Redis queues only |
| Service Mesh | Istio + Kiali | Not wired; needs Kubernetes |
| Semantic Layer | RDF / OWL / Graph DB / Ontology | Not wired |
| Simulation | SimPy / Mesa / domain adapters | Partial business simulation only |

## Global Architecture Policy

See `docs/GLOBAL_AGENT_ARCHITECTURE_POLICY.md` for the reusable full-stack agent architecture policy, and `docs/AGENT_PLATFORM_INTERVIEW_GUIDE.md` for an interview-ready project explanation.
