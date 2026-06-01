# Clinical Validation — PPV / NPV / Sensitivity / Specificity / Domain Thresholds

> **Cross-cutting doc, domain-scoped to clinical / medical / safety-critical AI.**
>
> Generic performance metrics (Accuracy, F1, AUC) are necessary but
> insufficient for clinical AI. A model with 99% accuracy that misses
> 1 in 10 strokes is clinically unsafe. This doc codifies the
> **clinically-meaningful** validation surface — PPV, NPV,
> chance-corrected agreement, population subgroup parity, FN / FP
> impact, real-world deployment, and domain-specific thresholds.
>
> Owned by Clinical Affairs + RAI Office. Maps to frameworks **102**
> (Trustworthy — calibration), **103** (Safe — harm prevention),
> **104** (Accountable — physician sign-off), **105** (Auditable —
> 7-year retention), **107** (Monitoring — population drift).
>
> Companion to [`performance_analysis_taxonomy.md`](performance_analysis_taxonomy.md)
> (generic) and [`reliability_matrix.md`](reliability_matrix.md)
> (test-retest + agreement infrastructure).

## 0) The brutal clinical truth

> **In clinical ML systems, PPV and NPV matter more than accuracy.**
> A safe model is one whose negative predictions can be trusted.
> A model is not clinically valid because it is accurate — it is
> clinically valid because it is **reliable, interpretable,
> unbiased, and safe across patients**.

## 1) Core clinical metrics

| Metric | Name | Formula | Clinical meaning |
|---|---|---|---|
| **PPV** | Positive Predictive Value | `TP / (TP + FP)` | Probability that a positive prediction is **truly positive** |
| **NPV** | Negative Predictive Value | `TN / (TN + FN)` | Probability that a negative prediction is **truly negative** |
| **Sensitivity** | True Positive Rate | `TP / (TP + FN)` | Ability to **detect affected** cases |
| **Specificity** | True Negative Rate | `TN / (TN + FP)` | Ability to **exclude healthy** cases |
| **Accuracy** | Overall correctness | `(TP + TN) / Total` | General diagnostic performance |
| **AUC** | Area under ROC | Threshold-independent separability | Diagnostic reliability |

**Why PPV / NPV ≠ Sensitivity / Specificity:**
Sens + Spec are intrinsic model properties. PPV + NPV depend on
**prevalence in the deployed population**. A model trained on a
50/50 dataset may have excellent Sens but collapsing PPV when
deployed in a 1% prevalence population. **Always report all four**
and disclose the prevalence at which PPV / NPV were measured.

## 2) Clinical Validation Analysis — 12-main + sub

| # | Main Clinical Analysis | Sub-Analysis | What is clinically validated | Score / Measure |
|---|---|---|---|---|
| **1** | **Diagnostic Performance** | Sensitivity Analysis | Detect true patients | Sensitivity (%) |
|   |   | Specificity Analysis | Detect healthy cases | Specificity (%) |
|   |   | Accuracy Analysis | Overall correctness | Accuracy (%) |
|   |   | AUC Analysis | Diagnostic separability | AUC |
| **2** | **Agreement** | Model vs Clinician | Consistency with experts | Cohen's Kappa |
|   |   | Inter-Rater (clinician–clinician) | Human reliability baseline | Kappa / ICC |
| **3** | **Clinical Risk** | False Negative Analysis | Missed-diagnosis risk | FN Rate |
|   |   | False Positive Analysis | Over-diagnosis risk | FP Rate |
|   |   | Risk Stratification | Severity classification | Risk Score |
| **4** | **Population Validation** | Age-Group Analysis | Perf across age groups | Mean F1 |
|   |   | Gender-Wise Analysis | Gender bias detection | Δ Accuracy |
|   |   | Comorbidity Analysis | Perf under co-conditions | Subgroup Score |
| **5** | **Subject-Wise Clinical** | Patient-Wise Performance | Individual patient reliability | Patient Score |
|   |   | LOSO Clinical Validation | Unseen-patient performance | Mean F1 / AUC |
| **6** | **Clinical Robustness** | Noise / Artifact Robustness | Real-world signal quality | Robustness Score |
|   |   | Missing Data Analysis | Incomplete clinical data | Score Degradation |
| **7** | **Clinical Generalization** | Cross-Center Validation | Multi-hospital consistency | Center-Wise Score |
|   |   | Cross-Device Validation | Different acquisition systems | Accuracy Drop |
| **8** | **Interpretability & Explainability** | Feature / Region Importance | Clinical plausibility | Expert Score |
|   |   | Attention / Heatmap Review | Clinician trust | Qualitative Rating |
| **9** | **Outcome Prediction** | Prognostic Accuracy | Outcome reliability | AUC / F1 |
|   |   | Early Detection Analysis | Pre-symptomatic detection | Lead-Time Score |
| **10** | **Clinical Decision Support** | Assistive Accuracy | Decision-support effectiveness | Improvement % |
|   |   | Workflow Integration | Clinical usability | Usability Score |
| **11** | **Safety & Ethical Validation** | Bias Analysis | Fair clinical treatment | Bias Index |
|   |   | Failure Mode Analysis | Unsafe predictions | Failure Rate |
| **12** | **Statistical Clinical** | Confidence Interval | Result reliability | Mean ± CI |
|   |   | Significance Testing | Clinical relevance | p-value |

## 3) Real-world performance assessment

| Assessment | What is tested | Clinical relevance |
|---|---|---|
| Deployment Performance | Inference latency | Real-time usability |
| Stability Analysis | Output consistency | Long-term monitoring |
| Domain Shift Analysis | Lab → real environment | Clinical transferability |
| Missing Data Analysis | Incomplete signals | Practical feasibility |
| Failure Mode Analysis | Unsafe predictions | Risk mitigation |
| Drift Analysis | Performance over time | Model longevity |

## 4) Worked example — Binary stress detection

### 4.1 Confusion matrix

| Actual \ Predicted | Stress | No-Stress |
|---|---|---|
| **Stress** | TP | FN |
| **No-Stress** | FP | TN |

### 4.2 Clinical focus

- **High Sensitivity** → avoid missed stress (false negative is dangerous)
- **High NPV** → confidence in "no-stress" decisions
- **PPV** → confidence in detected-stress alarms (avoid intervention fatigue)

### 4.3 Required reporting metrics

| Metric | Clinical interpretation |
|---|---|
| Sensitivity | Stress-detection capability |
| Specificity | Healthy exclusion |
| PPV | Confidence in detected stress |
| NPV | Safety of non-stress classification |
| F1-Score | Balanced detection |
| AUC | Diagnostic reliability |

## 5) Worked example — 4-class cognitive workload (COG)

### 5.1 Classes

`Low · Moderate · High · Overload`

### 5.2 Analysis types

| Analysis | What is evaluated | Score |
|---|---|---|
| Class-wise performance | Per-COG level reliability | Precision / Recall |
| Macro-F1 | Equal importance to all classes | Macro-F1 |
| Confusion pattern | Adjacent-class confusion | Confusion matrix |
| Severity-weighted score | Misclassification cost (Low→Overload is worse than Low→Moderate) | Weighted F1 |
| Ordinal consistency | Logical class ordering | Kendall τ / Error Distance |

### 5.3 Multi-class clinical metrics

| Metric | Purpose |
|---|---|
| Macro-F1 | Balanced evaluation across classes |
| Weighted-F1 | Class-prevalence handling |
| Per-Class Recall | Missed cognitive states |
| Cohen's Kappa | Agreement beyond chance |
| AUC (One-vs-Rest) | Separability per class |

## 6) Domain thresholds + clinical standards

Below these thresholds, clinical claims should NOT be made.

| Domain / metric | Threshold / standard | Clinical rationale |
|---|---|---|
| **Stress detection — Sensitivity** | ≥ 90% | Missed stress is high-risk |
| **Cognitive load — Recall (High / Overload)** | ≥ 85% | Safety-critical states |
| **PPV** | ≥ 80% | Avoid false alarms / intervention fatigue |
| **NPV** | ≥ 90% | Trust negative decisions |
| **Cohen's Kappa** | ≥ 0.6 | Substantial clinical agreement |
| **AUC** | ≥ 0.85 | Diagnostic reliability floor |

These thresholds are **defaults**; specific use cases may require
tighter values (e.g., oncology screening typically requires Sensitivity
≥ 95% and NPV ≥ 99%). The threshold table for every clinical use case
must be locked in **Phase 1 framing** per
[`../ml_methodology/phase_01_framing.md`](../ml_methodology/phase_01_framing.md)
and **never moved post-test**.

## 7) Composite Clinical Score (recommended)

Patient-safety-weighted single score:

```
Clinical Score = 0.3 · Sensitivity + 0.3 · NPV + 0.2 · PPV + 0.2 · AUC
```

Weights are deliberately tilted toward **catching real positives**
(Sens) and **trusting negatives** (NPV) — both protect the patient
from harm. PPV + AUC complete the picture without dominating it.

**Reweight if:**
- Screening (cancer / sepsis): bump Sens to 0.4, NPV to 0.4
- Confirmatory test: bump PPV to 0.4 (false positives drive surgery)
- Risk stratification: bump AUC to 0.3 (threshold-independent)

## 8) Per-release clinical metrics card

Every clinical model release MUST persist:

```json
{
  "model_id": "...",
  "model_version": "...",
  "release_date": "2026-...",
  "use_case": "binary_stress | 4class_cog | ...",
  "deployment_population": {
    "prevalence": 0.18,
    "age_distribution": { "18-34": 0.2, "35-54": 0.4, "55+": 0.4 },
    "gender_split": { "F": 0.51, "M": 0.49 }
  },
  "diagnostic": {
    "sensitivity": 0.91, "sensitivity_ci": [0.88, 0.94],
    "specificity": 0.88, "specificity_ci": [0.85, 0.91],
    "ppv": 0.83, "ppv_ci": [0.79, 0.87],
    "npv": 0.93, "npv_ci": [0.90, 0.96],
    "auc": 0.92, "auc_ci": [0.89, 0.95]
  },
  "agreement": {
    "model_vs_clinician_kappa": 0.74,
    "clinician_vs_clinician_kappa": 0.81
  },
  "population_parity": {
    "age_group_f1": { "18-34": 0.88, "35-54": 0.90, "55+": 0.86 },
    "gender_f1": { "F": 0.89, "M": 0.88 }
  },
  "subgroup_thresholds_met": true,
  "clinical_composite_score": 0.91,
  "thresholds_used": "default_clinical_v1",
  "physician_signoff": {
    "name": "Dr. ...",
    "credential": "...",
    "date": "2026-..."
  }
}
```

Stored alongside the model in the registry (§106 Lifecycle); rendered
in §68.11 safety eval; consumed by §38.3 audit envelope.

## 9) Thesis / regulatory-ready statement

> *"Clinical validation was performed through diagnostic
> performance, agreement, robustness, and population-wise analyses.
> Subject-wise and LOSO evaluations confirmed patient-independent
> generalization, while interpretability analysis ensured clinical
> plausibility. PPV and NPV were reported at the deployment-population
> prevalence; composite clinical score (0.3·Sens + 0.3·NPV + 0.2·PPV
> + 0.2·AUC) summarized multi-metric safety-weighted performance.
> All thresholds were locked pre-test per the framing document."*

## 10) Anti-patterns (clinical-specific)

| Anti-pattern | Why it fails clinically |
|---|---|
| Report accuracy without PPV / NPV at deployment prevalence | A 99% accurate model can have a 20% PPV when deployed at 1% prevalence — clinically useless |
| Skip Cohen's Kappa | Inter-rater agreement is regulatory-required for diagnostic claims |
| Move thresholds after seeing test results | This invalidates the validation; document as a NEW experiment |
| Single-center validation | Multi-hospital / multi-device drop is the most common deployment failure |
| No physician sign-off | Regulatory submissions require credentialed reviewer |
| Subgroup parity not reported | Disparate-impact violations surface as bias claims |
| No CI on diagnostic metrics | Single-point estimate hides variance; CI is mandatory |
| Recalibrate on test set | This breaks the freeze + reports a leaked result |

## 11) Regulatory mapping

| Regulation / standard | Requirement | This doc's contribution |
|---|---|---|
| **FDA 510(k) — Predicate comparison** | Sens / Spec / PPV / NPV vs predicate device | §2.1 + §6 thresholds |
| **EU MDR (Medical Device Regulation)** | Clinical evaluation + post-market surveillance | §3 real-world + §7 composite + §8 metrics card |
| **EU AI Act Art. 14 — Human oversight** | HITL escalation for high-risk decisions | §2.10 Clinical Decision Support |
| **EU AI Act Art. 86 — Right to explanation** | Counterfactual + factor disclosure | §2.8 Interpretability + see [`../ai_assurance/responsible_by_design.md`](responsible_by_design.md) |
| **NIST AI RMF Govern + Measure** | Risk + metric registers | §2.11 Safety + §10 anti-patterns |
| **ISO 14155 — Clinical investigation of medical devices** | Subject-wise + population validation | §2.4 + §2.5 |
| **HIPAA / GDPR Art. 9 (special-category data)** | PHI handling | See [`data_governance.md`](data_governance.md) |

## Composes with

- **§38.3** — every clinical decision lands an audit row
- **§43** — drills lock: PPV ≥ threshold, NPV ≥ threshold, Kappa ≥ 0.6, population-parity within tolerance, thresholds frozen pre-test
- **§48** — explainability evidence required for clinical claims (§ Art. 86)
- **§64.32** — per-dept security tab (PHI handling)
- **§64.42** — Fairlearn + AIF360 for population parity; Garak for prompt-injection (if generative); statsmodels for Kappa / ICC
- **§107 Monitoring/Drift** — clinical drift detection (population shift over time)
- **§103 Safe AI** — clinical safety is the primary surface
- **§104 Accountable AI** — physician sign-off + RACI per release
- **§105 Auditable AI** — 7-year retention for regulated decisions
- Sister docs:
  - [`performance_analysis_taxonomy.md`](performance_analysis_taxonomy.md) — generic 12-main analysis (clinical extends with §2 above)
  - [`reliability_matrix.md`](reliability_matrix.md) — test-retest + inter-rater foundations
  - [`evaluation_metrics.md`](evaluation_metrics.md) — distributional + generative metrics (for clinical generative AI)
  - [`fairness_framework.md`](fairness_framework.md) — population parity foundations
  - [`responsible_by_design.md`](responsible_by_design.md) — 5-pillar executive framing
