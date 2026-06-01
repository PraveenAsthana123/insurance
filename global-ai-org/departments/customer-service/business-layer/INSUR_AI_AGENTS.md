# AI Agent Inventory — Customer Service / Contact Center

| Agent ID | Agent name | Role | Orchestration pattern |
| --- | --- | --- | --- |
| AGT-CUST-001 | Insurance Chatbot Agent | Domain agent | Council + Planner |
| AGT-CUST-002 | Voice Virtual Agent | Domain agent | Council + Planner |
| AGT-CUST-003 | Authentication Agent | Domain agent | Council + Planner |
| AGT-CUST-004 | Intent Classification Agent | Domain agent | Council + Planner |
| AGT-CUST-005 | Sentiment Analysis Agent | Domain agent | Council + Planner |
| AGT-CUST-006 | Knowledge Search Agent | Domain agent | Council + Planner |
| AGT-CUST-007 | FAQ Generator Agent | Domain agent | Council + Planner |
| AGT-CUST-008 | Article Generator Agent | Domain agent | Council + Planner |
| AGT-CUST-009 | Resolution Status Agent | Domain agent | Council + Planner |
| AGT-CUST-010 | Response Suggestion Agent | Domain agent | Council + Planner |
| AGT-CUST-011 | Follow-Up Reminder Agent | Domain agent | Council + Planner |
| AGT-CUST-012 | Personalized Communication Agent | Domain agent | Council + Planner |
| AGT-CUST-013 | Escalation Routing Agent | Domain agent | Council + Planner |
| AGT-CUST-014 | Churn Prediction Agent | Domain agent | Council + Planner |

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
