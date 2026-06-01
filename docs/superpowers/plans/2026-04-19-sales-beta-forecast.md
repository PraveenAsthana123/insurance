# Sales Phase β — Prophet Forecast Backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Expose a real Prophet-backed `/api/v1/sales/forecast` endpoint that reads from the Rossmann `fact_sales` table loaded in Phase α, fits a per-store Prophet model with state-holiday regressors + promo events, returns 8-week forecast + trend/weekly/yearly components + backtest MAPE, with unit + integration tests.

**Architecture:** Thin FastAPI router → service class that caches fitted models per store → SalesRepo for history read. Prophet model warm on first request, LRU-cached in-process.

**Tech Stack:** FastAPI, Pydantic v2, Prophet 1.x, pandas, psycopg v3. All already in `requirements.txt` (Phase α added psycopg; Prophet was already there).

**Spec:** `docs/superpowers/specs/2026-04-19-sales-revenue-deep-dive-design.md` §6.1–6.4, §8, §10.1–10.2.

**Dependency:** Phase α (`fact_sales` populated, `SalesRepo` working). Verify with `python -m pytest backend/tests/test_rossmann_ingestion.py` — must be 6/6 pass.

---

## File Structure

**Create:**
```
backend/schemas/sales.py                      # Pydantic request/response models
backend/services/forecast_service.py          # Prophet wrapper + cache
backend/routers/sales.py                      # HTTP-only FastAPI endpoints
backend/tests/test_forecast_service.py        # unit tests (synthetic data)
backend/tests/test_sales_router.py            # integration tests (TestClient)
```

**Modify:**
```
backend/main.py                                # register sales router
```

---

## Tasks

### Task 1: Pydantic schemas

**Files:**
- Create: `backend/schemas/sales.py`

- [ ] **Step 1: Write `backend/schemas/sales.py`**

```python
"""sales.py — Pydantic schemas for the Sales deep-dive API."""
from __future__ import annotations

from datetime import date as date_cls
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StoreSummary(BaseModel):
    """Short store record for list views."""
    store_id: int
    store_type: Literal["a", "b", "c", "d"]
    assortment: Literal["a", "b", "c"]
    competition_distance: float | None = None


class ForecastRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    store_id: int = Field(ge=1)
    horizon_days: int = Field(default=56, ge=7, le=180)


class ForecastPoint(BaseModel):
    date: date_cls
    value: float
    lower: float | None = None
    upper: float | None = None


class ForecastComponents(BaseModel):
    trend: list[ForecastPoint]
    weekly: list[ForecastPoint]
    yearly: list[ForecastPoint]


class ForecastResponse(BaseModel):
    store_id: int
    horizon_days: int
    actual: list[ForecastPoint]        # historical — last 56 days
    forecast: list[ForecastPoint]      # predicted — next horizon_days
    components: ForecastComponents
    mape: float = Field(description="Backtest MAPE on held-out tail, 0.0–1.0")
    fit_time_ms: int
    predict_time_ms: int
```

- [ ] **Step 2: Verify imports**

```bash
cd /mnt/deepa/insur && python -c "from backend.schemas.sales import ForecastRequest, ForecastResponse; print('OK')"
```

Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add backend/schemas/sales.py
git commit -m "feat(schema): sales.py Pydantic models for forecast API

ForecastRequest (store_id, horizon_days), ForecastResponse
(actual, forecast, components, mape, timing). StoreSummary for
list views. Pydantic v2 with extra='forbid' on request to reject
unknown fields.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Forecast service

**Files:**
- Create: `backend/services/forecast_service.py`

- [ ] **Step 1: Write `backend/services/forecast_service.py`**

```python
"""forecast_service.py — Prophet per-store forecast wrapper with an LRU cache.

Public API:
    service = ForecastService(repo=SalesRepo())
    resp = service.forecast(store_id=1, horizon_days=56)
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from datetime import date as date_cls, timedelta
from functools import lru_cache
from typing import Iterable

import pandas as pd
from prophet import Prophet

from backend.repositories.sales_repo import SalesRepo
from backend.schemas.sales import (
    ForecastComponents,
    ForecastPoint,
    ForecastResponse,
)

logger = logging.getLogger(__name__)

BACKTEST_TAIL_DAYS = 56            # reserve last N days of history as holdout
HISTORY_WINDOW_DAYS = 730           # use at most 2 years of history for fitting


@dataclass
class _FittedModel:
    """Cached fitted model + metadata for one store."""
    store_id: int
    model: Prophet
    training_last_date: date_cls
    mape: float
    fit_time_ms: int


class ForecastService:
    def __init__(self, repo: SalesRepo | None = None) -> None:
        self._repo = repo or SalesRepo()
        self._cache: dict[int, _FittedModel] = {}

    # ----- public -----

    def forecast(self, store_id: int, horizon_days: int = 56) -> ForecastResponse:
        fitted = self._cache.get(store_id) or self._fit_and_cache(store_id)

        t0 = time.perf_counter()
        future = fitted.model.make_future_dataframe(periods=horizon_days, freq="D")
        pred = fitted.model.predict(future)
        predict_ms = int((time.perf_counter() - t0) * 1000)

        # Split pred into historical (last BACKTEST_TAIL_DAYS) and forecast (next horizon_days)
        pred_history = pred.iloc[-(horizon_days + BACKTEST_TAIL_DAYS):-horizon_days]
        pred_future = pred.iloc[-horizon_days:]

        actual_hist = self._load_history_tail(store_id, BACKTEST_TAIL_DAYS)
        actual_by_date = {row["date"]: row["sales"] for row in actual_hist}

        actual_series: list[ForecastPoint] = []
        for _, row in pred_history.iterrows():
            d = row["ds"].date()
            v = actual_by_date.get(d, float(row["yhat"]))
            actual_series.append(ForecastPoint(date=d, value=float(v)))

        forecast_series = [
            ForecastPoint(
                date=row["ds"].date(),
                value=float(row["yhat"]),
                lower=float(row["yhat_lower"]),
                upper=float(row["yhat_upper"]),
            )
            for _, row in pred_future.iterrows()
        ]

        components = ForecastComponents(
            trend=_to_points(pred_future, "trend"),
            weekly=_to_points(pred_future, "weekly") if "weekly" in pred_future.columns else [],
            yearly=_to_points(pred_future, "yearly") if "yearly" in pred_future.columns else [],
        )

        return ForecastResponse(
            store_id=store_id,
            horizon_days=horizon_days,
            actual=actual_series,
            forecast=forecast_series,
            components=components,
            mape=fitted.mape,
            fit_time_ms=fitted.fit_time_ms,
            predict_time_ms=predict_ms,
        )

    # ----- internal -----

    def _fit_and_cache(self, store_id: int) -> _FittedModel:
        history = self._load_history(store_id)
        if not history:
            raise ValueError(f"no sales history for store {store_id}")

        # Build training df (exclude last BACKTEST_TAIL_DAYS for holdout MAPE eval).
        df = pd.DataFrame(history)
        df = df.sort_values("date").reset_index(drop=True)
        if len(df) <= BACKTEST_TAIL_DAYS + 30:
            raise ValueError(f"insufficient history for store {store_id} ({len(df)} rows)")

        train = df.iloc[:-BACKTEST_TAIL_DAYS].copy()
        holdout = df.iloc[-BACKTEST_TAIL_DAYS:].copy()

        t0 = time.perf_counter()
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,
        )
        # Promo event as an extra regressor.
        model.add_regressor("promo")
        train_fit = train.rename(columns={"date": "ds", "sales": "y"})[["ds", "y", "promo"]]
        train_fit["promo"] = train_fit["promo"].astype(int)
        model.fit(train_fit)
        fit_ms = int((time.perf_counter() - t0) * 1000)

        # Compute backtest MAPE on holdout.
        holdout_ds = holdout.rename(columns={"date": "ds", "sales": "y"})[["ds", "y", "promo"]]
        holdout_ds["promo"] = holdout_ds["promo"].astype(int)
        pred = model.predict(holdout_ds[["ds", "promo"]])
        mape = _mape(holdout_ds["y"].values, pred["yhat"].values)

        fitted = _FittedModel(
            store_id=store_id,
            model=model,
            training_last_date=train.iloc[-1]["date"],
            mape=mape,
            fit_time_ms=fit_ms,
        )
        self._cache[store_id] = fitted
        logger.info(
            "fitted store=%s mape=%.3f fit_ms=%d history_rows=%d",
            store_id, mape, fit_ms, len(train),
        )
        return fitted

    def _load_history(self, store_id: int) -> list[dict]:
        end = date_cls.today()
        start = end - timedelta(days=HISTORY_WINDOW_DAYS)
        rows = self._repo.get_sales_history(store_id, start=None, end=None)
        # Filter to non-closed days only — Prophet handles zeros poorly.
        rows = [r for r in rows if r["open"]]
        if len(rows) > HISTORY_WINDOW_DAYS:
            rows = rows[-HISTORY_WINDOW_DAYS:]
        return rows

    def _load_history_tail(self, store_id: int, days: int) -> list[dict]:
        rows = self._repo.get_sales_history(store_id)
        rows = [r for r in rows if r["open"]]
        return rows[-days:] if len(rows) >= days else rows


# ----- helpers -----

def _to_points(df: "pd.DataFrame", col: str) -> list[ForecastPoint]:
    return [ForecastPoint(date=row["ds"].date(), value=float(row[col])) for _, row in df.iterrows()]


def _mape(actual: Iterable[float], predicted: Iterable[float]) -> float:
    """Mean absolute percentage error, skipping zero-actual rows."""
    a = pd.Series(list(actual), dtype=float)
    p = pd.Series(list(predicted), dtype=float)
    mask = a > 0
    if not mask.any():
        return 0.0
    return float(((a[mask] - p[mask]).abs() / a[mask]).mean())
```

- [ ] **Step 2: Quick smoke check**

```bash
cd /mnt/deepa/insur && python -c "
from backend.services.forecast_service import ForecastService
svc = ForecastService()
resp = svc.forecast(store_id=1, horizon_days=14)
print('store:', resp.store_id)
print('mape:', round(resp.mape, 3))
print('actual points:', len(resp.actual))
print('forecast points:', len(resp.forecast))
print('fit ms:', resp.fit_time_ms)
print('predict ms:', resp.predict_time_ms)
"
```

Expected: store=1, mape between 0.05 and 0.25, actual/forecast point counts > 0, timing > 0. First call is slow (~5–15s fit), subsequent cached.

**If this fails with a Prophet import error**: `pip install --break-system-packages prophet`. Log the exact error if it persists.

- [ ] **Step 3: Commit**

```bash
git add backend/services/forecast_service.py
git commit -m "feat(service): Prophet forecast service with per-store LRU cache

ForecastService fits Prophet per store on first request (promo as
regressor, state_holiday TODO in later phase), caches in-process.
Computes backtest MAPE on a 56-day holdout reserved from training.
Returns actual tail + forecast horizon + trend/weekly/yearly
components + timing metadata.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Sales router

**Files:**
- Create: `backend/routers/sales.py`

- [ ] **Step 1: Write `backend/routers/sales.py`**

```python
"""sales.py — HTTP-only FastAPI routes for the Sales deep-dive."""
from __future__ import annotations

import logging
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, status

from backend.repositories.sales_repo import SalesRepo
from backend.schemas.sales import (
    ForecastRequest,
    ForecastResponse,
    StoreSummary,
)
from backend.services.forecast_service import ForecastService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/sales", tags=["sales"])


@lru_cache(maxsize=1)
def _repo() -> SalesRepo:
    return SalesRepo()


@lru_cache(maxsize=1)
def _forecast_service() -> ForecastService:
    return ForecastService(repo=_repo())


def get_repo() -> SalesRepo:
    return _repo()


def get_forecast_service() -> ForecastService:
    return _forecast_service()


@router.get("/stores", response_model=list[StoreSummary])
def list_stores(repo: SalesRepo = Depends(get_repo)) -> list[StoreSummary]:
    rows = repo.list_stores()
    return [StoreSummary(**row) for row in rows]


@router.post("/forecast", response_model=ForecastResponse)
def forecast(
    req: ForecastRequest,
    svc: ForecastService = Depends(get_forecast_service),
) -> ForecastResponse:
    try:
        return svc.forecast(store_id=req.store_id, horizon_days=req.horizon_days)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))
```

- [ ] **Step 2: Wire into `backend/main.py`**

Read the file first: `cat /mnt/deepa/insur/backend/main.py | head -60` — confirm the pattern for registering routers (`app.include_router(...)`).

Then insert:
```python
from backend.routers import sales as sales_router
...
app.include_router(sales_router.router)
```

After existing router registrations.

- [ ] **Step 3: Smoke-test the endpoint**

```bash
cd /mnt/deepa/insur && python -c "
from fastapi.testclient import TestClient
from backend.main import app
c = TestClient(app)
r = c.get('/api/v1/sales/stores')
print('status:', r.status_code, 'count:', len(r.json()))
"
```

Expected: `status: 200 count: 1115`.

- [ ] **Step 4: Commit**

```bash
git add backend/routers/sales.py backend/main.py
git commit -m "feat(router): /api/v1/sales — stores list + Prophet forecast endpoint

GET  /api/v1/sales/stores    -> list of 1115 Rossmann stores
POST /api/v1/sales/forecast  -> Prophet forecast + backtest MAPE

Dependency injection via @lru_cache singletons for SalesRepo and
ForecastService (safe since both are thread-safe at our scale).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Forecast service unit tests

**Files:**
- Create: `backend/tests/test_forecast_service.py`

- [ ] **Step 1: Write the tests**

```python
"""test_forecast_service.py — unit tests for ForecastService.

Uses synthetic sales data injected via a mock SalesRepo; no Postgres needed.
"""
from __future__ import annotations

from datetime import date as date_cls, timedelta
from unittest.mock import MagicMock

import pytest

from backend.services.forecast_service import ForecastService, _mape


def _make_synthetic_history(days: int = 540) -> list[dict]:
    """Generate deterministic sales series with weekly + trend signal."""
    start = date_cls(2024, 1, 1)
    out = []
    for i in range(days):
        d = start + timedelta(days=i)
        base = 5000 + i * 2                            # gentle trend
        weekly = 300 if d.weekday() in (4, 5) else 0   # Fri/Sat bump
        promo = i % 30 < 7                             # weekly-ish promo
        out.append({
            "store_id": 1,
            "date": d,
            "sales": int(base + weekly + (500 if promo else 0)),
            "customers": 100,
            "open": True,
            "promo": promo,
        })
    return out


@pytest.fixture
def mock_repo():
    repo = MagicMock()
    repo.get_sales_history.return_value = _make_synthetic_history(540)
    return repo


def test_mape_zero_when_perfect():
    assert _mape([100, 200, 300], [100, 200, 300]) == 0.0


def test_mape_skips_zero_actual():
    # (|100-110|/100 + |200-210|/200) / 2 = (0.1 + 0.05)/2 = 0.075
    result = _mape([0, 100, 200], [0, 110, 210])
    assert abs(result - 0.075) < 0.001


def test_forecast_returns_schema(mock_repo):
    svc = ForecastService(repo=mock_repo)
    resp = svc.forecast(store_id=1, horizon_days=14)
    assert resp.store_id == 1
    assert resp.horizon_days == 14
    assert len(resp.forecast) == 14
    assert len(resp.actual) > 0
    assert 0.0 <= resp.mape <= 1.0
    assert resp.fit_time_ms > 0
    assert resp.predict_time_ms > 0


def test_forecast_mape_reasonable_on_synthetic(mock_repo):
    svc = ForecastService(repo=mock_repo)
    resp = svc.forecast(store_id=1, horizon_days=14)
    # Synthetic data is easy — MAPE should be well below 30%.
    assert resp.mape < 0.30, f"mape {resp.mape:.3f} too high on synthetic data"


def test_cache_hit_skips_refit(mock_repo):
    svc = ForecastService(repo=mock_repo)
    r1 = svc.forecast(store_id=1, horizon_days=7)
    fit_ms_first = r1.fit_time_ms
    r2 = svc.forecast(store_id=1, horizon_days=7)
    # Second call reads cached _FittedModel so fit_time_ms is identical to first.
    assert r2.fit_time_ms == fit_ms_first


def test_missing_history_raises(mock_repo):
    mock_repo.get_sales_history.return_value = []
    svc = ForecastService(repo=mock_repo)
    with pytest.raises(ValueError, match="no sales history"):
        svc.forecast(store_id=9999, horizon_days=7)


def test_insufficient_history_raises(mock_repo):
    mock_repo.get_sales_history.return_value = _make_synthetic_history(days=20)
    svc = ForecastService(repo=mock_repo)
    with pytest.raises(ValueError, match="insufficient history"):
        svc.forecast(store_id=1, horizon_days=7)
```

- [ ] **Step 2: Run**

```bash
cd /mnt/deepa/insur && python -m pytest backend/tests/test_forecast_service.py -v 2>&1 | tail -20
```

Expected: 7/7 pass. First call fits Prophet which takes ~3–8s; overall test file should finish in <30s.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_forecast_service.py
git commit -m "test(sales): ForecastService unit tests with synthetic history

Seven tests: MAPE helper behavior, response schema, reasonable
MAPE on synthetic data (<30%), cache hit, missing history, short
history. All use a mocked SalesRepo so no Postgres needed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Sales router integration tests

**Files:**
- Create: `backend/tests/test_sales_router.py`

- [ ] **Step 1: Write the tests**

```python
"""test_sales_router.py — integration tests against FastAPI TestClient.

Hits real Postgres via SalesRepo. Requires Phase α ingestion to have run
(1.017M fact_sales rows). If fact_sales is empty, tests skip.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.repositories.sales_repo import SalesRepo


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def _require_ingested() -> None:
    repo = SalesRepo()
    counts = repo.total_row_counts()
    if counts["fact_sales"] == 0:
        pytest.skip("fact_sales empty; run scripts/ingest_rossmann.py first")


def test_list_stores_returns_1115(client: TestClient) -> None:
    r = client.get("/api/v1/sales/stores")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1115
    assert body[0]["store_id"] == 1
    assert body[0]["store_type"] in {"a", "b", "c", "d"}


def test_forecast_happy_path(client: TestClient) -> None:
    r = client.post("/api/v1/sales/forecast", json={"store_id": 1, "horizon_days": 14})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["store_id"] == 1
    assert body["horizon_days"] == 14
    assert len(body["forecast"]) == 14
    assert 0.0 <= body["mape"] <= 1.0


def test_forecast_bad_store_returns_404(client: TestClient) -> None:
    r = client.post("/api/v1/sales/forecast", json={"store_id": 99999, "horizon_days": 14})
    # 404 from service's ValueError; Pydantic validation is ge=1 so 99999 passes schema.
    assert r.status_code == 404


def test_forecast_rejects_unknown_field(client: TestClient) -> None:
    r = client.post(
        "/api/v1/sales/forecast",
        json={"store_id": 1, "horizon_days": 14, "unexpected": True},
    )
    assert r.status_code == 422  # extra='forbid' in schema


def test_forecast_bounds(client: TestClient) -> None:
    r = client.post("/api/v1/sales/forecast", json={"store_id": 1, "horizon_days": 1})
    assert r.status_code == 422  # horizon_days ge=7

    r = client.post("/api/v1/sales/forecast", json={"store_id": 1, "horizon_days": 1000})
    assert r.status_code == 422  # horizon_days le=180
```

- [ ] **Step 2: Run**

```bash
cd /mnt/deepa/insur && python -m pytest backend/tests/test_sales_router.py -v 2>&1 | tail -15
```

Expected: 5/5 pass. First test that hits forecast takes ~10s (Prophet fit for store 1).

If tests skip because `fact_sales` is empty, re-run Phase α ingestion first.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_sales_router.py
git commit -m "test(sales): router integration tests with real Postgres

Five tests: list_stores returns 1115, forecast happy path returns
14-day horizon, bad store_id returns 404, unknown field returns
422 (extra='forbid'), horizon_days bounds (7-180) return 422.

Uses TestClient + real SalesRepo + real Prophet fit. Skips
cleanly if fact_sales is empty.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run the whole backend test suite**

```bash
cd /mnt/deepa/insur && python -m pytest backend/tests/ -v 2>&1 | tail -40
```

Expected: all sales-related tests pass (at least 4 + 6 + 7 + 5 = 22 new tests pass). Pre-existing tests unchanged.

- [ ] **Step 2: Confirm Playwright still passes**

```bash
cd /mnt/deepa/insur/frontend && npm run test:e2e 2>&1 | tail -12
```

Expected: 7/7 existing Playwright tests still green. No frontend changes in Phase β.

- [ ] **Step 3: Push**

```bash
cd /mnt/deepa/insur && git push 2>&1 | tail -3
```

---

## Completion criteria — Phase β DONE when

- [ ] `backend/schemas/sales.py` exists with ForecastRequest/Response
- [ ] `backend/services/forecast_service.py` exists and passes 7 unit tests
- [ ] `backend/routers/sales.py` exists and is registered in `main.py`
- [ ] 5 router integration tests pass
- [ ] Smoke: `POST /api/v1/sales/forecast` with `{store_id: 1, horizon_days: 14}` returns `{mape: <0.3, forecast: [14 items], ...}`
- [ ] First call ≤ 15s, subsequent (cached) ≤ 1s

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Prophet not installed in env | Task 2 Step 2 has install fallback |
| MAPE too high on some stores (closed often, thin history) | Service raises `insufficient history` → router returns 404 cleanly |
| Model cache leaks memory across 1115 stores | Accept for Phase β; real LRU eviction is Phase 2b polish |
| Pydantic v2 `extra='forbid'` breaks if unknown field sent | Intentional — covered by test_forecast_rejects_unknown_field |

---

## Deferred to later phases

- γ: RAG over `data/sales-context/` (Screen 4 AI Explanation)
- δ: Simulation endpoint
- ε: Frontend tabs consuming these endpoints
- ζ: Observability hooks (structured logs, OTel spans around `forecast_service.forecast`)
- η: RBAC middleware on these routes
- θ: Playwright E2E hitting these endpoints
