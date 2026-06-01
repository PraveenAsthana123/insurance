# Phase 10 — End-to-End Benchmarking + Reporting Pack (Paper / Thesis Ready)

> **DB ID:** 210 · **Owner:** ML Eng + Research · **Family:** `ml_methodology`
>
> **Core question:** *Is the paper / thesis story coherent and reproducible?*

## Why this phase

Phase 9 produces the numbers; Phase 10 makes them **defensible**.
The deliverable is not "we did the work" — it's a packaged narrative
that a reviewer, examiner, or auditor can reproduce on a different
machine, and that ties every figure to a single explicit claim.

## Steps

| Step | What you do | What to include | Do's | Don'ts | Output | Quality gate (KPI) | Edge cases + fix |
|---|---|---|---|---|---|---|---|
| 1 | **Build the "benchmark ladder"** — small set of models representing increasing sophistication | Baseline LR/SVM → Riemannian → 1D CNN → TFR-CNN/ViT | Keep ladder to 4–6 models | 20 models with no story | Benchmark plan | Ladder covers key families | Limited time → keep 3 strongest only |
| 2 | **Standardize evaluation protocol** — every model uses same split + metrics | Same folds · same subject grouping · same metrics | Apples-to-apples | Changing split per model | Evaluation harness | Identical folds across runs | Different input types → keep same split, adapt pipeline only |
| 3 | **"Single source of truth" results table** — one structured file | CSV / JSON with model, seed, fold, metrics, latency, params | Track every run | Manual copy-paste | Results registry | No missing runs; schema validated | Inconsistent → enforce schema + CI check |
| 4 | **Primary results table (main paper table)** — summarize key metrics | Mean ± CI · macro F1 · PR-AUC · sensitivity / specificity | Bold best model; report CI | Showing only best seed | Main results table | CI included for primary metric | CI too wide → explain data limits |
| 5 | **Baseline comparison table** — show improvement over strong baselines | Δ vs Riemannian + Δ vs best classical | Use paired stats if possible | Comparing only weak baseline | Baseline delta table | Improvements significant or justified | No significance → phrase as "trend" + CI |
| 6 | **Ablation table** — prove contribution of components | Remove: notch · ICA/ASR · per-freq norm · feature family · augmentation | 5–8 ablations max | 30 ablations clutter | Ablation table | Expected drops occur | No drop → simplify pipeline |
| 7 | **Robustness table** — behavior under stress tests | Noise · missing channels · resample · artifact-heavy subset | Use predefined tests | Designing tests after results | Robustness table | Drop within tolerance | Large drop → document + mitigation plan |
| 8 | **Generalization evidence** — cross-subject and (if possible) cross-dataset | LOSO / GroupKFold + external dataset test | External test if available | Claiming generalization without it | Generalization table | External results reported | Domain shift huge → "domain adaptation future work" |
| 9 | **Error analysis pack** — make failure modes concrete | Confusion matrix · top FP/FN examples · label audit notes | Categorize errors (artifact / drift / label noise) | Hand-wavy "data is noisy" | Error analysis section | Top 3 failure modes identified | Label noise → revise label rules + re-run v2 |
| 10 | **Explainability pack** — interpretable evidence | Bandpower importance · SHAP (features) · Grad-CAM (TFR-CNN) | Use explainability as support, not proof | Overclaiming causality | Explainability figures | Coherent patterns | Unstable maps → average across folds + sanity checks |
| 11 | **Efficiency + deployment metrics** — compute / latency footprint | Inference time · model size · memory · throughput | Include for robotics / edge use | Ignoring runtime | Efficiency table | Meets latency target | Too slow → quantize, smaller model, caching |
| 12 | **Reproducibility + artifacts** — everything to reproduce | Data card · model card · configs · seeds · environment file · pipeline diagram | Make it runnable | Missing versions | Repro bundle | Re-run matches metrics within tolerance | Dependency drift → containerize |
| 13 | **Compliance / trust reporting** — risk · privacy · monitoring plan | Risk register · bias checks · drift plan · audit logs | Align to Responsible AI | Skipping governance | Governance appendix | Checklist complete | Sensitive data → de-ID + access controls |
| 14 | **Final narrative ("the story")** — problem → pipeline → evidence → limits → roadmap | Clear contributions + why each step exists | Tie every table / figure to a claim | Random figures with no purpose | Final report structure | Each claim supported | Too many claims → reduce to 3–5 strong ones |

## Phase deliverables (minimum)

- [ ] Benchmark plan (4–6 model ladder)
- [ ] Evaluation harness (identical folds across runs)
- [ ] Results registry (CSV/JSON · schema-validated)
- [ ] Main results table (mean ± CI · bold winner)
- [ ] Baseline delta table (Δ vs strong baseline · paired stats)
- [ ] Ablation table (5–8 ablations)
- [ ] Robustness table (predefined stress tests)
- [ ] Generalization table (cross-subject + external if available)
- [ ] Error analysis section (top 3 failure modes)
- [ ] Explainability figures (averaged across folds)
- [ ] Efficiency table (latency / params / memory)
- [ ] Repro bundle (containerized · data + model + env)
- [ ] Governance appendix (risk register · audit log spec)
- [ ] Final report structure (every claim has table/figure backing)

## Composes with

- **§105 Auditable** — repro bundle is the audit artefact
- **§109 Responsible GenAI** — if synthetic data involved
- **§47.5 (JAD chain)** — final narrative closes the loop back to Phase 1's BRD
- **§64.42** — testing matrix tool choices documented in the repro bundle
- **§43 drills** — `drill_repro_bundle_runs.py` (clean machine + bundle → metrics within tolerance) + `drill_results_registry_complete.py` (no missing runs in registry)
- **AI assurance horizontals** — every horizontal doc in `../ai_assurance/` contributes here: data_governance to §13 governance appendix, validation_playbook to §5–7 tables, evaluation_metrics §5 metrics-card to §3 results registry, fairness_framework to §10 explainability, hallucination_controls (if generative) to §9 error analysis
