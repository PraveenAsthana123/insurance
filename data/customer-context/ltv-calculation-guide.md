# Customer Lifetime Value (CLV) Calculation Guide

## Formulas by business model

- **Subscription (fixed monthly charge)**: `CLV = (ARPU × gross_margin%) / churn_rate`. Simple and good enough when customers pay a predictable monthly amount.
- **Transactional (variable purchases)**: use BG/NBD + Gamma-Gamma. BG/NBD predicts transaction count; Gamma-Gamma predicts average order value. Multiply, discount, done.
- **Freemium with expansion**: separate zero-paying cohort (CLV ≈ 0 but watch conversion rate); for paying cohort use subscription formula with expansion multiplier.

## The BG/NBD model — intuition

- Customers transact according to a Poisson process at their own rate (λ).
- After each transaction, there is a per-customer dropout probability (p).
- Both λ and p are drawn from Beta / Gamma priors fit on the observed population.
- Output: per-customer expected transactions in a future window.

We avoid installing the full `lifetimes` package for the BEV platform and use a simplified heuristic: predicted monthly transactions = last-90-day transactions × 0.92 × (1 - churn_probability).

## Gamma-Gamma — for average order value

- Assumes per-customer average transaction value is independent of transaction frequency (test this before using — a correlation > 0.3 invalidates the model).
- Combines a gamma prior with observed history to predict future average order value.

## 12-month CLV heuristic

```
CLV_12mo = predicted_monthly_tx * avg_order_value * gross_margin_pct * 12 * (1 - discount_rate^12)
```

Where `discount_rate` is the monthly cost of capital (typically 1% for corporate use; 0% is fine for quarterly planning).

## Using CLV in decisions

- **CAC payback target**: typical BEV benchmark is CAC < 1/3 of expected 12-month CLV. If CAC is higher, bid down or abandon the channel.
- **CLV-weighted bidding**: in paid acquisition, bid proportional to predicted CLV by (segment × channel × creative) combination. This beats uniform bidding by 8–15% on blended ROI.
- **Service tiering**: route customers predicted to have high CLV (top-decile) to priority support; the cost is justified by retention lift.

## Common pitfalls

- **Don't project pre-pandemic CLV onto post-pandemic customers** — behavioral-regime change invalidates the training data.
- **Don't include one-time revenue** (bonuses, credits) as if it were recurring.
- **Don't forget COGS** — CLV is a margin number, not a revenue number. Revenue-CLV is a vanity metric; it flatters channels with low-margin products.
- **Don't discount too aggressively** — a 15% monthly discount rate makes long-run contributions nearly worthless, pushing the model to over-emphasize month-1 revenue.

## Validation

Split data into train (first 18 months) and holdout (months 19–24). Predict CLV at month 18; compare to actual revenue in months 19–24. Median absolute percentage error (MedAPE) < 30% is industry typical; < 20% is excellent.
