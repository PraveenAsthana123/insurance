-- 012_customer_pilot.sql — Customer Analytics pilot schema (IBM Telco Churn).
-- Part of the "depth pilot" — only the customer department gets deeper modeling.
-- Idempotent: safe to re-run.

BEGIN;

-- ── dim_customer_pilot ────────────────────────────────────────────────────────
-- One row per customer. Named _pilot to avoid collision with the Supply-Chain
-- dim_customer table (which holds unrelated demographics data).
CREATE TABLE IF NOT EXISTS dim_customer_pilot (
    customer_id           VARCHAR(32) PRIMARY KEY,
    gender                VARCHAR(8),
    senior_citizen        BOOLEAN NOT NULL DEFAULT FALSE,
    partner               BOOLEAN NOT NULL DEFAULT FALSE,
    dependents            BOOLEAN NOT NULL DEFAULT FALSE,
    tenure_months         INTEGER NOT NULL,
    monthly_charges       NUMERIC(10, 2) NOT NULL,
    total_charges         NUMERIC(12, 2),
    contract_type         VARCHAR(32),           -- Month-to-month | One year | Two year
    payment_method        VARCHAR(48),
    paperless_billing     BOOLEAN NOT NULL DEFAULT FALSE,
    internet_service      VARCHAR(32),           -- DSL | Fiber optic | No
    phone_service         BOOLEAN NOT NULL DEFAULT FALSE,
    multiple_lines        VARCHAR(32),
    service_count         SMALLINT NOT NULL DEFAULT 0
);

-- ── fact_customer_interaction ────────────────────────────────────────────────
-- One row per (customer_id, service); captures which add-ons are subscribed.
CREATE TABLE IF NOT EXISTS fact_customer_interaction (
    customer_id   VARCHAR(32) NOT NULL REFERENCES dim_customer_pilot(customer_id),
    service_name  VARCHAR(32) NOT NULL,
    status        VARCHAR(32) NOT NULL,          -- Yes | No | No internet service | No phone service
    PRIMARY KEY (customer_id, service_name)
);

-- ── fact_churn_label ──────────────────────────────────────────────────────────
-- Ground-truth label from Telco dataset + optional predicted score (filled
-- in by churn_model_service after training).
CREATE TABLE IF NOT EXISTS fact_churn_label (
    customer_id            VARCHAR(32) PRIMARY KEY REFERENCES dim_customer_pilot(customer_id),
    churned                BOOLEAN NOT NULL,
    predicted_probability  NUMERIC(5, 4),        -- 0.0000–1.0000; NULL until model runs
    model_version          VARCHAR(32),
    scored_at              TIMESTAMPTZ
);

-- Indexes for typical query patterns: segment lookup, tenure slicing, high-risk sort.
CREATE INDEX IF NOT EXISTS idx_dim_customer_pilot_contract
    ON dim_customer_pilot(contract_type);
CREATE INDEX IF NOT EXISTS idx_dim_customer_pilot_tenure
    ON dim_customer_pilot(tenure_months);
CREATE INDEX IF NOT EXISTS idx_dim_customer_pilot_monthly_charges
    ON dim_customer_pilot(monthly_charges);
CREATE INDEX IF NOT EXISTS idx_fact_churn_label_churned
    ON fact_churn_label(churned);
CREATE INDEX IF NOT EXISTS idx_fact_churn_label_predicted
    ON fact_churn_label(predicted_probability DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_fact_customer_interaction_service
    ON fact_customer_interaction(service_name, status);

COMMIT;
