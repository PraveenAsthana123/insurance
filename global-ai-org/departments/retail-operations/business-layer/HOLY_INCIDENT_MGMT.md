# HOLY Beverage — Retail Operations — Incident Management (L1/L2/L3 + RAG)

> Per global CLAUDE.md §64.6 + §64.18 — every department MUST have this artifact.
> This stub is the contract; the AI-Strategy role fills in dept specifics.

## Owner

**Manager** + **Ops role**. Backed by RAG runbook search.

## Tiering

### Level 1 — handled by self-service / L1 agents

| # | Issue | Top RAG runbook | MTTD target | MTTR target |
|---|---|---|---|---|
| 1 | _stub: replace with real L1 issue for retail-operations_ | runbook URL | < 1 min | < 5 min |
| … | (≥ 20 L1 issues required) | | | |

### Level 2 — escalated to SME

| # | Issue | SME team | Escalation trigger | MTTR target |
|---|---|---|---|---|
| 1 | _stub: replace with real L2 issue_ | _ | L1 fails after 15 min | < 1 hour |
| … | (≥ 10 L2 issues required) | | | |

### Level 3 — P1 needing engineering / management

| # | Issue | War-room owner | Auto-page rule | MTTR target |
|---|---|---|---|---|
| 1 | _stub: replace with real L3 issue_ | _ | severity = critical OR customer-blocking | < 4 hours |
| … | (≥ 5 L3 issues required) | | | |

## Issue source breakdown

| Source | Counts (last 30d) | Top 3 examples |
|---|---|---|
| Customer | _ | _ |
| Employee (internal user) | _ | _ |
| Vendor | _ | _ |
| Partner | _ | _ |

## RAG-driven solutions

For every L1 issue:

- RAG corpus: `data/retail-operations/runbooks/` + `data/retail-operations/past-incidents/`
- Retrieval: top-k = 4, rerank by recency × relevance
- LLM: synthesizes resolution steps from retrieved chunks
- Citation: every step MUST link to a runbook chunk ID
- Confidence gate: < 0.7 → escalate to L2 instead of auto-resolve

## Targets (current AS-IS vs TO-BE)

| Metric | L1 AS-IS | L1 TO-BE | L2 AS-IS | L2 TO-BE | L3 AS-IS | L3 TO-BE |
|---|---|---|---|---|---|---|
| MTTD | _ | _ | _ | _ | _ | _ |
| MTTR | _ | _ | _ | _ | _ | _ |
| Auto-resolved % | _ | _ | _ | _ | N/A | N/A |

## Escalation flow

```
L1 (self-service / agent)
  ├── confidence ≥ 0.85 → resolve
  ├── confidence < 0.85 → L2 (SME)
  │     ├── time-to-resolve > 1h → L3 (war room)
  │     └── customer-impact severity = high → L3
  └── time-budget exceeded → L2 auto-escalate
```

## Post-incident learning loop

- Every incident closure writes a record to RAG corpus
- Drill: assert new corpus chunk is indexed within 1 hour
- Weekly review: top 5 repeat issues + root-cause analysis
- Monthly: corpus-quality audit (precision@k, MRR per intent)

## Composes with

- `HOLY_CONTACT_CENTER.md` — channel + intent layer
- `HOLY_SECURITY.md` — security incidents feed this
- `HOLY_DEMO_STORY.md` — incident playback as demo scenario
- Global §43 (drills) — every L1 issue has a drill
- Global §64.32.1 — incidents are captured per dept
