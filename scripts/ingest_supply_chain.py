#!/usr/bin/env python
"""ingest_supply_chain.py — load Supply Chain Analysis CSV into canonical star schema.

Idempotent: TRUNCATEs targets before COPY.
Usage:  python scripts/ingest_supply_chain.py [--dir PATH]

CSV column adaptation notes (see docs/superpowers/plans/2026-04-19-supply-chain-alpha-data.md):
  - The harshsingh2209/supply-chain-analysis dataset has no `SKU number` column.
    We derive the integer sku_number from the `SKU` string (e.g. "SKU0" -> 0),
    falling back to the row index.
  - There is no `Product category` column either. We reuse `Product type` for
    both `product_type` and `product_category` in dim_sku (canonical demo value).
  - All other column names in the plan match the CSV verbatim.
"""
from __future__ import annotations

import argparse
import csv
import logging
import os
import re
import sys
from io import StringIO
from pathlib import Path

import psycopg

logger = logging.getLogger("ingest_supply_chain")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _pg_dsn() -> str:
    # Per Phase 2.3 of docs/AUDIT_FIX_PLAN.md — no hardcoded password fallback.
    pwd = os.environ.get("BEV_POSTGRES_PASSWORD")
    if not pwd:
        raise RuntimeError(
            "BEV_POSTGRES_PASSWORD env var is required. "
            "Set it in .env or shell before running this script."
        )
    return (
        f"host={os.getenv('BEV_POSTGRES_HOST', 'localhost')} "
        f"port={os.getenv('BEV_POSTGRES_PORT', '5432')} "
        f"dbname={os.getenv('BEV_POSTGRES_DB', 'insur_analytics')} "
        f"user={os.getenv('BEV_POSTGRES_USER', 'insur_user')} "
        f"password={pwd}"
    )


def _parse_csv(path: Path) -> list[dict]:
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def _extract_sku_number(sku_value: str | None, fallback: int) -> int:
    """Parse trailing digits from a SKU string like 'SKU0' -> 0. Fallback if missing."""
    if not sku_value:
        return fallback
    m = re.search(r"(\d+)$", sku_value)
    return int(m.group(1)) if m else fallback


def _upsert_rows(cur, table: str, cols: list[str], rows: list[tuple]) -> int:
    """Bulk-load via COPY. Dedupes rows by first column (primary key)."""
    seen = set()
    unique = []
    for r in rows:
        pk = r[0]
        if pk in seen:
            continue
        seen.add(pk)
        unique.append(r)

    buf = StringIO()
    writer = csv.writer(buf)
    for r in unique:
        writer.writerow([v if v is not None else "" for v in r])
    buf.seek(0)
    with cur.copy(f"COPY {table} ({', '.join(cols)}) FROM STDIN WITH (FORMAT csv, NULL '')") as copy:
        for line in buf:
            copy.write(line)
    return len(unique)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--dir",
        type=Path,
        default=Path(os.getenv("SUPPLY_CHAIN_DIR", "data/kaggle/supply-chain")),
    )
    args = ap.parse_args()

    csv_path = args.dir / "supply_chain_data.csv"
    if not csv_path.exists():
        logger.error("missing %s — run scripts/download_supply_chain.sh first", csv_path)
        return 2

    rows = _parse_csv(csv_path)
    logger.info("read %d rows from %s", len(rows), csv_path)
    logger.info("columns: %s", list(rows[0].keys()) if rows else "(empty)")

    with psycopg.connect(_pg_dsn()) as conn:
        with conn.cursor() as cur:
            logger.info("truncating targets")
            cur.execute("TRUNCATE fact_shipment, dim_customer, dim_supplier, dim_sku CASCADE")

            # --- dim_sku ---
            sku_rows = [
                (
                    r.get("SKU") or f"SKU-{i}",
                    r.get("Product type"),
                    r.get("Product type"),   # category reused (no separate column)
                    _extract_sku_number(r.get("SKU"), i),
                    float(r["Price"]) if r.get("Price") else None,
                    int(r["Availability"]) if r.get("Availability") else None,
                    int(r["Stock levels"]) if r.get("Stock levels") else None,
                    int(float(r["Lead times"])) if r.get("Lead times") else None,
                    int(r["Shipping times"]) if r.get("Shipping times") else None,
                    float(r["Defect rates"]) if r.get("Defect rates") else None,
                )
                for i, r in enumerate(rows)
            ]
            n = _upsert_rows(
                cur, "dim_sku",
                ["sku_id", "product_type", "product_category", "sku_number", "price",
                 "availability", "stock_levels", "lead_time_days", "shipping_time", "defect_rate"],
                sku_rows,
            )
            logger.info("  dim_sku: %d rows", n)

            # --- dim_supplier ---
            supplier_rows = [
                (
                    r.get("Supplier name") or f"SUP-{i}",
                    r.get("Supplier name"),
                    r.get("Location"),
                    int(r["Production volumes"]) if r.get("Production volumes") else None,
                    int(float(r["Manufacturing lead time"])) if r.get("Manufacturing lead time") else None,
                    float(r["Manufacturing costs"]) if r.get("Manufacturing costs") else None,
                    r.get("Inspection results"),
                )
                for i, r in enumerate(rows)
            ]
            n = _upsert_rows(
                cur, "dim_supplier",
                ["supplier_id", "supplier_name", "location", "production_volumes",
                 "manufacturing_lead_time_days", "manufacturing_costs", "inspection_results"],
                supplier_rows,
            )
            logger.info("  dim_supplier: %d rows", n)

            # --- dim_customer ---
            customer_rows = [
                (f"CUST-{i}", r.get("Customer demographics"))
                for i, r in enumerate(rows)
            ]
            n = _upsert_rows(
                cur, "dim_customer",
                ["customer_id", "demographics"],
                customer_rows,
            )
            logger.info("  dim_customer: %d rows", n)

            # --- fact_shipment ---
            fact_rows = []
            for i, r in enumerate(rows):
                fact_rows.append((
                    r.get("SKU") or f"SKU-{i}",
                    r.get("Supplier name") or f"SUP-{i}",
                    f"CUST-{i}",
                    int(r["Order quantities"]) if r.get("Order quantities") else None,
                    int(r["Number of products sold"]) if r.get("Number of products sold") else None,
                    float(r["Revenue generated"]) if r.get("Revenue generated") else None,
                    r.get("Shipping carriers"),
                    float(r["Shipping costs"]) if r.get("Shipping costs") else None,
                    r.get("Transportation modes"),
                    r.get("Routes"),
                    float(r["Costs"]) if r.get("Costs") else None,
                ))
            # NOTE: fact_shipment has a SERIAL pk so we insert without shipment_id;
            # the unique-check in _upsert_rows uses the first column, so we bypass it.
            buf = StringIO()
            writer = csv.writer(buf)
            for fr in fact_rows:
                writer.writerow([v if v is not None else "" for v in fr])
            buf.seek(0)
            with cur.copy(
                "COPY fact_shipment (sku_id, supplier_id, customer_id, order_quantity, "
                "number_of_products_sold, revenue_generated, shipping_carrier, shipping_cost, "
                "transportation_mode, route, costs) FROM STDIN WITH (FORMAT csv, NULL '')"
            ) as copy:
                for line in buf:
                    copy.write(line)
            logger.info("  fact_shipment: %d rows", len(fact_rows))

        conn.commit()
    logger.info("ingestion complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
