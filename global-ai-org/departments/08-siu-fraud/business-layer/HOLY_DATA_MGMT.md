# HOLY_DATA_MGMT.md · Dept 8 · SIU / Fraud Investigation

> Generated scaffold per §64.17 · per process · per sub-process.

## Per-process data surfaces (6 mandatory per §64.17)

### Process 1.0 · TODO

1. **Input data sources**
   - Producer / endpoint / format / schema version / SLA / retention
   - TODO
2. **Input data contract**
   - Required fields · types · value ranges · null policy · idempotency key
   - TODO
3. **Data quality rules**
   - Per field: must-be-present / unique / regex / range
   - TODO
4. **Data lineage**
   - Source → ingestion → cleaned → feature → model graph
   - TODO
5. **Before-process visualization** (per §64.17)
   - Raw EDA: target distribution · numeric histograms · correlation heatmap · missing matrix · outlier scan
   - Saved at `plots/before_*.png`
6. **After-process visualization**
   - Cleaned · imputed · scaled · feature-engineered equivalents
   - Saved at `plots/after_*.png`
   - Side-by-side with Before in PipelineOutput.jsx

Composes with §38.3 · §39 · §43 · §64.17 · §74 · §75 · §76 · §87.
