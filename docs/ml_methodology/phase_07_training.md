# Phase 7 — Model Training (Baselines → Deep, Reproducible + Fair)

> **DB ID:** 207 · **Owner:** ML Engineer · **Family:** `ml_methodology`
>
> **Core question:** *Did the deep model actually beat the strong baseline?*

## Why this phase

The most common Phase-7 failure is skipping baselines. A deep model
that beats *no baseline* doesn't beat anything — there's no
reference point to know if the deep model is adding value or
absorbing leakage. This phase forces the ladder discipline:
classical → Riemannian → 1D CNN → TFR-CNN, then talk about results.

## Steps

| Step | What you do | Options / techniques | Do's | Don'ts | Output | Quality gate (KPI) | Edge cases + fix |
|---|---|---|---|---|---|---|---|
| 1 | **Build baselines first** — simple before deep | Logistic Regression · SVM · Random Forest · XGBoost · LDA | Establish a "floor" performance | Jumping to deep model first | Baseline results table | Baseline stable across seeds | Baseline too low → check labels/preproc |
| 2 | **Define pipelines (end-to-end)** — one pipeline object per model family | preproc → norm → features → model | Put everything in one pipeline | Manual steps outside pipeline | Pipeline diagram + code | Reproducible run hash | Mismatch across runs → config locking |
| 3 | **Handle class imbalance** — strategy | Class weights · focal loss · balanced sampling · threshold tuning | Use PR-AUC / F1 if imbalance | Reporting only accuracy | Imbalance strategy note | Minority recall meets target | Extreme imbalance → event-based metrics |
| 4 | **Choose representation** — model input type | Raw EEG (1D CNN) · TFR images (2D CNN / ViT) · handcrafted features | Compare 2–3 representations max | Trying 10 representations at once | Representation benchmark table | Best rep selected on val | No gain → revisit feature quality |
| 5 | **Model families (EEG typical)** — select candidates | 1D CNN · EEGNet-style · TCN · BiLSTM (careful) · CNN + Attention · ViT for scalograms | Pick models aligned to data size | Huge ViT with small dataset | Model shortlist | Params vs N justified | Small N → use compact EEGNet / TCN |
| 6 | **Regularization strategy** — prevent overfitting from day 1 | Dropout · weight decay · early stopping · data augmentation | Early stopping + weight decay as default | Training until loss → 0 | Training config | Train–val gap controlled | Overfit → increase reg, reduce model size |
| 7 | **Data augmentation (signal-aware)** — robustness without corrupting meaning | Gaussian noise · time shift · channel dropout · mixup (careful) · SpecAugment on TFR | Keep augmentations physiologically plausible | Augmenting in a way that changes labels | Augmentation config | Val improves without instability | Aug hurts → disable one-by-one ablation |
| 8 | **Hyperparameter search plan** — tune fairly, not endlessly | Random search · Bayesian · small grid for baselines | Use nested CV or held-out val | Tuning on test set | HPO log | Limited search budget documented | Too many trials → overfitting to val |
| 9 | **Training reproducibility** — repeatable | Fixed seeds · deterministic ops (best effort) · pinned libs · saved configs | Log everything (seed, git hash, data hash) | "It changed this time" | Experiment log | Std dev across 5 seeds acceptable | High variance → simplify model + more data |
| 10 | **Calibration strategy** — meaningful probabilities | Temperature scaling · Platt scaling · isotonic | Calibrate on validation only | Calibrating on test | Calibration report | ECE/Brier improves | Overconfident model → calibration + regularization |
| 11 | **Threshold selection** — decision threshold aligned to objective | Max F1 · fixed sensitivity · Youden J | Select threshold on val | Picking threshold after seeing test | Threshold rule | Meets clinical/business constraint | Drift later → re-tune threshold on new val |
| 12 | **Training efficiency** — control compute/time cost | Mixed precision · batch sizing · caching features | Keep logs of compute | HPC "just because" | Resource log | Training time within budget | Memory errors → reduce batch / downsample TFR |
| 13 | **Model selection rule** — what "best model" means | Primary metric + tie-breakers (latency, stability) | Use consistent selection criteria | Picking best-looking run | Model selection spec | Best chosen without bias | Multiple winners → simplest/most stable |
| 14 | **Save artifacts** — package everything needed | Weights · configs · scaler · feature list · preprocessing version | Save as "model bundle" | Saving only weights | Model bundle v1 | Loads + predicts deterministically | Bundle missing stats → enforce checklist |

## Recommended training ladder (don't waste time)

| Stage | What to train | Why |
|---|---|---|
| **A** | Handcrafted features + LR/SVM | Fast sanity + interpretability |
| **B** | Riemannian tangent + LR/SVM | Strong EEG baseline |
| **C** | 1D CNN on raw EEG | Learns morphology |
| **D** | 2D CNN/ViT on CWT scalograms | Often top accuracy if data supports |

Each stage must beat the prior by a documented margin to justify
the added complexity (per Phase 9 § statistical comparison).

## Phase deliverables (minimum)

- [ ] Baseline results table (Stage A + B at minimum)
- [ ] Pipeline diagram + code (one per family)
- [ ] Imbalance strategy note
- [ ] Representation benchmark table
- [ ] Model shortlist with params-vs-N justification
- [ ] Training config (regularization explicit)
- [ ] Augmentation config (physiologically plausible)
- [ ] HPO log (search budget documented)
- [ ] Experiment log (seed + git + data hash)
- [ ] Calibration report (val only)
- [ ] Threshold rule (val only)
- [ ] Resource log
- [ ] Model selection spec
- [ ] Model bundle v1 (loads + predicts deterministically)

## Composes with

- **§101 Reliable** — training stability + reproducibility
- **§106 Lifecycle** — model bundle is a registry artefact
- **§108 Sustainable** — compute cost tracked per training run
- **§102 Trustworthy** — calibration belongs here
- **§43 drills** — `drill_baseline_floor.py` (each ladder stage must beat prior) + `drill_seed_reproducibility.py` (5 seeds, std dev within tolerance)
- **AI assurance horizontals** — [`evaluation_metrics.md`](../ai_assurance/evaluation_metrics.md) §1.7 evaluation stack + §5 metrics_card.json schema land here
