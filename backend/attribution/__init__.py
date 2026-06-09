"""Multi-touch attribution module · T5.9.

Per docs/PENDING_PLAN.md T5.9. Assigns revenue credit across the customer
journey (touchpoint sequence) using 5 industry-standard attribution
models. Reads from existing marketing_campaign_runs without requiring
new instrumentation.

Per §57.7: uses outcome_score as a revenue proxy (operator can wire real
revenue later via a 'value_per_outcome' column).
"""
