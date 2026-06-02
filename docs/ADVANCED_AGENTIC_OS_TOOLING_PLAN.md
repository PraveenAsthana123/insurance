# Advanced Agentic OS Tooling Plan

This plan places the requested advanced stack into the existing governance model without pretending every candidate is installed or production-wired.

## Operating Rule

OpenClaw + Ollama remain the default local execution path. BMAD/KT own planning kickoff. HITL, approval policy, project doctor, and docs updates remain mandatory gates. Candidate tools cannot bypass service boundaries, tenant controls, audit logs, or hard approval gates.

## Current Catalog

Generate the current table from the machine-readable catalog:

```bash
scripts/advanced_agentic_os_tools.py markdown
scripts/advanced_agentic_os_tools.py list --verbose
```

Source of truth: `config/advanced_agentic_os_tools.json`.

## Maturity Ladder

The canonical advanced stack moves in this order:

```text
Spec Kit
  ↓
BMAD
  ↓
LangGraph
  ↓
OpenAI Agents SDK
  ↓
AutoGen
  ↓
CrewAI
  ↓
Agentic OS
  ↓
Mem0 + Letta
  ↓
GraphRAG + Neo4j
  ↓
LangSmith + Phoenix
  ↓
NeMo Guardrails
  ↓
AgentOps
  ↓
AI Command Center
  ↓
Enterprise Decision OS
  ↓
Autonomous Enterprise OS
```

Print the current repo status for each step:

```bash
scripts/advanced_agentic_os_tools.py ladder --verbose
scripts/advanced_agentic_os_tools.py ladder --markdown
```

Interpretation:

- The first two layers, Spec Kit/KT and BMAD, are the planning intake.
- LangGraph, OpenAI Agents SDK, AutoGen, and CrewAI are framework candidates and must prove value against the local OpenClaw/council baseline before becoming defaults.
- Agentic OS is the control map, not a bypass around governance.
- Mem0/Letta and GraphRAG/Neo4j need tenant, retention, schema, and eval controls before production use.
- LangSmith/Phoenix, NeMo Guardrails, and AgentOps belong to observability/trust, not authorization.
- AI Command Center, Enterprise Decision OS, and Autonomous Enterprise OS are target operating layers, not present-tense production claims.

## Adoption Order

1. Use now: Superpowers, HITL, Evaluators, Pydantic AI typed council when explicitly enabled.
2. Design now: Agentic OS control map, GraphRAG + Neo4j, OWL + RDF, Reflection Agents.
3. Candidate pilots: NeMo Guardrails, Letta + Mem0, Semantic Kernel, OpenLineage.
4. Future/operator-gated: Microsoft Purview and any cloud-governance integration requiring credentials or enterprise tenant review.

## Tool Placement

| Layer | Tools |
|---|---|
| Planning and task kickoff | Superpowers, BMAD, KT workspace |
| Runtime orchestration | OpenClaw, Agentic OS control map, Semantic Kernel candidate |
| Memory and retrieval | Letta + Mem0 candidate, GraphRAG + Neo4j, OWL + RDF |
| Trust and approvals | HITL, NeMo Guardrails candidate, local guardrails service, OPA/approval policy |
| Review and quality | Reflection Agents, Evaluators, Pydantic AI typed council |
| Lineage and governance | OpenLineage candidate, Purview future |

## Readiness Tests

Run local readiness checks for every ladder layer:

```bash
scripts/test_advanced_agentic_os_tools.py
scripts/test_advanced_agentic_os_tools.py --json
```

The test classifies each item as:

- `PASS`: all local checks passed.
- `PARTIAL`: some evidence exists, but an SDK, endpoint, env var, or integration is missing.
- `MISSING`: no local readiness evidence passed.
- `GATED`: future/operator-gated layer with local evidence but no production claim.

Reports are written to:

- `jobs/reports/advanced_agentic_os_tool_tests.json`
- `jobs/reports/advanced_agentic_os_tool_tests.md`

## Hard Gates

- Purview requires Azure/operator approval and data-boundary review.
- Letta/Mem0 requires memory retention, tenant isolation, PII deletion, and audit policy.
- Neo4j/GraphRAG requires schema, ingestion ownership, tenancy, and eval set.
- NeMo Guardrails must be layered behind existing auth/RBAC/HITL, not used as authorization.
- Semantic Kernel must pass parity tests against OpenClaw/Redis before replacing any default flow.
- OpenLineage must start with one pipeline producer before broad instrumentation.

## Immediate Commands

```bash
scripts/advanced_agentic_os_tools.py list
scripts/advanced_agentic_os_tools.py list --stage candidate --verbose
scripts/advanced_agentic_os_tools.py markdown
scripts/advanced_agentic_os_tools.py ladder --verbose
```

For a new task, start with Spec Kit, then KT + BMAD, and route through OpenClaw only after the task is captured:

```bash
scripts/spec_kit.py create --bmad --text "Plan the next Advanced Agentic OS pilot"
scripts/spec_kit.py create --submit --department engineering --mode council --profile fast --text "Plan the next Advanced Agentic OS pilot"
```
