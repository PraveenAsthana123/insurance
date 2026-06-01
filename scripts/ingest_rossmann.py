#!/usr/bin/env python
"""ingest_rossmann.py — transform Rossmann CSVs into canonical star schema.

Reads from $ROSSMANN_DIR (default data/kaggle/rossmann/), loads:
  store.csv    -> dim_store (1115 rows)
  train.csv    -> dim_date + fact_sales (~1.017M rows)

Idempotent: TRUNCATEs target tables before COPY.

Usage:
  python scripts/ingest_rossmann.py [--dir PATH] [--limit N]
"""
from __future__ import annotations

import argparse
import csv
import logging
import os
import sys
from datetime import date as date_cls
from io import StringIO
from pathlib import Path
from typing import Iterable

import psycopg

logger = logging.getLogger("ingest_rossmann")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _pg_dsn_from_env() -> str:
    host = os.getenv("BEV_POSTGRES_HOST", "localhost")
    port = os.getenv("BEV_POSTGRES_PORT", "5432")
    db = os.getenv("BEV_POSTGRES_DB", "insur_analytics")
    user = os.getenv("BEV_POSTGRES_USER", "insur_user")
    pwd = os.getenv("BEV_POSTGRES_PASSWORD", "insur_secret_password")
    return f"host={host} port={port} dbname={db} user={user} password={pwd}"


def _read_store_csv(path: Path) -> Iterable[tuple]:
    with path.open() as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield (
                int(row["Store"]),
                row["StoreType"],
                row["Assortment"],
                float(row["CompetitionDistance"]) if row["CompetitionDistance"] else None,
                int(row["CompetitionOpenSinceMonth"]) if row["CompetitionOpenSinceMonth"] else None,
                int(row["CompetitionOpenSinceYear"]) if row["CompetitionOpenSinceYear"] else None,
                row["Promo2"] == "1",
                int(row["Promo2SinceWeek"]) if row["Promo2SinceWeek"] else None,
                int(row["Promo2SinceYear"]) if row["Promo2SinceYear"] else None,
                row["PromoInterval"] or None,
            )


def _read_train_csv(path: Path, limit: int | None = None) -> Iterable[tuple]:
    """Yield (dim_date_row, fact_sales_row); dim_date is deduped downstream."""
    with path.open() as f:
        reader = csv.DictReader(f)
        count = 0
        for row in reader:
            if limit is not None and count >= limit:
                break
            d = date_cls.fromisoformat(row["Date"])
            yield (
                d,
                int(row["DayOfWeek"]),
                row["SchoolHoliday"] == "1",
                row["StateHoliday"] if row["StateHoliday"] in ("a", "b", "c") else "0",
            ), (
                int(row["Store"]),
                d,
                int(row["Sales"]),
                int(row["Customers"]),
                row["Open"] == "1",
                row["Promo"] == "1",
            )
            count += 1


def _copy_rows(cur, table: str, cols: list[str], rows: Iterable[tuple]) -> int:
    """Bulk-load rows via COPY. Returns row count."""
    buf = StringIO()
    writer = csv.writer(buf, quoting=csv.QUOTE_MINIMAL)
    n = 0
    for row in rows:
        writer.writerow([r if r is not None else "" for r in row])
        n += 1
    buf.seek(0)
    copy_sql = f"COPY {table} ({', '.join(cols)}) FROM STDIN WITH (FORMAT csv, NULL '')"
    with cur.copy(copy_sql) as copy:
        for line in buf:
            copy.write(line)
    return n


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", type=Path, default=Path(os.getenv("ROSSMANN_DIR", "data/kaggle/rossmann")))
    ap.add_argument("--limit", type=int, default=None, help="limit fact_sales rows (for testing)")
    args = ap.parse_args()

    store_csv = args.dir / "store.csv"
    train_csv = args.dir / "train.csv"
    for f in (store_csv, train_csv):
        if not f.exists():
            logger.error("missing %s — run scripts/download_rossmann.sh first", f)
            return 2

    logger.info("connecting to postgres")
    with psycopg.connect(_pg_dsn_from_env()) as conn:
        with conn.cursor() as cur:
            logger.info("truncating target tables (cascade)")
            cur.execute("TRUNCATE fact_sales, dim_date, dim_store CASCADE")

            logger.info("loading dim_store")
            store_cols = [
                "store_id", "store_type", "assortment", "competition_distance",
                "competition_open_since_mo", "competition_open_since_yr",
                "promo2", "promo2_since_week", "promo2_since_year", "promo_interval",
            ]
            n = _copy_rows(cur, "dim_store", store_cols, _read_store_csv(store_csv))
            logger.info("  %d store rows", n)

            logger.info("reading train.csv → dim_date + fact_sales")
            dates_seen: dict[date_cls, tuple] = {}
            fact_rows: list[tuple] = []
            for d_row, f_row in _read_train_csv(train_csv, args.limit):
                dates_seen.setdefault(d_row[0], d_row)
                fact_rows.append(f_row)
            logger.info("  %d unique dates, %d fact rows", len(dates_seen), len(fact_rows))

            dim_date_cols = ["date", "day_of_week", "is_school_holiday", "state_holiday"]
            n = _copy_rows(cur, "dim_date", dim_date_cols, dates_seen.values())
            logger.info("  %d dim_date rows loaded", n)

            fact_cols = ["store_id", "date", "sales", "customers", "open", "promo"]
            n = _copy_rows(cur, "fact_sales", fact_cols, fact_rows)
            logger.info("  %d fact_sales rows loaded", n)

        conn.commit()
    logger.info("ingestion complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
