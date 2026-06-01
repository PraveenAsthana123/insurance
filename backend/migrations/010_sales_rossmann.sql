-- 010_sales_rossmann.sql — Rossmann Store Sales canonical schema for Sales deep-dive
-- Idempotent: safe to run multiple times.

BEGIN;

CREATE TABLE IF NOT EXISTS dim_store (
    store_id                   INTEGER PRIMARY KEY,
    store_type                 CHAR(1) NOT NULL,
    assortment                 CHAR(1) NOT NULL,
    competition_distance       NUMERIC(10, 2),
    competition_open_since_mo  SMALLINT,
    competition_open_since_yr  INTEGER,
    promo2                     BOOLEAN NOT NULL DEFAULT FALSE,
    promo2_since_week          SMALLINT,
    promo2_since_year          INTEGER,
    promo_interval             VARCHAR(32)
);

CREATE TABLE IF NOT EXISTS dim_date (
    date               DATE PRIMARY KEY,
    day_of_week        SMALLINT NOT NULL,           -- 1=Mon .. 7=Sun
    is_school_holiday  BOOLEAN NOT NULL DEFAULT FALSE,
    state_holiday      CHAR(1) NOT NULL DEFAULT '0' -- '0' | 'a' public | 'b' easter | 'c' xmas
);

CREATE TABLE IF NOT EXISTS fact_sales (
    store_id  INTEGER NOT NULL REFERENCES dim_store(store_id),
    date      DATE    NOT NULL REFERENCES dim_date(date),
    sales     INTEGER NOT NULL,
    customers INTEGER NOT NULL,
    open      BOOLEAN NOT NULL,
    promo     BOOLEAN NOT NULL,
    PRIMARY KEY (store_id, date)
);

CREATE INDEX IF NOT EXISTS idx_fact_sales_date       ON fact_sales(date);
CREATE INDEX IF NOT EXISTS idx_fact_sales_store_date ON fact_sales(store_id, date DESC);

COMMIT;
