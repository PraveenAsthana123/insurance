# Performance + Analysis Taxonomy

> **Cross-cutting doc.** The master analysis taxonomy: 12 categories,
> ~32 sub-analyses, each with a named score. Plus the 25-metric
> generic performance catalog, the 30-metric AI/ML matrix, the
> subject-wise CV pattern with composite scoring, and worked examples
> for EEG / BCI and GenAI + Computer Vision.
>
> Owned by ML Engineering + RAI Office. Maps to frameworks **101**
> (Reliable), **102** (Trustworthy), **107** (Monitoring/Drift),
> **110** (Debug). Companion to [`evaluation_metrics.md`](evaluation_metrics.md)
> (which covers the distributional + generative metrics — IS / FID /
> KL / Wasserstein); this doc covers **classification + regression +
> deployment + analysis-of-analysis** territory.

## 0) Why this taxonomy

A team that ships "we ran metrics on the model" is shipping a
disconnected score. A team that ships **"we ran the 12-main analyses
× sub-analyses, each scored, composited per phase"** is shipping a
defensible posture. The taxonomy is the difference between
*reporting numbers* and *reporting analyses*.

## 1) Generic performance metrics (25)

System-level + ML-level + ops-level — the floor every project should
report on.

| # | Metric | What is analyzed | Typical interpretation |
|---|---|---|---|
| 1 | Accuracy | Correct predictions over total | Overall correctness |
| 2 | Precision | Correct positives over predicted positives | Prediction exactness |
| 3 | Recall (Sensitivity) | Correct positives over actual positives | Detection capability |
| 4 | F1-Score | Harmonic mean of P + R | Classification robustness |
| 5 | Specificity | Correct negatives over actual negatives | Negative-detection reliability |
| 6 | Error Rate | Incorrect over total | Misclassification tendency |
| 7 | Confusion Matrix | TP / FP / TN / FN distribution | Error pattern identification |
| 8 | ROC Curve | TPR vs FPR | Discriminative power |
| 9 | AUC | Area under ROC | Class separability |
| 10 | Latency | Time per operation | System responsiveness |
| 11 | Throughput | Tasks per unit time | Processing capacity |
| 12 | Execution Time | Total runtime | Computational efficiency |
| 13 | Memory Utilization | Memory consumed | Resource efficiency |
| 14 | CPU / GPU Utilization | Processing-unit workload | Hardware efficiency |
| 15 | Scalability | Behavior with workload growth | Expansion capability |
| 16 | Stability | Performance consistency over time | Reliability under prolonged operation |
| 17 | Fault Tolerance | Behavior under failure | Resilience |
| 18 | Energy Consumption | Power usage | Energy efficiency |
| 19 | Bandwidth Utilization | Data-transfer efficiency | Communication overhead |
| 20 | Load Handling Capacity | Performance under peak | Stress tolerance |
| 21 | Model Convergence | Training stability over iterations | Learning effectiveness |
| 22 | Overfitting / Underfitting | Train-vs-val behavior | Generalization capability |
| 23 | Resource Allocation Efficiency | Optimal use of resources | System optimization |
| 24 | Response Time Variance | Fluctuation in response | Predictability |
| 25 | Reliability Index | Failure frequency over time | Operational dependability |

## 2) AI / ML Performance Metrics Matrix (30, categorized)

| # | Metric | Category | What is analyzed | Why it matters |
|---|---|---|---|---|
| 1 | Accuracy | Classification | Correct / total | Overall correctness |
| 2 | Precision | Classification | TP / pred-positives | FP control |
| 3 | Recall | Classification | TP / actual-positives | Detection capability |
| 4 | F1-Score | Classification | Harmonic P+R | Balance |
| 5 | Specificity | Classification | TN / actual-negatives | Negative reliability |
| 6 | Confusion Matrix | Classification | TP/FP/TN/FN | Error patterns |
| 7 | ROC Curve | Classification | TPR vs FPR | Discrimination |
| 8 | AUC | Classification | Area under ROC | Separability |
| 9 | Log Loss | Classification | Probability error | Confidence quality |
| 10 | Top-K Accuracy | Classification | Correct in top-K | Ranking |
| 11 | MSE | Regression | Avg squared error | Magnitude |
| 12 | RMSE | Regression | √MSE | Scale interpretability |
| 13 | MAE | Regression | Avg absolute error | Outlier robustness |
| 14 | R² | Regression | Explained variance | Explanatory power |
| 15 | Adjusted R² | Regression | Variance w/ penalty | Overfit risk |
| 16 | Training Loss | Training | Error during learning | Optimization |
| 17 | Validation Loss | Training | Error on unseen | Generalization |
| 18 | Convergence Rate | Training | Speed of stabilization | Efficiency |
| 19 | Overfitting Gap | Training | Train–val gap | Robustness |
| 20 | Underfitting Indicator | Training | Low train perf | Capacity adequacy |
| 21 | Inference Time | Deployment | Time per sample | Real-time suitability |
| 22 | Throughput | Deployment | Pred / sec | Scalability |
| 23 | Memory Footprint | Deployment | RAM / VRAM | Resource efficiency |
| 24 | Model Size | Deployment | Storage | Edge feasibility |
| 25 | Energy Consumption | Deployment | Power | Sustainability |
| 26 | Robustness | Reliability | Stability under noise | Resilience |
| 27 | Bias / Fairness | Ethics | Group-wise perf | Ethical compliance |
| 28 | Explainability Score | Interpretability | Transparency | Trustworthiness |
| 29 | Drift Detection | Maintenance | Distribution change | Validity over time |
| 30 | Retraining Frequency | Lifecycle | Update rate | Operational cost |

## 3) The 12-Main Analysis Taxonomy (with sub-analyses + score)

This is the **load-bearing table**. Every project's analysis plan
should map to it.

| # | Main Analysis | Sub-Analysis | What is evaluated | Score / Metric |
|---|---|---|---|---|
| **1** | **Performance** | Overall Performance | Global model effectiveness | Accuracy |
|   |   | Class-wise Performance | Per-class reliability | Precision, Recall, F1 |
|   |   | Error Distribution | FP / FN behavior | Confusion Matrix |
|   |   | Agreement Analysis | Chance-corrected accuracy | Cohen's Kappa |
| **2** | **Subject-Wise** | Per-Subject Performance | Individual subject behavior | F1-Score |
|   |   | Inter-Subject Variability | Performance deviation | Std. Deviation |
|   |   | Worst-Case Subject | Minimum reliability | Min Score |
| **3** | **Cross-Validation** | K-Fold CV | Generalization stability | Mean Accuracy |
|   |   | LOSO Validation | Unseen-subject perf | Mean F1 / AUC |
|   |   | Subject-Wise CV | Leakage-free validation | Composite Score |
| **4** | **Model** | Architecture | Structural suitability | Parameter Count |
|   |   | Convergence | Training stability | Loss Reduction Rate |
|   |   | Overfitting | Train–test gap | Δ Accuracy / Δ Loss |
|   |   | Ablation Study | Component contribution | Score Drop (%) |
| **5** | **Feature** | Feature Importance | Contribution | Importance Score |
|   |   | Channel / Band Analysis | Informative inputs | Mean F1 |
|   |   | Dimensionality Reduction | Redundancy removal | Accuracy Gain |
| **6** | **Robustness** | Noise Sensitivity | Performance under noise | Robustness Score |
|   |   | Occlusion / Drop | Missing-input tolerance | F1 Degradation |
|   |   | Domain Shift | Cross-dataset stability | AUC Drop |
| **7** | **Generalization** | Unseen Data Testing | Real-world applicability | Test F1 |
|   |   | Cross-Session | Temporal stability | Session-wise Score |
|   |   | Transfer Learning | Knowledge reuse | Transfer Gain |
| **8** | **Reliability** | Stability Over Time | Output consistency | Variance Score |
|   |   | Failure Case | Error patterns | Failure Rate |
|   |   | Confidence Calibration | Prediction reliability | Brier Score |
| **9** | **Interpretability** | Feature Attribution | Decision transparency | SHAP / LIME Score |
|   |   | Spatial / Attention Maps | Focus regions | Activation Score |
|   |   | Neuro / Semantic Validity | Domain consistency | Expert Score |
| **10** | **Computational** | Inference Time | Real-time feasibility | Latency (ms) |
|   |   | Memory Usage | Deployment readiness | RAM / VRAM |
|   |   | Energy Efficiency | Power consumption | Energy Score |
| **11** | **Comparative** | Baseline Comparison | Relative performance | Score Improvement |
|   |   | Model Ranking | Best-model selection | Composite Score |
| **12** | **Statistical** | Mean ± Std | Result reliability | Confidence Interval |
|   |   | Significance Testing | Performance validity | p-value |

## 4) Model-Analysis Comprehensive List (30 types)

The "what can I analyze about a model" checklist. Used during
Phase 7 (training) and Phase 10 (benchmarking) per
[`../ml_methodology/`](../ml_methodology/README.md).

| # | Model-Analysis Type | What is analyzed | Purpose |
|---|---|---|---|
| 1 | Architecture | Structure + layers | Design effectiveness |
| 2 | Parameter | # trainable params | Complexity |
| 3 | Model Capacity | Learning ability vs data size | Under / over-fit risk |
| 4 | Convergence | Loss stabilization | Training stability |
| 5 | Loss Curve | Train vs val loss | Learning behavior |
| 6 | Gradient | Magnitude + flow | Vanishing / exploding |
| 7 | Overfitting | Train–test gap | Generalization quality |
| 8 | Underfitting | Low train perf | Expressiveness |
| 9 | Bias–Variance | Error decomposition | Trade-off balance |
| 10 | Feature Dependency | Model reliance on features | Input importance |
| 11 | Ablation | Effect of removing components | Contribution |
| 12 | Hyperparameter Sensitivity | Perf vs param change | Param robustness |
| 13 | Robustness | Behavior under noisy inputs | Resilience |
| 14 | Stability | Output consistency | Predictive reliability |
| 15 | Generalization | Perf on unseen | Real-world applicability |
| 16 | Transferability | Perf on new domains | Knowledge reuse |
| 17 | Interpretability | Decision transparency | Explainability |
| 18 | Calibration | Probability correctness | Confidence reliability |
| 19 | Error Distribution | Patterns across samples | Failure modes |
| 20 | Class Sensitivity | Response per class | Imbalance impact |
| 21 | Complexity | Time + space | Computational cost |
| 22 | Inference Efficiency | Prediction speed | Real-time suitability |
| 23 | Memory Footprint | RAM / VRAM | Deployment feasibility |
| 24 | Energy Efficiency | Power consumption | Sustainability |
| 25 | Scalability | Perf with larger data | Expansion capability |
| 26 | Robustness to Domain Shift | Behavior under distribution change | Adaptability |
| 27 | Drift Sensitivity | Perf over time | Degradation detection |
| 28 | Failure Case | Incorrect predictions | Limitations |
| 29 | Comparative Model | Perf vs baselines | Relative superiority |
| 30 | Deployment Readiness | Combined operational factors | Production suitability |

## 5) Subject-Wise Cross-Validation with Composite Score

### 5.1 What "subject-wise" means

An evaluation strategy in which data from each subject is kept
**isolated** during training + testing. Samples from the same
subject never appear in both sets simultaneously. This evaluates
**true generalization across subjects**, not memorization of
subject-specific patterns.

### 5.2 Four common subject-wise strategies

| Method | Description | Use case |
|---|---|---|
| **LOSO** (Leave-One-Subject-Out) | One subject test, rest train | User-independent systems |
| **K-Fold Subject-Wise CV** | Subjects split into K groups | Limited-subject datasets |
| **Hold-Out Subject Validation** | Fixed subjects for test | Fast benchmarking |
| **Cross-Session Subject CV** | Train on one session, test on another | Temporal generalization |

### 5.3 Sample subject-wise table (LOSO + composite)

| Subject ID | Accuracy (%) | Precision | Recall | F1 | AUC | Composite | Observation |
|---|---|---|---|---|---|---|---|
| Subject-1 | 90.8 | 0.89 | 0.91 | 0.90 | 0.94 | **0.92** | Stable generalization |
| Subject-2 | 87.6 | 0.86 | 0.88 | 0.87 | 0.92 | **0.89** | Minor recall degradation |
| Subject-3 | 92.4 | 0.91 | 0.93 | 0.92 | 0.95 | **0.94** | Strong subject compatibility |
| Subject-4 | 84.9 | 0.83 | 0.85 | 0.84 | 0.90 | **0.87** | High subject variability |
| Subject-5 | 89.7 | 0.88 | 0.90 | 0.89 | 0.93 | **0.91** | Balanced performance |
| **Mean** | **89.1** | **0.87** | **0.89** | **0.88** | **0.93** | **0.91** | Robust cross-subject |

### 5.4 Composite score formulations

| Option | Formula | When to use |
|---|---|---|
| **F1-Score as final** | `Score = F1` | Imbalanced data + detection emphasis |
| **AUC-based** | `Score = AUC` | Ranking + threshold-independent |
| **Weighted (recommended)** | `Score = α·F1 + β·AUC`, α + β = 1, typical α = β = 0.5 | Balanced view |

### 5.5 Score analyses to report

| Analysis | What it reveals |
|---|---|
| **Score consistency** | Low variance → strong subject-independent learning |
| **Worst-case subject** | Min score → model reliability limits |
| **Generalization strength** | High mean → robust real-world applicability |
| **Bias indicator** | Repeated low scores on specific subjects → data imbalance / model bias |
| **Error patterns** | Subject-specific FP/FN → failure-mode identification |

### 5.6 Subject-wise vs sample-wise (critical)

| Sample-wise CV | Subject-wise CV |
|---|---|
| Over-optimistic accuracy | Realistic performance |
| Subject leakage risk | No data leakage |
| Memorization possible | True generalization |
| Weak reviewer acceptance | Strong reviewer acceptance |

### 5.7 Domain-specific importance

| Domain | Why subject-wise is mandatory |
|---|---|
| **EEG / Biomedical** | Mandatory for publication |
| **Computer Vision (human-centric)** | Prevents identity leakage |
| **GenAI (personalized data)** | Validates generalization |
| **Affective Computing / BCI** | User-independent evaluation |

### 5.8 Reusable thesis-ready sentence

> *"To ensure subject-independent evaluation, subject-wise
> cross-validation was employed. Data from each subject were
> exclusively used either for training or testing, thereby
> eliminating subject leakage and enabling realistic generalization
> assessment. A composite score (α·F1 + β·AUC) was computed per
> subject and aggregated to summarize multi-metric performance."*

## 6) Worked example — EEG / BCI project

Eight categories tailored to EEG. Use as a checklist when scoping
an EEG project's analysis plan.

| Category | Sub-analysis | Why it matters |
|---|---|---|
| **6.1 Data-Level** | Signal quality (EOG/EMG noise) · Channel-wise · Frequency-band (δ/θ/α/β/γ) · Time-domain · Artifact-impact | EEG reliability validation |
| **6.2 Feature-Level** | Feature importance · Band power · Statistical (mean/var/entropy) · Connectivity (coherence/PLV) · Dim-reduction (PCA / CSP) | Discriminative power |
| **6.3 Model-Level** | Architecture (CNN / LSTM / Transformer) · Param count · Convergence · Overfit · Ablation · Hyperparam sensitivity | Suitability for EEG |
| **6.4 Subject-Wise & LOSO** | Subject-wise perf · LOSO · Inter-subject variability · Intra-subject consistency | Reviewer credibility |
| **6.5 Performance Metrics** | Accuracy · Precision/Recall · F1 · AUC · Confusion Matrix · **Cohen's Kappa** | Imbalanced EEG classes |
| **6.6 Robustness** | Noise robustness · Channel-drop · Session variability · Domain shift · Stability | Real-world tolerance |
| **6.7 Interpretability & Neuro-Validity** | Spatial topography · Band contribution · SHAP/LIME · Physiological consistency | Trust in predictions |
| **6.8 Computational & Deployment** | Inference time · Memory · Energy · Scalability | BCI / wearable feasibility |

Reusable EEG thesis sentence:

> *"To evaluate subject-independent generalization, a Leave-One-
> Subject-Out (LOSO) validation strategy was employed. Channel-wise,
> band-wise, and feature-level analyses were conducted to assess
> neurophysiological relevance. Robustness was further examined
> under noise and channel-drop conditions."*

## 7) Worked example — GenAI + Computer Vision

Ten categories for GenAI + CV projects.

| Category | Sub-analysis | Why it matters |
|---|---|---|
| **7.1 Data & Dataset** | Distribution · image quality · augmentation impact · split integrity · domain diversity | Bias / imbalance identification |
| **7.2 Model Architecture** | Backbone (CNN / ViT) · Generator (GAN / Diffusion / VAE) · Discriminator (GAN) · Encoder-Decoder · Param count | Generation quality |
| **7.3 Training Behavior** | Loss curve (G vs D) · Convergence · **Mode collapse** · Overfit · Hyperparam sensitivity | Training dynamics |
| **7.4 Generative Quality** | **FID** · **IS** · **PRD** · **LPIPS** · Diversity · Mode coverage | See [`evaluation_metrics.md`](evaluation_metrics.md) |
| **7.5 CV Task Performance** | Classification: Acc / P / R / F1 / CM · Detection: **mAP / IoU / Recall** · Segmentation: **Dice / IoU / Pixel-Acc** | Task fitness |
| **7.6 Feature & Latent Space** | Feature-map viz · Latent interpolation · Disentanglement · Attention maps | Learned representation |
| **7.7 Robustness** | Noise · Occlusion · **Adversarial** · Domain shift · Stability | Real-world deployment |
| **7.8 Ablation & Comparative** | Component ablation · Loss-function comparison · Baseline · Backbone | Validation discipline |
| **7.9 Computational & Deployment** | Inference time · Throughput · Memory · Energy · Scalability | Edge feasibility |
| **7.10 Ethical & Quality (GenAI-specific)** | Bias · Artifact detection · **Hallucination** · Safety | Ethical compliance |

Reusable GenAI+CV thesis sentence:

> *"The generative model was evaluated using FID, IS, and LPIPS to
> assess visual fidelity and diversity. Downstream computer vision
> performance was validated through mAP and IoU metrics, while
> robustness was examined under noise and occlusion conditions."*

## 8) Composite scoring (used across analyses)

A single unified score for ranking + reporting:

```
Composite Score = α · F1 + β · AUC,   where α + β = 1
```

Typical choices:

| Use case | α (F1) | β (AUC) | Why |
|---|---|---|---|
| Balanced default | 0.5 | 0.5 | Equal weight to detection + ranking |
| Imbalanced data | 0.7 | 0.3 | Emphasize F1 |
| Threshold-independent | 0.3 | 0.7 | Emphasize AUC |
| Clinical (see [`clinical_validation.md`](clinical_validation.md)) | 0 | 0 | Use clinical composite (Sens + NPV + PPV + AUC) instead |

## 9) Project wire-up

| Analysis | Surface in this project |
|---|---|
| 25-metric generic catalog | §68.4 monitoring · §68.10 cost (latency / memory / energy rows) |
| 30-metric AI/ML matrix | `metrics_card.json` per release (§5 of [`evaluation_metrics.md`](evaluation_metrics.md)) |
| 12-main analysis taxonomy | Per-release "analysis card" — one row per main category × per sub-analysis × score |
| Model-analysis 30-list | Phase 7 (training) + Phase 10 (benchmarking) per ml_methodology |
| Subject-wise CV + composite | Phase 8 (validation) per ml_methodology |
| EEG worked example | `ml_methodology/` worked example pack |
| GenAI+CV worked example | `ml_methodology/` worked example pack |

## 10) Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| Report only accuracy with imbalanced data | Hides minority-class collapse — use PR-AUC + F1 |
| Random-window split (no subject isolation) | Subject leakage → over-optimistic results |
| Skip composite score | Single-metric ranking hides multi-dimensional reality |
| Skip ablation in benchmarking | Cannot defend "this component helped" claim |
| Skip Cohen's Kappa on EEG / clinical | Chance-agreement is non-trivial; raw accuracy misleads |
| Mode collapse uncaught in GAN | "Looks good per-sample" hides "produces same 5 things" |
| Mix sample-wise + subject-wise without flagging | Reviewers reject silently |
| Single seed reporting | Hides variance; report mean ± std across 5–10 seeds |

## 11) Audit-ready statement

> *"Performance was evaluated through a 12-category analysis
> taxonomy spanning Performance / Subject-Wise / Cross-Validation /
> Model / Feature / Robustness / Generalization / Reliability /
> Interpretability / Computational / Comparative / Statistical
> analyses. Each sub-analysis was scored with a named metric and
> aggregated through a composite score (α·F1 + β·AUC) to enable
> apples-to-apples ranking. Subject-wise cross-validation eliminated
> subject leakage; mean and per-subject scores were reported with
> confidence intervals."*

## Composes with

- **§38.3** — every analysis result lands an audit row
- **§43** — drills lock each sub-analysis output schema
- **§47.10** — load-testing surfaces the deployment-category metrics
- **§48** — interpretability sub-analyses provide the explainability artefacts
- **§59.4** — ORF metrics (Ragas) are the LLM/RAG analog of this catalog
- **§64.20** — every ML lifecycle type produces a row in the 12-main taxonomy
- **§64.36** — 6-flavor scorecard reads from this taxonomy (Analytical / Predictive ↔ Performance + Subject-wise · Bias-Gov ↔ Robustness + Reliability · Explainable ↔ Interpretability)
- **§68.4 / §68.8 / §68.10** — runtime read-side surfaces (monitoring + functional + cost evals)
- All 11 frameworks (101–111) — each main analysis ties to ≥ 1 framework
- Sister docs in this folder:
  - [`evaluation_metrics.md`](evaluation_metrics.md) — distributional + generative metrics (IS / FID / KL / Wasserstein)
  - [`clinical_validation.md`](clinical_validation.md) — clinical-specific (PPV / NPV / domain thresholds)
  - [`reliability_matrix.md`](reliability_matrix.md) — reliability discipline (test-retest, inter-rater, internal consistency)
  - [`validation_playbook.md`](validation_playbook.md) — Framework × Process × Verification × Quality Evidence per pillar
  - [`fairness_framework.md`](fairness_framework.md) — fairness metrics
