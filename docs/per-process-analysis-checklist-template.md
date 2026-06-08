# Per-Process Analysis Checklist Template

> Copy this template into a process's docs folder (e.g. `docs/processes/<dept>/<process>/analysis-checklist.md`). Fill in which of the ~400 analyses from [`ai-quality-analyses-catalog.md`](ai-quality-analyses-catalog.md) apply.

## Process identity

| Field | Value |
|---|---|
| Process ID | `<dept>_<process_slug>` |
| Department | (e.g. Claims / Underwriting / Fraud-SIU) |
| Domain | b2c / b2b / b2e |
| Owner | (named person) |
| Risk tier | low / high / critical |
| Last reviewed | YYYY-MM-DD |
| Reviewer | (name) |

## Mandatory subset (always applies)

Every process must pass these 6 regardless of AI complexity:

- [ ] **#5 Auditable** — process has lineage + audit row per call
- [ ] **#4 Accountable** — named owner + RACI documented
- [ ] **#17 Governance** — covered by AI Policy
- [ ] **#21 Secure** — security review completed
- [ ] **#18 Compliance** — applicable laws mapped (PIPEDA · PHIPA · etc.)
- [ ] **#19 Responsible AI** — 5 pillars assessed

## Per-tab analysis selection

Mark which modalities apply per tab. Cross-reference [`ai-quality-analyses-catalog.md`](ai-quality-analyses-catalog.md) Tab→Modality mapping.

### Data tab
- [ ] #5 Auditable · data lineage
- [ ] #11 Portability · data dependency
- [ ] #14 Hypothesis · data sufficiency

### Model tab
- [ ] #1 Reliable · model performance
- [ ] #6 Lifecycle · model versioning
- [ ] #10 Debug · capacity + sensitivity
- [ ] #14 Hypothesis · model capacity

### Analysis tab
- [ ] #5 Auditable · analysis reproducibility
- [ ] #14 Hypothesis · full 20-row analysis
- [ ] §83 research-grade phases applied

### UserStory tab
- [ ] #4 Accountable · RACI per story
- [ ] #14 Hypothesis · problem framing
- [ ] #16 SWOT · process-level

### UserDemo tab
- [ ] #2 Trustworthy · demo trustworthiness
- [ ] #20 Explainable · demo includes XAI

### ResAI tab
- [ ] **#19 Responsible AI · full 20-row catalog** ← mandatory
- [ ] #3 Safe · harm prevention
- [ ] #7 Monitoring & Drift

### ExpAI tab
- [ ] **#20 Explainable AI · full 20-row catalog** ← mandatory
- [ ] Local + global + counterfactual explanations stored

### GovernanceAI tab
- [ ] **#17 Governance AI · full 20-row catalog** ← mandatory
- [ ] #5 Auditable · governance audit trail
- [ ] #4 Accountable · governance ownership

### Tests tab
- [ ] #10 Debug · full 20-row debug analysis
- [ ] #14 Hypothesis · test hypothesis discipline
- [ ] #1 Reliable · regression suite

### Security tab
- [ ] **#21 Secure AI · full 20-row catalog** ← mandatory
- [ ] #15 Threat · threat model documented
- [ ] #18 Compliance · regulatory security baseline

## Optional modalities (apply where relevant)

- [ ] #8 Sustainable / Green AI · energy + carbon tracking (if heavy compute)
- [ ] #11 Portability · cross-env deployment (if multi-cloud)
- [ ] #12 Energy-Efficient · model right-sizing
- [ ] #13 Hallucination Prevention · GenAI / RAG process
- [ ] #16 SWOT · strategic decision point

## Sign-off

| Reviewer | Role | Date | Decision |
|---|---|---|---|
| | Owner | | ✓ / ✗ |
| | AI Reviewer | | ✓ / ✗ |
| | Security | | ✓ / ✗ |
| | Compliance | | ✓ / ✗ |

**Decision**: ☐ Proceed · ☐ Hold (gaps to close) · ☐ Block

## Composes with

§81 · §82 · §83 · §84 · §86 · ai-quality-analyses-catalog.md
