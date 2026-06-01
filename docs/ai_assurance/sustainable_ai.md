# Sustainable / Green AI (Framework 108)

> **Core question:** What is the energy, carbon, and resource footprint — and is it controlled?
>
> **Owner:** FinOps / Sustainability · **Family:** `ai_assurance` · **DB ID:** 108

## Why this framework

Token-spend is a stand-in for energy-spend. A 1B-token-per-day RAG
pipeline is not just a $X budget line — it's a watt-hour load, a
carbon footprint, and (increasingly) a regulatory disclosure. This
framework brings the FinOps + ESG conversation onto the same surface
as the SRE + RAI conversations.

## Modules (18+)

Live source is `analysis_module WHERE phase_id=108`. Typical modules:
tokens-per-request budget, cost-per-request budget, GPU hour
utilization, prompt-cache hit-rate (savings %), response-cache hit-
rate (savings %), model-routing (small model for easy queries),
batch / streaming switch, idle-pool sizing, region selection
(carbon-aware), embedding-recompute frequency, vector-DB shard
density, retraining cadence vs marginal accuracy gain, hardware
refresh cycle, vendor PUE disclosure, ESG report inputs.

## Required outputs (per release)

- Per-model token + cost dashboard (per §41.1)
- Carbon-equivalent calculation per request (one of: CodeCarbon, MLCO2)
- Cache-savings tile in §68 hub
- Quarterly ESG-disclosure inputs
- Cost-anomaly alert routing

## Composes with

- §41.1 (Cost / FinOps policy — this framework is its assurance layer)
- §47.10 (5-phase load testing — phase 4 soak surfaces cost drift)
- §53.36 (capacity planning — sustainability lens)
- §68.10 (cost eval surface)
- §64.42 (testing matrix — cost-governance row)
