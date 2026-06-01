# Phase 5 — EDA + Feature Evaluation (Signal-First, Leakage-Safe)

> **DB ID:** 205 · **Owner:** ML Engineer · **Family:** `ml_methodology`
>
> **Core question:** *Which features actually carry the signal — and are they stable?*

## Why this phase

EDA done on the test set is leakage with extra steps. EDA done only
on the train set, with a clear separability + stability gate, is
the only honest way to decide which features survive into Phase 6.
This phase also catches the dead-give-away leakage signatures
(simple classifier on "ID-like" features doing too well).

## Steps

| Step | What you do | Techniques / metrics | Do's | Don'ts | Output | Quality gate (KPI) | Edge cases + fix |
|---|---|---|---|---|---|---|---|
| 1 | **EDA scope + split lock** — freeze train/val/test before any analysis | Subject-wise split locked from Phase 2 | Do EDA on **train only** (or mark exploratory-only) | Peeking at test labels | EDA protocol note | Leakage checklist = pass | Test inspected → discard + redo split |
| 2 | **Signal quality overview** — quantify basic EEG health | SNR proxy · RMS amplitude · PSD slope · SQI per channel/window | Report distributions, not just means | Ignoring noisy channels | SQI report | % windows passing SQI ≥ threshold | Persistent noise → revisit preprocessing thresholds |
| 3 | **Time-domain exploration** — understand waveform behavior | Mean · variance · skew / kurtosis · Hjorth (activity / mobility / complexity) | Compare class-wise on train | Overinterpreting single subject | Time-domain summary tables | Stable stats across folds | Heavy tails → robust stats (median / IQR) |
| 4 | **Frequency-domain exploration** — check band relevance | Bandpower (δ, θ, α, β, γ) · relative power · PSD peaks | Tie bands to neuroscience rationale | Fishing for significance | Bandpower plots + tables | Expected band trends visible | No trend → re-check task alignment |
| 5 | **Time–frequency EDA** — validate TFR usefulness | STFT/CWT average maps per class · variance maps | Average over windows + subjects | Showing cherry-picked images | Mean / variance TFR figures | Clear structural differences | Blurry maps → window/wavelet mismatch |
| 6 | **Spatial / channel EDA** — see where information lives | Channel-wise bandpower maps · correlation matrices | Keep montage consistent | Mixing channel orders | Channel importance heatmaps | Consistent hotspots across folds | Device-specific bias → harmonize channels |
| 7 | **Class separability (univariate)** — feature discrimination | Effect size (Cohen's d) · AUC per feature · KS-test | Prefer effect size over p-value | p-value hunting | Feature ranking table | Top features d ≥ 0.5 (task-dependent) | Weak effects → consider interactions |
| 8 | **Class separability (multivariate)** — combined feature power | LDA projection · PCA + class coloring · t-SNE / UMAP (train only) | Use for diagnostics, not claims | Claiming performance from t-SNE | Projection plots | Partial separation visible | No separation → model may need nonlinear capacity |
| 9 | **Redundancy analysis** — identify correlated features | Pearson / Spearman corr · mutual information · VIF | Remove or group redundant features | Blindly keeping all features | Correlation matrix + clusters | Max corr below chosen threshold | Strong collinearity → PCA or feature grouping |
| 10 | **Stability across subjects** — ensure features generalize | Feature mean / variance per subject · ICC | Favor features stable across subjects | Features driven by few subjects | Stability report | Low between-subject variance | Subject-specific effects → consider personalization track |
| 11 | **Leakage detection (EDA)** — proactively detect leakage | Check if simple classifier on "ID-like" features performs well | Intentionally test for leaks | Ignoring suspiciously high AUC | Leakage audit | Dummy models ≈ chance | High dummy AUC → revisit split / windowing |
| 12 | **Feature readiness decision** — what moves to Phase 6 | Keep interpretable + stable + discriminative features | Document why each feature is kept/dropped | "We kept everything" | Feature shortlist v1 | Shortlist size justified | Too many features → prioritize by effect + stability |

## Typical EEG feature families (evaluation checklist)

| Family | Examples | Why evaluate |
|---|---|---|
| **Time-domain** | RMS · Hjorth · zero-crossings | Fast, interpretable |
| **Frequency-domain** | Bandpower · peak freq · ratios | Neuroscience-aligned |
| **Time–frequency** | Energy in TFR tiles | Captures nonstationarity |
| **Connectivity** (optional) | Coherence · PLV | Network-level info |
| **Riemannian** | Covariance geometry | Montage-robust, strong baseline |
| **Image-derived** | CNN embeddings from STFT/CWT | High-capacity representation |

## Phase deliverables (minimum)

- [ ] EDA protocol note (train-only scope locked)
- [ ] SQI report
- [ ] Time-domain + frequency-domain + TF summary tables/figures
- [ ] Channel importance heatmaps
- [ ] Feature ranking table (univariate)
- [ ] Multivariate projection plots
- [ ] Correlation matrix + redundancy clusters
- [ ] Feature stability report (cross-subject)
- [ ] Leakage audit (dummy classifier should be ≈ chance)
- [ ] Feature shortlist v1 with kept/dropped rationale

## Composes with

- **§102 Trustworthy** — calibration foundations
- **§110 Debug** — feature-level reproducibility
- **§64.36** — Predictive flavor of per-sub-process scorecard reads from feature shortlist
- **AI assurance horizontals** — [`fairness_framework.md`](../ai_assurance/fairness_framework.md) §3.B forbids hidden group inference; this phase's leakage audit is the prevention mechanism
- **§43 drills** — `drill_eda_train_only.py` (verify no test access during EDA) + `drill_leakage_audit.py` (dummy classifier on ID-like features stays at chance)
