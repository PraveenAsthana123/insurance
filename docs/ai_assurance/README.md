# AI Assurance Frameworks Catalog

> 11 generic AI assurance frameworks, each with ~18 standard analysis
> modules. Reusable across this project's 19 departments. Stored in
> `analysis_phase` + `analysis_module` (migration 015) with this folder
> as the human-readable companion.
>
> **Sibling catalogs:**
>
> - [`../ml_methodology/`](../ml_methodology/README.md) — 11-phase **construction** discipline (framing → data → preprocessing → … → production)
> - [`../digital_transformation/`](../digital_transformation/README.md) — per-jurisdiction × per-industry **enterprise DT checklists** (Canada Healthcare 2026 is the worked example)
>
> The three catalogs answer different questions: *"is it correct?"*
> (here) · *"is it built correctly?"* (ml_methodology) ·
> *"can the enterprise absorb it?"* (digital_transformation).
> You need all three for a regulated rollout.

## Why this catalog exists

The §68 Observability Hub + §66 per-dept artifacts + §64.42 testing
matrix all answer the same meta-question: *"how do we know the AI is
behaving correctly?"* — but each from a different vantage point.

This catalog is the **uniform vocabulary** that lets every department,
every model, every release reach for the SAME 11 frameworks instead of
inventing a one-off review template. Auditors get one taxonomy. SREs
get one runbook. Operators get one set of dashboards.

The split:

| Surface | Where it lives | Audience |
|---|---|---|
| **What frameworks exist?** | SQL — `analysis_phase` + `analysis_module` | Code, dashboards, cron, drills |
| **Explain framework X** | This folder — `<framework>.md` | Auditors, ML engineers, ops |
| **Which dept does each apply to?** | Follow-up migration (NOT yet seeded) | Operations, governance |

## The 11 frameworks

| ID | Framework | Core question | Primary owner |
|---|---|---|---|
| 101 | [Reliable AI](reliable_ai.md) | Does the AI deliver consistent, available, predictable behavior? | SRE / AI Platform |
| 102 | [Trustworthy AI](trustworthy_ai.md) | Can stakeholders trust outputs, decisions, and limits? | RAI Office |
| 103 | [Safe AI](safe_ai.md) | Can the AI cause harm — and if so, can harm be prevented or contained? | Safety Engineering |
| 104 | [Accountable AI](accountable_ai.md) | Who is responsible when things go wrong, and how is that enforced? | Governance / Legal |
| 105 | [Auditable AI](auditable_ai.md) | Can every decision, dataset, and update be reconstructed and verified later? | Audit / Compliance |
| 106 | [Lifecycle Management](lifecycle_management.md) | Is the model governed end-to-end — from problem definition through retirement? | MLOps |
| 107 | [Monitoring & Drift](monitoring_drift.md) | Are degradations and drifts detected, attributed, and acted upon in production? | MLOps / SRE |
| 108 | [Sustainable / Green AI](sustainable_ai.md) | What is the energy, carbon, and resource footprint — and is it controlled? | FinOps / Sustainability |
| 109 | [Responsible GenAI](responsible_genai.md) | Is generation safe, grounded, non-harmful, IP-respecting, and properly disclosed? | RAI Office / Content Safety |
| 110 | [Debug AI](debug_ai.md) | When models or pipelines fail, can we identify, attribute, and fix the root cause? | ML Engineering |
| 111 | [Portability AI](portability_ai.md) | Can the model move across environments, domains, and infrastructure without breaking? | AI Architecture |

## Cross-cutting / horizontal docs

The 11 frameworks above answer *"what does each one mean?"* These
horizontal docs answer *"how do you implement, verify, and enforce
across all of them?"* — read these before diving into any specific
framework.

| Doc | When to read |
|---|---|
| [**Responsible-by-Design — 5 pillars**](responsible_by_design.md) | Executive framing (Privacy / Transparency / Robustness / Safety / Accountability). Use in board decks, policy docs, regulator submissions. |
| [**Data Governance**](data_governance.md) | Engineering controls for "no user data to the model" + per-operation user notifications + RACI / non-repudiation. |
| [**Fairness Framework**](fairness_framework.md) | Fairness metrics (data / model / outcome), bias handling, Responsible-by-Design lifecycle. |
| [**Validation Playbook**](validation_playbook.md) | The Framework × Process × Verification × Quality Evidence tables per pillar. Use this to wire CI/CD gates. |
| [**Hallucination Controls**](hallucination_controls.md) | Multi-layer hallucination validation (Prevent → Detect → Verify → Block → Monitor). |
| [**Evaluation Metrics**](evaluation_metrics.md) | Generative-quality metrics (IS / FID / KID / F1) + probability primer + divergence + distance landscape + fidelity beyond divergence + per-release metrics-card schema. |
| [**Performance + Analysis Taxonomy**](performance_analysis_taxonomy.md) | Master 12-main analysis taxonomy × ~32 sub-analyses with named scores. Plus 25-metric generic performance catalog, 30-metric AI/ML matrix, model-analysis 30-list, subject-wise CV with composite scoring, and EEG / GenAI+CV worked examples. |
| [**Clinical Validation**](clinical_validation.md) | Clinical-specific: PPV / NPV / sensitivity / specificity / Cohen's Kappa / 12-main clinical analysis taxonomy / binary stress + 4-class COG worked examples / domain thresholds / composite clinical score / FDA / EU MDR / EU AI Act regulatory mapping. |
| [**Reliability Matrix**](reliability_matrix.md) | 7-main reliability discipline (test-retest ICC · inter-rater Kappa · internal-consistency Cronbach's α · cross-session · robustness · noise tolerance · artifact resistance) with formulas, interpretation bands, and per-release reliability card schema. |

## Schema (at a glance)

```sql
analysis_phase (
  id, code, name, answers_question, owner,
  family   -- 'ai_assurance' | 'ml_methodology' | 'governance'
)

analysis_module (
  id, phase_id, seq, slug, name, core_question,
  details JSONB,     -- analyzed[], output, plus any extra column
  status, tags[]
)
```

JSONB `details` typically carries:

```json
{
  "analyzed": ["uptime_pct", "p95_latency_ms", "error_budget_burn"],
  "output":   "reliability_dashboard + SLO report"
}
```

## How the cron orchestrator walks them

`scripts/schedule_dashboard_build.sh` (§44 autonomous loop) consumes
this catalog two ways:

1. **Per phase 0**: applies migration 015 alongside 013 + 014.
2. **Per phase 24+** (planned): iterates over frameworks 101→111,
   surfacing one as a "today's framework" call-out in the Phase
   roll-up — so the autonomous loop touches assurance, not just
   feature flow.

## Per-department mapping (FOLLOW-UP, not seeded)

Per operator directive (2026-06-01) — "later... how to use this for
each department" — we are NOT seeding per-department applicability in
this migration. The follow-up will look like:

```sql
-- migration 016 (planned)
CREATE TABLE dept_framework_applies (
  dept_code         VARCHAR(40) NOT NULL,    -- references INSUR_NAV dept slug
  phase_id          SMALLINT NOT NULL REFERENCES analysis_phase(id),
  applicability     VARCHAR(20) NOT NULL,    -- 'required' | 'recommended' | 'optional' | 'n/a'
  rationale         TEXT,
  reviewer          TEXT,
  next_review_date  DATE,
  PRIMARY KEY (dept_code, phase_id)
);
```

This is intentionally postponed because:

- The dept inventory may shift (INSUR/insur is at 19 depts; insur_project
  fork is at 19 today but may grow).
- The owner per cell is a governance decision, not a code decision —
  filing it without the operator is invention, not engineering.
- Once seeded, the §68 hub gains a `/api/v1/ai-assurance/applies?dept=`
  endpoint and the role-dashboard per §64.37 gains a "framework gates"
  tile per dept × per role.

When the operator says "seed the mapping," the migration is small
(~210 rows for 19 depts × 11 frameworks) and the JSONB details column
already accommodates per-cell notes.

## Read the catalog yourself

```bash
# All 11 frameworks
psql "$DATABASE_URL" -c \
  "SELECT id, code, name, owner FROM analysis_phase WHERE family='ai_assurance' ORDER BY id;"

# All modules of one framework
psql "$DATABASE_URL" -c \
  "SELECT seq, name, core_question FROM analysis_module WHERE phase_id=101 ORDER BY seq;"

# JSONB drill into 'what is analyzed' per module
psql "$DATABASE_URL" -c \
  "SELECT name, details->'analyzed' FROM analysis_module WHERE phase_id=103;"
```

## Composes with

- **§38** — every framework module emits an audit row when used to score a release.
- **§43** — every framework's "is this applied?" check becomes a drill once the dept-mapping migration lands.
- **§47.6** — Auditable AI (105) IS the SOC2 CC8.1 change-management surface.
- **§48** — Trustworthy AI (102) + Responsible GenAI (109) inherit the §48 explainability contract.
- **§57.5** — Debug AI (110) provides the structure for the 5-question troubleshooting runbook.
- **§64.36** — the per-sub-process 6-flavor scorecard maps to framework modules: Bias/Gov ↔ 104+105, Output-Relevancy ↔ 109, Explainable ↔ 102.
- **§64.42** — testing matrix rows map to framework modules: chaos ↔ 101, prompt injection ↔ 103, RAGAS ↔ 109.
- **§68** — Observability Hub's `/evals/safety`, `/evals/cost`, `/evals/functional` surface each map 1:1 to frameworks 103, 108, 101.

## The brutal rule

> A project that scores each model release against ONE generic framework
> ("we have evals") has no defensible posture when an auditor asks
> "what about X?" An 11-framework catalog gives 11 explicit answers — each
> with a named owner, a JSONB `analyzed[]` list, and an output artefact.
> The cost of the catalog is one migration + one folder of markdown;
> the cost of NOT having it is reinventing the framework during the
> first incident under regulatory scrutiny.
