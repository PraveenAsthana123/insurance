# Supplier Scorecard Methodology

The supplier score is a single composite number from 0 to 100 that aggregates three weak signals into one comparable metric. It drives the ranked list on the Supplier Scorecard tab and is the number cited by the Ask-AI narrative when a user asks "why is supplier X low?".

## Weighting

```
score = 0.40 × defect_score + 0.30 × lead_time_score + 0.30 × inspection_score
```

The 40 / 30 / 30 weighting prioritises product-quality (defect) over speed (lead-time) over paper-compliance (inspection). Defect dominates because downstream rework, returns and customer-trust damage typically exceed the revenue impact of a one-week lead-time miss.

## Defect sub-score

Defect rate is the average quality-reject percentage observed across all shipments from the supplier, read from `dim_sku.defect_rate` via `fact_shipment`.

```
defect_score = max(0, 100 − defect_rate_pct × 20)
```

- 0% defect → score 100 (best).
- 2.5% defect → score 50.
- 5% defect → score 0 (linear floor).

Most acceptable BEV suppliers operate in the 0.5% – 3.0% band.

## Lead-time sub-score

Manufacturing lead time is measured in days from PO placement to ship-ready:

```
lead_time_score = max(0, 100 − lead_time_days × 1.5)
```

- 20 days → 70.
- 30 days → 55.
- 60 days → 10.

This penalises suppliers whose manufacturing cycle eats into the safety-stock window. When a supplier's lead time exceeds the category's safety-stock cover, a re-source review is recommended.

## Inspection sub-score

Inspection results are tri-state and contribute a flat value:

| Result | Points |
|--------|--------|
| **Pass** | 100 |
| **Pending** | 50 |
| **Fail** | 0 |

Pending is interpreted as "documentation-only risk" — not a quality failure but an open audit item. Fail requires immediate compliance review and a 100% inspection hold on the next three shipments.

## Interpretation bands

Scores are binned into three operational tiers:

- **Green (score > 70).** Healthy. Continue current volume, expand share-of-wallet opportunistically.
- **Amber (40 – 70).** Watch-list. Review monthly; add a secondary supplier if the SKU carries a high-stockout-risk signal.
- **Red (< 40).** Escalate. Trigger a corrective-action plan with the supplier and accelerate the re-source roadmap. A red score on a single-sourced SKU is a top-3 operational risk.

## Update cadence

Scores refresh on every Supplier Scorecard page load using the live `fact_shipment` + `dim_sku` snapshot. There is no cache; the AI Explain narrative always cites the current score that the user sees on screen.
