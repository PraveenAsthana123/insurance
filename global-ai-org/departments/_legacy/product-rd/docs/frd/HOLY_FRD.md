# HOLY Beverage — Product Rd — FRD (Functional Requirements Document)

> Per global §47 + §52 + §57.5 + §64 — every requirement here is testable
> and traces back to a business goal in HOLY_BRD.md.
> Persona: **VP R&D**. Owner: Engineering Lead + VP R&D.

## 1. Source-of-truth links

- Parent goals: [HOLY_BRD.md](../brd/HOLY_BRD.md) §4 success metrics
- Process catalog: [HOLY_PROCESS_MGMT.md](../../business-layer/HOLY_PROCESS_MGMT.md)
- Data contracts: [HOLY_DATA_MGMT.md](../../business-layer/HOLY_DATA_MGMT.md)
- Use cases: [HOLY_USE_CASES.md](../../business-layer/HOLY_USE_CASES.md)
- AS-IS gap: [HOLY_ASIS_ASSESSMENT.md](../../business-layer/HOLY_ASIS_ASSESSMENT.md)

## 2. Functional requirement format (every row)

Each row in §3 below MUST carry:

| Field | Purpose |
|---|---|
| ID | `FR-PRD-NNN` — stable across releases |
| Description | What the system DOES (active voice) |
| Trigger | What event invokes it |
| Input | Data + caller (per §57.6 canonical fields) |
| Process | Transformation summary (link to detailed sequence diagram in HLD/LLD) |
| Output | Returned shape + downstream consumer |
| Decision logged? | YES/NO (§38.3 audit row) |
| AI involvement | None / Predictive / Generative / Decision (per §64.36 6-flavor scorecard) |
| Acceptance criteria | Drill-testable assertion (per §43) |
| Traceability | Parent BRD goal + parent process ID |

## 3. Functional requirements catalog

> Initial catalog — extend per release. Every release adds ≥ 1 row;
> deprecated rows move to §6 not deleted. Each row MUST have a drill
> at `tests/drills/drill_product_rd_<feature>.py` per §43.

### 3.1 Decision automation

| ID | Description | AI | Acceptance |
|---|---|---|---|
| FR-PRD-001 | Auto-decide when confidence ≥ 0.8 (per §40 decision system) | Decision | Drill: 100 synthetic inputs → auto-decisions match ground truth ≥ 95% |
| FR-PRD-002 | Route 0.5–0.8 confidence to human-in-loop queue | Decision | Drill: 0.7-confidence input → queued + persona notified within 60s |
| FR-PRD-003 | Reject < 0.5 confidence + log + fallback | Decision | Drill: low-confidence input → rejected response carries `error_code:LOW_CONFIDENCE` |

### 3.2 Observability + audit

| ID | Description | AI | Acceptance |
|---|---|---|---|
| FR-PRD-010 | Every decision writes §38.3 audit row keyed by `request_id` | None | Drill: 1 decision → 1 audit row with all 13 required fields |
| FR-PRD-011 | Audit row queryable from per-role dashboard within 30s | None | Drill: decision at T=0 → visible on Manager dashboard at T+30 |
| FR-PRD-012 | Per-cron-job manifest visible on `/holy/product-rd/monitoring` | None | Drill: cron run → manifest.json appears + monitoring endpoint reflects within cadence |

### 3.3 Per-process AI surfaces

| ID | Description | AI | Acceptance |
|---|---|---|---|
| FR-PRD-020 | Each process exposes Analytical AI panel (§64.36) | Predictive | Drill: process card renders ≥ 1 analytical chart |
| FR-PRD-021 | Each process exposes Predictive AI score | Predictive | Drill: model exists in registry + score visible + drift trend chart present |
| FR-PRD-022 | Each RAG-backed answer carries citations | Generative | Drill: answer text → every claim maps to a chunk in the retrieval set |
| FR-PRD-023 | Each prediction has SHAP-or-equivalent explainability | Predictive | Drill: per-prediction `/explain?id=X` returns top-5 feature attributions |

### 3.4 Compliance + RAI

| ID | Description | AI | Acceptance |
|---|---|---|---|
| FR-PRD-030 | Disparate impact ≥ 0.8 per protected group | All | Drill: weekly fairness eval green; breach → ai-reviewer paged |
| FR-PRD-031 | EU AI Act Art. 86 counterfactual on any regulated decision | Decision | Drill: regulated decision → counterfactual present + actionable |
| FR-PRD-032 | Model card on every deployed model (§48.3) | All | Drill: each model in registry → card present + last-reviewed < 90 days |

## 4. Non-functional requirements

| NFR | Target | How verified |
|---|---|---|
| Latency p95 (read) | < 500ms | k6 load test (§47.10 tier 2) |
| Latency p95 (write) | < 1500ms | k6 load test |
| Latency p95 (LLM call) | < 5000ms | k6 + Langfuse trace stats |
| Throughput | ≥ 100 RPS sustained per dept | k6 stress test |
| Availability | 99.5% per quarter | health-probe SLO dashboard |
| Recovery | RTO < 1h, RPO < 15min (§41.2 standard tier) | quarterly DR drill |
| Cost per decision | < $0.05 (LLM-backed) | finops dashboard (§41.1) |

## 5. Acceptance + verification

Per global §43 drill discipline:

- Every FR row in §3 maps to a drill under `tests/drills/`
- Every drill ships with ≥ 1 negative assertion
- Drills run continuously per the §65.8 8-tier matrix
- Test agent role: `pytest-agent` (units) + `drill-agent` (process tier)

## 6. Deprecated requirements (audit trail)

_None yet — append here when requirements are retired. NEVER delete rows._

## 7. Compose-footer (§49)

- [`HOLY_BRD.md`](../brd/HOLY_BRD.md) — parent goals every FR row traces to
- [`HOLY_HLD.md`](../hld/HOLY_HLD.md) — system shape that implements these FRs
- [`HOLY_LLD.md`](../lld/HOLY_LLD.md) — class/method-level expansion
- [`HOLY_SAD.md`](../sad/HOLY_SAD.md) — security & cross-cutting concerns
- [`HOLY_NETWORK_FLOW.md`](../network-flow/HOLY_NETWORK_FLOW.md) — request sequence per FR
- [`HOLY_TECH_STACK.md`](../../HOLY_TECH_STACK.md) — concrete tech stack implementing each FR
- [`HOLY_USE_CASES.md`](../../business-layer/HOLY_USE_CASES.md) — narrative form of these FRs
- [`HOLY_MONITORING_AI.md`](../../business-layer/HOLY_MONITORING_AI.md) — runtime evidence
