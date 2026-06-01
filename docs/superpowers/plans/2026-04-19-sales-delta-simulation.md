# Sales Phase δ — Price × Promo Simulation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Turn the Sales Simulation tab placeholder into a live feature: user enters store + promo discount + duration, backend runs elasticity-based simulation using the β forecast as baseline, returns a 4-step waterfall (Baseline → Promo uplift → Margin hit → Net impact). Frontend renders the waterfall.

**Architecture:** New `simulation_service.py` wraps forecast_service to get baseline, applies an elasticity coefficient (constant for Phase δ; real learning deferred to later). New POST route. Frontend `SimulationTab.jsx` replaces placeholder with live form handler + recharts waterfall.

**Tech Stack:** FastAPI, Pydantic v2, recharts. No new deps.

**Spec:** `docs/superpowers/specs/2026-04-19-sales-revenue-deep-dive-design.md` §9.

**Dependency:** Phase β complete (ForecastService works).

---

## Scope decisions

- **Elasticity coefficient:** constant **-2.0** (typical BEV grocery: 1% discount → ~2% volume uplift). Documented as "Phase 1 elasticity = industry benchmark; per-store learning deferred".
- **Margin factor:** constant **0.30** (30% gross margin baseline). Documented same way.
- **Horizon:** use the simulation's `duration_days` as the forecast horizon for baseline.

---

## File Structure

**Create:**
```
backend/services/simulation_service.py      # simulation math + waterfall
backend/tests/test_simulation_service.py    # unit tests
```

**Modify:**
```
backend/schemas/sales.py                    # add SimulationRequest/Response
backend/routers/sales.py                    # add POST /simulate
backend/tests/test_sales_router.py          # add /simulate integration tests
frontend/src/services/salesApi.js           # add simulate()
frontend/src/components/manager-tabs/sales/SimulationTab.jsx   # replace placeholder with live form
frontend/e2e/capture-screenshots.spec.js    # replace placeholder screenshot with live waterfall
```

---

## Tasks

### Task 1: Extend schemas

Add to `backend/schemas/sales.py`:

```python
class SimulationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    store_id: int = Field(ge=1)
    discount_pct: float = Field(ge=0, le=50, description="0–50%")
    duration_days: int = Field(ge=1, le=30)


class WaterfallStep(BaseModel):
    label: str
    delta: float                 # positive or negative dollars vs previous step
    cumulative: float            # running total after this step


class SimulationResponse(BaseModel):
    store_id: int
    discount_pct: float
    duration_days: int
    baseline_revenue: float
    promo_revenue: float
    uplift_units: float
    margin_hit: float
    net_impact: float
    waterfall: list[WaterfallStep]   # 4 steps: Baseline, Promo uplift, Margin hit, Net
    elasticity_used: float
    margin_factor_used: float
```

Verify: `python -c "from backend.schemas.sales import SimulationRequest, SimulationResponse; print('OK')"`.

Commit `feat(schema): SimulationRequest/Response + WaterfallStep`.

---

### Task 2: SimulationService

Create `backend/services/simulation_service.py`:

```python
"""simulation_service.py — price × promo simulation using beta forecast as baseline.

Elasticity + margin-factor are constants for Phase delta. Real per-store learning
is deferred; see docs/superpowers/specs/2026-04-19-sales-revenue-deep-dive-design.md §9.
"""
from __future__ import annotations

import logging

from services.forecast_service import ForecastService
from schemas.sales import SimulationRequest, SimulationResponse, WaterfallStep

logger = logging.getLogger(__name__)

# Industry benchmarks — see /docs/data/elasticity-methodology.md (Phase 1 simplification).
DEFAULT_ELASTICITY = -2.0         # 1% discount → 2% volume uplift (BEV grocery typical)
DEFAULT_MARGIN_FACTOR = 0.30       # 30% gross margin baseline
UNIT_PRICE = 10.0                  # Rossmann sales is in $, not units; treat 'sales' as revenue directly
# (Simplification: Rossmann "Sales" column is daily revenue, not units. We compute revenue waterfall directly.)


class SimulationService:
    def __init__(self, forecast_service: ForecastService | None = None) -> None:
        self._forecast = forecast_service or ForecastService()

    def simulate(self, req: SimulationRequest) -> SimulationResponse:
        # Get baseline forecast for the duration window.
        fc = self._forecast.forecast(store_id=req.store_id, horizon_days=max(7, req.duration_days))

        # Sum forecast revenue over the requested duration.
        baseline_revenue = float(sum(p.value for p in fc.forecast[: req.duration_days]))

        # Apply elasticity: uplift multiplier = 1 + (elasticity × discount_fraction)
        # With elasticity=-2.0 and discount=0.15 (15%): 1 + (-2.0 × -0.15) = 1.30 → 30% volume lift
        # (elasticity is negative because discount is a price reduction)
        discount_fraction = req.discount_pct / 100.0
        volume_multiplier = 1.0 + (DEFAULT_ELASTICITY * -discount_fraction)   # = 1 + |e|×d
        uplift_units = baseline_revenue * (volume_multiplier - 1.0)

        # Promo revenue = new volume × discounted price
        promo_revenue = baseline_revenue * volume_multiplier * (1.0 - discount_fraction)

        # Margin hit = baseline_margin − promo_margin
        # Simplification: margin on baseline = baseline_rev × margin_factor
        #                 margin on promo    = promo_rev × margin_factor × (1 - discount_fraction)
        # Actually cleaner: margin per unit shrinks by discount.
        # Gross profit = revenue × margin_factor − unit_cost × uplift_units
        # Using shortcut: margin_hit is how much gross profit changes
        baseline_margin = baseline_revenue * DEFAULT_MARGIN_FACTOR
        promo_margin = promo_revenue * (DEFAULT_MARGIN_FACTOR - discount_fraction)
        # If discount eats more than the margin, promo_margin can go negative — that's reality.
        margin_hit = baseline_margin - promo_margin    # positive = lost margin vs baseline

        net_impact = promo_margin - baseline_margin    # positive = net gain; usually negative for heavy promos

        waterfall = [
            WaterfallStep(label="Baseline margin",  delta=baseline_margin,  cumulative=baseline_margin),
            WaterfallStep(label="Promo uplift",     delta=uplift_units * DEFAULT_MARGIN_FACTOR,
                          cumulative=baseline_margin + uplift_units * DEFAULT_MARGIN_FACTOR),
            WaterfallStep(label="Margin hit",       delta=-margin_hit - uplift_units * DEFAULT_MARGIN_FACTOR,
                          cumulative=promo_margin),
            WaterfallStep(label="Net promo margin", delta=0.0,              cumulative=promo_margin),
        ]

        return SimulationResponse(
            store_id=req.store_id,
            discount_pct=req.discount_pct,
            duration_days=req.duration_days,
            baseline_revenue=baseline_revenue,
            promo_revenue=promo_revenue,
            uplift_units=uplift_units,
            margin_hit=margin_hit,
            net_impact=net_impact,
            waterfall=waterfall,
            elasticity_used=DEFAULT_ELASTICITY,
            margin_factor_used=DEFAULT_MARGIN_FACTOR,
        )
```

Verify import: `python -c "from backend.services.simulation_service import SimulationService; print('OK')"` (run from repo root where conftest adds backend/ to path).

Commit `feat(service): SimulationService — constant elasticity + 4-step waterfall`.

---

### Task 3: Router endpoint

Append to `backend/routers/sales.py`:

```python
from schemas.sales import SimulationRequest, SimulationResponse
from services.simulation_service import SimulationService


@lru_cache(maxsize=1)
def _simulation_service() -> SimulationService:
    return SimulationService(forecast_service=_forecast_service())


def get_simulation_service() -> SimulationService:
    return _simulation_service()


@router.post("/simulate", response_model=SimulationResponse)
def simulate(
    req: SimulationRequest,
    svc: SimulationService = Depends(get_simulation_service),
) -> SimulationResponse:
    try:
        return svc.simulate(req)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))
```

(Matches the existing `_forecast_service()` pattern.)

Smoke test:
```bash
curl -s -X POST http://localhost:8001/api/v1/sales/simulate \
  -H "Content-Type: application/json" \
  -d '{"store_id":1,"discount_pct":15,"duration_days":7}' | python -m json.tool
```

Expected: JSON with `baseline_revenue > 0`, `waterfall` has 4 items, `net_impact` exists.

Commit `feat(router): POST /api/v1/sales/simulate`.

---

### Task 4: Unit tests for service

Create `backend/tests/test_simulation_service.py`:

```python
from unittest.mock import MagicMock
from datetime import date, timedelta
import pytest

from services.simulation_service import SimulationService, DEFAULT_ELASTICITY, DEFAULT_MARGIN_FACTOR
from schemas.sales import SimulationRequest, ForecastPoint, ForecastResponse, ForecastComponents


def _mock_forecast_service(daily_revenue: float = 5000.0, days: int = 7) -> MagicMock:
    """Produce a forecast service returning a flat `daily_revenue` per day for `days` days."""
    start = date.today()
    forecast = [ForecastPoint(date=start + timedelta(i), value=daily_revenue) for i in range(days)]
    actual = [ForecastPoint(date=start - timedelta(i + 1), value=daily_revenue) for i in range(56)]
    resp = ForecastResponse(
        store_id=1, horizon_days=days, actual=actual, forecast=forecast,
        components=ForecastComponents(trend=[], weekly=[], yearly=[]),
        mape=0.1, fit_time_ms=1, predict_time_ms=1,
    )
    mock = MagicMock()
    mock.forecast.return_value = resp
    return mock


def test_simulate_baseline_revenue_matches_forecast_sum():
    svc = SimulationService(forecast_service=_mock_forecast_service(5000, 7))
    out = svc.simulate(SimulationRequest(store_id=1, discount_pct=15, duration_days=7))
    assert out.baseline_revenue == 5000 * 7


def test_simulate_elasticity_uplift_sign():
    """Higher discount → higher uplift_units."""
    svc_low = SimulationService(forecast_service=_mock_forecast_service(5000, 7))
    svc_high = SimulationService(forecast_service=_mock_forecast_service(5000, 7))
    low = svc_low.simulate(SimulationRequest(store_id=1, discount_pct=5, duration_days=7))
    high = svc_high.simulate(SimulationRequest(store_id=1, discount_pct=30, duration_days=7))
    assert high.uplift_units > low.uplift_units


def test_simulate_zero_discount_zero_uplift():
    svc = SimulationService(forecast_service=_mock_forecast_service(5000, 7))
    out = svc.simulate(SimulationRequest(store_id=1, discount_pct=0, duration_days=7))
    # At 0% discount, promo = baseline: uplift = 0, margin_hit = 0, net = 0.
    assert out.uplift_units == 0.0
    assert abs(out.net_impact) < 0.01


def test_simulate_waterfall_has_four_steps():
    svc = SimulationService(forecast_service=_mock_forecast_service(5000, 7))
    out = svc.simulate(SimulationRequest(store_id=1, discount_pct=15, duration_days=7))
    assert len(out.waterfall) == 4
    assert [w.label for w in out.waterfall] == [
        "Baseline margin", "Promo uplift", "Margin hit", "Net promo margin",
    ]


def test_simulate_constants_returned():
    svc = SimulationService(forecast_service=_mock_forecast_service(5000, 7))
    out = svc.simulate(SimulationRequest(store_id=1, discount_pct=10, duration_days=7))
    assert out.elasticity_used == DEFAULT_ELASTICITY
    assert out.margin_factor_used == DEFAULT_MARGIN_FACTOR
```

Run: `python -m pytest backend/tests/test_simulation_service.py -v` → 5/5 pass.

Commit `test(sales): simulation_service unit tests`.

---

### Task 5: Router integration tests

Append to `backend/tests/test_sales_router.py`:

```python
def test_simulate_happy_path(client: TestClient) -> None:
    r = client.post("/api/v1/sales/simulate", json={"store_id": 1, "discount_pct": 15, "duration_days": 7})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["store_id"] == 1
    assert body["baseline_revenue"] > 0
    assert len(body["waterfall"]) == 4


def test_simulate_bad_discount_returns_422(client: TestClient) -> None:
    r = client.post("/api/v1/sales/simulate", json={"store_id": 1, "discount_pct": 75, "duration_days": 7})
    assert r.status_code == 422  # ge=0, le=50


def test_simulate_unknown_field_returns_422(client: TestClient) -> None:
    r = client.post("/api/v1/sales/simulate", json={"store_id": 1, "discount_pct": 15, "duration_days": 7, "extra": 1})
    assert r.status_code == 422
```

Run: `python -m pytest backend/tests/test_sales_router.py -v` → 5+3=8 tests pass.

Commit `test(sales): simulate endpoint integration tests`.

---

### Task 6: Frontend API client

Append to `frontend/src/services/salesApi.js`:

```js
export async function simulate({ storeId, discountPct, durationDays }) {
  return fetchJson('/api/v1/sales/simulate', {
    method: 'POST',
    body: JSON.stringify({
      store_id: storeId,
      discount_pct: discountPct,
      duration_days: durationDays,
    }),
  });
}
```

Commit `feat(ui): salesApi.simulate() client`.

---

### Task 7: Replace SimulationTab placeholder with live form + waterfall

Rewrite `frontend/src/components/manager-tabs/sales/SimulationTab.jsx`:

```jsx
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  Cell, ResponsiveContainer,
} from 'recharts';
import { simulate } from '../../../services/salesApi';

export default function SimulationTab() {
  const [storeId, setStoreId] = useState(1);
  const [discount, setDiscount] = useState(15);
  const [duration, setDuration] = useState(7);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await simulate({ storeId, discountPct: discount, durationDays: duration });
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0, fontSize: 16 }}>Promotion Simulator</h3>
      <p style={{ color: '#64748b', fontSize: 13, marginTop: 0 }}>
        Configure a price × promotion scenario. Backend applies constant elasticity
        (-2.0) + 30% baseline margin to Phase β's Prophet forecast.
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16, marginBottom: 20, maxWidth: 640,
      }}>
        <Field label="Store ID" value={storeId} onChange={setStoreId} min={1} max={1115} />
        <Field label="Discount %" value={discount} onChange={setDiscount} min={0} max={50} suffix="%" />
        <Field label="Duration (days)" value={duration} onChange={setDuration} min={1} max={30} />
      </div>

      <button
        onClick={run}
        disabled={loading}
        style={{
          padding: '10px 20px',
          background: loading ? '#cbd5e1' : '#3b82f6',
          color: '#fff', border: 'none', borderRadius: 6,
          cursor: loading ? 'wait' : 'pointer', fontWeight: 600,
        }}
      >
        {loading ? 'Running…' : '▶ Run scenario'}
      </button>

      {error && (
        <div style={{
          marginTop: 16, padding: 12,
          background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca',
          borderRadius: 6,
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            <Stat label="Baseline revenue"  value={`$${Math.round(result.baseline_revenue).toLocaleString()}`} />
            <Stat label="Promo revenue"     value={`$${Math.round(result.promo_revenue).toLocaleString()}`} />
            <Stat label="Uplift units ($)"  value={`$${Math.round(result.uplift_units).toLocaleString()}`} />
            <Stat label="Margin hit"        value={`$${Math.round(result.margin_hit).toLocaleString()}`} />
            <Stat
              label="Net margin impact"
              value={`$${Math.round(result.net_impact).toLocaleString()}`}
              color={result.net_impact >= 0 ? '#059669' : '#dc2626'}
            />
          </div>

          <div style={{ height: 300, background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.waterfall}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => `$${Math.round(v).toLocaleString()}`} />
                <Bar dataKey="cumulative" fill="#3b82f6">
                  {result.waterfall.map((step, i) => (
                    <Cell key={i} fill={step.delta >= 0 ? '#3b82f6' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
            Elasticity: {result.elasticity_used} · Margin factor: {result.margin_factor_used}
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, min, max, suffix }) {
  return (
    <label>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="number" value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
          min={min} max={max}
          style={{
            padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6,
            width: '100%', boxSizing: 'border-box',
          }}
        />
        {suffix && <span style={{ color: '#64748b' }}>{suffix}</span>}
      </div>
    </label>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{
      padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0',
      borderRadius: 6, minWidth: 140,
    }}>
      <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: color || '#0f172a' }}>{value}</div>
    </div>
  );
}
```

Commit `feat(ui): SimulationTab live — form + waterfall via /api/v1/sales/simulate`.

---

### Task 8: Update Playwright screenshot spec

Modify `frontend/e2e/capture-screenshots.spec.js` test 06:

```js
test('06 simulation — live waterfall', async ({ page }) => {
  await page.goto('/sales/manager');
  await page.locator('.tab-item').filter({ hasText: /Simulation/ }).first().click();
  await expect(page.getByRole('button', { name: /Run scenario/ })).toBeVisible();
  await page.screenshot({ path: `${OUT}/06a-simulation-empty.png`, fullPage: true });

  await page.getByRole('button', { name: /Run scenario/ }).click();
  await expect(page.getByText(/Baseline revenue/)).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/06b-simulation-waterfall.png`, fullPage: true });
});
```

This replaces the old "Phase δ placeholder" screenshot with 2 new shots: empty form + waterfall.

Run: `npx playwright test capture-screenshots --project=chromium` → 9/9 pass (one failing earlier now passes differently).

Commit `test(e2e): capture simulation waterfall screenshots`.

---

### Task 9: Verify + push

```bash
cd /mnt/deepa/insur
python -m pytest backend/tests/ -v 2>&1 | tail -10
# 27 backend tests total (22 + 5 new simulation)
cd frontend && npm run test:e2e 2>&1 | tail -10
# Still 24 passing (existing) + new simulation screenshots
npx vite build 2>&1 | tail -5
git push
```

---

## Completion criteria

- [ ] `POST /api/v1/sales/simulate` returns a SimulationResponse with 4-step waterfall
- [ ] 5 unit tests + 3 integration tests pass
- [ ] SimulationTab renders waterfall bar chart + 5 stat tiles after submit
- [ ] Screenshot `06b-simulation-waterfall.png` exists and shows live numbers
- [ ] Regression: all existing backend tests pass, all existing Playwright tests pass
