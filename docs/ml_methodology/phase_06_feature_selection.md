# Phase 6 — Feature Selection + Dimensionality Reduction

> **DB ID:** 206 · **Owner:** ML Engineer · **Family:** `ml_methodology`
>
> **Core question:** *Which features survive a robustness gauntlet?*

## Why this phase

Phase 5 lists the candidates; Phase 6 fights them. The right
features here aren't the strongest single-fold winners — they're the
ones that survive bootstrapping, ablation, and a leakage gauntlet
inside CV. Locking a feature set on a single-fold ranking is
exactly how "the model works in the lab" becomes "the model
collapses in production."

## Steps

| Step | What you do | Methods / options | Do's | Don'ts | Output | Quality gate (KPI) | Edge cases + fix |
|---|---|---|---|---|---|---|---|
| 1 | **Selection objective** — why reduce features? | Improve generalization · reduce overfitting · speed · interpretability | Tie objective to metric (F1 / AUC / latency) | Reducing features "just because" | Feature-selection goal doc | Objective aligned to metric | Conflicting goals → run parallel tracks (interp vs perf) |
| 2 | **Selection scope** — which features are eligible | Handcrafted only · image-embeddings only · hybrid | Start with Phase-5 shortlist | Feeding raw everything | Candidate feature set | Candidate size justified | Too many → pre-filter by stability/effect size |
| 3 | **Filter methods (fast)** — rank features independently of model | Variance threshold · ANOVA / F-test · mutual information · effect size | Use train-only stats | Using labels from val/test | Ranked feature list | Top-K improves baseline | Nonlinear relations → MI instead of ANOVA |
| 4 | **Correlation pruning** — remove redundancy | Pearson / Spearman threshold · clustering · VIF | Keep one representative per cluster | Keeping many correlated features | Pruned feature set | Max corr ≤ threshold | Strong domain reason → keep group + regularize |
| 5 | **Wrapper methods (model-aware)** — evaluate subsets using a model | RFE (SVM / LR) · sequential forward selection | Use **nested CV** | Wrapper on full dataset | Wrapper-selected subset | Stable subset across folds | Small N → wrappers unstable; prefer filters |
| 6 | **Embedded methods** — let model select during training | L1 / Lasso · Elastic Net · tree-based importance · group lasso | Prefer for linear / tree baselines | Overinterpreting single-run importance | Embedded-selected features | Consistency across seeds | Importance variance high → average over runs |
| 7 | **Stability selection** — check robustness of selection | Bootstrapping + selection frequency | Keep features with high selection freq | One-shot selection | Stability table | Selection freq ≥ threshold (e.g., 70%) | Unstable → relax K or increase data |
| 8 | **Dimensionality reduction (linear)** — compress while preserving variance | PCA · ICA (features) · CSP (MI tasks) | Fit on train only | Using components fit on all data | Component models | Explained variance ≥ target | PCA hurts interpretability → keep raw features too |
| 9 | **Dimensionality reduction (manifold)** — capture nonlinear structure | Autoencoders · kernel PCA | Use cautiously; report clearly | Claiming interpretability | Latent embeddings | Downstream metric improves | Overfitting → regularize + early stop |
| 10 | **Riemannian geometry (EEG-specific)** — leverage covariance | Covariance matrices → tangent space | Strong baseline for EEG | Mixing with incompatible features | Riemannian feature set | Competitive baseline achieved | Few channels → covariance unstable; regularize |
| 11 | **Hybrid feature strategy** — combine complementary | Bandpower + Riemannian · TFR-CNN embeddings + stats | Keep combinations small | Feature explosion | Hybrid feature schema | Hybrid > best single family | No gain → drop weakest family |
| 12 | **Ablation studies** — prove contribution | Remove one family at a time | Mandatory for papers | Skipping ablations | Ablation table / plot | Performance drops as expected | No drop → feature redundant |
| 13 | **Leakage guardrails** — enforce safe fitting | Fit selectors **inside** CV folds | Lock pipeline order | Preselecting before split | Pipeline diagram | No optimistic bias | Suspected bias → redo with nested CV |
| 14 | **Final feature freeze** — freeze for modeling phase | Versioned feature list | Freeze before heavy tuning | Changing features mid-tuning | Feature set v-Final | Hash matches across runs | New idea → new experiment ID |

## Practical defaults (strong + defensible)

| Scenario | Recommended approach |
|---|---|
| Small N, handcrafted features | Filter (effect size / MI) → corr-prune → L1 |
| Motor imagery EEG | CSP + bandpower → LDA / SVM |
| Cross-subject generalization | Riemannian tangent features |
| EEG → image → deep model | Use embeddings · avoid heavy manual selection |
| DBA / applied research | Prefer stable, interpretable features + ablations |

## Phase deliverables (minimum)

- [ ] Feature-selection goal doc (objective tied to metric)
- [ ] Candidate feature set
- [ ] Ranked feature list (filter)
- [ ] Pruned feature set (correlation)
- [ ] Wrapper-selected subset (nested CV)
- [ ] Stability table (bootstrapping)
- [ ] Component models (if PCA / CSP)
- [ ] Riemannian feature set (if applicable)
- [ ] Hybrid feature schema (if multi-family)
- [ ] Ablation table
- [ ] Pipeline diagram (selectors fit inside CV)
- [ ] Feature set v-Final with hash

## Composes with

- **§102 Trustworthy** — feature stability is trust foundation
- **§106 Lifecycle** — feature set is a registry artefact
- **§110 Debug** — per-feature reproducibility
- **§64.20** — ML lifecycle types consume this freeze
- **§43 drills** — `drill_feature_freeze_hash.py` (frozen list reproducible) + `drill_selector_in_cv_fold.py` (selectors fit inside fold, not on full data)
- **AI assurance horizontals** — [`evaluation_metrics.md`](../ai_assurance/evaluation_metrics.md) §4 row 9 (Sample-quality fidelity) reads from feature stability tables
