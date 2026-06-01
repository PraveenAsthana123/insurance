# Supply Chain Phase α — Data Ingestion

**Goal:** Ingest a Supply Chain Kaggle dataset into Postgres as a canonical star schema, expose a `SupplyChainRepo` for later phases. Follows the Sales-α pattern verbatim but with a different source dataset.

**Scope:** Only Phase α (data + repo + tests). Phase β (forecast/stockout-risk model), γ (RAG), δ (simulation), ε (frontend), ζ (observability reuse), η (RBAC reuse), θ (docs) follow in separate plans.

**Source dataset decision:** **`harshsingh2209/supply-chain-analysis`** (Kaggle, public, usability 0.76). Small (100 rows × 24 columns) but richly structured — includes supplier, customer segment, product, transportation mode, costs, defect rate, shipping mode, delivery performance. Good demo density. `shahpranshu27/supply-chain-analysis` or `shashwatwork/dataco-smart-supply-chain-for-big-data-analysis` are bigger alternatives we can ingest later if more volume helps.

Why small is fine here: forecast/simulation work in β–δ uses per-SKU aggregates; 100 rows × 9 SKUs × 2 suppliers gives enough signal. Bigger datasets come with cleanup overhead that doesn't add demo value.

**Companion doc:** `docs/specs/SUPPLY_CHAIN_SCENARIOS.md` (the 6 screens + 3 narrated scenarios — not yet expanded to a full design spec but this plan cites the schema it proposes).

---

## Canonical schema (after ingestion)

Denormalized slightly from the scenarios doc to fit the single source dataset:

```
dim_sku(
  sku_id           TEXT PRIMARY KEY,
  product_type     TEXT,
  product_category TEXT,
  sku_number       INTEGER,
  price            NUMERIC(10,2),
  availability     INTEGER,
  stock_levels     INTEGER,
  lead_time_days   INTEGER,
  shipping_time    INTEGER,
  defect_rate      NUMERIC(6,4)
)

dim_supplier(
  supplier_id      TEXT PRIMARY KEY,
  supplier_name    TEXT,
  location         TEXT,
  production_volumes INTEGER,
  manufacturing_lead_time_days INTEGER,
  manufacturing_costs NUMERIC(10,2),
  inspection_results TEXT
)

dim_customer(
  customer_id      TEXT PRIMARY KEY,
  demographics     TEXT
)

fact_shipment(
  shipment_id          SERIAL PRIMARY KEY,
  sku_id               TEXT REFERENCES dim_sku(sku_id),
  supplier_id          TEXT REFERENCES dim_supplier(supplier_id),
  customer_id          TEXT REFERENCES dim_customer(customer_id),
  order_quantity       INTEGER,
  number_of_products_sold INTEGER,
  revenue_generated    NUMERIC(12,2),
  shipping_carrier     TEXT,
  shipping_cost        NUMERIC(10,2),
  transportation_mode  TEXT,
  route                TEXT,
  costs                NUMERIC(10,2)
)
```

Indices:
- `idx_fact_shipment_sku ON fact_shipment(sku_id)`
- `idx_fact_shipment_supplier ON fact_shipment(supplier_id)`
- `idx_fact_shipment_mode ON fact_shipment(transportation_mode)`

---

## File Structure

**Create:**
```
backend/migrations/011_supply_chain.sql
scripts/download_supply_chain.sh
scripts/ingest_supply_chain.py
backend/repositories/supply_chain_repo.py
backend/tests/test_supply_chain_ingestion.py
backend/tests/test_supply_chain_repo.py
```

**Modify:** none. Migration runs via the same `docker compose exec psql` pattern used in Sales-α.

---

## Tasks

### Task 1 — Migration 011

Create `backend/migrations/011_supply_chain.sql`:

```sql
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
```

Apply via `docker compose exec -T postgres psql -U insur_user -d insur_analytics < backend/migrations/011_supply_chain.sql`. Verify with `\dt+` — three new tables present.

Commit `feat(db): migration 011 — supply chain star schema`.

### Task 2 — Kaggle download helper

Create `scripts/download_supply_chain.sh`:

```bash
#!/usr/bin/env bash
# download_supply_chain.sh — fetch the Supply Chain Analysis dataset.
set -euo pipefail

DEST="${1:-data/kaggle/supply-chain}"
mkdir -p "$DEST"

if [[ -f "$DEST/supply_chain_data.csv" ]]; then
  echo "[download_supply_chain] file already present in $DEST — skipping"
  exit 0
fi

if ! command -v kaggle >/dev/null 2>&1; then
  echo "[download_supply_chain] kaggle CLI not installed."
  echo "Kaggle creds are available globally per ~/.claude/policies/data-access-kaggle.md"
  exit 1
fi

echo "[download_supply_chain] downloading harshsingh2209/supply-chain-analysis"
kaggle datasets download -d harshsingh2209/supply-chain-analysis -p "$DEST" --unzip

# Dataset may extract to a nested folder — flatten if so.
if [[ -d "$DEST/supply-chain-analysis" ]]; then
  mv "$DEST/supply-chain-analysis/"*.csv "$DEST/" 2>/dev/null || true
  rmdir "$DEST/supply-chain-analysis" 2>/dev/null || true
fi

echo "[download_supply_chain] done. Files in $DEST:"
ls -lh "$DEST"
```

`chmod +x scripts/download_supply_chain.sh`.

Smoke run: `./scripts/download_supply_chain.sh data/kaggle/supply-chain` should succeed and produce `data/kaggle/supply-chain/supply_chain_data.csv` (~10KB, 100 rows).

Commit `feat(scripts): Kaggle supply chain download helper`.

### Task 3 — Python ingestion

Create `scripts/ingest_supply_chain.py`:

```python
#!/usr/bin/env python
"""ingest_supply_chain.py — load Supply Chain Analysis CSV into canonical star schema.

Idempotent: TRUNCATEs targets before COPY.
Usage:  python scripts/ingest_supply_chain.py [--dir PATH]
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

logger = logging.getLogger("ingest_supply_chain")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _pg_dsn() -> str:
    return (
        f"host={os.getenv('BEV_POSTGRES_HOST', 'localhost')} "
        f"port={os.getenv('BEV_POSTGRES_PORT', '5432')} "
        f"dbname={os.getenv('BEV_POSTGRES_DB', 'insur_analytics')} "
        f"user={os.getenv('BEV_POSTGRES_USER', 'insur_user')} "
        f"password={os.getenv('BEV_POSTGRES_PASSWORD', 'insur_secret_password')}"
    )


def _parse_csv(path: Path) -> list[dict]:
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


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
    ap.add_argument("--dir", type=Path, default=Path(os.getenv("SUPPLY_CHAIN_DIR", "data/kaggle/supply-chain")))
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
                    r.get("Product type"),   # product_type and category both populated from same field (no separate category col)
                    int(r["SKU number"]) if r.get("SKU number") else None,
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
            # the unique-check in _upsert_rows uses the first column, so we just pass rows directly.
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
```

`chmod +x scripts/ingest_supply_chain.py`.

Commit `feat(scripts): supply chain ingestion (CSV → star schema)`.

### Task 4 — Repository class

Create `backend/repositories/supply_chain_repo.py`:

```python
"""supply_chain_repo.py — read-only repository for supply chain star schema."""
from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row


def _pg_dsn() -> str:
    return (
        f"host={os.getenv('BEV_POSTGRES_HOST', 'localhost')} "
        f"port={os.getenv('BEV_POSTGRES_PORT', '5432')} "
        f"dbname={os.getenv('BEV_POSTGRES_DB', 'insur_analytics')} "
        f"user={os.getenv('BEV_POSTGRES_USER', 'insur_user')} "
        f"password={os.getenv('BEV_POSTGRES_PASSWORD', 'insur_secret_password')}"
    )


class SupplyChainRepo:
    def __init__(self, dsn: str | None = None):
        self._dsn = dsn or _pg_dsn()

    @contextmanager
    def _conn(self) -> Iterator[psycopg.Connection]:
        with psycopg.connect(self._dsn, row_factory=dict_row) as conn:
            yield conn

    def list_skus(self) -> list[dict]:
        with self._conn() as c, c.cursor() as cur:
            cur.execute("SELECT * FROM dim_sku ORDER BY sku_id")
            return list(cur.fetchall())

    def list_suppliers(self) -> list[dict]:
        with self._conn() as c, c.cursor() as cur:
            cur.execute("SELECT * FROM dim_supplier ORDER BY supplier_id")
            return list(cur.fetchall())

    def get_sku(self, sku_id: str) -> dict | None:
        with self._conn() as c, c.cursor() as cur:
            cur.execute("SELECT * FROM dim_sku WHERE sku_id = %s", (sku_id,))
            return cur.fetchone()

    def get_shipments_for_sku(self, sku_id: str) -> list[dict]:
        with self._conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT * FROM fact_shipment WHERE sku_id = %s ORDER BY shipment_id DESC",
                (sku_id,),
            )
            return list(cur.fetchall())

    def total_row_counts(self) -> dict:
        with self._conn() as c, c.cursor() as cur:
            out = {}
            for t in ("dim_sku", "dim_supplier", "dim_customer", "fact_shipment"):
                cur.execute(f"SELECT COUNT(*) AS n FROM {t}")
                out[t] = cur.fetchone()["n"]
            return out
```

Commit `feat(repo): SupplyChainRepo`.

### Task 5 — Unit + integration tests

Create `backend/tests/test_supply_chain_repo.py` — unit tests with mocked `_conn` (follow the `test_sales_repo.py` pattern):

```python
from unittest.mock import MagicMock
from contextlib import contextmanager

import pytest

from repositories.supply_chain_repo import SupplyChainRepo


@pytest.fixture
def mock_repo(monkeypatch):
    repo = SupplyChainRepo()
    mock_cur = MagicMock()
    mock_cur.fetchall.return_value = []
    mock_cur.fetchone.return_value = None
    mock_conn = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    mock_conn.cursor.return_value.__exit__.return_value = None

    @contextmanager
    def _fake_conn(self):
        yield mock_conn

    monkeypatch.setattr(SupplyChainRepo, "_conn", _fake_conn)
    return repo, mock_cur


def test_list_skus_sql(mock_repo):
    repo, cur = mock_repo
    repo.list_skus()
    assert "FROM dim_sku" in cur.execute.call_args[0][0]


def test_list_suppliers_sql(mock_repo):
    repo, cur = mock_repo
    repo.list_suppliers()
    assert "FROM dim_supplier" in cur.execute.call_args[0][0]


def test_get_sku_parameterized(mock_repo):
    repo, cur = mock_repo
    repo.get_sku("SKU-1")
    args = cur.execute.call_args
    assert "WHERE sku_id = %s" in args[0][0]
    assert args[0][1] == ("SKU-1",)


def test_get_shipments_for_sku(mock_repo):
    repo, cur = mock_repo
    repo.get_shipments_for_sku("SKU-1")
    assert "WHERE sku_id = %s" in cur.execute.call_args[0][0]
```

Create `backend/tests/test_supply_chain_ingestion.py` — data-quality integration tests that auto-skip if the tables are empty:

```python
import pytest

from repositories.supply_chain_repo import SupplyChainRepo


@pytest.fixture(scope="module")
def repo() -> SupplyChainRepo:
    return SupplyChainRepo()


@pytest.fixture(scope="module")
def counts(repo: SupplyChainRepo) -> dict:
    return repo.total_row_counts()


def _require_ingested(counts: dict) -> None:
    if counts["fact_shipment"] == 0:
        pytest.skip("fact_shipment empty; run scripts/ingest_supply_chain.py first")


def test_fact_shipment_has_rows(counts):
    _require_ingested(counts)
    assert counts["fact_shipment"] >= 50, f"expected at least 50 shipments, got {counts['fact_shipment']}"


def test_dim_sku_has_at_least_one_entry_per_product_type(repo, counts):
    _require_ingested(counts)
    skus = repo.list_skus()
    product_types = {s["product_type"] for s in skus if s["product_type"]}
    assert len(product_types) >= 3, f"expected ≥3 product types, got {product_types}"


def test_dim_supplier_has_unique_locations(repo, counts):
    _require_ingested(counts)
    suppliers = repo.list_suppliers()
    locations = {s["location"] for s in suppliers if s["location"]}
    assert len(locations) >= 2


def test_get_shipments_for_known_sku_returns_records(repo, counts):
    _require_ingested(counts)
    skus = repo.list_skus()
    assert skus, "dim_sku empty"
    ships = repo.get_shipments_for_sku(skus[0]["sku_id"])
    assert len(ships) >= 1, f"no shipments for SKU {skus[0]['sku_id']}"
```

Run:
```
python -m pytest backend/tests/test_supply_chain_repo.py -v       # 4/4 pass
python -m pytest backend/tests/test_supply_chain_ingestion.py -v  # 4/4 pass (or all skip if not ingested)
```

Commit `test(supply-chain): repo unit tests + ingestion integration tests`.

### Task 6 — Run end-to-end

```bash
docker compose up -d postgres
docker compose exec -T postgres psql -U insur_user -d insur_analytics < backend/migrations/011_supply_chain.sql
./scripts/download_supply_chain.sh data/kaggle/supply-chain
python scripts/ingest_supply_chain.py --dir data/kaggle/supply-chain
python -m pytest backend/tests/test_supply_chain_ingestion.py -v   # expect all pass
```

Expected outcomes (row counts):
- `dim_sku` ≥ 9
- `dim_supplier` ≥ 3
- `dim_customer` ≥ 80 (one per shipment row — deduplication happens by customer_id which is synthetic per-row, so may be 100)
- `fact_shipment` ≥ 90

Exact numbers depend on the dataset's real content; the tests are tolerant bands (>= 50 shipments, >= 3 product types).

No commit needed for runtime verification.

### Task 7 — Push

```bash
git push
```

Report row counts from the actual ingestion.

---

## Completion criteria

- [ ] Migration 011 applied; 4 tables present
- [ ] `scripts/download_supply_chain.sh` + `scripts/ingest_supply_chain.py` executable
- [ ] `SupplyChainRepo` with 5 methods
- [ ] 4 unit tests + 4 integration tests pass (or skip cleanly if data not ingested)
- [ ] Real ingestion shows plausible row counts for the dataset
- [ ] 45 prior backend tests still pass (no regression)

## Risks

| Risk | Mitigation |
|---|---|
| Dataset column names differ from the plan | The ingest script uses `r.get(...)` with defaults; misses become `NULL` rather than crashes. Verify first run. |
| Dataset is tiny — demos feel thin | Acceptable for Phase α; phase β+ will render per-SKU drilldowns that look rich on even 100 rows. |
| PK collisions if supplier names repeat | `_upsert_rows` dedupes by first column. |
