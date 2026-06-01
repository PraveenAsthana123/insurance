# AI Agent Inventory — Fraud / Special Investigations Unit (SIU)

| Agent ID | Agent name | Role | Orchestration pattern |
| --- | --- | --- | --- |
| AGT-FRAU-001 | Fraud Detection Agent | Domain agent | Council + Planner |
| AGT-FRAU-002 | Anomaly Detection Agent | Domain agent | Council + Planner |
| AGT-FRAU-003 | Graph / Network Analysis Agent | Domain agent | Council + Planner |
| AGT-FRAU-004 | Behavioral Analysis Agent | Domain agent | Council + Planner |
| AGT-FRAU-005 | OSINT Agent | Domain agent | Council + Planner |
| AGT-FRAU-006 | Document Forensics Agent | Domain agent | Council + Planner |
| AGT-FRAU-007 | Provider Audit Agent | Domain agent | Council + Planner |
| AGT-FRAU-008 | Recovery Agent | Domain agent | Council + Planner |
| AGT-FRAU-009 | NICB / DOI Reporting Agent | Domain agent | Council + Planner |
| AGT-FRAU-010 | Application Fraud Agent | Domain agent | Council + Planner |

## Composition per §64.40 (10-layer agentic stack)

Each agent in this dept fits into the 10-layer stack:

```
Layer 1: User Goal
Layer 2: Council of Agents (3-stage triage)
Layer 3: Planner Agent (decompose to DAG)
Layer 4: Task Decomposition
Layer 5: Policy / Governance
Layer 6: Computer-Using Agent (CUA)
Layer 7: Stagehand / Browser-Use
Layer 8: Playwright
Layer 9: Browser / Desktop / API
Layer 10: Insurance Core Systems
```

## Patterns Used (per §64.43)

| Pattern | Why |
|---|---|
| #1 Hub-and-Spoke | Worker fleet for parallel claim processing |
| #2 Council | Decision validation for high-severity cases |
| #4 Hierarchical | Multi-step user goal decomposition |
| #5 Blackboard | Shared memory across agents |
| #8 DAG Workflow | Conditional pipeline |
| #9 Debate | Risk validation on borderline decisions |
| #12 Mixture-of-Agents | Ensemble for high-stakes decisions |

## Required drills per agent (§43)

Each agent ships with:
- Health probe (§47.8 3-probe)
- Drill with ≥ 3 negative assertions (§43)
- Outcome metric (§55.3)
