# Sales KPI Definitions

## Revenue

- **Gross revenue** = Σ (sales × unit_price). In Rossmann this is already dollar-denominated.
- **Net revenue** = Gross − Returns − Trade Spend.
- **YoY growth %** = (current_period − same_period_prior_year) / same_period_prior_year.

## Forecast accuracy

- **MAPE** (Mean Absolute Percentage Error) = mean(|actual − forecast| / actual). Lower is better. Under 15% is considered good for daily retail sales.
- **Forecast bias** = mean(forecast − actual). Positive = over-forecast. Should be close to zero.
- **Forecast stability** = |MAPE_this_week − MAPE_last_week|.

## Pipeline

- **Win rate** = closed_won_deals / total_closed. BEV equivalent is new-distribution retention.
- **Deal cycle days** = mean(close_date − open_date). Shorter cycles usually indicate healthier pipeline.
- **Pipeline coverage ratio** = open_pipeline / quota. 3× or higher is healthy.

## Operational

- **Promo uplift %** = (revenue_with_promo − baseline) / baseline. 20–35% typical for short promos.
- **Lost-sale rate** = closed_days / total_days. Extended closures erode annual revenue.
- **Anomaly rate** = anomalies / store-days. A rising rate indicates data quality or external disruption.
