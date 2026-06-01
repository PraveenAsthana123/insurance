# Phase 9 — Model Testing (Final Holdout) + Accuracy Reporting + Benchmarking

> **DB ID:** 209 · **Owner:** QA + Audit · **Family:** `ml_methodology`
>
> **Core question:** *Single test execution, single result, defensible CI.*

## Why this phase

The test set is one-shot. Re-running it many times and picking the
best result is the most common silent leak of confidence. Phase 9
codifies the freeze → execute-once → report-with-CI → defend pattern
that auditors and reviewers expect.

## Steps

| Step | What you do | Methods / tools | Do's | Don'ts | Output | Quality gate (KPI) | Edge cases + fix |
|---|---|---|---|---|---|---|---|
| 1 | **Freeze everything** — lock code, data version, preprocessing, normalization, features, threshold rule | Git tag · dataset hash · model bundle | Treat test like "production" | Changing pipeline after seeing test | Test freeze checklist | Hashes match (data + code) | Bug found → declare "new test run" with new version |
| 2 | **One-time test execution** — run inference on test set **once** per model candidate (ideally 1 final) | Deterministic inference script | Keep logs + timestamps | Re-running many times + picking best | Test run log | Same output with same seed | Non-determinism → set deterministic flags + average over seeds (predefined) |
| 3 | **Report primary metrics** — compute Phase-1 agreed metrics | Accuracy · F1 · AUC · PR-AUC · sensitivity / specificity | Use metrics aligned to imbalance | Reporting only accuracy | Test metrics table | Primary metric meets target | Imbalance severe → focus PR-AUC + sensitivity |
| 4 | **Confusion matrix + per-class** — show what fails and how | Confusion matrix · per-class precision / recall | Always include per-class | Only macro averages | Error breakdown table | Worst-class recall above floor | One class collapses → threshold tuning (but only if Phase-1 rule allowed) |
| 5 | **Confidence intervals on test** — quantify uncertainty | Bootstrap CI · Wilson CI for accuracy · DeLong CI for AUC | Report CI beside score | Single number only | CI report | CI width acceptable | CI too wide → needs more subjects/sessions |
| 6 | **Statistical comparison vs baselines** — prove improvements are not noise | McNemar (paired classification) · paired bootstrap · DeLong (AUC) | Compare against your **best** baseline | Comparing to weak baselines only | Significance table | Improvement statistically supported | Small N → prefer paired bootstrap |
| 7 | **Benchmarking table (literature)** — compare fairly with prior work | Same dataset split · same metric definitions | Match protocols or disclose differences | Claiming SOTA without same split | Benchmark matrix | Apples-to-apples comparisons | Different preprocessing → include "not directly comparable" note |
| 8 | **Robustness on test** — run predefined stress tests (no tuning) | Noise · missing channels · downsample · artifact-heavy subset | Predefine tests in Phase 8 | Inventing new tests after seeing results | Test robustness appendix | Drop within tolerance | Big drop → document; future work |
| 9 | **Calibration on test** — check probability quality post-hoc | ECE · reliability curve · Brier | Report but **do not** recalibrate on test | Fitting calibration on test | Calibration figure / table | Calibration acceptable | Poor calibration → note; recalibrate in next version only |
| 10 | **Failure-mode audit** — inspect top FP / FN | Manual review · label audit sampling | Identify if labels or model are wrong | Hand-wavy explanations | Failure audit notes | Clear dominant causes found | Label errors → document + plan revised dataset |
| 11 | **Repro pack for reviewers** — everything to reproduce | Scripts · configs · model card · data card · environment file | Make it runnable end-to-end | Missing seeds/configs | Repro bundle | Another machine reproduces test | Dependency drift → lock versions + container |
| 12 | **"Go / No-Go" decision** — readiness for deployment / pilot | Criteria: performance + robustness + risk | Use a decision matrix | Deploying because score is high | Release decision doc | All gates pass | If not pass → iterate Phase 3–8 |

## Accuracy reporting — what reviewers expect

| Situation | What to report (minimum) | Why |
|---|---|---|
| **Balanced classes** | Accuracy + macro F1 + CI | Accuracy is meaningful |
| **Imbalanced classes (common)** | PR-AUC + macro F1 + sensitivity/specificity + CI | Avoid misleading accuracy |
| **Clinical-like event detection** | Sensitivity at fixed false-alarm rate | Safety-focused |
| **Cross-subject generalization** | Subject-wise results + mean ± CI | Shows real deployment ability |

## Benchmarking table template (copy into thesis/paper)

| Category | Baseline(s) | Your model | Δ | Notes |
|---|---|---|---|---|
| Handcrafted + LR / SVM | F1 / AUC | F1 / AUC | Δ | Same split |
| Riemannian baseline | F1 / AUC | F1 / AUC | Δ | Strong EEG baseline |
| Deep 1D CNN | F1 / AUC | F1 / AUC | Δ | Same preprocessing |
| TFR image CNN / ViT | F1 / AUC | F1 / AUC | Δ | Same TFR params |

## Phase deliverables (minimum)

- [ ] Test freeze checklist (data + code hashes locked)
- [ ] Test run log (single execution, timestamped)
- [ ] Test metrics table (primary + secondary)
- [ ] Error breakdown table (per-class)
- [ ] CI report (bootstrap / Wilson / DeLong)
- [ ] Significance table (paired comparison vs best baseline)
- [ ] Benchmark matrix (vs literature, apples-to-apples)
- [ ] Test robustness appendix (predefined stress tests)
- [ ] Calibration figure (no recalibration on test)
- [ ] Failure audit notes
- [ ] Repro bundle (runnable end-to-end)
- [ ] Release decision doc (Go / No-Go with rationale)

## Composes with

- **§105 Auditable** — test freeze checklist is the per-release audit row source
- **§109 Responsible GenAI** — if any component is generative (TSTR pattern from `evaluation_metrics.md` §1.5)
- **§38.3** — every test execution lands an audit row
- **§43 drills** — `drill_test_freeze_hash.py` (data + code + bundle hashes match between freeze + execute) + `drill_test_single_execution.py` (audit log shows ONE execution per candidate, not many)
- **AI assurance horizontals** — [`evaluation_metrics.md`](../ai_assurance/evaluation_metrics.md) §5 `metrics_card.json` lands here · [`validation_playbook.md`](../ai_assurance/validation_playbook.md) §1-6 quality-evidence columns map here
