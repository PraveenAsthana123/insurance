# Enterprise AI Reference Architecture — Policy

**Status:** POLICY (normative, binding for Phase 2+ content)
**Role:** Architect-level direction for the BEV AI Platform
**Adopted:** 2026-04-19
**Supersedes:** course-level / introductory AI system designs

This document is the **architectural policy** that governs Phase 2+ feature work on the BEV AI Platform. Every new feature, data flow, model integration, or governance control MUST map back to one of the nine layers below. Deviations require an ADR (Architecture Decision Record) under `docs/architecture/decisions/`.

---

## 1. Full-Stack Mapping — Course vs. Enterprise AI

The baseline "course version" is inadequate for enterprise. This is the target state.

| Layer | Course-Level (insufficient) | Enterprise-Grade (required) |
|---|---|---|
| **Experience** | Chatbots, content generation | Multi-channel apps: web, mobile, API gateway |
| **Prompt** | ReAct, ToT, Self-Ask | Prompt governance + versioning |
| **Agent** | MCP, tool calling | Multi-agent orchestration (LangGraph-style) |
| **Orchestration** | n8n workflows | Event-driven pipelines (Kafka, Airflow) |
| **LLM** | Single-provider Claude | Multi-model routing (OpenAI, Bedrock, local LLMs) |
| **Retrieval** | Basic RAG | Hybrid retrieval + reranking |
| **Data** | Light datasets | Lakehouse (Databricks / Snowflake) |
| **Governance** | Ethics basics | RBAC, PII masking, audit |
| **Observability** | ❌ missing | Full LLMOps monitoring |

---

## 2. Canonical Enterprise AI Flow

Every user-facing AI interaction MUST traverse this pipeline. Skipping a stage requires explicit ADR justification.

```
User
  ↓
API Gateway
  ↓
Auth (RBAC / ABAC)
  ↓
Query Processor  (rewrite + classify)
  ↓
Retrieval Layer  (hybrid search: BM25 + vector)
  ↓
Reranker
  ↓
Context Builder  (token budget, chunk merge)
  ↓
LLM             (Claude / GPT / Bedrock — routed)
  ↓
Guardrails      (PII, toxicity, policy)
  ↓
Response Formatter
  ↓
Feedback Loop
  ↓
Monitoring      (latency, accuracy, cost, drift)
```

---

## 3. Advanced RAG — Normative Spec

"Build a RAG pipeline" is insufficient. The BEV platform RAG MUST implement ALL of the following:

### 3.1 Retrieval Layer
- BM25 + Vector search (hybrid)
- Metadata filtering (RBAC-aware)
- Semantic + keyword fallback

### 3.2 Reranking Layer
- Cross-encoder reranker models
- Top-K → Top-N filtering

### 3.3 Query Intelligence
- Query rewriting
- Intent detection
- Multi-hop query decomposition

### 3.4 Context Optimization
- Token budget management
- Chunk merging
- Relevance scoring

### 3.5 Evaluation Layer (mandatory, not optional)
- Groundedness score
- Faithfulness
- Answer relevance

---

## 4. Multi-Agent Architecture

The platform MUST implement a multi-agent system. Single-agent tool-calling is insufficient for enterprise workloads.

### 4.1 Agent Roster

| Agent | Responsibility |
|---|---|
| **Planner** | Decomposes incoming tasks into subtasks |
| **Retrieval** | Fetches grounded data from lakehouse / vector DB |
| **Reasoning** | Chains logical inference across subtasks |
| **Tool** | Calls external APIs / MCP tools |
| **Validator** | Checks for hallucination and policy violations |
| **Memory** | Stores / retrieves conversation and long-term history |

### 4.2 Flow

```
User Query
  ↓
Planner Agent
  ↓
Task decomposition
  ↓
Parallel agents  (Retrieval + Tool)
  ↓
Aggregator Agent
  ↓
Validator Agent
  ↓
Final Answer
```

---

## 5. LLMOps — Required Observability (biggest gap to close)

This is the area where enterprise deployments most often fail. Every AI feature MUST track:

| Dimension | Metric to Track |
|---|---|
| **Latency** | Response time per request (p50/p95/p99) |
| **Cost** | Tokens per query × model-specific pricing |
| **Accuracy** | Comparison against ground-truth evals |
| **Hallucination** | Rate of unsupported claims (sampled eval) |
| **Drift** | Model performance over rolling time window |
| **Prompt performance** | A/B testing across prompt variants |

### 5.1 Required Tooling
- LangSmith / equivalent for distributed tracing
- OpenTelemetry for cross-service spans
- Custom evaluation pipelines (faithfulness, groundedness, answer-relevance)

---

## 6. Governance — Enterprise Controls

Expand beyond "basic ethics" to enterprise-grade governance.

| Control | Implementation Example |
|---|---|
| **RBAC** | Role-based retrieval (agents see only their scope) |
| **ABAC** | Attribute-based content filtering |
| **PII Masking** | Redact PII before LLM call; unmask in response if policy allows |
| **Audit Logs** | Immutable log of who queried what, when, with what result |
| **Explainability** | Source attribution on every generated claim |
| **Compliance** | Alignment with ISO 42001 and NIST AI RMF |

---

## 7. Data Platform — Lakehouse-Native

The AI platform MUST NOT be built on isolated / light datasets. It connects to:

- **Databricks / Snowflake** — lakehouse
- **Kafka** — streaming ingestion
- **Airflow** — batch orchestration
- **Data contracts** — schema validation at boundaries
- **Feature store** — canonical features for ML + retrieval

---

## 8. Target System — Reference Architecture

```
[Frontend / Apps]
        ↓
[API Gateway + Auth]
        ↓
[Agent Orchestrator]
        ↓
[Query Intelligence Layer]
        ↓
[Hybrid Retrieval System]
        ↓
[Vector DB + Search Index]
        ↓
[LLM Layer (Multi-model)]
        ↓
[Guardrails Layer]
        ↓
[Response Engine]
        ↓
[Monitoring + Feedback]
        ↓
[Data Platform (Lakehouse)]
```

---

## 9. Project Position — "Enterprise Knowledge AI Platform"

The BEV AI Platform is NOT positioned as a "Claude chatbot." It is an **Enterprise Knowledge AI Platform** with the following mandatory features:

| Feature | Description |
|---|---|
| Multi-source ingestion | SharePoint, PDFs, relational DBs, SaaS APIs |
| Hybrid RAG | Vector + keyword with rerank |
| Role-based retrieval | RBAC-aware answers |
| Multi-agent reasoning | Planner → specialists → validator |
| Observability dashboard | Accuracy + latency + cost + drift |
| Feedback loop | Continuous improvement via human + auto signals |
| Cost optimization | Token budget control per request class |

---

## 10. Gap Summary (self-honest current state)

| Area | Status | Required Action |
|---|---|---|
| Prompting | ✅ Good | Optimize + govern (versioning, A/B) |
| Agents | ✅ Basic | Upgrade to multi-agent orchestration |
| RAG | ⚠️ Basic | Upgrade to advanced hybrid + rerank + eval |
| LLMOps | ❌ Missing | Build full monitoring stack |
| Data | ❌ Missing | Lakehouse integration |
| Security | ⚠️ Basic | Enterprise-grade RBAC/ABAC/PII |
| Scale | ❌ Missing | Distributed systems + autoscaling |

---

## 11. Execution Sequence — Module-by-Module

Work proceeds phase by phase. Each phase produces a deliverable and a measurable improvement.

### Next Module: Phase 1 — Retrieval Engine Deep Dive

Deliverables:
1. Chunking strategy
2. Embedding selection
3. Vector DB design
4. Hybrid retrieval (BM25 + vector)
5. Index tuning
6. Metadata filtering (RBAC-aware)

(See: future spec under `docs/superpowers/specs/<date>-retrieval-engine-design.md` when scoped.)

---

## 12. Mapping to BEV Admin & Manager Hubs (for Phase 2+ content)

Each Admin/Manager tab in the BEV app is the operator console for one of the nine layers:

| Architecture Layer | BEV Tab(s) That Host It |
|---|---|
| Experience | Dashboard tiles; Manager → KPI Dashboard |
| Prompt | Admin → Model Registry (prompt version registry) |
| Agent | Admin → AI Use Cases (AI Agent category) |
| Orchestration | Admin → Workflows, Scheduled Jobs |
| LLM | Admin → Model Registry, MCP Servers |
| Retrieval | Admin → Integrations (vector DB, search); Manager → Status & Health (retrieval p95) |
| Data | Admin → Integrations (Databricks / Snowflake / Kafka); Manager → Cross-Dept Data Flow |
| Governance | Admin → Users & Roles, Permissions, Audit Log |
| Observability | Manager → Monitoring & Alerts, Status & Health |

---

## Enforcement

- Every Phase 2+ feature spec MUST cite which layer it fills.
- Every feature that crosses layer boundaries MUST include an integration test and a trace-propagation check (OpenTelemetry).
- Every new model integration MUST pass the governance tab (PII masking + audit logging) before production.
- Deviations require ADR in `docs/architecture/decisions/`.

---

*End of policy.*
