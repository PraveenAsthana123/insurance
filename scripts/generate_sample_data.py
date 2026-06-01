"""
Generate synthetic sample CSV/JSON data for each BEV department.

This script creates small, realistic sample files so the application can
run without Kaggle credentials. All data is purely synthetic and for
demo/development purposes only.

Usage:
    python scripts/generate_sample_data.py [--dept DEPT] [--rows N]
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import random
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

DATA_ROOT = Path(os.environ.get("BEV_DATA_DIR", "/mnt/deepa/insur/data"))
KAGGLE_DIR = DATA_ROOT / "kaggle"

RANDOM_SEED = 42
rng = np.random.default_rng(RANDOM_SEED)
random.seed(RANDOM_SEED)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _date_range(start: str, periods: int, freq: str = "D") -> list[str]:
    """Return a list of ISO date strings."""
    dr = pd.date_range(start=start, periods=periods, freq=freq)
    return [str(d.date()) for d in dr]


def _save(df: pd.DataFrame, path: Path, name: str) -> None:
    path.mkdir(parents=True, exist_ok=True)
    fpath = path / name
    df.to_csv(fpath, index=False)
    logger.info("Saved %s (%d rows) → %s", name, len(df), fpath)


# ---------------------------------------------------------------------------
# Department generators
# ---------------------------------------------------------------------------

def generate_sales(dest: Path, rows: int) -> None:
    n_stores = 10
    n_products = 20
    dates = _date_range("2022-01-01", rows)

    store_ids = rng.integers(1, n_stores + 1, size=rows)
    product_ids = rng.integers(1, n_products + 1, size=rows)
    sales = rng.integers(10, 500, size=rows).astype(float)
    # Add some trend + seasonality noise
    trend = np.linspace(0, 50, rows)
    sales = sales + trend + rng.normal(0, 10, rows)
    sales = np.maximum(sales, 0).round(2)

    df_train = pd.DataFrame({
        "date": dates,
        "store_id": store_ids,
        "product_id": product_ids,
        "sales": sales,
        "on_promotion": rng.choice([0, 1], size=rows, p=[0.85, 0.15]),
    })
    _save(df_train, dest, "train.csv")

    df_stores = pd.DataFrame({
        "store_id": range(1, n_stores + 1),
        "city": [f"City_{i}" for i in range(1, n_stores + 1)],
        "state": rng.choice(["State_A", "State_B", "State_C"], size=n_stores),
        "store_type": rng.choice(["A", "B", "C", "D"], size=n_stores),
        "cluster": rng.integers(1, 6, size=n_stores),
    })
    _save(df_stores, dest, "stores.csv")

    df_oil = pd.DataFrame({
        "date": _date_range("2022-01-01", rows),
        "dcoilwtico": rng.uniform(50, 90, size=rows).round(2),
    })
    _save(df_oil, dest, "oil.csv")

    df_holiday = pd.DataFrame({
        "date": _date_range("2022-01-01", min(rows, 50)),
        "locale": rng.choice(["National", "Regional", "Local"], size=min(rows, 50)),
        "locale_name": [f"Event_{i}" for i in range(min(rows, 50))],
        "type": rng.choice(["Holiday", "Work Day", "Transfer"], size=min(rows, 50)),
        "transferred": rng.choice([True, False], size=min(rows, 50)),
    })
    _save(df_holiday, dest, "holidays_events.csv")


def generate_supply_chain(dest: Path, rows: int) -> None:
    products = [f"SKU_{i:03d}" for i in range(1, 51)]
    df = pd.DataFrame({
        "date": _date_range("2022-01-01", rows),
        "product_id": rng.choice(products, size=rows),
        "warehouse_id": rng.integers(1, 6, size=rows),
        "demand": rng.integers(5, 300, size=rows),
        "inventory_level": rng.integers(50, 1000, size=rows),
        "reorder_point": rng.integers(20, 100, size=rows),
        "lead_time_days": rng.integers(1, 14, size=rows),
        "unit_cost": rng.uniform(1.5, 50.0, size=rows).round(2),
    })
    _save(df, dest, "inventory_demand.csv")


def generate_logistics(dest: Path, rows: int) -> None:
    carriers = ["FedEx", "UPS", "DHL", "USPS", "Local"]
    df = pd.DataFrame({
        "shipment_id": [f"SHP{i:05d}" for i in range(1, rows + 1)],
        "order_date": _date_range("2022-01-01", rows),
        "carrier": rng.choice(carriers, size=rows),
        "origin_city": [f"City_{rng.integers(1, 20)}" for _ in range(rows)],
        "destination_city": [f"City_{rng.integers(1, 20)}" for _ in range(rows)],
        "weight_kg": rng.uniform(0.5, 50.0, size=rows).round(2),
        "shipping_cost": rng.uniform(5.0, 200.0, size=rows).round(2),
        "on_time_delivery": rng.choice([1, 0], size=rows, p=[0.88, 0.12]),
        "transit_days": rng.integers(1, 10, size=rows),
    })
    _save(df, dest, "shipments.csv")


def generate_manufacturing(dest: Path, rows: int) -> None:
    machines = [f"MACH_{i:02d}" for i in range(1, 11)]
    df = pd.DataFrame({
        "timestamp": pd.date_range("2022-01-01", periods=rows, freq="h").astype(str),
        "machine_id": rng.choice(machines, size=rows),
        "temperature": rng.normal(70, 15, size=rows).round(2),
        "vibration": rng.normal(5, 2, size=rows).round(3),
        "pressure": rng.normal(100, 10, size=rows).round(2),
        "rpm": rng.integers(800, 3600, size=rows),
        "tool_wear": rng.integers(0, 250, size=rows),
        "failure": rng.choice([0, 1], size=rows, p=[0.97, 0.03]),
        "failure_type": rng.choice(["None", "HDF", "PWF", "OSF", "RNF"], size=rows,
                                   p=[0.97, 0.01, 0.01, 0.005, 0.005]),
    })
    _save(df, dest, "machine_data.csv")


def generate_maintenance(dest: Path, rows: int) -> None:
    """Reuse manufacturing data but add maintenance-specific fields."""
    equipment = [f"EQ_{i:03d}" for i in range(1, 21)]
    df = pd.DataFrame({
        "record_id": range(1, rows + 1),
        "equipment_id": rng.choice(equipment, size=rows),
        "inspection_date": _date_range("2020-01-01", rows),
        "operating_hours": rng.integers(0, 20000, size=rows),
        "temperature_c": rng.normal(65, 12, size=rows).round(2),
        "vibration_mm_s": rng.normal(4.5, 1.8, size=rows).round(3),
        "lubrication_ok": rng.choice([1, 0], size=rows, p=[0.9, 0.1]),
        "failure_within_30d": rng.choice([0, 1], size=rows, p=[0.95, 0.05]),
    })
    _save(df, dest, "maintenance_logs.csv")


def generate_retail(dest: Path, rows: int) -> None:
    countries = ["United Kingdom", "Germany", "France", "Spain", "Netherlands"]
    df = pd.DataFrame({
        "invoice_no": [f"INV{i:06d}" for i in range(1, rows + 1)],
        "stock_code": [f"PRD{rng.integers(10000, 99999)}" for _ in range(rows)],
        "description": [f"Product Description {i % 200}" for i in range(rows)],
        "quantity": rng.integers(1, 100, size=rows),
        "invoice_date": _date_range("2022-01-01", rows),
        "unit_price": rng.uniform(0.5, 50.0, size=rows).round(2),
        "customer_id": rng.integers(10000, 19999, size=rows),
        "country": rng.choice(countries, size=rows),
    })
    df["total_price"] = (df["quantity"] * df["unit_price"]).round(2)
    _save(df, dest, "online_retail.csv")


def generate_customer(dest: Path, rows: int) -> None:
    df = pd.DataFrame({
        "customer_id": range(1, rows + 1),
        "age": rng.integers(18, 75, size=rows),
        "annual_income_k": rng.integers(15, 150, size=rows),
        "spending_score": rng.integers(1, 100, size=rows),
        "gender": rng.choice(["Male", "Female"], size=rows),
        "region": rng.choice(["North", "South", "East", "West"], size=rows),
        "loyalty_years": rng.integers(0, 20, size=rows),
        "avg_order_value": rng.uniform(20, 500, size=rows).round(2),
    })
    _save(df, dest, "customers.csv")


def generate_finance(dest: Path, rows: int) -> None:
    categories = ["COGS", "Marketing", "R&D", "Logistics", "Admin", "Revenue"]
    df = pd.DataFrame({
        "period": _date_range("2019-01-01", rows, freq="ME"),
        "category": rng.choice(categories, size=rows),
        "department": rng.choice(
            ["Sales", "Operations", "Finance", "Marketing"], size=rows
        ),
        "amount_usd": rng.uniform(-500000, 2000000, size=rows).round(2),
        "budget_usd": rng.uniform(100000, 1800000, size=rows).round(2),
        "currency": "USD",
    })
    df["variance"] = (df["amount_usd"] - df["budget_usd"]).round(2)
    _save(df, dest, "financials.csv")


def generate_procurement(dest: Path, rows: int) -> None:
    suppliers = [f"Supplier_{chr(65 + i)}" for i in range(10)]
    df = pd.DataFrame({
        "po_id": [f"PO{i:05d}" for i in range(1, rows + 1)],
        "supplier": rng.choice(suppliers, size=rows),
        "order_date": _date_range("2021-01-01", rows),
        "category": rng.choice(["Raw Material", "Packaging", "Services", "Equipment"], size=rows),
        "quantity": rng.integers(10, 5000, size=rows),
        "unit_price": rng.uniform(0.5, 200.0, size=rows).round(2),
        "lead_time_days": rng.integers(2, 45, size=rows),
        "quality_pass": rng.choice([1, 0], size=rows, p=[0.93, 0.07]),
    })
    df["total_cost"] = (df["quantity"] * df["unit_price"]).round(2)
    _save(df, dest, "purchase_orders.csv")


def generate_quality(dest: Path, rows: int) -> None:
    """Quality control — image data is not generated; create a CSV metadata file."""
    defect_types = ["None", "Blow_Hole", "Crack", "Inclusion", "Scratch"]
    df = pd.DataFrame({
        "sample_id": [f"QC{i:05d}" for i in range(1, rows + 1)],
        "inspection_date": _date_range("2022-01-01", rows),
        "product_line": rng.choice(["CastingA", "CastingB", "MoldingC"], size=rows),
        "defect_type": rng.choice(defect_types, size=rows, p=[0.88, 0.04, 0.03, 0.03, 0.02]),
        "defect_detected": 0,  # set below
        "severity": rng.choice(["Low", "Medium", "High", "None"], size=rows,
                               p=[0.05, 0.04, 0.03, 0.88]),
        "image_file": [f"sample_{i:05d}.jpg" for i in range(1, rows + 1)],
    })
    df["defect_detected"] = (df["defect_type"] != "None").astype(int)
    _save(df, dest, "quality_control.csv")


def generate_governance(dest: Path, rows: int) -> None:
    statuses = ["Ongoing", "Completed", "Terminated"]
    classifications = ["Class I", "Class II", "Class III"]
    countries = ["United States", "Canada", "Mexico", "United Kingdom"]
    df = pd.DataFrame({
        "recall_number": [f"2022-{i:04d}" for i in range(1, rows + 1)],
        "recall_initiation_date": _date_range("2018-01-01", rows),
        "product_description": [f"Food Product {i % 100}" for i in range(rows)],
        "classification": rng.choice(classifications, size=rows, p=[0.4, 0.45, 0.15]),
        "status": rng.choice(statuses, size=rows, p=[0.3, 0.6, 0.1]),
        "reason_for_recall": rng.choice(
            ["Undeclared Allergen", "Contamination", "Mislabeling", "Foreign Material"],
            size=rows,
            p=[0.35, 0.3, 0.25, 0.1],
        ),
        "country": rng.choice(countries, size=rows),
        "voluntary_mandated": rng.choice(["Voluntary", "FDA Mandated"], size=rows, p=[0.8, 0.2]),
    })
    _save(df, dest, "food_enforcement.csv")


# ---------------------------------------------------------------------------
# Registry
# ---------------------------------------------------------------------------

GENERATORS = {
    "sales": generate_sales,
    "supply_chain": generate_supply_chain,
    "logistics": generate_logistics,
    "manufacturing": generate_manufacturing,
    "maintenance": generate_maintenance,
    "retail": generate_retail,
    "customer": generate_customer,
    "finance": generate_finance,
    "procurement": generate_procurement,
    "quality": generate_quality,
    "governance": generate_governance,
}


def generate_all(departments: list[str] | None = None, rows: int = 500) -> None:
    targets = departments or list(GENERATORS.keys())
    for dept in targets:
        if dept not in GENERATORS:
            logger.warning("Unknown department '%s', skipping", dept)
            continue
        dest = KAGGLE_DIR / dept
        logger.info("Generating sample data for: %s (%d rows)", dept, rows)
        try:
            GENERATORS[dept](dest, rows)
        except Exception as exc:  # noqa: BLE001
            logger.error("Failed to generate %s: %s", dept, exc)

    logger.info("Sample data generation complete. Files are in: %s", KAGGLE_DIR)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate synthetic sample data for BEV departments")
    parser.add_argument(
        "--dept",
        nargs="+",
        choices=list(GENERATORS.keys()),
        help="Generate only specific department(s)",
    )
    parser.add_argument(
        "--rows",
        type=int,
        default=500,
        help="Number of rows to generate per dataset (default: 500)",
    )
    args = parser.parse_args()

    generate_all(departments=args.dept, rows=args.rows)
    return 0


if __name__ == "__main__":
    sys.exit(main())
