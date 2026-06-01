#!/usr/bin/env python
"""ingest_customer_telco.py — load IBM Telco Churn CSV into customer-pilot star schema.

Part of the Customer Analytics depth-pilot. Mirrors ingest_rossmann.py /
ingest_supply_chain.py pattern (TRUNCATE + COPY, idempotent).

Reads from $TELCO_DIR (default data/customer-analytics/), loads:
  WA_Fn-UseC_-Telco-Customer-Churn.csv  -> dim_customer_pilot (~7043 rows)
                                         + fact_customer_interaction (~42k rows)
                                         + fact_churn_label       (~7043 rows)

Usage:
  python scripts/ingest_customer_telco.py [--dir PATH] [--limit N]

CSV column adaptation notes:
  - customerID, gender, SeniorCitizen (0/1), Partner/Dependents (Yes/No),
    tenure, MonthlyCharges, TotalCharges (may be blank), Contract,
    PaymentMethod, PaperlessBilling, InternetService, PhoneService,
    MultipleLines, plus 6 add-on service flags, plus Churn.
  - The 6 add-on services (OnlineSecurity, OnlineBackup, DeviceProtection,
    TechSupport, StreamingTV, StreamingMovies) plus PhoneService become
    rows in fact_customer_interaction. service_count = count of "Yes".
"""
from __future__ import annotations

import argparse
import csv
import logging
import os
import sys
from io import StringIO
from pathlib import Path

import psycopg

logger = logging.getLogger("ingest_customer_telco")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

ADD_ON_SERVICES = [
    "OnlineSecurity",
    "OnlineBackup",
    "DeviceProtection",
    "TechSupport",
    "StreamingTV",
    "StreamingMovies",
]


def _pg_dsn() -> str:
    return (
        f"host={os.getenv('BEV_POSTGRES_HOST', 'localhost')} "
        f"port={os.getenv('BEV_POSTGRES_PORT', '5432')} "
        f"dbname={os.getenv('BEV_POSTGRES_DB', 'insur_analytics')} "
        f"user={os.getenv('BEV_POSTGRES_USER', 'insur_user')} "
        f"password={os.getenv('BEV_POSTGRES_PASSWORD', 'insur_secret_password')}"
    )


def _yn(v: str | None) -> bool:
    return (v or "").strip().lower() == "yes"


def _float_or_none(v: str | None) -> float | None:
    if v is None:
        return None
    s = v.strip()
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _copy_rows(cur, table: str, cols: list[str], rows) -> int:
    buf = StringIO()
    writer = csv.writer(buf, quoting=csv.QUOTE_MINIMAL)
    n = 0
    for row in rows:
        writer.writerow(["" if v is None else v for v in row])
        n += 1
    buf.seek(0)
    copy_sql = f"COPY {table} ({', '.join(cols)}) FROM STDIN WITH (FORMAT csv, NULL '')"
    with cur.copy(copy_sql) as copy:
        for line in buf:
            copy.write(line)
    return n


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--dir",
        type=Path,
        default=Path(os.getenv("TELCO_DIR", "data/customer-analytics")),
    )
    ap.add_argument("--limit", type=int, default=None, help="Limit rows for testing.")
    args = ap.parse_args()

    csv_path = args.dir / "WA_Fn-UseC_-Telco-Customer-Churn.csv"
    if not csv_path.exists():
        logger.error(
            "missing %s — run `kaggle datasets download -d blastchar/telco-customer-churn -p %s --unzip`",
            csv_path, args.dir,
        )
        return 2

    with csv_path.open(newline="") as f:
        rows = list(csv.DictReader(f))
    if args.limit is not None:
        rows = rows[: args.limit]
    logger.info("read %d rows from %s", len(rows), csv_path)
    if rows:
        logger.info("columns: %s", list(rows[0].keys()))

    dim_rows: list[tuple] = []
    interaction_rows: list[tuple] = []
    label_rows: list[tuple] = []
    seen_ids: set[str] = set()

    for r in rows:
        cid = (r.get("customerID") or "").strip()
        if not cid or cid in seen_ids:
            continue
        seen_ids.add(cid)

        # Count how many add-on services the customer has subscribed ("Yes").
        service_count = sum(1 for s in ADD_ON_SERVICES if _yn(r.get(s)))
        if _yn(r.get("PhoneService")):
            service_count += 1

        dim_rows.append((
            cid,
            (r.get("gender") or "").strip() or None,
            (r.get("SeniorCitizen") or "0").strip() == "1",
            _yn(r.get("Partner")),
            _yn(r.get("Dependents")),
            int((r.get("tenure") or "0").strip() or 0),
            _float_or_none(r.get("MonthlyCharges")) or 0.0,
            _float_or_none(r.get("TotalCharges")),
            (r.get("Contract") or "").strip() or None,
            (r.get("PaymentMethod") or "").strip() or None,
            _yn(r.get("PaperlessBilling")),
            (r.get("InternetService") or "").strip() or None,
            _yn(r.get("PhoneService")),
            (r.get("MultipleLines") or "").strip() or None,
            service_count,
        ))

        # One interaction row per add-on service + phone service.
        for svc in ADD_ON_SERVICES + ["PhoneService"]:
            status = (r.get(svc) or "").strip() or "No"
            interaction_rows.append((cid, svc, status))

        label_rows.append((
            cid,
            _yn(r.get("Churn")),
            None,  # predicted_probability — filled in by model later
            None,  # model_version
            None,  # scored_at
        ))

    logger.info(
        "parsed %d customers, %d interactions, %d labels",
        len(dim_rows), len(interaction_rows), len(label_rows),
    )

    logger.info("connecting to postgres")
    with psycopg.connect(_pg_dsn()) as conn, conn.cursor() as cur:
        logger.info("truncating target tables (cascade)")
        cur.execute(
            "TRUNCATE fact_churn_label, fact_customer_interaction, dim_customer_pilot CASCADE"
        )

        dim_cols = [
            "customer_id", "gender", "senior_citizen", "partner", "dependents",
            "tenure_months", "monthly_charges", "total_charges", "contract_type",
            "payment_method", "paperless_billing", "internet_service",
            "phone_service", "multiple_lines", "service_count",
        ]
        n = _copy_rows(cur, "dim_customer_pilot", dim_cols, dim_rows)
        logger.info("  dim_customer_pilot: %d rows", n)

        interaction_cols = ["customer_id", "service_name", "status"]
        n = _copy_rows(cur, "fact_customer_interaction", interaction_cols, interaction_rows)
        logger.info("  fact_customer_interaction: %d rows", n)

        label_cols = [
            "customer_id", "churned", "predicted_probability",
            "model_version", "scored_at",
        ]
        n = _copy_rows(cur, "fact_churn_label", label_cols, label_rows)
        logger.info("  fact_churn_label: %d rows", n)

        conn.commit()
    logger.info("ingestion complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
