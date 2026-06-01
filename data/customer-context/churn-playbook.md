# Customer Churn Playbook

## When to intervene

- **Probability ≥ 0.65 (High Risk)** — intervene within 48 hours. Use a personal outreach (phone or 1-on-1 email) rather than automated nudges. High-risk customers have already started disengaging; they need friction-reducing offers plus empathic listening.
- **Probability 0.40–0.65 (At Risk)** — queue for next-available agent, aim for outreach within 5 business days. Automated first-touch (retention email + feedback survey) works; escalate to human if no response within 72 hours.
- **Probability < 0.40 with short tenure (≤ 6 mo)** — these are "New Adopter" customers. Do NOT send a save-offer yet — send onboarding content. Save-offers early in the lifecycle train customers to expect discounts and actually worsen long-run retention.
- **Probability < 0.40 with tenure ≥ 36 mo** — these are "Loyal High-Value". No intervention needed; monitor only.

## Driver-specific playbooks

- **Month-to-month contract** driver — offer a 1-year upgrade with a small discount (typically 5–8% of monthly charge). Industry benchmarks show ~22% acceptance when paired with a service-quality assurance.
- **High monthly charges (≥ $80)** + short tenure — investigate bill-shock. Many churns driven by this pattern are avoidable with a proactive bill review and plan-right-sizing call.
- **Electronic-check payment** driver — correlates with churn because it's often used by bill-sensitive customers. Offer auto-pay (credit card or bank draft) with a one-time $5 credit; reduces churn ~3 pts.
- **Fiber internet** + short tenure — typically install-experience issues. Follow up with a proactive quality-of-service review call in the first 60 days.

## Industry retention benchmarks

- **Telco / subscription** — annual churn 22–30% is normal. Below 15% indicates above-average retention; above 35% indicates a product-market-fit problem that a retention campaign cannot fix alone.
- **Grocery BEV** — loyalty-defection rate 8–12% annually for branded programs. "Churn" here means a loyalty ID going inactive for > 180 days.
- **SaaS B2B** — 5–7% gross annual churn is best-in-class; 10–15% is typical; > 20% indicates expansion is being cannibalized by contraction.

## Intervention timing by lifecycle stage

- **Onboarding (days 1–30)** — welcome touch, feature-adoption nudge. DO NOT mention churn risk.
- **Adopting (days 31–90)** — first friction-removal outreach if usage plateaus.
- **Established (90+ days, probability < 0.40)** — monitor only; avoid over-touch.
- **At-risk (probability 0.40–0.65)** — save campaign described above.
- **Reactivating (last-active 180+ days, just re-engaged)** — win-back offer with no lock-in; measure 90-day survival.

## Measurement

Retention campaigns must be measured with **matched-pair or uplift modeling**, not naive before/after. A naive test overstates campaign lift by 2–3× because the customers you pick to save are self-selected for higher baseline churn. Use a holdout group of 10% of the high-risk cohort with no treatment, and measure the *incremental* save rate vs holdout.
