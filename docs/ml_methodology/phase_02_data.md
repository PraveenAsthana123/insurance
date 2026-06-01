# Phase 2 — Data Acquisition + Dataset Design

> **DB ID:** 202 · **Owner:** Data Engineering · **Family:** `ml_methodology`
>
> **Core question:** *Is the data inventory complete, labelled, and split-safe?*

## Why this phase

If Phase 1 says *what* we are deciding, Phase 2 says *what we are
deciding it on*. Most downstream "the model doesn't work" surprises
trace to Phase 2 shortcuts — silent montage mismatch, undocumented
label rules, random-window split — that look harmless until
validation collapses.

## Steps

| Step | What you do | Best-practice options | Do's | Don'ts | Output | Quality gate (KPI) | Edge cases + fix |
|---|---|---|---|---|---|---|---|
| 1 | **Data source selection** — 1 primary + 1 benchmark dataset | DEAP / SEED (emotion) · PhysioNet (clinical) · BCI Comp (MI) · own device | Match label + task | Mixing 4–5 datasets at start | Data source decision log | Dataset supports label + enough subjects | Different montages → map to common channel set |
| 2 | **Ground truth + label rules** — define label creation rules | Event labels (seizure) · stimulus labels (emotion) · self-report · clinician | Write label rules like a contract | "Label = whatever file says" | Label rulebook v1 | Inter-rater agreement or consistency checks | Noisy self-report → binning + smoothing + calibration |
| 3 | **Subject + session metadata** — metadata table per recording | Subject ID · session ID · age group · device · montage · Fs · task · timestamps | Metadata is first-class data | Storing without unique IDs | `metadata.csv` / parquet | 100% records have subject+session IDs | Missing fields → "unknown" + track gaps |
| 4 | **Inclusion / exclusion criteria** — what recordings are valid | Min duration · min channels · artifact tolerance · signal-quality threshold | Define before modeling | Cherry-picking after results | Data QC policy | % kept vs dropped reported | Too strict → soften thresholds + add robustness |
| 5 | **Harmonize sampling rate** — standard Fs for model input | Resample to 128 / 256 / 512 Hz | Resample **after** anti-alias filter | Resampling raw without filtering | Standardized signals | No aliasing (spectral sanity check) | Different Fs → resample + note loss at high freq |
| 6 | **Montage / channel mapping** — align channels across sources | 10–20 mapping · common subset (Fp1/Fp2/F3/F4/C3/C4/P3/P4/O1/O2) | Keep a channel-map table | Training on different channels without handling | Channel mapping spec | ≥ X common channels across datasets | Missing channel → drop or interpolate |
| 7 | **Windowing strategy** — continuous → fixed-size examples | MI: 1–4s · Emotion: 4–8s · Sleep: 8–30s · Overlap 25–75% | Window length must match phenomenon | Tiny windows for slow phenomena | Windowing config | #windows per class balanced | Label timing mismatch → align via timestamps + buffer |
| 8 | **Leakage prevention** — no information leaks train→test | Subject-wise · session-wise · grouped CV by subject | Split before heavy transforms | Random window split across subjects | Split manifest file | 0 subject overlap across splits | Same subject, multiple sessions → keep all in one split |
| 9 | **Class balance planning** — quantify imbalance + tactics | Stratified subject selection · balanced sampling · class weights · focal loss | Report imbalance clearly | Oversampling test set | Class distribution report | Imbalance ratio documented | Extreme imbalance → event-based metrics + PR-AUC |
| 10 | **Dataset versioning** — freeze versions + hashes | Data cards + checksum · DVC · git-lfs · manifest JSON | Make dataset reproducible | "I edited the files manually" | Dataset v1 package | Hashes match across machines | Updates needed → new version (v1.1) not overwrite |
| 11 | **Baseline-ready format** — standardize file structure | `.npz` / `.parquet` with X, y, meta · or HDF5 | Consistent schema | Ad-hoc naming per experiment | Dataset loader + schema | Loader passes unit tests | Multi-dataset schema mismatch → adapter layer |
| 12 | **Data documentation** — Data Card for transparency | Source · consent · demographics · known biases · label creation | Document limitations early | Hiding data issues | Data Card v1 | Completeness checklist | Missing demographics → note explicitly; avoid claims |

## Phase deliverables (minimum)

- [ ] Data source decision log
- [ ] Label rulebook v1
- [ ] `metadata.csv` with subject + session IDs covering 100% of records
- [ ] Data QC policy (inclusion / exclusion criteria documented)
- [ ] Standardized signals (consistent Fs + anti-aliased)
- [ ] Channel mapping specification
- [ ] Windowing configuration
- [ ] Split manifest file (subject-wise / LOSO with 0 leakage)
- [ ] Class distribution report
- [ ] Dataset v1 package with hashes
- [ ] Dataset loader + schema (unit-tested)
- [ ] Data Card v1

## Composes with

- **§104 Accountable** — data owner per source
- **§105 Auditable** — dataset versioning + hashes
- **§108 Sustainable** — cost of acquisition + retention budget
- **§64.32** — per-dept security tab covers PII/consent flags
- **AI assurance horizontal** — [`data_governance.md`](../ai_assurance/data_governance.md) defines redaction + retention; this phase produces the artefacts that doc requires
