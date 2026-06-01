# Phase 3 — Filtering + Preprocessing

> **DB ID:** 203 · **Owner:** Signal Engineer · **Family:** `ml_methodology`
>
> **Core question:** *Has noise been removed without erasing the signal?*

## Why this phase

Aggressive preprocessing destroys neural signal. Lazy preprocessing
trains the model on power-line hum and eye-blinks. The recipe lives
on a narrow ridge between these failure modes; documenting the
recipe is what makes the ridge defensible at audit.

## Steps

| Step | What you do | Practical defaults | Do's | Don'ts | Output | Quality gate (KPI) | Edge cases + fix |
|---|---|---|---|---|---|---|---|
| 1 | **Raw sanity checks** — verify signal looks like EEG before any filtering | Plot 10–30s per channel · PSD overview · check clipping/saturation | Catch bad files early | Preprocess blindly | QC notebook + flags | % files passing QC | Flatline / clipped channel → drop channel or segment |
| 2 | **Unit + scaling standard** — ensure consistent units | Convert to µV if needed · float32 datatype | Normalize units across datasets/devices | Mixing µV / mV | Standardization note in Data Card | Unit consistency check passes | Unknown units → infer from amplitude ranges + document |
| 3 | **Re-referencing** — pick a reference scheme | Common Average Reference (CAR) · linked mastoids · Cz reference | Keep reference consistent across all data | Changing reference per experiment without tracking | `reference_config.yaml` | Stable PSD + reduced common noise | Few channels → CAR may hurt; use device ref |
| 4 | **Notch filter (mains)** — remove powerline interference | 50 Hz or 60 Hz notch · optional harmonics | Confirm mains frequency from location/device | Notch too wide (kills brain bands) | Notch-applied signals | Reduced 50/60 peak in PSD | Strong harmonics → add 2nd notch (120 Hz) if Fs supports |
| 5 | **Bandpass filter** — keep physiological bands, remove drift/EMG | General: 0.5–45 Hz · Emotion: 1–40 Hz · High-γ: 0.1–70 Hz | Pick cutoffs based on task + Fs | Using 0–Nyquist without reason | Bandpass-applied signals | Drift reduced + bands preserved | Epilepsy spikes / high-freq → extend upper cutoff carefully |
| 6 | **Anti-alias before resample** — protect spectrum when downsampling | Lowpass at new-Nyquist margin | **Always** filter before downsampling | Downsampling raw signals | Resampled clean data | No aliasing artifacts in PSD | Resample mismatch across datasets → consistent bandpass first |
| 7 | **Artifact detection (segment-level)** — find contaminated windows | Amplitude threshold · kurtosis · peak-to-peak · channel variance · SQI score | Reject/mark artifacts instead of hiding | Deleting lots of data without reporting | Artifact mask + report | % windows rejected reported | Too many rejects → loosen thresholds + robust modeling |
| 8 | **Artifact removal (channel / ICA / ASR)** — reduce eye-blink, EMG, motion | ICA (EOG removal) · ASR · EOG regression | Apply consistently and log parameters | Over-cleaning (removes neural signal) | Cleaned signals + component logs | Improved SNR proxy + stable band power | No EOG channels → ICA heuristics + conservative removal |
| 9 | **Baseline correction (task-based)** — adjust relative to baseline | Subtract pre-stimulus mean · z-score vs baseline segment | Use only within-subject/session stats | Using test-set baseline stats | Baseline-corrected epochs | Reduced between-session bias | No baseline → skip; use session normalization later |
| 10 | **Bad channel handling** — identify + treat bad channels | Flatline detection · low correlation · high noise · interpolate if montage supports | Track dropped / interpolated channels | Quietly filling everything | Bad-channel report | < X% channels repaired | Many bad channels → exclude recording |
| 11 | **Window extraction (post-clean)** — cut fixed windows after preprocessing | Phase-2 window config | Extract after artifact logic finalized | Changing windowing while comparing models | Final windows dataset | Window count stable across reruns | Event boundary leakage → use buffer (exclude ±t seconds) |
| 12 | **Preprocessing reproducibility** — deterministic + logged pipeline | Config files · fixed filter order · ICA seed · versioned code | Store every parameter | "Manual tweaks" | Preproc config + pipeline script | Same input → same output hash | Library differences → pin versions + export filter coefficients |

## Recommended default recipes (pick one)

| Use case | Minimal safe recipe | Notes |
|---|---|---|
| **Emotion / stress EEG** | Re-ref (CAR) → notch 60 → bandpass 1–40 → artifact mark (threshold + SQI) | Stable, reproducible, reviewer-friendly |
| **Motor imagery (BCI)** | Re-ref → notch 60 → bandpass 8–30 (mu/beta) + 0.5–45 for general → epoch | Often benefit from band-specific features |
| **Clinical seizure event support** | Re-ref → notch → bandpass 0.5–70 (if Fs supports) → careful artifact labeling | Avoid aggressive cleaning that may remove spikes |

## Phase deliverables (minimum)

- [ ] QC notebook + flags
- [ ] Standardization note in Data Card
- [ ] `reference_config.yaml`
- [ ] Notch + bandpass parameter spec
- [ ] Artifact detection mask + rejection report
- [ ] Artifact removal logs (ICA components, ASR parameters)
- [ ] Bad-channel report
- [ ] Final windows dataset (post-clean, post-extraction)
- [ ] Preprocessing config + pipeline script (deterministic)
- [ ] Output hash matches across reruns

## Composes with

- **§106 Lifecycle Management** — preprocessing is a lifecycle stage in the registry
- **§110 Debug** — every preprocessing step must be reproducible from config
- **§111 Portability** — filter coefficients exported (cross-environment portability)
- **§57.6** — every preproc operation logs request_id + tenant_id (if multi-tenant)
- **AI assurance horizontal** — [`evaluation_metrics.md`](../ai_assurance/evaluation_metrics.md) §4 row 2 (Statistical fidelity) + row 6 (Spectral) measure whether preprocessing preserved signal
