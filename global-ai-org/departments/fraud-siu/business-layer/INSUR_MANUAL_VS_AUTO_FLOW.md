# Manual vs Automated Flow — Fraud / Special Investigations Unit (SIU)

Per global §64.27 + operator 2026-06-01.
Side-by-side comparison of AS-IS (manual, human-driven) vs TO-BE (AI-driven, agentic) for the first 6 L2 processes.

## Side-by-side comparison table

### Manual (AS-IS)

| L1 | L2 | Actor | Duration | Tools | Quality |
| --- | --- | --- | --- | --- | --- |
| Fraud Detection | Multi-Layer Screening | Human (CSR / Adjuster / UW / Investigator) | ~15 min | Manual checklist + email | Variable (skill-dependent) |
| Triage | Case Prioritization | Human (CSR / Adjuster / UW / Investigator) | ~30 min | Manual checklist + email | Variable (skill-dependent) |
| Investigation | Active Case Work | Human (CSR / Adjuster / UW / Investigator) | ~45 min | Manual checklist + email | Variable (skill-dependent) |
| Decision | Case Disposition | Human (CSR / Adjuster / UW / Investigator) | ~60 min | Manual checklist + email | Variable (skill-dependent) |
| Action | Outcome | Human (CSR / Adjuster / UW / Investigator) | ~75 min | Manual checklist + email | Variable (skill-dependent) |
| Reporting | Regulatory & Industry | Human (CSR / Adjuster / UW / Investigator) | ~90 min | Manual checklist + email | Variable (skill-dependent) |

**Total cycle time (Manual):** ~315 minutes
**Error rate:** Medium-to-High (per [INSUR_ASIS_ASSESSMENT.md](INSUR_ASIS_ASSESSMENT.md))
**Audit trail:** Email + paper + spreadsheet (incomplete)
**Cost basis:** Fully-loaded labor cost per step

### Automated (TO-BE)

| L1 | L2 | Agent | Duration | Reference pipeline | Quality |
| --- | --- | --- | --- | --- | --- |
| Fraud Detection | Multi-Layer Screening | AI Agent (Fraud Copilot) | ~200 ms | `fraud_lifecycle` | Deterministic + audited (§38.3) |
| Triage | Case Prioritization | AI Agent (Triage Assistant) | ~400 ms | `anomaly_lifecycle` | Deterministic + audited (§38.3) |
| Investigation | Active Case Work | AI Agent (Investigator Copilot) | ~600 ms | `rag_lifecycle` | Deterministic + audited (§38.3) |
| Decision | Case Disposition | AI Agent (SIU Manager Copilot) | ~800 ms | `fraud_lifecycle` | Deterministic + audited (§38.3) |
| Action | Outcome | AI Agent (Action Assistant) | ~1000 ms | `anomaly_lifecycle` | Deterministic + audited (§38.3) |
| Reporting | Regulatory & Industry | AI Agent (Compliance Reporter) | ~1200 ms | `rag_lifecycle` | Deterministic + audited (§38.3) |

**Total cycle time (Automated):** ~4200 ms
**Error rate:** Low (model-monitored; drift detection per §53)
**Audit trail:** Per-decision audit row keyed by `request_id` (§38.3)
**Cost basis:** Token + compute + agent execution (~$0.01–0.10/transaction)

## Cycle-time delta

| Metric | Manual | Automated | Improvement |
|---|---|---|---|
| Total cycle | ~315 min | ~4200 ms | **~4,500×** |
| Human touch-points | 6 | 0–1 (only HITL gates per §40) | **~6×** reduction |
| Per-transaction cost | $5–50 (labor) | $0.01–0.10 (compute) | **~50–500×** cheaper |
| Error rate | 8–15% | < 2% | **~5–8×** lower |
| Audit completeness | partial | 100% per §38.3 | **discrete to full** |

## Manual sequence

```mermaid
sequenceDiagram
    participant Customer
    participant Actor0 as Fraud Detection actor
    participant Actor1 as Triage actor
    participant Actor2 as Investigation actor
    participant Actor3 as Decision actor
    participant Actor4 as Action actor
    participant Actor5 as Reporting actor
    Customer->>Actor0: hand off Multi-Layer Screening
    Actor0->>Actor1: hand off Case Prioritization
    Actor1->>Actor2: hand off Active Case Work
    Actor2->>Actor3: hand off Case Disposition
    Actor3->>Actor4: hand off Outcome
    Actor4->>Actor5: hand off Regulatory & Industry
    Actor5->>Customer: result (eventually)
```

## Automated sequence

```mermaid
sequenceDiagram
    participant User
    participant Agent0 as Multi-Layer Screening agent
    participant Agent1 as Case Prioritization agent
    participant Agent2 as Active Case Work agent
    participant Agent3 as Case Disposition agent
    participant Agent4 as Outcome agent
    participant Agent5 as Regulatory & Industry agent
    participant Audit
    User->>Agent0: invoke Multi-Layer Screening (sub-sec)
    Agent0->>Audit: write audit row (§38.3)
    Agent0->>Agent1: invoke Case Prioritization (sub-sec)
    Agent1->>Audit: write audit row (§38.3)
    Agent1->>Agent2: invoke Active Case Work (sub-sec)
    Agent2->>Audit: write audit row (§38.3)
    Agent2->>Agent3: invoke Case Disposition (sub-sec)
    Agent3->>Audit: write audit row (§38.3)
    Agent3->>Agent4: invoke Outcome (sub-sec)
    Agent4->>Audit: write audit row (§38.3)
    Agent4->>Agent5: invoke Regulatory & Industry (sub-sec)
    Agent5->>Audit: write audit row (§38.3)
    Agent5->>User: result + citations
```

## Run the automated pipeline

```bash
# List registered pipelines for this dept
python backend/ml/insurance/run_dept_pipelines.py --list

# Run all pipelines for this dept (smoke mode)
python backend/ml/insurance/run_dept_pipelines.py --all --dept fraud-siu --smoke

# Run a specific pipeline end-to-end
python backend/ml/insurance/run_dept_pipelines.py --dept fraud-siu --pipeline 1
```

Output lands at `data/eval/insurance/fraud-siu/pipeline_<id>/run-<ts>/` per global §64.7.

## Manual fallback

When the automated pipeline rejects (HITL gate / low confidence / scope-denied per §40), routing flows back to the manual sequence above. Per global §38 — the system cannot ship if no manual fallback exists for any automated step.

## Composes with

- [INSUR_PROCESS_FLOW.md](INSUR_PROCESS_FLOW.md) — L1/L2/L3 process hierarchy
- [INSUR_BUSINESS_MODELS.md](INSUR_BUSINESS_MODELS.md) — B2C / B2B / B2E channel-specific paths
- [INSUR_PIPELINES.md](INSUR_PIPELINES.md) — which reference impl maps to which step
- [INSUR_AI_AGENTS.md](INSUR_AI_AGENTS.md) — agent inventory + §64.43 patterns
- [INSUR_INCIDENT_MGMT.md](INSUR_INCIDENT_MGMT.md) — when automation fails, escalation path
