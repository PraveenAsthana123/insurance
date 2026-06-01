# ML Methodology Catalog — 11 Phases

> **Sibling catalogs:**
>
> - [`docs/ai_assurance/`](../ai_assurance/README.md) — 11 AI assurance frameworks + 10 cross-cutting horizontal docs (verification)
> - [`docs/digital_transformation/`](../digital_transformation/README.md) — per-jurisdiction × per-industry enterprise DT checklists (Canada Healthcare 2026 is the worked example)
>
> **AI Assurance** answers *"how do we know it's behaving correctly?"*
> **ML Methodology** (this folder) answers *"how do we build it
> correctly in the first place?"*
> **Digital Transformation** answers *"how does the enterprise change
> to absorb it?"*
>
> Originally written as an EEG / BCI project strategy; the methodology
> is **generic to time-series + signal ML** — applicable to any
> sensor / IoT / audio / fermentation-monitoring / wearable / medical
> signal domain. EEG is the worked example because the discipline is
> hardest to fake there (subject-level leakage + montage drift +
> reference choice).

## Why this catalog exists

A team that talks about "fairness + monitoring + governance" but
can't articulate **"what is leakage-safe normalization"** or **"what
is the subject-wise split protocol"** is doing assurance theatre on
top of a broken construction. The 11 phases here are the
construction discipline that has to land BEFORE assurance has
anything real to assure.

## The 11 phases

| ID | Phase | Owner | Core question |
|---|---|---|---|
| 201 | [Project framing + success criteria](phase_01_framing.md) | Product / Tech Lead | What decision is the model making, and how do we know we won? |
| 202 | [Data acquisition + dataset design](phase_02_data.md) | Data Engineering | Is the data inventory complete, labelled, and split-safe? |
| 203 | [Filtering + preprocessing](phase_03_preprocessing.md) | Signal Engineer | Has noise been removed without erasing the signal? |
| 204 | [Standardization + normalization (leakage-safe)](phase_04_normalization.md) | ML Engineer | Are statistics computed from train only and applied consistently? |
| 205 | [EDA + feature evaluation](phase_05_eda.md) | ML Engineer | Which features actually carry the signal — and are they stable? |
| 206 | [Feature selection + dim reduction](phase_06_feature_selection.md) | ML Engineer | Which features survive a robustness gauntlet? |
| 207 | [Model training (baselines → deep)](phase_07_training.md) | ML Engineer | Did the deep model actually beat the strong baseline? |
| 208 | [Model validation](phase_08_validation.md) | ML Eng + QA | Does it generalize across subjects / sessions / devices? |
| 209 | [Model testing (final holdout) + reporting](phase_09_testing.md) | QA + Audit | Single test execution, single result, defensible CI |
| 210 | [End-to-end benchmarking + reporting pack](phase_10_benchmarking.md) | ML Eng + Research | Is the paper / thesis story coherent and reproducible? |
| 211 | [Production / pilot deployment](phase_11_production.md) | MLOps + SRE | Does it stay reliable as the world drifts? |

## How each phase is structured

Every phase doc renders the operator's canonical table verbatim:

| Step | What you do | Options / Techniques | Do's | Don'ts | Output / Deliverable | Quality gates (KPI) | Edge cases + fix |

Plus:

- **Recommended defaults** — the operator's pick-this-if-in-doubt picks
- **Phase deliverables** — the minimum artefact set per phase gate
- **Composes with** — explicit cross-refs to AI assurance frameworks (101–111)

## Schema (live source)

The 11 phases land in `analysis_phase` with `family='ml_methodology'`
(per migration 016, sibling to migration 015):

```sql
SELECT id, code, name, owner
FROM analysis_phase
WHERE family = 'ml_methodology'
ORDER BY id;
-- expect 11 rows, 201-211
```

Per-phase methodology steps land in `analysis_module` keyed by
`phase_id ∈ {201..211}`. JSONB `details` carries `options`, `dos`,
`donts`, `output`, `quality_gate`, `edge_case`.

## How it composes with the AI Assurance catalog (101–111)

The two catalogs intersect at every phase gate:

| Phase | Reads from AI assurance |
|---|---|
| 201 framing | 104 Accountable (RACI), 105 Auditable (data lineage) |
| 202 data | 104 Accountable (data ownership), 105 Auditable (versioning), 108 Sustainable (cost of acquisition) |
| 203 preprocessing | 110 Debug (reproducibility), 106 Lifecycle |
| 204 normalization | 105 Auditable (leakage audit), 110 Debug |
| 205 EDA | 102 Trustworthy (calibration foundations), 110 Debug |
| 206 feature selection | 102 Trustworthy, 106 Lifecycle, 110 Debug |
| 207 training | 101 Reliable (training stability), 106 Lifecycle, 108 Sustainable (compute cost) |
| 208 validation | 102 Trustworthy, 107 Monitoring (drift), 110 Debug |
| 209 testing | 105 Auditable (freeze + hash), 109 Responsible GenAI (TSTR if synthetic) |
| 210 benchmarking | 105 Auditable (repro pack), 109 Responsible GenAI |
| 211 production | 101 Reliable, 107 Monitoring, 111 Portability, 103 Safe, 104 Accountable, 105 Auditable |

Cross-cutting horizontal docs in [`../ai_assurance/`](../ai_assurance/)
that apply to every phase:

- [Data Governance](../ai_assurance/data_governance.md) — applies during Phase 2 + Phase 11
- [Validation Playbook](../ai_assurance/validation_playbook.md) — applies during Phase 8–10
- [Evaluation Metrics](../ai_assurance/evaluation_metrics.md) — applies during Phase 9
- [Fairness Framework](../ai_assurance/fairness_framework.md) — applies during Phase 5 + Phase 8 + Phase 11
- [Hallucination Controls](../ai_assurance/hallucination_controls.md) — applies during Phase 9 + Phase 11 (for generative components only)
- [Responsible-by-Design (5 pillars)](../ai_assurance/responsible_by_design.md) — applies across all phases

## The brutal rule

> You cannot fix assurance debt with assurance docs. You fix it by
> landing the methodology discipline — leakage-safe splits, train-only
> statistics, locked validation protocol, single-shot test execution
> — and THEN the assurance overlay has something real to govern. The
> 11 phases here are the construction; the 11 frameworks in
> ai_assurance/ are the verification. You need both.
