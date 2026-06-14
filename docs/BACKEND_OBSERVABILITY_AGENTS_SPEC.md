# Backend Observability + Agents · Production Architecture Spec

> Operator 2026-06-14 16:50 MDT: pasted 50K char spec for `observability/` (12 files · Production Architecture Checklist) + `agents/` (16 files Principal Architect Production Matrix + 12 Missing files I would add). Per §57.7 brutal honest, this doc captures the full spec · status is in [BACKEND_OBSERVABILITY_AGENTS_STATUS.md](./BACKEND_OBSERVABILITY_AGENTS_STATUS.md).

## § 1 · observability/ — Production Architecture Checklist (12 files + 9 extended)

### Core 12 files

| File | Required | What should be inside | Flow | Common mistakes | Architect recommendation | Audit check |
|---|:-:|---|---|---|---|---|
| `otel_tracing.py` | Yes | OpenTelemetry SDK setup, service name from env, trace/span creation, exporter config, error boundary | App/API → OTel SDK → Collector → Jaeger/Grafana/Tempo | No service name, no trace ID, no error span | Env-driven config + YAML collector | Every request has trace_id + span_id + request_id |
| `metrics_collector.py` | Yes | Latency, throughput, error rate, token usage, cost, queue depth, p95/p99 | Service → Metrics → Prometheus → Grafana | Only CPU/RAM monitored | Track business + AI metrics | Dashboards show infra + app + AI metrics |
| `log_pipeline.py` | Yes | Structured JSON logging, correlation ID, tenant ID, user/session ID, masking | App logs → Log pipeline → ELK/Loki/CloudWatch | Plain text logs, PII leakage | JSON logs with redaction | Logs searchable by trace/request/user/session |
| `trace_propagation.py` | Yes | Request ID, trace context, baggage propagation, headers | API Gateway → Service A → Service B → Agent/Tool | Trace breaks between services | Enforce W3C trace context | Trace continues across all services |
| `langfuse_client.py` | Optional/Yes for GenAI | Prompt logs, model calls, cost, latency, feedback, eval score | LLM call → Langfuse → Eval dashboard | Logging prompts without masking | LLM observability | Prompt/version/cost/latency captured |
| `langsmith_client.py` | Optional/Yes if LangChain | Chain tracing, tool calls, agent steps, dataset eval | LangChain/LangGraph → LangSmith | No chain-level visibility | RAG/agent debugging | Agent/tool traces visible E2E |
| `phoenix_client.py` | Optional/Yes for eval | Embedding drift, retrieval eval, hallucination checks | RAG pipeline → Phoenix → Eval | No retrieval quality monitoring | RAG evaluation | Retrieval relevance + groundedness tracked |
| `agentops_client.py` | Optional | Agent session, tool execution, failures, cost | Agent runtime → AgentOps | Agent actions not audited | Multi-agent workflows | Each agent action has owner + trace |
| `prometheus_exporter.py` | Yes | /metrics endpoint, counters, gauges, histograms | Service → Prometheus scrape | Wrong labels causing high cardinality | Controlled labels | No unbounded labels like raw user ID/query |
| `grafana_dashboard.py` | Yes | Dashboard JSON/code generator, panels, alerts | Prometheus/Loki/Tempo → Grafana | Dashboard only after incident | Create dashboard from day 1 | SLO dashboards exist |
| `jaeger_exporter.py` | Optional/Yes | Jaeger exporter config, trace sink setup | OTel Collector → Jaeger | Direct app-to-Jaeger hardcoding | OTel Collector routing | Jaeger receives valid traces |
| `telemetry_router.py` | Yes | Route traces/logs/metrics to tools by env/team/use case | App → Router → Langfuse/LangSmith/Phoenix/Grafana | Vendor lock-in | Central telemetry abstraction | Can switch backend without app rewrite |

### Extended 9 files (Enterprise Top-1%)

| File | Required | Owner | Signal Type | Purpose |
|---|:-:|---|---|---|
| `audit_logger.py` | Yes | Security/Compliance | Audit Log | Immutable audit logs, actor/action/resource · 1-7 yr retention |
| `redaction_filter.py` | Yes | Security | Security | PII masking, token stripping, secret filtering |
| `cost_tracker.py` | Yes for AI | FinOps/AI Ops | Financial Metrics | Token cost, embedding cost, API spend, tenant cost |
| `retrieval_monitor.py` | Yes for RAG | AI Platform | RAG Metrics | Retrieval score, chunk source, latency, ranking quality |
| `hallucination_monitor.py` | Recommended | AI QA | AI Quality | Groundedness scoring, hallucination detection |
| `synthetic_checks.py` | Yes | SRE/QA | Synthetic Monitoring | API health probes, RAG golden tests, workflow validation |
| `alert_manager.py` | Yes | Operations/SRE | Alerting | Routing, escalation, deduplication, severity rules |
| `incident_ticket_creator.py` | Yes | Operations | Incident | Auto-ticket creation with trace/log context |
| `slo_definitions.yml` | Yes | Architecture/SRE | Governance | SLO, SLA, error budget definitions |

### Required YAML schema (`observability_config.yml`)

```yaml
service:
  name: ${SERVICE_NAME}
  environment: ${ENVIRONMENT}
  version: ${SERVICE_VERSION}

otel:
  collector_endpoint: ${OTEL_EXPORTER_OTLP_ENDPOINT}
  protocol: grpc
  sampling_ratio: ${OTEL_SAMPLING_RATIO}

propagation:
  trace_context: true
  baggage: true
  request_id_header: x-request-id
  correlation_id_header: x-correlation-id

exporters:
  traces:
    - otlp
    - jaeger
  metrics:
    - prometheus
  logs:
    - loki

security:
  redact_pii: true
  mask_prompt_data: true
  block_sensitive_headers:
    - authorization
    - cookie
```

### Top Architect Rule

> For every API, agent, tool, and LLM call: must carry `request_id + trace_id + span_id + tenant_id + service_name`.

---

## § 2 · agents/ — Principal Architect Production Matrix (16 core + 12 missing)

### Core 16 agent files

| File | Required | Owner | Signal Type | Purpose | Severity if Missing |
|---|:-:|---|---|---|---|
| `base_agent.py` | Yes | AI Platform | Agent lifecycle | Common agent interface, config, identity, policy, tool access, memory hooks, logging | Critical |
| `orchestration_agent.py` | Yes | AI Architect | Workflow trace | Agent routing, task delegation, state machine, retry, fallback, HITL | Critical |
| `planner_agent.py` | Yes | AI Product/Architect | Plan trace | Task breakdown, dependency map, execution plan, risk scoring | High |
| `architect_agent.py` | Yes | Principal Architect | Design trace | HLD/LLD, ADR, NFR mapping, trade-off analysis, C4 design | Critical |
| `developer_agent.py` | Yes | Engineering | Code trace | Code generation, refactoring, unit test hooks, PR summary | High |
| `coding_agent.py` | Conditional | Engineering | Code execution | Local coding task, bug fix, repo navigation, patch generation | Medium |
| `qa_agent.py` | Yes | QA/SDET | Test trace | Test cases, automation, regression, API/UI/load/security hooks | Critical |
| `security_agent.py` | Yes | Security | Security event | Threat model, SAST/DAST, secrets scan, dependency risk, prompt injection | Critical |
| `compliance_agent.py` | Yes | GRC/Compliance | Audit event | Policy mapping, ISO/NIST controls, evidence collection, approval rules | Critical |
| `reviewer_agent.py` | Yes | Tech Lead | Review trace | Code/design review, risk review, quality gate, approval/reject | High |
| `evaluation_agent.py` | Yes | AI QA | Eval metrics | Accuracy, groundedness, hallucination, relevance, toxicity, latency, cost | Critical |
| `rag_agent.py` | Yes for RAG | AI Platform | Retrieval trace | Query rewrite, retrieval, reranking, citation, source validation | Critical |
| `browser_agent.py` | Conditional | Automation Team | Browser trace | Browser automation, scraping policy, UI task execution, screenshot evidence | High |
| `deployment_agent.py` | Yes | DevOps/SRE | Deployment event | CI/CD trigger, release validation, rollback, canary, env promotion | Critical |
| `monitoring_agent.py` | Yes | SRE/AI Ops | Ops signal | Alert triage, RCA, anomaly detection, incident summary, escalation | Critical |
| `memory_agent.py` | Yes | AI Platform/Data | Memory event | Short/long-term memory, TTL, tenant isolation, memory review | Critical |

### Missing files (Top-1%) · should be added

| File | Why |
|---|---|
| `agent_registry.py` | Central list of agents, roles, permissions, owners |
| `agent_policy.py` | Decides what each agent can/cannot do |
| `agent_state.py` | Shared state model for workflow execution |
| `agent_context.py` | Tenant, user, session, trace, task context |
| `agent_guardrails.py` | Safety, compliance, prompt-injection defense |
| `agent_tool_permissions.py` | Tool allowlist/denylist per agent |
| `agent_handoff.py` | Clean handoff between planner, coder, QA, reviewer |
| `agent_error_handler.py` | Retry, fallback, circuit breaker |
| `agent_audit.py` | Immutable record of every agent decision |
| `human_approval_agent.py` | Required for high-risk actions |
| `agent_config.yml` | Runtime config, env, model, tools, limits |
| `agent_prompts/` | Versioned system prompts per agent |

### Standard Agent Sequence (every agent · 12 steps)

1. Receive AgentRequest
2. Validate schema
3. Attach trace_id / request_id / tenant_id
4. Check policy and permissions
5. Load required context
6. Execute agent-specific logic
7. Call tools / DB / SharePoint / vector DB if needed
8. Validate output
9. Run evaluation / guardrail check
10. Log metrics
11. Write audit event
12. Return AgentResponse

### Standard Decorators (8 mandatory)

- `@trace_agent`
- `@measure_latency`
- `@enforce_policy`
- `@validate_input`
- `@audit_action`
- `@handle_agent_errors`
- `@enforce_timeout`
- `@track_cost`

### Must / Should / May Content Per Agent File

| Level | Content |
|---|---|
| **Must** | Typed input/output models, trace ID, tenant ID, request ID, policy check, error boundary, timeout, audit log, structured logs |
| **Should** | Retry policy, fallback path, circuit breaker, SLO metric, eval hook, cost tracking, feature flag |
| **May** | Agent-specific prompt template, cache, advanced ranking, model selection, human approval hook |

---

## § 3 · Forced Sequence Flow (SharePoint Agentic RAG / Council of Agents)

```
1. User / API request
   ↓
2. API Gateway (auth · rate limit · request_id · tenant_id · trace_id)
   ↓
3. Orchestration Agent (validates · creates workflow state · selects agents)
   ↓
4. Security Agent (RBAC/ABAC · prompt injection · SharePoint permission)
   ↓
5. Planner Agent (breaks request into tasks · decides RAG/browser/coding path)
   ↓
6. Memory Agent (loads allowed user/session context · TTL + tenant isolation)
   ↓
7. RAG Agent (query rewrite · metadata lookup · vector/keyword/graph retrieval · rerank · citation)
   ↓
8. Architect / Developer / Browser Agent (only if task needs design/code/browser)
   ↓
9. Evaluation Agent (groundedness · hallucination · relevance · citation accuracy · safety)
   ↓
10. Reviewer Agent (validates · approves / rejects / asks retry)
   ↓
11. Compliance Agent (policy check · audit evidence · high-risk approval)
   ↓
12. Response Composer (final answer · citations · confidence · limitations)
   ↓
13. Observability Layer (logs · traces · metrics · cost · audit event)
   ↓
14. User Response
```

### Mandatory Rule

> **No agent can directly answer the user.** Every response must pass: Security → Retrieval → Evaluation → Review → Compliance → Audit.

---

## § 4 · Golden Rule · per-request must-capture fields

For every SharePoint Agentic RAG request, developer must capture:

```
user_id · tenant_id · request_id · trace_id · agent_path ·
sharepoint_site_id · document_ids · chunk_ids · retrieval_scores ·
model_name · prompt_version · eval_score · cost · latency ·
final_decision · audit_event_id
```

---

## § 5 · Backend / Forward Compatibility

| Area | Rule |
|---|---|
| Input schema | Version every request: `schema_version` |
| Agent response | Keep old fields · add new optional fields only |
| Tool contracts | Use interface layer · not direct SDK calls everywhere |
| Prompt versions | Store prompt version with every response |
| Model versions | Store model/provider/version per call |
| Index versions | Store embedding model + index version |
| API compatibility | Never break existing clients without versioned endpoint |
| Memory schema | Support migration and TTL cleanup |

---

## § 6 · Enterprise Pattern Recommendation

> **Hub-and-Spoke + Council of Agents + Human Approval**
>
> Do not run a pure AI Dark Factory in enterprise. Use it only with: sandbox · policy gate · test gate · security scan · cost limit · audit log · human approval · rollback. Otherwise it becomes fast production chaos.

### Production Flow

```
User Requirement
  → Hub Orchestrator
  → Planner Agent
  → BMAD/Architect Agent
  → Developer/OpenHands Agent
  → QA Agent
  → Security Agent
  → Evaluation Agent
  → Council Review
  → Human Approval
  → Deployment Agent
  → Monitoring Agent
```

---

## § 7 · Composes with

- §38.3 (audit row · feeds audit_logger.py)
- §43 (drill enforces presence of this spec doc + status doc)
- §47.6 (per-tenant RBAC · enforced by security_agent.py)
- §57.6 (canonical fields · all in Golden Rule §4)
- §103.5 (HITL approval · enforced by human_approval_agent.py)
- §122 (top-1% scaffold over fake code · status doc tells the truth)
- §138 (operator stack honored end-to-end)

---

## § 8 · Effective date

**2026-06-14** · per operator brutal spec dump in OP-16.
