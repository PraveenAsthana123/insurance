# Manual vs Automated Flow — Underwriting

Per global §64.27 + operator 2026-06-01.
Side-by-side comparison of AS-IS (manual, human-driven) vs TO-BE (AI-driven, agentic) for the first 6 L2 processes.

## Side-by-side comparison table

### Manual (AS-IS)

| L1 | L2 | Actor | Duration | Tools | Quality |
| --- | --- | --- | --- | --- | --- |
| Lead Intake | Application Submission | Human (CSR / Adjuster / UW / Investigator) | ~15 min | Manual checklist + email | Variable (skill-dependent) |
| Pre-Screening | Eligibility & Appetite | Human (CSR / Adjuster / UW / Investigator) | ~30 min | Manual checklist + email | Variable (skill-dependent) |
| Data Collection | External Data Pulls | Human (CSR / Adjuster / UW / Investigator) | ~45 min | Manual checklist + email | Variable (skill-dependent) |
| Risk Assessment | Multi-Source Risk Scoring | Human (CSR / Adjuster / UW / Investigator) | ~60 min | Manual checklist + email | Variable (skill-dependent) |
| Underwriting Review | Decision Engine | Human (CSR / Adjuster / UW / Investigator) | ~75 min | Manual checklist + email | Variable (skill-dependent) |
| Pricing | Premium Calculation | Human (CSR / Adjuster / UW / Investigator) | ~90 min | Manual checklist + email | Variable (skill-dependent) |

**Total cycle time (Manual):** ~315 minutes
**Error rate:** Medium-to-High (per [INSUR_ASIS_ASSESSMENT.md](INSUR_ASIS_ASSESSMENT.md))
**Audit trail:** Email + paper + spreadsheet (incomplete)
**Cost basis:** Fully-loaded labor cost per step

### Automated (TO-BE)

| L1 | L2 | Agent | Duration | Reference pipeline | Quality |
| --- | --- | --- | --- | --- | --- |
| Lead Intake | Application Submission | AI Agent (Application Assistant) | ~200 ms | `full_lifecycle` | Deterministic + audited (§38.3) |
| Pre-Screening | Eligibility & Appetite | AI Agent (Data Assistant) | ~400 ms | `ensemble_compare` | Deterministic + audited (§38.3) |
| Data Collection | External Data Pulls | AI Agent (Risk Copilot) | ~600 ms | `rag_lifecycle` | Deterministic + audited (§38.3) |
| Risk Assessment | Multi-Source Risk Scoring | AI Agent (Pricing Assistant) | ~800 ms | `full_lifecycle` | Deterministic + audited (§38.3) |
| Underwriting Review | Decision Engine | AI Agent (UW Copilot) | ~1000 ms | `ensemble_compare` | Deterministic + audited (§38.3) |
| Pricing | Premium Calculation | AI Agent (Policy Assistant) | ~1200 ms | `rag_lifecycle` | Deterministic + audited (§38.3) |

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
    participant Actor0 as Lead Intake actor
    participant Actor1 as Pre-Screening actor
    participant Actor2 as Data Collection actor
    participant Actor3 as Risk Assessment actor
    participant Actor4 as Underwriting Review actor
    participant Actor5 as Pricing actor
    Customer->>Actor0: hand off Application Submission
    Actor0->>Actor1: hand off Eligibility & Appetite
    Actor1->>Actor2: hand off External Data Pulls
    Actor2->>Actor3: hand off Multi-Source Risk Scoring
    Actor3->>Actor4: hand off Decision Engine
    Actor4->>Actor5: hand off Premium Calculation
    Actor5->>Customer: result (eventually)
```

## Automated sequence

```mermaid
sequenceDiagram
    participant User
    participant Agent0 as Application Submission agent
    participant Agent1 as Eligibility & Appetite agent
    participant Agent2 as External Data Pulls agent
    participant Agent3 as Multi-Source Risk Scoring agent
    participant Agent4 as Decision Engine agent
    participant Agent5 as Premium Calculation agent
    participant Audit
    User->>Agent0: invoke Application Submission (sub-sec)
    Agent0->>Audit: write audit row (§38.3)
    Agent0->>Agent1: invoke Eligibility & Appetite (sub-sec)
    Agent1->>Audit: write audit row (§38.3)
    Agent1->>Agent2: invoke External Data Pulls (sub-sec)
    Agent2->>Audit: write audit row (§38.3)
    Agent2->>Agent3: invoke Multi-Source Risk Scoring (sub-sec)
    Agent3->>Audit: write audit row (§38.3)
    Agent3->>Agent4: invoke Decision Engine (sub-sec)
    Agent4->>Audit: write audit row (§38.3)
    Agent4->>Agent5: invoke Premium Calculation (sub-sec)
    Agent5->>Audit: write audit row (§38.3)
    Agent5->>User: result + citations
```

## Run the automated pipeline

```bash
# List registered pipelines for this dept
python backend/ml/insurance/run_dept_pipelines.py --list

# Run all pipelines for this dept (smoke mode)
python backend/ml/insurance/run_dept_pipelines.py --all --dept underwriting --smoke

# Run a specific pipeline end-to-end
python backend/ml/insurance/run_dept_pipelines.py --dept underwriting --pipeline 1
```

Output lands at `data/eval/insurance/underwriting/pipeline_<id>/run-<ts>/` per global §64.7.

## Manual fallback

When the automated pipeline rejects (HITL gate / low confidence / scope-denied per §40), routing flows back to the manual sequence above. Per global §38 — the system cannot ship if no manual fallback exists for any automated step.

## Composes with

- [INSUR_PROCESS_FLOW.md](INSUR_PROCESS_FLOW.md) — L1/L2/L3 process hierarchy
- [INSUR_BUSINESS_MODELS.md](INSUR_BUSINESS_MODELS.md) — B2C / B2B / B2E channel-specific paths
- [INSUR_PIPELINES.md](INSUR_PIPELINES.md) — which reference impl maps to which step
- [INSUR_AI_AGENTS.md](INSUR_AI_AGENTS.md) — agent inventory + §64.43 patterns
- [INSUR_INCIDENT_MGMT.md](INSUR_INCIDENT_MGMT.md) — when automation fails, escalation path
