# Reliability Matrix — Main & Sub-Analyses with Scores

> **Cross-cutting doc.** Reliability is the discipline that asks:
> *"Is the underlying measurement consistent enough to trust at all?"*
> Distinct from drift (which asks *"did distribution shift?"*) and
> distinct from validation (which asks *"does it generalize?"*).
>
> Without reliability, accuracy is a coincidence — a high-scoring
> model on a single eval is not the same as a model whose score holds
> up across retests, raters, sessions, and noise.
>
> Owned by ML Engineering + Clinical Affairs. Maps primarily to
> framework **101** (Reliable AI) and **107** (Monitoring/Drift);
> reads from **102** (Trustworthy AI — calibration) and **105**
> (Auditable — agreement traceability).
>
> Companion to [`performance_analysis_taxonomy.md`](performance_analysis_taxonomy.md)
> and [`clinical_validation.md`](clinical_validation.md).

## 0) The brutal reliability truth

> Reliability is what you have when the **same input produces the
> same output across runs / raters / sessions / minor perturbations**.
> A model that scores 0.92 once and 0.78 the next day on the same
> data is not 0.85 on average — it is **unreliable**. Average masks
> the failure mode; variance reveals it.

## 1) Reliability Matrix — 7 main + sub (with scores)

| # | Main Reliability Analysis | Sub-Analysis | What is assessed | Score / Metric |
|---|---|---|---|---|
| **1** | **Test–Retest Reliability** | Short-Term Retest | Consistency across repeated trials | ICC |
|   |   | Long-Term Retest | Stability over time | ICC |
|   |   | Session-Gap Analysis | Temporal drift impact | Correlation (r) |
| **2** | **Inter-Rater Agreement** | Model vs Clinician | Agreement with expert | Cohen's Kappa |
|   |   | Clinician–Clinician | Human reliability baseline | Kappa / ICC |
|   |   | Multi-Rater Consensus | Across raters | Fleiss' Kappa |
| **3** | **Internal Consistency** | Feature Consistency | Coherence of internal measures | Cronbach's α |
|   |   | Channel / Sensor Consistency | Signal agreement | α / Mean Corr |
| **4** | **Cross-Session Stability** | Session-Wise Performance | Stability across sessions | Δ F1 / Δ AUC |
|   |   | Day-Wise Consistency | Longitudinal robustness | Std. Deviation |
| **5** | **Robustness Testing** | Perturbation Robustness | Small input variations | Robustness Score |
|   |   | Stress-Case Testing | Extreme conditions | Performance Drop (%) |
| **6** | **Noise Tolerance** | Gaussian / Real-World Noise | Noise immunity | SNR-based Score |
|   |   | Low-Quality Signal Test | Degraded input handling | F1 Degradation |
| **7** | **Artifact Resistance** | Motion Artifacts | Resistance to movement noise | Artifact Score |
|   |   | Sensor Dropout | Missing-channel tolerance | F1 Degradation |
|   |   | Power-Line / EOG / EMG Interference | Resistance to mains + biological artifacts | Resistance Score |

## 2) Reliability metric reference (formulas + interpretation)

### 2.1 ICC (Intraclass Correlation Coefficient)

Measures absolute agreement across raters / trials / sessions.

| ICC Value | Interpretation |
|---|---|
| < 0.5 | Poor reliability |
| 0.5 – 0.75 | Moderate |
| 0.75 – 0.9 | Good |
| > 0.9 | Excellent |

Use ICC(2,k) for absolute agreement when same model runs multiple
times; ICC(3,k) when raters are fixed; ICC(1,k) when raters are
random.

### 2.2 Cohen's Kappa

Chance-corrected agreement between TWO raters.

```
κ = (p_o − p_e) / (1 − p_e)
```

| κ Value | Interpretation |
|---|---|
| < 0 | Worse than chance |
| 0.0 – 0.2 | Slight |
| 0.2 – 0.4 | Fair |
| 0.4 – 0.6 | Moderate |
| 0.6 – 0.8 | Substantial |
| 0.8 – 1.0 | Almost perfect |

Clinical floor: **κ ≥ 0.6** per [`clinical_validation.md`](clinical_validation.md) §6.

### 2.3 Fleiss' Kappa

Same as Cohen's but for ≥ 3 raters. Required when consensus across
a panel matters.

### 2.4 Cronbach's α (alpha)

Internal consistency across items / features / sensors.

| α Value | Interpretation |
|---|---|
| < 0.5 | Unacceptable |
| 0.5 – 0.7 | Questionable / acceptable |
| 0.7 – 0.9 | Good |
| > 0.9 | Excellent (but may indicate redundancy) |

### 2.5 Robustness Score (project-defined)

A weighted combination of perf-drop under stress tests:

```
R = mean( F1_clean − F1_under_perturbation ) over perturbation types
Lower R = more robust
```

### 2.6 SNR-based Score

For signal-processing pipelines (EEG / audio / sensor):

```
SNR_score = F1 at SNR=ε / F1 at SNR=clean
```

Reported across SNR levels: 30dB, 20dB, 10dB, 0dB, -10dB.

## 3) Sub-analysis details

### 3.1 Test–Retest

| Question | Method |
|---|---|
| Same model + same data + new run → same output? | Run inference N times with deterministic flags; report std dev |
| Same model + same data + N days later → same output? | Long-term retest with ICC |
| Same subject + new session → similar prediction? | Session-gap correlation |

### 3.2 Inter-Rater (model + human)

| Pairing | Floor |
|---|---|
| Model vs Clinician | κ ≥ 0.6 (clinical), κ ≥ 0.4 (non-clinical) |
| Clinician vs Clinician (baseline) | Should be reported alongside — model κ should approach human baseline |
| Multi-rater consensus | Fleiss' κ ≥ 0.6 |

If model–clinician κ ≥ clinician–clinician κ, the model is at-or-above
human-rater reliability — a strong claim worth defending carefully.

### 3.3 Internal Consistency

| Use case | Test |
|---|---|
| Multi-feature predictor | Cronbach's α across the feature set |
| Multi-channel sensor array | α across channels measuring same construct |
| Ensemble model | Inter-component agreement |

### 3.4 Cross-Session Stability

| Test | Method |
|---|---|
| Within-subject across sessions | Mean Δ F1 across sessions per subject |
| Across days (longitudinal) | Std dev of daily scores |
| Across acquisition equipment | Cross-device Δ F1 |

Pair with [`../ml_methodology/phase_08_validation.md`](../ml_methodology/phase_08_validation.md)
Step 12 (external validation).

### 3.5 Robustness Testing

| Perturbation type | Expected drop tolerance |
|---|---|
| Gaussian noise (σ ≤ 5% of signal range) | F1 drop ≤ 5pp |
| Time shift (±10% window length) | F1 drop ≤ 3pp |
| Random channel masking (1 of N) | F1 drop ≤ 5pp |
| Stress case (worst-quartile SNR subset) | F1 drop ≤ 10pp |

Locked pre-test per Phase 9 freeze discipline.

### 3.6 Noise Tolerance

Report F1 / AUC across SNR levels in a single table. A model whose
F1 falls off a cliff at 10dB but is fine at 20dB has a hidden
deployment failure waiting for a noisy hospital ward.

### 3.7 Artifact Resistance

Domain-specific (EEG → EOG / EMG / motion; CV → occlusion / motion
blur; audio → reverb / background hum). Maintain a per-domain
artifact catalog tested per release.

## 4) Composite Reliability Score (recommended)

A safety-tilted composite:

```
Reliability Score = 0.25·ICC + 0.25·κ + 0.20·α + 0.15·Robustness + 0.15·SNR_score
```

All five inputs in [0, 1]. Weights:
- ICC + κ get 25% each → measurement-process reliability dominates
- α (internal consistency) → 20%
- Robustness + SNR → 15% each (covered separately by Phase 8 ablation)

Per-release reliability dashboard tile in §68.4 monitoring surface.

## 5) Per-release reliability card

```json
{
  "model_id": "...",
  "model_version": "...",
  "release_date": "2026-...",
  "test_retest": {
    "icc_short_term": 0.92,
    "icc_long_term": 0.88,
    "session_gap_correlation": 0.85
  },
  "inter_rater": {
    "model_vs_clinician_kappa": 0.74,
    "clinician_baseline_kappa": 0.81,
    "multi_rater_fleiss": 0.71
  },
  "internal_consistency": {
    "feature_alpha": 0.84,
    "channel_alpha": 0.79
  },
  "cross_session": {
    "delta_f1_across_sessions": 0.03,
    "std_dev_daily": 0.018
  },
  "robustness": {
    "robustness_score": 0.91,
    "stress_drop_pp": 7.2
  },
  "noise_tolerance": {
    "snr_30db": 0.91, "snr_20db": 0.89, "snr_10db": 0.83, "snr_0db": 0.69, "snr_-10db": 0.41
  },
  "artifact_resistance": {
    "motion_score": 0.86,
    "eog_score": 0.82,
    "emg_score": 0.85,
    "powerline_score": 0.94
  },
  "composite_reliability_score": 0.86
}
```

## 6) When reliability fails — failure modes

| Symptom | Likely cause | Investigation |
|---|---|---|
| ICC < 0.5 | Non-deterministic inference | Audit seed control + library determinism flags |
| κ vs clinician < clinician-baseline κ | Model is worse than a junior reviewer | Retrain or restrict scope |
| α < 0.5 | Feature set is internally inconsistent | Re-examine feature selection |
| Δ F1 across sessions > 10pp | Session-specific overfitting / sensor drift | Re-baseline normalization (see [`../ml_methodology/phase_04_normalization.md`](../ml_methodology/phase_04_normalization.md)) |
| Stress-case drop > 20pp | Insufficient augmentation / brittle features | Phase 7 augmentation review |
| SNR fall-off at moderate noise | Over-fit to clean lab signal | Train with realistic noise mixtures |

## 7) Reliability vs Drift vs Validation — what's what

| Concern | Question | Where it lives |
|---|---|---|
| **Reliability** (this doc) | Is the measurement consistent? | Pre-deploy + ongoing |
| **Validation** | Does the model generalize? | [`../ml_methodology/phase_08_validation.md`](../ml_methodology/phase_08_validation.md) |
| **Drift** | Did the distribution shift? | [`monitoring_drift.md`](monitoring_drift.md) + framework 107 |
| **Bias** | Is performance equal across groups? | [`fairness_framework.md`](fairness_framework.md) |
| **Calibration** | Do confidence scores match correctness? | [`trustworthy_ai.md`](trustworthy_ai.md) |

A model can be **valid** (generalizes well on test) yet **unreliable**
(produces different scores on retest). Both must be verified.

## 8) Audit-ready statement

> *"Reliability was assessed through test-retest (ICC), inter-rater
> agreement (Cohen's Kappa for model–clinician, Fleiss for multi-rater
> consensus), internal consistency (Cronbach's α), cross-session
> stability, robustness testing, noise tolerance, and artifact
> resistance. A composite reliability score (weighted ICC + κ + α
> + Robustness + SNR-score) summarized all dimensions; per-domain
> reliability cards were persisted alongside each model release."*

## 9) Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Report mean across raters without κ | Mean can be high while disagreement is high |
| Skip clinician-baseline κ | "Model κ = 0.7" is meaningless without "human baseline κ" reference |
| ICC reported without (1/2/3, k) variant | Different ICC variants measure different things |
| Test-retest on same exact inference batch | Deterministic flag may hide non-determinism in upstream pipeline |
| Single SNR level | Models often fall off a cliff at specific SNRs; sweep is required |
| Cronbach's α > 0.95 unchallenged | Often indicates redundancy, not high reliability |
| No artifact catalog | Cannot defend "robust to artifacts" without enumerating which artifacts |
| Composite reported without component breakdown | Hides which dimension is weak |

## Composes with

- **§38.3** — reliability card lands as a §38 audit row per release
- **§43** — drills lock: `drill_test_retest_icc.py` · `drill_kappa_vs_clinician.py` · `drill_snr_sweep.py` · `drill_artifact_catalog_present.py`
- **§47.10** — soak + spike load testing surfaces reliability under stress
- **§57.5** — 5-question runbook: "WHY is reliability dropping?" answered by per-card breakdown
- **§64.30** — 12-tier testing includes reliability tier (boundary + perf)
- **§64.32** — per-dept security tab includes reliability under attack-perturbation
- **§107 Monitoring** — reliability dashboard refreshed per inference window
- **§101 Reliable AI** — this doc is the operational discipline behind framework 101
- Sister docs:
  - [`performance_analysis_taxonomy.md`](performance_analysis_taxonomy.md) — generic 12-main analysis (reliability is one of the 12)
  - [`clinical_validation.md`](clinical_validation.md) — clinical-specific reliability (Kappa floor, ICC threshold per domain)
  - [`monitoring_drift.md`](monitoring_drift.md) — drift is the post-deploy variant
  - [`evaluation_metrics.md`](evaluation_metrics.md) — calibration metric (ECE) is reliability-adjacent
  - [`fairness_framework.md`](fairness_framework.md) — reliability across subgroups
