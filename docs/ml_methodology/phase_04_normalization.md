# Phase 4 — Standardization + Normalization (Leakage-Safe)

> **DB ID:** 204 · **Owner:** ML Engineer · **Family:** `ml_methodology`
>
> **Core question:** *Are statistics computed from train only and applied consistently?*

## Why this phase

Normalization is where 80% of "too-good-to-be-true" results are
born. Fitting a scaler on the whole dataset is silent leakage —
the test-set mean is now hardcoded into the train-side feature
distribution. This phase exists to **lock the scaler before any
validation result is reported**.

## Steps

| Step | What you do | Options | Do's | Don'ts | Output | Quality gate (KPI) | Edge cases + fix |
|---|---|---|---|---|---|---|---|
| 1 | **Decide "what to normalize"** — pick the representation | Raw time-series · bandpower features · STFT/CWT images · embeddings | Normalize **after** splits are defined | Compute global stats using all data | Normalization design note | Split-leakage check = pass | Multi-dataset → normalize per-dataset + document |
| 2 | **Choose normalization scope** — where stats come from | Train-only global · per-subject · per-session · per-window | Default: **train-only global** for generalization | Using test-set mean/std | `norm_stats_train.json` | Reproducible stats hash | Session drift huge → add per-session normalization as ablation |
| 3 | **Time-series scaling** — scale amplitude for model stability | Z-score (mean/std) · robust (median/IQR) · min-max (rare for EEG) | Use **robust scaling** if artifacts remain | Min-max with outliers (destroys scale) | Scaled time-series tensors | Stable training loss | Heavy-tailed noise → robust scaler + artifact mask |
| 4 | **Channel-wise vs sample-wise** — per-channel stats? | Channel-wise z-score (recommended) · global across all channels | Channel-wise for multi-channel EEG | Mixing channels into one scaler | Channel-wise scaler stats | Reduced channel bias | Different montages → scaler per channel only if channels match |
| 5 | **Per-subject normalization (optional)** — reduce subject variability | Normalize within each subject (train subjects only) | Use only for within-subject tasks or adaptation experiments | Using subject normalization that hides real generalization gap | Ablation experiment results | Report change in LOSO performance | If cross-subject deployment → avoid relying on this |
| 6 | **Per-window normalization (careful)** — normalize each window | Subtract window mean · divide by window std | Good for removing slow drift | Can erase amplitude biomarkers | Window-normalized dataset version | Compare with/without in benchmark | If amplitude is predictive → keep raw scale + use drift removal instead |
| 7 | **Log transforms for power features** — stabilize variance | `log10(power + ε)` · dB scaling | Always use ε to avoid log(0) | Logging raw negative values | Feature transform spec | Reduced skewness/kurtosis | Zero/near-zero bins → increase ε and document |
| 8 | **Image normalization (STFT/CWT)** — consistent spectrograms | Per-image min-max (visual) · per-dataset z-score (ML) · per-frequency-bin z-score | For CNN: per-frequency-bin z-score (train-only stats) | Per-image normalization when doing cross-subject clinical metrics only | Normalized TFR images | Improved calibration + stability | Different FFT params → recompute bin-wise stats |
| 9 | **Dataset standardization (multi-source)** — align across devices/datasets | Resample Fs · channel subset · consistent bandpass · consistent window length | Keep a "compatibility layer" | Pretending datasets are identical | Harmonized dataset v1 | Cross-dataset baseline exists | Channel overlap small → montage-agnostic features (Riemannian) |
| 10 | **Leakage-safe statistic computation** — fit on train only | Fit scaler on train split · apply to val/test | Lock the scaler after training split | Re-fitting on val/test | Saved scaler object | Re-run gives identical outputs | If using CV → fit scaler **inside each fold** |
| 11 | **Normalization QA** — prove it behaves correctly | Check mean ≈ 0, std ≈ 1 on train · compare distributions across splits | Track per-channel histograms | Only eyeballing plots | Normalization QA report | No abnormal distribution shift introduced | Weird spikes post-normalization → bad channel not removed; revisit Phase 3 |
| 12 | **Versioned "data views"** — multiple normalized variants | raw · zscore_global · robust_global · per_window · logpower | Name variants clearly | Overwriting files | Dataset registry | Each view reproducible | Confusion → enforce naming convention + manifest |

## Practical defaults (reviewer-friendly)

| Representation | Default normalization | Why it's safe |
|---|---|---|
| Raw time-series → deep model | Channel-wise z-score (train-only) | Stable, minimal leakage risk |
| Bandpower features (θ / α / β / γ) | `log(power + ε)` then z-score (train-only) | Makes features more Gaussian |
| STFT/CWT images | Per-frequency-bin z-score (train-only) | Handles frequency-wise scale differences cleanly |

## Phase deliverables (minimum)

- [ ] Normalization design note (what + scope)
- [ ] `norm_stats_train.json` with reproducible hash
- [ ] Channel-wise scaler stats (saved object)
- [ ] Feature transform spec (log/scaling)
- [ ] Normalization QA report (mean ≈ 0, std ≈ 1 on train)
- [ ] Dataset registry of all named views
- [ ] Re-run identity check (scaler applied gives identical outputs)

## Composes with

- **§105 Auditable** — saved scaler is part of the model bundle
- **§110 Debug** — leakage audit per Phase 11 § validation_playbook.md
- **§111 Portability** — scaler stats survive environment moves
- **AI assurance horizontals** — [`validation_playbook.md`](../ai_assurance/validation_playbook.md) §2 Privacy + §6 Accountability both require this phase's leakage-safety guarantees
- **§43 drill discipline** — `drill_normalization_leakage.py` locks: scaler fit on train only, applied identically to val + test, hash stable across reruns
