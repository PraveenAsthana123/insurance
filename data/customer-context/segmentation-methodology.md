# Customer Segmentation Methodology

## When to use which method

- **RFM (Recency, Frequency, Monetary)** — best for transactional e-commerce / grocery. Cheap, explainable, robust. Use when you need segments for campaign targeting but not for behavioral insight.
- **K-means on standardized features** — best for subscription / SaaS. Include tenure, service-count, monthly-charges, contract-type. Validate with silhouette score (target ≥ 0.35 for 4 clusters).
- **Behavioral sequence clustering** — best when the journey matters: which touchpoints, in what order. Use when RFM + K-means produce segments that don't map to business actions.
- **Hierarchical (agglomerative) clustering** — small populations only (< 5k customers). Expensive but lets you see the tree and pick cluster count by eye.

## Canonical 4-segment model (K-means on {tenure, monthly_charges, service_count})

We use this 4-segment model as the default for the Telco-style analytics because it maps cleanly to retention action:

1. **At-Risk** — short tenure (median < 12 mo), high monthly charges (> $75), few add-on services. Highest churn rate (> 40%). Needs friction-reduction outreach.
2. **Loyal High-Value** — long tenure (median > 36 mo), high charges, many services. Low churn (< 10%). Monitor-only; overcontact backfires.
3. **New Adopter** — short tenure (median < 6 mo), any price, few services. Churn rate 25–35%. Needs onboarding, NOT save-offers.
4. **Stable** — medium tenure (12–36 mo), moderate charges, 2–4 services. Churn rate 15–20%. Automated retention cadence only.

## Segment boundary stability

Segment definitions drift. Re-run the clusterer monthly and measure the **Jaccard overlap** between last-month and this-month's segments on the same customers. If overlap drops below 0.80, freeze segment IDs for campaigns and trigger a manual review before updating definitions.

## Migration patterns (healthy vs unhealthy)

- **New Adopter → Stable** within 90 days — healthy conversion; the onboarding is working.
- **New Adopter → At-Risk** within 90 days — unhealthy; investigate first-touch UX.
- **Stable → Loyal High-Value** over 24 mo — healthy deepening; value is being realized.
- **Loyal High-Value → At-Risk** — very unhealthy; usually indicates a product quality incident. Always investigate the common ticket drivers in this flow.

## Common mistakes

- **Using too many segments** — above 8, marketers can't action them. Start with 4; split only when a segment has two clearly different playbooks.
- **Scaling by raw values** — K-means on unscaled features will be dominated by whichever has the largest variance (usually monthly charges). Always standardize.
- **Confusing segments with personas** — segments are mathematical; personas are narrative. A segment is "high-spend, short-tenure"; a persona is "Alex, the bill-shocked early switcher". Keep both, never conflate.

## Validation metrics

- **Silhouette score** — intra-cluster cohesion vs inter-cluster separation. > 0.35 acceptable for 4 clusters on mixed numeric features.
- **Segment-action correlation** — do churn/CLV/NPS differ meaningfully between segments? A segmentation with p-value > 0.05 across your key outcome is useless for decisions.
- **Migration stability month-over-month** — measured as described above; should stay > 0.80.
