# AI Agent Inventory — Underwriting

| Agent ID | Agent name | Role | Orchestration pattern |
| --- | --- | --- | --- |
| AGT-UNDE-001 | Application Intake Agent | Domain agent | Council + Planner |
| AGT-UNDE-002 | Document Verification Agent | Domain agent | Council + Planner |
| AGT-UNDE-003 | Risk Scoring Agent | Domain agent | Council + Planner |
| AGT-UNDE-004 | Pricing Agent | Domain agent | Council + Planner |
| AGT-UNDE-005 | Underwriting Decision Agent | Domain agent | Council + Planner |
| AGT-UNDE-006 | Policy Generation Agent | Domain agent | Council + Planner |
| AGT-UNDE-007 | Compliance Verification Agent | Domain agent | Council + Planner |
| AGT-UNDE-008 | Portfolio Monitoring Agent | Domain agent | Council + Planner |
| AGT-UNDE-009 | Renewal Risk Agent | Domain agent | Council + Planner |

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
