# Evaluation Metrics — Generative + Distributional + Task

> **Cross-cutting doc.** The Validation Playbook tells you *when* to
> measure; this doc tells you *what* to measure with — generative-
> quality metrics (IS, FID, KID), the probability primer behind them
> (joint / marginal / conditional / posterior / likelihood),
> divergence + distance landscape (KL / JSD / Wasserstein / MMD /
> Hellinger / Bhattacharyya), and the broader fidelity dimensions
> beyond divergence (perceptual / structural / temporal / causal /
> fairness).
>
> Owned by AI Engineering + RAI Office. Maps primarily to frameworks
> **109** Responsible GenAI (sample quality), **107** Monitoring/Drift
> (distribution shift), **102** Trustworthy AI (calibration), **101**
> Reliable AI (task usefulness). The metrics in §5 are the ones you
> reach for in §68.8 functional eval, §68.10 cost eval (where token
> cost interacts with sample quality), and §68.11 safety eval.

## 0) The one-paragraph brutal truth

> No single metric is sufficient. **High IS ≠ useful data. Low FID ≠
> good classifier performance. Only F1 proves operational value.**
> Distribution-distance metrics tell you "are the distributions
> similar?"; fidelity tells you "is it realistic, usable, safe?" — they
> are different questions. Ship at least one metric from each layer
> (distribution + perceptual + task) per release; gate on all three.

## 1) Generative-quality metrics

### 1.1 Inception Score (IS)

| Property | Value |
|---|---|
| **Measures** | Quality + diversity of generated images |
| **Formula** | `IS = exp(E_x[KL(p(y|x) || p(y))])` |
| **Direction** | ↑ higher = sharper + more diverse |
| **Strengths** | Cheap to compute; sharpens incentive to produce confidently-classifiable samples |
| **Limitations** | Does NOT compare to real data · gameable via mode collapse across classes · meaningless outside ImageNet-class domains |

Intuition:
- Per-image `p(y|x)` should be **peaked** (confident classification)
- Across-images marginal `p(y) = E_x[p(y|x)]` should be **diverse**

### 1.2 Fréchet Inception Distance (FID)

| Property | Value |
|---|---|
| **Measures** | Fidelity of generated samples to real-data feature distribution |
| **Formula** | `FID = ‖μ_r − μ_g‖² + Tr(Σ_r + Σ_g − 2(Σ_r·Σ_g)^(1/2))` |
| **Feature space** | Inception-V3 embeddings (default) |
| **Direction** | ↓ lower = closer to real |
| **Strengths** | Sensitive to mode collapse · correlates with human judgment |
| **Limitations** | Needs ≥ 10k samples · depends on Inception embeddings · Gaussian assumption on features |
| **Captures** | ✅ visual realism · ✅ distribution similarity · ✅ mode collapse · ⚠️ diversity (indirect) · ❌ per-sample quality · ❌ task usefulness |

### 1.3 Kernel Inception Distance (KID)

Unbiased MMD-based alternative to FID. Use when sample count < 10k.

```
KID = MMD²(Inception(X_real), Inception(X_gen))
```

### 1.4 F1-Score (classification metric, not generative)

| Property | Value |
|---|---|
| **Formula** | `F1 = 2 · (P · R) / (P + R)` |
| **Direction** | ↑ higher = better balance of precision + recall |
| **Used for** | Classification · detection · segmentation |

F1 is **not** a generative metric, but it is the bridge between
distribution-quality (IS/FID) and operational usefulness.

### 1.5 Connecting IS / FID with F1 (correct usage)

The connection is **indirect**:

**Method 1 — Train classifier on synthetic, test on real (TSTR):**
1. Generate synthetic data
2. Train a classifier on it
3. Test on real labelled data
4. Measure F1 → "synthetic data usefulness"

**Method 2 — Class-conditional FID + F1:**

| Class | FID ↓ | F1 ↑ |
|---|---|---|
| A | 12.4 | 0.91 |
| B | 38.7 | 0.62 |

Correlate per-class. High-FID classes should have low F1; if they don't,
something's off (e.g., label leakage).

**Method 3 — Generative Precision–Recall (PRD):**
- Precision → sample quality (fidelity)
- Recall → coverage (diversity)
- F1 → balance between both

### 1.6 When to use each (cheat sheet)

| Scenario | Best metric |
|---|---|
| Image visual quality | IS |
| Realism vs real data | FID |
| Mode collapse detection | FID + PRD |
| Synthetic data usefulness | F1 (TSTR) |
| Medical / EEG / IoT AI | F1 + task-specific metrics |
| Business validation | F1 + cost / accuracy |

### 1.7 Recommended evaluation stack (best practice)

| Layer | Metric |
|---|---|
| Visual quality | IS |
| Statistical fidelity | FID (or KID for small N) |
| Coverage vs quality | PRD (Precision + Recall) |
| Task performance | F1 / AUROC |
| Business impact | Accuracy gain / cost-per-correct-answer |

## 2) Probability primer (so the formulas above make sense)

### 2.1 Definitions

| Type | Symbol | Meaning |
|---|---|---|
| **Joint** | `P(X, Y)` | Both events together |
| **Conditional** | `P(X \| Y)` | X given Y |
| **Marginal** | `P(X) = Σ_Y P(X, Y)` | One variable alone (sum / integrate out the rest) |
| **Posterior** | `P(θ \| D)` | Belief after evidence |
| **Prior** | `P(θ)` | Belief before evidence |
| **Likelihood** | `P(D \| θ)` | How likely the data is given parameters (NOT a probability over θ) |
| **Evidence / marginal likelihood** | `P(D) = ∫ P(D \| θ) P(θ) dθ` | How well the model explains the data overall |
| **Predictive** | `P(x_new \| D)` | Probability of future data |
| **Empirical** | `P̂(X = x) = count(x) / N` | Estimated from observed frequencies |
| **Class (softmax)** | `P(y \| x)` | Model-estimated class probability |
| **Calibration** | — | Whether predicted probabilities reflect reality (0.8 confidence → 80% correct) |
| **Tail** | `P(X > x)` | Probability of extreme events |
| **Survival** | `S(t) = P(T > t)` | Event hasn't occurred yet |
| **Conditional marginal** | `P(X) = Σ_Y P(X \| Y) P(Y)` | Hybrid form for hierarchical models |

### 2.2 Memory rule

> **Joint** = everything together
> **Conditional** = one given another
> **Marginal** = what's left when you forget the rest
> **Posterior** = after evidence

### 2.3 Why marginals matter for Inception Score

In IS:

- `p(y | x)` → conditional class probability for each image
- `p(y) = E_x[p(y | x)]` → marginal over generated samples

A **peaked `p(y | x)`** signals confident predictions (quality).
A **uniform `p(y)`** signals diverse outputs across classes.
The KL between them is the IS signal.

### 2.4 Why marginals matter for bias detection

If `p_generated(y) ≠ p_real(y)`:
- FID may look acceptable (it's averaging)
- Downstream F1 collapses on the under-represented classes
- This is the **hidden failure mode** in GenAI fairness

**Good practice checklist:**
- [ ] Always inspect marginal class distributions
- [ ] Compare real vs generated marginals
- [ ] Combine with conditional metrics
- [ ] Validate with downstream F1

## 3) Divergence + distance landscape (f-divergences and beyond)

### 3.1 f-divergences

| # | Metric | Formula | Sym? | Disjoint OK? | Strengths | Weaknesses | Use |
|---|---|---|---|---|---|---|---|
| 1 | **KL** | `Σ P log(P/Q)` | ❌ | ❌ | Theoretical basis · variational | Explodes when Q=0 where P>0 | VAEs, IS, Bayesian ML |
| 2 | **Reverse KL** | `Σ Q log(Q/P)` | ❌ | ❌ | Mode-seeking → sharp samples | Mode collapse risk | Variational methods |
| 3 | **Jensen–Shannon (JSD)** | `½KL(P‖M) + ½KL(Q‖M)`, M = (P+Q)/2 | ✅ | ⚠️ | Symmetric · bounded [0, ln 2] | Less fine-detail | GAN theory |
| 4 | **Total Variation** | `½ Σ\|P−Q\|` | ✅ | ❌ | Strong difference signal | Coarse | Distribution tests |
| 5 | **Chi-Square** | `Σ (P−Q)²/Q` | ❌ | ❌ | Tail-sensitive | Unstable for small Q | Rare-event modeling |
| 6 | **Hellinger** | `‖√P − √Q‖ / √2` | ✅ | ✅ | Robust to zeros · bounded | Less interpretable | Robust stats |
| 7 | **Bhattacharyya** | `−ln Σ √(PQ)` | ✅ | ⚠️ | Measures overlap | Limited scaling | Pattern recognition |

### 3.2 Cross-entropy + likelihood family

| Metric | Formula | Use |
|---|---|---|
| **Cross-entropy** | `H(P, Q) = H(P) + KL(P‖Q)` | Classification loss (equivalent to KL minimization) |
| **Negative log-likelihood (NLL)** | `−log P(x)` | Diffusion, autoregressive LLMs (per-sample) |

### 3.3 Optimal transport family (NOT f-divergence)

| Metric | Formula (intuition) | Notes |
|---|---|---|
| **Wasserstein (Earth-Mover)** | `inf_γ E[‖x−y‖]` over couplings γ | Handles disjoint support · smooth gradients · used in WGAN, Sim2Real |
| **Sinkhorn divergence** | Entropy-regularised Wasserstein | Scalable / HPC-friendly · used in large-scale GenAI |

### 3.4 Kernel-based distances

| Metric | Intuition | Notes |
|---|---|---|
| **Maximum Mean Discrepancy (MMD)** | Mean embedding difference in RKHS | Non-parametric · used in KID + domain adaptation |
| **Energy distance** | Statistical expectation diff | Equivalent to MMD with specific kernel |

### 3.5 Probability-integral-transform tests (non-parametric)

| Metric | Intuition | Notes |
|---|---|---|
| **Kolmogorov–Smirnov** | `sup_x \|F_P(x) − F_Q(x)\|` | Distribution-free · simple |
| **Anderson–Darling** | Tail-weighted KS | Tail sensitivity · needs more samples |

### 3.6 Geometric / information-geometry

| Metric | Use |
|---|---|
| **Fisher–Rao distance** | Info geometry metric · advanced Bayesian AI |

### 3.7 Cheat sheet — which divergence to use

| Goal | Choice |
|---|---|
| Match full distribution | KL |
| Avoid mode collapse | **Wasserstein** |
| Stable GAN training | JSD / Wasserstein |
| Small datasets | MMD / Energy |
| Tail sensitivity | Chi-Square / AD |
| Need symmetry | JSD / Hellinger |
| HPC scalable | Sinkhorn |
| Statistical hypothesis test | KS / AD |

### 3.8 Brutal truth

> **KL explodes when supports don't overlap.** That's why Wasserstein
> and MMD are often better for generative models — they degrade
> gracefully when the generator hasn't yet learned to cover the
> real-data manifold.

### 3.9 One-line memory rule

> **KL** asks: *"How surprised am I using Q when truth is P?"*
> **Wasserstein** asks: *"How much effort to turn Q into P?"*
> **MMD** asks: *"Do P and Q match in their feature averages?"*

## 4) Fidelity beyond divergence (when distribution-distance is not enough)

Divergence answers *"are the distributions similar?"* — fidelity
answers *"is it realistic / usable / safe?"*. Use these for the
non-statistical dimensions.

| # | Fidelity Topic | Measures | Typical Techniques | Where used |
|---|---|---|---|---|
| 1 | **Perceptual** | Human-perceived realism | LPIPS, SSIM, MS-SSIM | Image, video, AR/VR |
| 2 | **Statistical** | Match of statistical properties | Mean/variance, PSD, autocorrelation | Sensors, EEG, IoT |
| 3 | **Structural** | Preservation of structure | SSIM, graph similarity | Medical imaging |
| 4 | **Semantic** | Meaning preservation | CLIP similarity, embedding cosine | Vision-language |
| 5 | **Temporal** | Time-dependency accuracy | DTW, lag correlation | Robotics, signals |
| 6 | **Spectral** | Frequency-domain realism | FFT distance, PSD error | EEG, audio |
| 7 | **Geometric** | Manifold preservation | Geodesic distance, curvature | Representation learning |
| 8 | **Coverage** | Mode coverage completeness | Recall, density metrics | GenAI evaluation |
| 9 | **Sample quality** | Per-output realism | Precision metrics | GAN diagnostics |
| 10 | **Task** | Usefulness for real tasks | F1, AUROC, accuracy | Healthcare, autonomy |
| 11 | **Simulation** | Sim-to-real closeness | Reality-gap metrics | Robotics, digital twins |
| 12 | **Causal** | Cause–effect preservation | SCM checks, counterfactuals | Trustworthy AI |
| 13 | **Physical** | Physics consistency | Constraint-violation rate | Robotics, satellite |
| 14 | **Robustness** | Stability under noise | Stress tests, perturbation | Industrial AI |
| 15 | **Fairness** | Group-wise realism | Marginal-parity checks | Regulated AI |
| 16 | **Uncertainty** | Confidence correctness | Calibration error, ECE | Medical AI |
| 17 | **Energy** | Resource realism | Power, latency deviation | Edge / IoT |
| 18 | **Scalability** | Behavior at scale | Throughput degradation | Big Data, HPC |

### Mental model

> **Divergence = mathematical closeness.**
> **Fidelity = real-world correctness.**

## 5) Wire-up — where these metrics land in this project

| Metric | Surface in this project |
|---|---|
| IS / FID / KID | `§68.8 functional eval` for image generators · MLflow logged per training run · ratchet test per release |
| F1 / AUROC | `§68.8 functional eval` for classifiers · gating in CI per validation playbook |
| KL / JSD | Used inside model loss (cross-entropy) + drift monitoring (PSI ≈ symmetric KL approximation) |
| Wasserstein | `§107 Monitoring/Drift` per-feature drift score · WGAN training if applicable |
| MMD | Domain-adaptation check per-tenant · `§64.43 Federated` pattern |
| KS / AD | Per-feature drift dashboards |
| LPIPS / SSIM | Image generators in §109 Responsible GenAI |
| DTW | Time-series in `§64.20 timeseries_lifecycle.py` |
| ECE | Calibration in `§102 Trustworthy AI` · safety-critical models |
| TSTR F1 | Synthetic-data utility in any §109 generator pipeline |
| PRD (Precision-Recall for generative) | `§109 Responsible GenAI` companion to FID |

### Per-release acceptance template

A release lands a `metrics_card.json` per model with:

```json
{
  "model_id": "...",
  "model_version": "...",
  "release_date": "2026-...",
  "distribution": {
    "fid": 14.2,
    "kid": 0.012,
    "wasserstein_features": 0.08,
    "ks_pass_rate": 0.97
  },
  "perceptual": {
    "lpips_avg": 0.21,
    "ssim_avg": 0.84
  },
  "coverage": {
    "precision": 0.88,
    "recall": 0.79,
    "prd_f1": 0.83
  },
  "task": {
    "tstr_f1": 0.82,
    "tstr_auroc": 0.91
  },
  "fairness": {
    "marginal_parity_pass": true,
    "per_class_fid": { "A": 12.4, "B": 38.7 },
    "per_class_f1": { "A": 0.91, "B": 0.62 }
  },
  "uncertainty": {
    "ece": 0.04,
    "brier": 0.11
  },
  "cost": {
    "tokens_per_sample": 410,
    "usd_per_1k": 0.0091
  }
}
```

Stored alongside the model in the registry (`§106 Lifecycle`); rendered
in the `§68.8` functional eval surface; consumed by the `§68.10` cost
eval surface.

## 6) Anti-patterns (do not do)

| Anti-pattern | Why it fails |
|---|---|
| Ship with FID alone | "Low FID" can still mean per-class collapse — pair with PRD + per-class F1 |
| Use IS without diversity check | IS is gameable by collapsing classes |
| Use KL on disjoint supports | Explodes to infinity; use Wasserstein or MMD |
| Use FID with < 10k samples | Gaussian assumption fails; use KID instead |
| Compute marginals only at training | They drift in prod; recompute per inference window |
| Treat perceptual metrics as task metrics | LPIPS is human-eye-aligned, NOT classifier-aligned |
| Skip calibration (ECE) on regulated AI | A 70% accurate model that thinks it's 99% accurate is *worse* than one that knows it's uncertain |
| Compute FID on un-pre-processed images | Inception expects specific resize + centre-crop; otherwise score is meaningless |
| Report a single number per release | Always ship the metrics-card JSON with all 5 layers; auditors need the breakdown |

## 7) Audit-ready statement (reusable)

> Generative quality is measured at five layers per release: distribution
> (FID / KID / Wasserstein), perceptual (LPIPS / SSIM), coverage (PRD),
> task (TSTR F1 / AUROC), and fairness (per-class parity). All five
> are persisted in a per-model metrics card, gated in CI, and tracked
> over time for drift. No release ships on a single-metric pass.

## Composes with

- **§38.3** — metrics card lands as an audit row per release
- **§43** — drills lock thresholds (`drill_metrics_card_present.py`, `drill_fid_ratchet.py`, `drill_per_class_parity.py`)
- **§47.10** — load testing surfaces cost-per-token + cost-per-correct (links to §68.10)
- **§48** — explainability + per-class transparency are read-side of fairness metrics
- **§59.4** — Ragas (faithfulness / context-precision / answer-relevance / citation accuracy) is the LLM/RAG analog of the IS/FID/F1 stack
- **§64.20** — every ML lifecycle type (tabular / NLP / CV / time-series / DL / RAG / recommendation / anomaly / fraud) consumes the metrics-card schema
- **§64.30** — 12-tier testing references these metrics in tiers 1 / 2 / 6 (functional + perf + boundary)
- **§64.36** — Bias/Governance flavor + Output-Relevancy flavor read from this card
- **§64.42** — testing matrix tools (Ragas / DeepEval / Fairlearn / AIF360 / Evidently AI) feed this card
- **§68.4 / §68.8 / §68.10 / §68.11** — runtime read-side surfaces (monitoring + functional + cost + safety)
- Frameworks **101** (task usefulness) · **102** (calibration / trust) · **107** (drift) · **109** (sample quality + coverage + fairness in GenAI)
