# Sales Deep-Dive Phase α — Data Ingestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Download the Rossmann Store Sales Kaggle dataset, create a canonical star-schema in Postgres, ingest 1.1M rows, expose a repository class for later phases.

**Architecture:** Python ingestion script reads 3 Kaggle CSVs (`train.csv`, `store.csv`, `test.csv`), transforms into 3 canonical tables (`dim_store`, `dim_date`, `fact_sales`), loads via COPY for speed. Migration runs idempotently. Repository class wraps all future read queries.

**Tech Stack:** Python 3.11, SQLAlchemy, psycopg 3, pandas, Kaggle CLI (or direct download fallback). Postgres 16 (already in docker-compose).

**Spec:** `docs/superpowers/specs/2026-04-19-sales-revenue-deep-dive-design.md` §4, §5, §14 phase α.

**Dependency:** Postgres must be reachable. Run `docker compose up postgres` before executing task 5+.

---

## File Structure

**Create:**
```
backend/migrations/010_sales_rossmann.sql          # schema DDL
scripts/ingest_rossmann.py                          # CLI ingest runner
scripts/download_rossmann.sh                        # Kaggle / fallback download
backend/repositories/sales_repo.py                  # read-side queries
backend/tests/test_sales_repo.py                    # repo unit tests
backend/tests/test_rossmann_ingestion.py            # data-quality integration test
data/kaggle/rossmann/                               # download dest (.gitignored — already in .gitignore)
```

**Modify:**
```
backend/database.py                                 # run migration 010 in startup sequence
.env.template                                       # document KAGGLE_USERNAME / KAGGLE_KEY
requirements.txt                                    # ensure kaggle, psycopg[binary] present
```

**Rationale:** Migration DDL is a single file so it's easy to diff and rollback. Ingestion script is separate from migration (DDL runs on every boot; ingest runs on-demand). Repository class isolates SQL so the forthcoming forecast service can depend on an interface.

---

## Tasks

### Task 1: Create the migration SQL

**Files:**
- Create: `backend/migrations/010_sales_rossmann.sql`

- [ ] **Step 1: Write the migration file**

Create `/mnt/deepa/insur/backend/migrations/010_sales_rossmann.sql`:

```sql
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
```

- [ ] **Step 2: Wire into `backend/database.py`**

Read `/mnt/deepa/insur/backend/database.py` to find the existing migration runner. Confirm that the runner reads files from `backend/migrations/` in order by filename prefix. The `010_` prefix should sort after any existing migrations (if the highest existing is `009_*`).

If the runner does NOT exist or doesn't pick up the 010 file automatically, ADD the migration to whatever mechanism is in place. Report as DONE_WITH_CONCERNS and describe what you found.

- [ ] **Step 3: Commit**

```bash
cd /mnt/deepa/insur
git add backend/migrations/010_sales_rossmann.sql
git commit -m "feat(db): add migration 010 — Rossmann star schema

Creates dim_store (1115 rows after ingest), dim_date (lookup),
fact_sales (~1.1M rows). Indexes on (date) and (store_id, date desc)
for common query patterns. Idempotent via IF NOT EXISTS.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Create the Kaggle download script

**Files:**
- Create: `scripts/download_rossmann.sh`

- [ ] **Step 1: Write the shell script**

```bash
#!/usr/bin/env bash
# download_rossmann.sh — fetch the Rossmann Store Sales dataset.
# Uses Kaggle CLI if credentials are present; otherwise prints instructions.
set -euo pipefail

DEST="${1:-data/kaggle/rossmann}"
mkdir -p "$DEST"

if [[ -f "$DEST/train.csv" && -f "$DEST/store.csv" ]]; then
  echo "[download_rossmann] files already present in $DEST — skipping"
  exit 0
fi

if ! command -v kaggle >/dev/null 2>&1; then
  echo "[download_rossmann] kaggle CLI not installed. Install with: pip install kaggle"
  echo "Then set KAGGLE_USERNAME and KAGGLE_KEY in your env or ~/.kaggle/kaggle.json"
  exit 1
fi

if [[ -z "${KAGGLE_USERNAME:-}" || -z "${KAGGLE_KEY:-}" ]]; then
  if [[ ! -f "${HOME}/.kaggle/kaggle.json" ]]; then
    echo "[download_rossmann] no Kaggle credentials found"
    echo "Set KAGGLE_USERNAME and KAGGLE_KEY env vars, or place kaggle.json in ~/.kaggle/"
    exit 1
  fi
fi

echo "[download_rossmann] downloading rossmann-store-sales to $DEST"
kaggle competitions download -c rossmann-store-sales -p "$DEST"

cd "$DEST"
if ls *.zip >/dev/null 2>&1; then
  for z in *.zip; do
    unzip -o "$z"
    rm "$z"
  done
fi

echo "[download_rossmann] done. Files in $DEST:"
ls -lh "$DEST"
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x /mnt/deepa/insur/scripts/download_rossmann.sh
```

- [ ] **Step 3: Commit**

```bash
git add scripts/download_rossmann.sh
git commit -m "feat(scripts): add Kaggle Rossmann download helper

Idempotent shell script that uses Kaggle CLI if creds are present,
otherwise prints setup instructions. Target dir defaults to
data/kaggle/rossmann (gitignored).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Create the Python ingestion script

**Files:**
- Create: `scripts/ingest_rossmann.py`

- [ ] **Step 1: Write the ingestion script**

Create `/mnt/deepa/insur/scripts/ingest_rossmann.py`:

```python
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
```

- [ ] **Step 2: Ensure executable**

```bash
chmod +x /mnt/deepa/insur/scripts/ingest_rossmann.py
```

- [ ] **Step 3: Commit**

```bash
git add scripts/ingest_rossmann.py
git commit -m "feat(scripts): add Rossmann ingestion pipeline

Reads store.csv (1115 rows) and train.csv (~1.017M rows) from
data/kaggle/rossmann/, transforms into canonical dim_store +
dim_date + fact_sales, bulk-loads via COPY. TRUNCATEs first
(idempotent). Supports --limit for test runs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Create the sales repository

**Files:**
- Create: `backend/repositories/sales_repo.py`

- [ ] **Step 1: Read the existing repo base class**

```bash
cat /mnt/deepa/insur/backend/repositories/base.py 2>/dev/null || echo "NO base.py"
ls /mnt/deepa/insur/backend/repositories/
```

If a `base.py` exists with a shared connection-context pattern, inherit from it. Otherwise, create a standalone class that uses psycopg directly.

- [ ] **Step 2: Write the repository**

Create `/mnt/deepa/insur/backend/repositories/sales_repo.py`:

```python
"""sales_repo.py — read-only repository for the sales star schema.

All SQL for fact_sales, dim_store, dim_date lives here. Services should
depend on this class, never touch SQL directly.
"""
from __future__ import annotations

import os
from contextlib import contextmanager
from datetime import date as date_cls
from typing import Iterator

import psycopg
from psycopg.rows import dict_row


def _pg_dsn() -> str:
    host = os.getenv("BEV_POSTGRES_HOST", "localhost")
    port = os.getenv("BEV_POSTGRES_PORT", "5432")
    db = os.getenv("BEV_POSTGRES_DB", "insur_analytics")
    user = os.getenv("BEV_POSTGRES_USER", "insur_user")
    pwd = os.getenv("BEV_POSTGRES_PASSWORD", "insur_secret_password")
    return f"host={host} port={port} dbname={db} user={user} password={pwd}"


class SalesRepo:
    def __init__(self, dsn: str | None = None):
        self._dsn = dsn or _pg_dsn()

    @contextmanager
    def _conn(self) -> Iterator[psycopg.Connection]:
        with psycopg.connect(self._dsn, row_factory=dict_row) as conn:
            yield conn

    def list_stores(self) -> list[dict]:
        with self._conn() as c, c.cursor() as cur:
            cur.execute("""
                SELECT store_id, store_type, assortment, competition_distance
                FROM dim_store
                ORDER BY store_id
            """)
            return list(cur.fetchall())

    def get_store(self, store_id: int) -> dict | None:
        with self._conn() as c, c.cursor() as cur:
            cur.execute("SELECT * FROM dim_store WHERE store_id = %s", (store_id,))
            return cur.fetchone()

    def get_sales_history(
        self, store_id: int, start: date_cls | None = None, end: date_cls | None = None
    ) -> list[dict]:
        params: list = [store_id]
        sql = "SELECT store_id, date, sales, customers, open, promo FROM fact_sales WHERE store_id = %s"
        if start is not None:
            sql += " AND date >= %s"
            params.append(start)
        if end is not None:
            sql += " AND date <= %s"
            params.append(end)
        sql += " ORDER BY date ASC"
        with self._conn() as c, c.cursor() as cur:
            cur.execute(sql, params)
            return list(cur.fetchall())

    def total_row_counts(self) -> dict:
        """Smoke check — for health / data-quality tests."""
        with self._conn() as c, c.cursor() as cur:
            out = {}
            for t in ("dim_store", "dim_date", "fact_sales"):
                cur.execute(f"SELECT COUNT(*) AS n FROM {t}")
                out[t] = cur.fetchone()["n"]
            return out
```

- [ ] **Step 3: Commit**

```bash
git add backend/repositories/sales_repo.py
git commit -m "feat(repo): add SalesRepo for the Rossmann star schema

Methods: list_stores, get_store, get_sales_history (optional date
range), total_row_counts (for smoke checks). Uses psycopg with
dict_row. All future sales services depend on this repo — no SQL
leaks into services or routers.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Run the end-to-end pipeline locally

**Note:** This task requires Postgres running. The dev user has it in docker-compose.

- [ ] **Step 1: Start Postgres (if not running)**

```bash
cd /mnt/deepa/insur
docker compose up -d postgres
sleep 5
docker compose exec postgres pg_isready -U insur_user -d insur_analytics
```

Expected: `accepting connections`.

- [ ] **Step 2: Apply the migration**

Run the migration runner. If the backend has a `python -m backend.database` command (per README), use it. Otherwise, pipe the SQL directly:

```bash
cd /mnt/deepa/insur
docker compose exec -T postgres psql -U insur_user -d insur_analytics < backend/migrations/010_sales_rossmann.sql
```

Expected: migration runs without error.

Verify:
```bash
docker compose exec postgres psql -U insur_user -d insur_analytics -c "\dt+ dim_store dim_date fact_sales"
```

Expected: three tables listed.

- [ ] **Step 3: Download the dataset (skip if already present)**

```bash
cd /mnt/deepa/insur
./scripts/download_rossmann.sh data/kaggle/rossmann
ls -lh data/kaggle/rossmann/
```

Expected: `train.csv`, `store.csv`, `test.csv` present. If script exits with "no Kaggle credentials", stop and report BLOCKED; the controller will provide credentials or a manual download path.

- [ ] **Step 4: Run the ingestion**

```bash
cd /mnt/deepa/insur
python scripts/ingest_rossmann.py --dir data/kaggle/rossmann
```

Expected log output ends with:
```
... %d store rows            (1115)
... %d unique dates, %d fact rows  (942, 1017209)
... %d dim_date rows loaded  (942)
... %d fact_sales rows loaded (1017209)
ingestion complete
```

Row counts are approximate — the Rossmann train.csv typically contains 1,017,209 rows covering 942 unique dates and 1,115 stores. Minor variance is acceptable; order-of-magnitude mismatch is not.

- [ ] **Step 5: Verify via psycopg**

```bash
docker compose exec postgres psql -U insur_user -d insur_analytics -c "
  SELECT 'dim_store' AS tbl, COUNT(*) FROM dim_store
  UNION ALL SELECT 'dim_date', COUNT(*) FROM dim_date
  UNION ALL SELECT 'fact_sales', COUNT(*) FROM fact_sales;
"
```

Expected (approximate):
```
    tbl      |  count
-------------+---------
 dim_store   |    1115
 dim_date    |     942
 fact_sales  | 1017209
```

No commit for Task 5 — this is runtime verification.

---

### Task 6: Write data-quality integration test

**Files:**
- Create: `backend/tests/test_rossmann_ingestion.py`

- [ ] **Step 1: Write the test**

```python
"""test_rossmann_ingestion.py — data-quality assertions against the ingested tables.

These run against whatever Postgres the BEV backend points at. If the tables
are empty (ingestion not run), tests are skipped with a clear message.
"""
from __future__ import annotations

import pytest

from backend.repositories.sales_repo import SalesRepo


@pytest.fixture(scope="module")
def repo() -> SalesRepo:
    return SalesRepo()


@pytest.fixture(scope="module")
def counts(repo: SalesRepo) -> dict:
    return repo.total_row_counts()


def _require_ingested(counts: dict) -> None:
    if counts["fact_sales"] == 0:
        pytest.skip("fact_sales is empty; run scripts/ingest_rossmann.py first")


def test_dim_store_row_count_matches_expected(counts: dict) -> None:
    _require_ingested(counts)
    assert counts["dim_store"] == 1115, (
        f"expected 1115 Rossmann stores, got {counts['dim_store']}"
    )


def test_fact_sales_row_count_is_order_of_magnitude_correct(counts: dict) -> None:
    _require_ingested(counts)
    # Rossmann train.csv has 1,017,209 rows; allow ±1% tolerance.
    assert 1_000_000 <= counts["fact_sales"] <= 1_030_000, (
        f"expected ~1.017M fact_sales rows, got {counts['fact_sales']}"
    )


def test_dim_date_row_count_is_reasonable(counts: dict) -> None:
    _require_ingested(counts)
    # Rossmann covers ~942 unique days across 2.5 years.
    assert 900 <= counts["dim_date"] <= 980, (
        f"expected ~942 dim_date rows, got {counts['dim_date']}"
    )


def test_no_null_sales(repo: SalesRepo, counts: dict) -> None:
    _require_ingested(counts)
    # Use raw connection for a fast check.
    with repo._conn() as c, c.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS n FROM fact_sales WHERE sales IS NULL")
        n = cur.fetchone()["n"]
    assert n == 0, f"{n} rows with NULL sales"


def test_store_123_exists(repo: SalesRepo, counts: dict) -> None:
    _require_ingested(counts)
    store = repo.get_store(123)
    assert store is not None, "store 123 (a known Rossmann store) missing"
    assert store["store_type"] in {"a", "b", "c", "d"}


def test_get_sales_history_returns_nonempty(repo: SalesRepo, counts: dict) -> None:
    _require_ingested(counts)
    rows = repo.get_sales_history(store_id=1)
    assert len(rows) > 500, f"expected many days for store 1, got {len(rows)}"
    assert rows[0]["date"] < rows[-1]["date"], "rows must be ordered by date asc"
```

- [ ] **Step 2: Run the test**

```bash
cd /mnt/deepa/insur
python -m pytest backend/tests/test_rossmann_ingestion.py -v 2>&1 | tail -30
```

Expected outcome depends on whether ingestion has been run:
- If ingested in Task 5: all 6 tests pass.
- If NOT ingested (e.g. no Kaggle creds in dev env): all tests SKIPPED with message "fact_sales is empty; run scripts/ingest_rossmann.py first". This is acceptable — the tests exist and are wired; they'll pass when anyone runs the full pipeline.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_rossmann_ingestion.py
git commit -m "test(sales): data-quality assertions against Rossmann tables

Six integration tests: dim_store row count, fact_sales order of
magnitude, dim_date range, no-null sales, store 123 exists,
get_sales_history returns ordered non-empty rows.

Tests auto-skip with a friendly message if fact_sales is empty
(ingestion not run). They pass cleanly once ingestion completes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Write SalesRepo unit tests (mockable, don't need Postgres)

**Files:**
- Create: `backend/tests/test_sales_repo.py`

- [ ] **Step 1: Write the test**

```python
"""test_sales_repo.py — unit tests for SalesRepo that exercise SQL shape without needing Postgres.

Uses an in-memory SQLite via SQLAlchemy? No — we want psycopg semantics.
Instead: monkeypatch the repo's _conn to return a mock with recorded queries.
"""
from __future__ import annotations

from datetime import date
from unittest.mock import MagicMock

import pytest

from backend.repositories.sales_repo import SalesRepo


@pytest.fixture
def mock_repo(monkeypatch):
    repo = SalesRepo()
    # Prepare a mock connection + cursor that records executed SQL.
    mock_cur = MagicMock()
    mock_cur.fetchall.return_value = []
    mock_cur.fetchone.return_value = None

    mock_conn = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cur
    mock_conn.cursor.return_value.__exit__.return_value = None

    # _conn is a @contextmanager
    from contextlib import contextmanager

    @contextmanager
    def _fake_conn(self):
        yield mock_conn

    monkeypatch.setattr(SalesRepo, "_conn", _fake_conn)
    return repo, mock_cur


def test_list_stores_executes_expected_sql(mock_repo):
    repo, cur = mock_repo
    repo.list_stores()
    sql = cur.execute.call_args[0][0]
    assert "FROM dim_store" in sql
    assert "ORDER BY store_id" in sql


def test_get_store_parameterized(mock_repo):
    repo, cur = mock_repo
    repo.get_store(42)
    args = cur.execute.call_args
    assert "WHERE store_id = %s" in args[0][0]
    assert args[0][1] == (42,)


def test_get_sales_history_no_dates(mock_repo):
    repo, cur = mock_repo
    repo.get_sales_history(store_id=1)
    sql = cur.execute.call_args[0][0]
    params = cur.execute.call_args[0][1]
    assert "WHERE store_id = %s" in sql
    assert "AND date >=" not in sql
    assert "ORDER BY date ASC" in sql
    assert params == [1]


def test_get_sales_history_with_dates(mock_repo):
    repo, cur = mock_repo
    start, end = date(2015, 1, 1), date(2015, 6, 30)
    repo.get_sales_history(store_id=1, start=start, end=end)
    sql = cur.execute.call_args[0][0]
    params = cur.execute.call_args[0][1]
    assert "AND date >= %s" in sql
    assert "AND date <= %s" in sql
    assert params == [1, start, end]
```

- [ ] **Step 2: Run the tests**

```bash
cd /mnt/deepa/insur
python -m pytest backend/tests/test_sales_repo.py -v 2>&1 | tail -20
```

Expected: 4/4 pass without needing Postgres.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_sales_repo.py
git commit -m "test(sales): SalesRepo unit tests — mock-based SQL assertions

Four tests verify SQL structure and parameter binding for
list_stores, get_store, and get_sales_history (with and without
date filters). Runs without Postgres; uses monkeypatched _conn
that records executed SQL.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Update `.env.template`

**Files:**
- Modify: `.env.template`

- [ ] **Step 1: Append Kaggle credentials section**

Append to `/mnt/deepa/insur/.env.template`:

```bash

# --- Kaggle (for Rossmann + other flagship datasets) ---
# Get credentials from https://www.kaggle.com/settings/account -> "Create New Token"
# Download kaggle.json, then either place it at ~/.kaggle/kaggle.json
# or set these env vars:
KAGGLE_USERNAME=
KAGGLE_KEY=
```

- [ ] **Step 2: Commit**

```bash
git add .env.template
git commit -m "docs(env): document KAGGLE_USERNAME and KAGGLE_KEY

Required for scripts/download_rossmann.sh. Alternative: place
kaggle.json in ~/.kaggle/ (permissions must be 600).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Completion Criteria — Phase α done when

- [ ] Migration 010 applied cleanly (verified via `\dt+` listing)
- [ ] `SalesRepo` exists with 4 methods and 4 passing unit tests
- [ ] `scripts/download_rossmann.sh` exists, executable, idempotent
- [ ] `scripts/ingest_rossmann.py` exists, executable, runs end-to-end on a real ingest OR is verified by unit tests alone if Kaggle creds unavailable
- [ ] `backend/tests/test_rossmann_ingestion.py` — 6 tests, either all pass or all skip with clear message
- [ ] `.env.template` documents Kaggle env vars
- [ ] All commits follow conventional-commit style

**If Kaggle credentials are NOT available in the dev environment:** Tasks 1–4, 6, 7, 8 proceed normally. Task 5 steps 3–5 are documented as "manually tested later with creds" and status is DONE_WITH_CONCERNS. Controller will handle the real ingest separately. The plan does NOT block on missing creds.

---

## Deferred to Phase β (next phase)

- Prophet forecast service (uses `get_sales_history` from this repo)
- Sales router exposing forecast endpoint
- MAPE calculation + backtest

---

## Risks & Mitigations (α-specific)

| Risk | Mitigation |
|---|---|
| No Kaggle creds in dev env | Pipeline tests skip cleanly; manual ingest documented |
| Postgres not running when Task 5 starts | Step 1 brings it up; fails fast with pg_isready |
| Rossmann schema changes on Kaggle side | Ingest script pins column names explicitly (DictReader); if columns change, parsing fails loudly, not silently |
| `backend.database.py` doesn't auto-run new migration | Task 1 step 2 asks implementer to report this; Task 5 step 2 has manual fallback |
| COPY load fails mid-stream on bad row | Entire transaction rolls back (with-clause); re-run ingests idempotently after fix |
