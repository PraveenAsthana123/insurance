# HOLY Beverage — Product Rd — BRD (Business Requirements Document)

> Per global §47 + §59 + §64 — every functional commitment in HOLY_FRD.md
> traces back to a goal in this document. Owner: **VP R&D**.

## 1. Executive summary

**Strategic goal:** AI-assisted concept generation + simulation + market-fit prediction

**Primary KPI(s):** Concept-to-launch ↓ 30%, hit-rate ↑ 25%

**Headline opportunity:** Per the AS-IS assessment in
[HOLY_ASIS_ASSESSMENT.md](../../business-layer/HOLY_ASIS_ASSESSMENT.md),
this department's AI investment closes the largest measurable gap in our
operating model — without it, the headline KPI above continues to drift
against industry benchmarks at the rate documented in the AS-IS 7-axis
impact table.

## 2. Stakeholders + RACI

| Role | Persona | RACI |
|---|---|---|
| Sponsor | VP R&D | A |
| Primary user | Per-role dashboards (manager / team-member / specialist) | R |
| Reviewer | AI Strategy + Ai Reviewer | C |
| Affected functions | R&D, Marketing, Sales, Customer Insights | I |

## 3. Scope

**In scope:** All processes catalogued in
[HOLY_PROCESS_MGMT.md](../../business-layer/HOLY_PROCESS_MGMT.md) that
carry `process_type` of `automatic` or `hybrid` per §64.8.

**Out of scope:** Processes tagged `manual` without an AS-IS impact score
> $100K/year. These will be revisited in the next quarterly review.

**Explicit non-goals:** No replacement of in-place ERP/CRM transactional
systems — AI is the analytic + decision layer ON TOP, not the system of
record. Per global §38, every AI decision must remain reversible.

## 4. Business outcomes (success metrics)

| Outcome | Metric | Baseline | Target | Horizon |
|---|---|---|---|---|
| Operational efficiency | Concept-to-launch ↓ 30% | per AS-IS | per AS-IS | 6 months |
| Decision quality | Audit-row completeness ≥ 95% | 0% (no audit) | ≥ 95% | 3 months |
| Risk reduction | Drift incidents per quarter | unmeasured | < 2 | 6 months |
| Adoption | Persona usage on dept dashboards | 0 | ≥ 70% weekly active | 6 months |

## 5. Constraints

| Constraint | Notes |
|---|---|
| Regulatory | EU AI Act Art. 86 right-to-explanation; ISO 42001 AI mgmt sys; SOC2 CC6 |
| Data | Per-tenant isolation enforced (§41.3); PII redaction (§64.32) |
| Cost | Per-tenant token budget (§41.1); ROI horizon < 12 months for any new pipeline |
| Latency | Customer-facing AI: p95 < 1500ms; internal AI: p95 < 5000ms |
| Trust | Every AI decision a human can audit within 5 minutes (§57.5) |

## 6. Risks (business-level)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Adoption resistance | Medium | High | Change management + per-role dashboards + small wins first |
| Model drift undetected | Medium | High | §64.21 RAI compliance + weekly fairness gate |
| Vendor lock-in | Low | Medium | Open-source-first per §64.42; multi-LLM-provider router |
| Data quality regression | Medium | High | Great-Expectations gate at ingestion (§64.42 row) |
| Compliance gap | Low | Critical | Quarterly audit per §53 maturity item 42 |

## 7. Dependencies

| Type | Item |
|---|---|
| Upstream data | See [HOLY_DATA_MGMT.md](../../business-layer/HOLY_DATA_MGMT.md) per-process input contracts |
| Downstream system | Per-dept Operating-System tab consumers |
| Cross-dept | Per [HOLY_FLOW.md](../../business-layer/HOLY_FLOW.md) cross-functional flows |
| Vendors | Per [HOLY_CONTACTS.md](../../business-layer/HOLY_CONTACTS.md) vendor list |

## 8. Approvals

| Phase | Approver | Status |
|---|---|---|
| BRD draft | VP R&D | _pending_ |
| BRD final | AI Strategy + AI Reviewer | _pending_ |
| FRD draft (derived) | Engineering Lead | _pending_ |
| Production launch | Sponsor + AI Ethics Council | _pending_ |

## 9. Compose-footer (§49)

- [`HOLY_DT_STRATEGY.md`](../../business-layer/HOLY_DT_STRATEGY.md) — the 4P plan that operationalizes these goals
- [`HOLY_ASIS_ASSESSMENT.md`](../../business-layer/HOLY_ASIS_ASSESSMENT.md) — evidence baseline for every metric here
- [`HOLY_FRD.md`](../frd/HOLY_FRD.md) — sibling functional decomposition of these goals
- [`HOLY_PROCESS_MGMT.md`](../../business-layer/HOLY_PROCESS_MGMT.md) — process catalog every goal maps onto
- [`HOLY_HLD.md`](../hld/HOLY_HLD.md) — system shape that makes these goals achievable
- [`HOLY_MONITORING_AI.md`](../../business-layer/HOLY_MONITORING_AI.md) — runtime evidence the goals are being met
