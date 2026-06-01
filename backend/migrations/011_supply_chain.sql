-- 011_supply_chain.sql — Supply Chain Analysis canonical schema for Phase 2a-2
-- Idempotent: safe to run multiple times.

BEGIN;

CREATE TABLE IF NOT EXISTS dim_sku (
    sku_id                       TEXT PRIMARY KEY,
    product_type                 TEXT,
    product_category             TEXT,
    sku_number                   INTEGER,
    price                        NUMERIC(10, 2),
    availability                 INTEGER,
    stock_levels                 INTEGER,
    lead_time_days               INTEGER,
    shipping_time                INTEGER,
    defect_rate                  NUMERIC(6, 4)
);

CREATE TABLE IF NOT EXISTS dim_supplier (
    supplier_id                   TEXT PRIMARY KEY,
    supplier_name                 TEXT,
    location                      TEXT,
    production_volumes            INTEGER,
    manufacturing_lead_time_days  INTEGER,
    manufacturing_costs           NUMERIC(10, 2),
    inspection_results            TEXT
);

CREATE TABLE IF NOT EXISTS dim_customer (
    customer_id                  TEXT PRIMARY KEY,
    demographics                 TEXT
);

CREATE TABLE IF NOT EXISTS fact_shipment (
    shipment_id             SERIAL PRIMARY KEY,
    sku_id                  TEXT REFERENCES dim_sku(sku_id),
    supplier_id             TEXT REFERENCES dim_supplier(supplier_id),
    customer_id             TEXT REFERENCES dim_customer(customer_id),
    order_quantity          INTEGER,
    number_of_products_sold INTEGER,
    revenue_generated       NUMERIC(12, 2),
    shipping_carrier        TEXT,
    shipping_cost           NUMERIC(10, 2),
    transportation_mode     TEXT,
    route                   TEXT,
    costs                   NUMERIC(10, 2)
);

CREATE INDEX IF NOT EXISTS idx_fact_shipment_sku      ON fact_shipment(sku_id);
CREATE INDEX IF NOT EXISTS idx_fact_shipment_supplier ON fact_shipment(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fact_shipment_mode     ON fact_shipment(transportation_mode);

COMMIT;
