# Phase 8 — Model Validation (Proof of Generalization, Not Just a Score)

> **DB ID:** 208 · **Owner:** ML Eng + QA · **Family:** `ml_methodology`
>
> **Core question:** *Does it generalize across subjects / sessions / devices?*

## Why this phase

A high validation score on a single fold is not generalization
evidence — it's a sample of one. Phase 8 codifies the rituals
(LOSO, nested CV, bootstrap CI, stratified analysis, leakage
re-audit) that turn a model into a *defensible* model.

## Steps

| Step | What you do | Validation methods | Do's | Don'ts | Output | Quality gate (KPI) | Edge cases + fix |
|---|---|---|---|---|---|---|---|
| 1 | **Lock validation protocol** — freeze how you validate before looking at results | Subject-wise CV · LOSO · session-wise split · nested CV | Write protocol in advance | Changing protocol to boost score | Validation protocol doc | Protocol unchanged across runs | If changed → report as new experiment |
| 2 | **Choose CV scheme** — match CV to deployment scenario | LOSO (strong) · GroupKFold by subject · repeated GroupKFold | Use group-based folds | Random KFold on windows | Fold assignment file | No subject leakage | Few subjects → LOSO + CI |
| 3 | **Nested CV (for tuning)** — prevent "val overfit" during HPO | Inner loop tuning · outer loop scoring | Required for serious claims | Tuning on the same fold you report | Nested CV results | Outer-fold performance stable | Too expensive → small random search + strong baselines |
| 4 | **Confidence intervals** — quantify uncertainty | Bootstrap CI · fold std · Bayesian CI (optional) | Report CI for key metrics | Reporting only best run | CI table | CI width acceptable | Wide CI → more data or simpler model |
| 5 | **Robustness checks** — validate under noise/variation | Add noise · missing channels · time shift · reduced Fs · artifact-heavy subset | Run stress tests systematically | Only testing "clean" data | Robustness report | Performance drop within tolerance | Large drop → add augmentation + robust normalization |
| 6 | **Stratified analysis** — evaluate per subgroup | Per-subject · per-session · per-class · per-device · per-task condition | Identify failure modes early | Hiding poor subgroup performance | Stratified metrics dashboard | Worst-case ≥ minimum threshold | Device bias → domain adaptation / harmonization |
| 7 | **Error analysis** — study what the model gets wrong | Confusion matrix · per-class errors · hard examples · mislabel audit | Sample errors for review | Blaming data without checking | Error log + examples | Clear dominant error sources | Label noise → refine label rules + exclude ambiguous windows |
| 8 | **Calibration validation** — validate probability quality | Reliability curve · ECE · Brier score | Validate calibration on held-out val/test | Using training to calibrate | Calibration report | ECE improves | Overconfidence → temperature scaling |
| 9 | **Decision-threshold validation** — validate operating point | Sensitivity at fixed specificity · F1 max · cost-based threshold | Select threshold on val only | Choosing threshold after test | Operating point report | Constraint met (e.g., sens ≥ X) | Different population → threshold may shift |
| 10 | **Leakage audit (again)** — detect "too good to be true" | Train on shuffled labels (should fail) · ID-prediction tests | Run sanity baselines | Skipping sanity checks | Sanity-check appendix | Shuffled-label ≈ chance | If not → pipeline leakage exists |
| 11 | **Reproducibility validation** — results hold across seeds + reruns | 5–10 seeds · rerun key experiments | Report mean ± std | Reporting only best seed | Repro table | Std dev within tolerance | High variance → smaller model + better regularization |
| 12 | **External validation (if possible)** — test on different dataset/device | Cross-dataset test · leave-one-dataset-out | Strongest evidence | Claiming generalization without it | External test report | Drop acceptable + explained | Large domain shift → domain adaptation |
| 13 | **Ablation validation** — prove which components matter | Remove preprocessing step · remove feature family · swap model | Keep ablation list small | Too many ablations without focus | Ablation table | Contributions consistent | No effect → simplify pipeline |
| 14 | **Validation sign-off gate** — decide if model is ready for final test | Checklist + thresholds | Use gate to stop infinite tuning | "One more tweak" cycle | Validation sign-off | All gates pass | If fail → return to Phase 6 / 7 systematically |

## Best validation recipe (most defensible per scenario)

| Scenario | Recommended validation |
|---|---|
| Cross-subject deployment | GroupKFold by subject **or** LOSO + bootstrap CI |
| Small dataset | LOSO + nested CV (small HPO budget) |
| Multi-session per subject | Group by subject (keep all sessions together) |
| Multi-device | External validation per device or leave-one-device-out |

## Phase deliverables (minimum)

- [ ] Validation protocol (locked, versioned, unchanged across runs)
- [ ] Fold assignment file (grouped by subject)
- [ ] Nested CV results + confidence intervals
- [ ] Robustness + sanity-check report
- [ ] Error analysis notes (top failure modes)
- [ ] Calibration report (ECE / reliability curve)
- [ ] Operating point report (threshold rule)
- [ ] Sanity-check appendix (shuffled-label baseline at chance)
- [ ] Reproducibility table (5–10 seeds)
- [ ] External validation (if achievable)
- [ ] Ablation table
- [ ] Validation sign-off checklist (all gates pass)

## Composes with

- **§102 Trustworthy** — calibration + reliability foundations
- **§107 Monitoring/Drift** — robustness checks are pre-deployment drift simulations
- **§110 Debug** — per-fold reproducibility
- **§43 drills** — `drill_validation_protocol_immutable.py` (protocol file hash doesn't change across runs) + `drill_shuffled_label_chance.py` (shuffled-label baseline = chance ± ε) + `drill_loso_no_subject_overlap.py`
- **AI assurance horizontals** — [`validation_playbook.md`](../ai_assurance/validation_playbook.md) §3 Transparency table reads from this phase's outputs
