# Phase 1 — Project Framing + Success Criteria

> **DB ID:** 201 · **Owner:** Product / Tech Lead · **Family:** `ml_methodology`
>
> **Core question:** *What decision is the model making, and how do we know we won?*

## Why this phase first

Every downstream phase derives its acceptance from this one. A
project that skips Phase 1 measures itself against the *first
plausible-looking metric* — usually accuracy — and discovers at
Phase 9 that the metric never tracked the actual decision. Phase 1
is cheap; the wrong-metric tax at Phase 9 is everything.

## Steps

| Step | What you do | Options / Techniques | Do's | Don'ts | Output | Quality gate (KPI) | Edge cases + fix |
|---|---|---|---|---|---|---|---|
| 1 | **Use-case definition** — define the decision the model makes (label) | Stress vs calm · seizure event vs non-event · MI class · sleep stage · cognitive load | Keep label objective + measurable | Vague labels like "mood" without ground truth | Problem statement + label schema | Label agreement ≥ 0.8 (if human-annotated) | Label noise → rules + adjudication |
| 2 | **Data scope** — decide datasets, channels, sampling rate, duration, subjects | Public (DEAP, SEED, PhysioNet EEG) · private · hybrid | Start with 1 main + 1 benchmark dataset | Mixing many datasets too early | Data inventory sheet | Coverage: #subjects, #sessions, class balance | Dataset mismatch → harmonize montage + resample |
| 3 | **Evaluation target** — choose primary metric + constraints | Accuracy · F1 · AUC · sensitivity/specificity · latency · memory | Pick metric aligned with risk (clinical = sensitivity) | Using only accuracy with imbalance | Metric plan | Baseline threshold (e.g., F1 ≥ X) | Imbalance → PR-AUC + class weights |
| 4 | **Split strategy** — define how train/val/test is separated | Subject-wise split · session-wise · leave-one-subject-out (LOSO) | Subject-wise for generalization | Random window split (leakage) | Split protocol doc | No subject overlap across splits | Small N → LOSO + nested CV |
| 5 | **Reproducibility** — run config + versioning for data/code | Config files · seed control · env lock · experiment tracking | Make every run reproducible | "Works on my laptop" setup | Repro bundle (requirements + configs) | Same seed → same results | Library drift → pin versions |
| 6 | **Benchmark plan** — what you must compare against | Classical ML (SVM, RF) · CNN on STFT/CWT · simple LSTM | Strong but fair baselines | Comparing only to weak baselines | Baseline matrix | Within 10–15% of SOTA (realistic) | Different preproc → document everything |
| 7 | **Risk + ethics** — privacy, consent, safety, bias, misuse | De-ID · governance · audit logs | Build privacy from day 1 | Storing raw identifiers | Risk register | Compliance checklist complete | Missing consent → exclude data |
| 8 | **Definition of done** — finalize deliverables per phase | Model card · data card · test report · deployment plan | Make phase gates explicit | Endless iteration without gates | Roadmap with milestones | All gates met before next phase | Scope creep → freeze phase requirements |

## Phase deliverables (minimum)

- [ ] Problem statement + label schema (versioned)
- [ ] Data inventory sheet (primary + benchmark dataset chosen)
- [ ] Metric plan (primary + secondary metrics + thresholds)
- [ ] Split protocol document (subject-wise / LOSO / etc.)
- [ ] Repro bundle scaffold (configs / seeds / env file)
- [ ] Baseline matrix (models to compare against)
- [ ] Risk register (privacy + consent + bias + misuse)
- [ ] Roadmap with explicit phase gates

## Composes with

- **§104 Accountable** — RACI per data source + per metric owner
- **§105 Auditable** — versioned problem statement + label schema
- **§38.3** — every metric-plan decision lands as a §38 audit row
- **§47 (JAD chain)** — JAD session → BRD → this phase's problem statement
- **§64.36** — 6-flavor scorecard requires this phase to define what "good" means
- **AI assurance horizontal** — [`responsible_by_design.md`](../ai_assurance/responsible_by_design.md) §1 Privacy + §5 Accountability map directly here
