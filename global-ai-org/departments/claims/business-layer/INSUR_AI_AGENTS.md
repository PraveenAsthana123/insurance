# AI Agent Inventory — Claims

| Agent ID | Agent name | Role | Orchestration pattern |
| --- | --- | --- | --- |
| AGT-CLAI-001 | Claim Intake Agent | Domain agent | Council + Planner |
| AGT-CLAI-002 | Claim Assessment Agent | Domain agent | Council + Planner |
| AGT-CLAI-003 | Claim Validation Agent | Domain agent | Council + Planner |
| AGT-CLAI-004 | Claim Triage Agent | Domain agent | Council + Planner |
| AGT-CLAI-005 | Claim Settlement Agent | Domain agent | Council + Planner |
| AGT-CLAI-006 | Claims Investigation Agent | Domain agent | Council + Planner |
| AGT-CLAI-007 | Fraud Detection Agent | Domain agent | Council + Planner |
| AGT-CLAI-008 | Coverage Verification Agent | Domain agent | Council + Planner |
| AGT-CLAI-009 | Document Extraction Agent | Domain agent | Council + Planner |
| AGT-CLAI-010 | Subrogation Agent | Domain agent | Council + Planner |
| AGT-CLAI-011 | Customer Notification Agent | Domain agent | Council + Planner |

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
