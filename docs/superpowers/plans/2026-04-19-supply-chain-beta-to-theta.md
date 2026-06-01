# Supply Chain β → θ — Consolidated Plan (7 phases)

**Goal:** Complete Supply Chain deep-dive in one consolidated effort. Mirrors Sales 8-phase pattern but simpler (no Prophet — smaller dataset needs different models).

**Approach:** 3 execution waves with subagent dispatch between each.

---

## Phase Scope Decisions

### β — Backend models + endpoints (~4h)
Swap Prophet for simpler models that fit a 100-row dataset:
- **Stockout-risk scoring**: heuristic-based (no ML training on 100 rows) — risk = `f(stock_levels / (lead_time × daily_demand))` with daily_demand derived from `number_of_products_sold / period`
- **ETA prediction**: rule-based lookup: `predicted_eta = shipping_time + lane_adjustment[mode]` (constants per transportation mode from the dataset's observed avg)
- **Supplier score**: composite 0–100 from `defect_rate`, `manufacturing_lead_time`, `inspection_results` → weighted sum

Endpoints:
```
GET  /api/v1/supply-chain/skus              # list from dim_sku
GET  /api/v1/supply-chain/suppliers         # list from dim_supplier with computed score
POST /api/v1/supply-chain/stockout-risk     # {sku_id} → {risk_score, days_to_stockout, reason}
POST /api/v1/supply-chain/eta               # {sku_id, transportation_mode} → {eta_days, confidence}
```

Services: `stockout_service.py`, `eta_service.py`, `supplier_score_service.py` (small — ~50 LOC each).

### δ — Scenario simulator (~2h)
Supplier-delay impact: input `{supplier_id, delay_days, affected_sku_count}` → output `{stockout_probability_change, service_level_delta, revenue_at_risk}`. Reuses stockout_service for baseline.

Endpoint: `POST /api/v1/supply-chain/simulate`.

### ε — Frontend (~3h)
New tabs under /supply-chain/manager (matching Sales pattern):
- **StockoutRiskTab** — SKU picker → risk panel + AI Explain button
- **SupplierScorecardTab** — ranked table with color-coded scores
- **NetworkSimTab** — form + waterfall output

Also enrich OverviewTab for supply-chain (4 live KPI tiles from `/api/v1/supply-chain/skus` and `/suppliers`).

### γ — RAG (~1h reuse)
Create `data/supply-chain-context/*.md` (4 files — mirror the Sales corpus). Reuse the existing RAGService. Configure a second instance with `corpus_dir=supply-chain-context`. Either add a `corpus` query param to `/api/v1/ai/explain` OR create a second endpoint. Prefer a query param.

### ζ — Observability (~30min)
Already covered — existing `CorrelationIdMiddleware` and `emit_event` wrap every request. Just add event emits in the 3 new Supply Chain services.

### η — RBAC (~1h)
Extend `SALES_PERMS` into `PERMS_MATRIX` (rename) with supply-chain rules:
- `GET /supply-chain/*` → all 4 roles
- `POST /supply-chain/stockout-risk`, `/eta` → all 4
- `POST /supply-chain/simulate` → manager-only (same as Sales simulate)

### θ — Docs (~1h)
Add `docs/demo/supply-chain-walkthrough.md` (3 scenarios) + `docs/diagrams/supply-chain-sequence.md`. Update `docs/STATUS.md`.

---

## Execution waves

**Wave 1 (dispatch 1):** β + δ backend — stockout / eta / supplier_score / simulate services + schemas + routers + tests.

**Wave 2 (dispatch 2):** ε frontend — 3 new tabs + enriched OverviewTab + Playwright assertions + screenshots.

**Wave 3 (dispatch 3):** γ corpus + RAG corpus-selector + ζ event emits + η RBAC extension + θ docs.

Each wave commits 3–6 changes. Subagent can reject the plan and ask for narrower scope if context-constrained.

---

## File structure (planned — may shift slightly)

```
CREATE backend/schemas/supply_chain.py
CREATE backend/services/stockout_service.py
CREATE backend/services/eta_service.py
CREATE backend/services/supplier_score_service.py
CREATE backend/services/supply_chain_simulation_service.py
CREATE backend/routers/supply_chain.py
CREATE backend/tests/test_stockout_service.py
CREATE backend/tests/test_eta_service.py
CREATE backend/tests/test_supplier_score_service.py
CREATE backend/tests/test_supply_chain_router.py
CREATE data/supply-chain-context/network-topology.md
CREATE data/supply-chain-context/logistics-playbook.md
CREATE data/supply-chain-context/supplier-scorecard-methodology.md
CREATE data/supply-chain-context/safety-stock-policies.md
CREATE frontend/src/services/supplyChainApi.js
CREATE frontend/src/components/manager-tabs/supply-chain/StockoutRiskTab.jsx
CREATE frontend/src/components/manager-tabs/supply-chain/SupplierScorecardTab.jsx
CREATE frontend/src/components/manager-tabs/supply-chain/NetworkSimTab.jsx
CREATE docs/demo/supply-chain-walkthrough.md
CREATE docs/diagrams/supply-chain-sequence.md
MODIFY backend/main.py                          (register supply-chain router)
MODIFY backend/core/rbac_middleware.py          (extend matrix)
MODIFY backend/services/rag_service.py          (support corpus_dir param per request)
MODIFY backend/routers/ai_explain.py            (optional corpus= query param)
MODIFY frontend/src/pages/ManagerPage.jsx       (3 supply-chain-specific tabs when dept=supply-chain)
MODIFY frontend/src/components/dept-tabs/OverviewTab.jsx  (supply-chain live tiles)
MODIFY frontend/e2e/admin-manager-hubs.spec.js  (new assertions)
MODIFY frontend/e2e/capture-screenshots.spec.js (new captures)
MODIFY docs/STATUS.md
```

## Detailed code specs per phase

### β-1. Schemas (`backend/schemas/supply_chain.py`)

```python
from __future__ import annotations
from pydantic import BaseModel, ConfigDict, Field


class SkuSummary(BaseModel):
    sku_id: str
    product_type: str | None = None
    price: float | None = None
    stock_levels: int | None = None
    lead_time_days: int | None = None
    defect_rate: float | None = None


class SupplierScored(BaseModel):
    supplier_id: str
    supplier_name: str | None = None
    location: str | None = None
    manufacturing_lead_time_days: int | None = None
    score: float                        # 0-100
    sub_scores: dict                    # {defect, lead_time, inspection}


class StockoutRiskRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sku_id: str


class StockoutRiskResponse(BaseModel):
    sku_id: str
    risk_score: float                    # 0-1 (prob of stockout in next lead_time window)
    days_to_stockout: int                # extrapolated from stock / daily_demand
    risk_band: str                       # "high" | "medium" | "low"
    reason: str                          # human-readable driver


class ETARequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sku_id: str
    transportation_mode: str | None = None


class ETAResponse(BaseModel):
    sku_id: str
    transportation_mode: str
    eta_days: float
    confidence: float                    # 0-1, shrinks away from observed mean


class SimulationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    supplier_id: str
    delay_days: int = Field(ge=0, le=30)
    affected_sku_count: int = Field(ge=1, le=100)


class SimulationResponse(BaseModel):
    supplier_id: str
    delay_days: int
    affected_sku_count: int
    stockout_probability_change: float
    service_level_delta_pct: float
    revenue_at_risk: float
```

### β-2. Stockout service (`backend/services/stockout_service.py`)

```python
from __future__ import annotations
from core.structured_logger import emit_event
from repositories.supply_chain_repo import SupplyChainRepo
from schemas.supply_chain import StockoutRiskRequest, StockoutRiskResponse


class StockoutService:
    def __init__(self, repo: SupplyChainRepo | None = None):
        self._repo = repo or SupplyChainRepo()

    def assess(self, req: StockoutRiskRequest) -> StockoutRiskResponse:
        sku = self._repo.get_sku(req.sku_id)
        if not sku:
            raise ValueError(f"unknown sku: {req.sku_id}")

        stock = int(sku.get("stock_levels") or 0)
        lead = int(sku.get("lead_time_days") or 14)
        ships = self._repo.get_shipments_for_sku(req.sku_id)
        daily_demand = sum(int(s.get("number_of_products_sold") or 0) for s in ships) / 30.0 or 1.0
        days_to_stockout = int(stock / daily_demand) if daily_demand else 999

        ratio = days_to_stockout / lead if lead > 0 else 1.0
        risk_score = max(0.0, min(1.0, 1.0 - ratio))
        if risk_score > 0.7:
            band, reason = "high", f"only {days_to_stockout}d of cover vs {lead}d lead time"
        elif risk_score > 0.35:
            band, reason = "medium", f"{days_to_stockout}d cover — tight vs {lead}d lead time"
        else:
            band, reason = "low", f"{days_to_stockout}d cover comfortably exceeds {lead}d lead time"

        emit_event("supply_chain.stockout_risk", sku_id=req.sku_id, risk_score=risk_score,
                   days_to_stockout=days_to_stockout, band=band)

        return StockoutRiskResponse(
            sku_id=req.sku_id, risk_score=risk_score, days_to_stockout=days_to_stockout,
            risk_band=band, reason=reason,
        )
```

### β-3. ETA service (`backend/services/eta_service.py`)

```python
from __future__ import annotations
from statistics import mean, pstdev
from core.structured_logger import emit_event
from repositories.supply_chain_repo import SupplyChainRepo
from schemas.supply_chain import ETARequest, ETAResponse


class ETAService:
    """Rule-based ETA: per-mode observed average shipping time + deviation-weighted confidence."""

    def __init__(self, repo: SupplyChainRepo | None = None):
        self._repo = repo or SupplyChainRepo()
        self._cache: dict[str, tuple[float, float]] = {}  # mode -> (mean, stdev)

    def _stats(self, mode: str) -> tuple[float, float]:
        if mode in self._cache:
            return self._cache[mode]
        with self._repo._conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT s.shipping_time FROM fact_shipment f JOIN dim_sku s ON f.sku_id=s.sku_id "
                "WHERE f.transportation_mode = %s", (mode,),
            )
            times = [r["shipping_time"] for r in cur.fetchall() if r["shipping_time"] is not None]
        if not times:
            self._cache[mode] = (5.0, 2.0)
            return self._cache[mode]
        m = mean(times)
        sd = pstdev(times) if len(times) > 1 else 1.0
        self._cache[mode] = (m, sd)
        return m, sd

    def predict(self, req: ETARequest) -> ETAResponse:
        sku = self._repo.get_sku(req.sku_id)
        if not sku:
            raise ValueError(f"unknown sku: {req.sku_id}")
        mode = req.transportation_mode or "Road"
        m, sd = self._stats(mode)
        confidence = max(0.1, 1.0 - (sd / m if m else 1.0))

        emit_event("supply_chain.eta", sku_id=req.sku_id, mode=mode, eta_days=m, confidence=confidence)

        return ETAResponse(sku_id=req.sku_id, transportation_mode=mode,
                           eta_days=float(m), confidence=float(confidence))
```

### β-4. Supplier score (`backend/services/supplier_score_service.py`)

```python
from __future__ import annotations
from repositories.supply_chain_repo import SupplyChainRepo
from schemas.supply_chain import SupplierScored


INSPECTION_POINTS = {"Pass": 100, "Fail": 0, "Pending": 50}


class SupplierScoreService:
    def __init__(self, repo: SupplyChainRepo | None = None):
        self._repo = repo or SupplyChainRepo()

    def scored(self) -> list[SupplierScored]:
        suppliers = self._repo.list_suppliers()
        out: list[SupplierScored] = []
        for s in suppliers:
            defect = float(self._avg_defect_rate(s["supplier_id"]))
            lead = float(s.get("manufacturing_lead_time_days") or 30)
            inspection = INSPECTION_POINTS.get(s.get("inspection_results") or "Pending", 50)
            # Composite: lower defect = better (invert), lower lead = better (invert), inspection as-is
            defect_score = max(0, 100 - defect * 20)          # defect 0% → 100, 5% → 0
            lead_score = max(0, 100 - lead * 1.5)             # 30d → 55, 60d → 10
            score = round(0.4 * defect_score + 0.3 * lead_score + 0.3 * inspection, 1)
            out.append(SupplierScored(
                supplier_id=s["supplier_id"],
                supplier_name=s.get("supplier_name"),
                location=s.get("location"),
                manufacturing_lead_time_days=s.get("manufacturing_lead_time_days"),
                score=score,
                sub_scores={"defect": round(defect_score, 1), "lead_time": round(lead_score, 1),
                            "inspection": inspection},
            ))
        return sorted(out, key=lambda x: -x.score)

    def _avg_defect_rate(self, supplier_id: str) -> float:
        with self._repo._conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT AVG(s.defect_rate) AS r FROM fact_shipment f JOIN dim_sku s ON f.sku_id=s.sku_id "
                "WHERE f.supplier_id = %s", (supplier_id,),
            )
            r = cur.fetchone()["r"]
        return float(r or 0)
```

### β-5. Simulation service (δ)

```python
# backend/services/supply_chain_simulation_service.py
from __future__ import annotations
from core.structured_logger import emit_event
from repositories.supply_chain_repo import SupplyChainRepo
from schemas.supply_chain import SimulationRequest, SimulationResponse


class SupplyChainSimulationService:
    def __init__(self, repo: SupplyChainRepo | None = None):
        self._repo = repo or SupplyChainRepo()

    def run(self, req: SimulationRequest) -> SimulationResponse:
        with self._repo._conn() as c, c.cursor() as cur:
            cur.execute(
                "SELECT SUM(revenue_generated) AS r FROM fact_shipment WHERE supplier_id = %s",
                (req.supplier_id,),
            )
            supplier_rev = float(cur.fetchone()["r"] or 0.0)

        # Simple linear penalty: each day of delay reduces service level by 2% per SKU impacted
        service_level_delta = -min(100.0, req.delay_days * 2.0 * (req.affected_sku_count / 20))
        revenue_at_risk = supplier_rev * (abs(service_level_delta) / 100.0)
        stockout_prob_change = min(1.0, req.delay_days * 0.02 * (req.affected_sku_count / 20))

        emit_event("supply_chain.simulate", supplier_id=req.supplier_id,
                   delay_days=req.delay_days, affected_skus=req.affected_sku_count,
                   revenue_at_risk=revenue_at_risk)

        return SimulationResponse(
            supplier_id=req.supplier_id, delay_days=req.delay_days,
            affected_sku_count=req.affected_sku_count,
            stockout_probability_change=stockout_prob_change,
            service_level_delta_pct=service_level_delta, revenue_at_risk=revenue_at_risk,
        )
```

### β-6. Router + tests + main.py wiring

`backend/routers/supply_chain.py`:

```python
from functools import lru_cache
from fastapi import APIRouter, Depends, HTTPException, status
from repositories.supply_chain_repo import SupplyChainRepo
from schemas.supply_chain import (
    SkuSummary, SupplierScored, StockoutRiskRequest, StockoutRiskResponse,
    ETARequest, ETAResponse, SimulationRequest, SimulationResponse,
)
from services.stockout_service import StockoutService
from services.eta_service import ETAService
from services.supplier_score_service import SupplierScoreService
from services.supply_chain_simulation_service import SupplyChainSimulationService

router = APIRouter(prefix="/api/v1/supply-chain", tags=["supply-chain"])


@lru_cache(maxsize=1)
def _repo(): return SupplyChainRepo()
@lru_cache(maxsize=1)
def _stockout(): return StockoutService(_repo())
@lru_cache(maxsize=1)
def _eta(): return ETAService(_repo())
@lru_cache(maxsize=1)
def _score(): return SupplierScoreService(_repo())
@lru_cache(maxsize=1)
def _sim(): return SupplyChainSimulationService(_repo())


@router.get("/skus", response_model=list[SkuSummary])
def skus(repo: SupplyChainRepo = Depends(_repo)):
    return [SkuSummary(**r) for r in repo.list_skus()]


@router.get("/suppliers", response_model=list[SupplierScored])
def suppliers(svc: SupplierScoreService = Depends(_score)):
    return svc.scored()


@router.post("/stockout-risk", response_model=StockoutRiskResponse)
def stockout(req: StockoutRiskRequest, svc: StockoutService = Depends(_stockout)):
    try: return svc.assess(req)
    except ValueError as e: raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/eta", response_model=ETAResponse)
def eta(req: ETARequest, svc: ETAService = Depends(_eta)):
    try: return svc.predict(req)
    except ValueError as e: raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/simulate", response_model=SimulationResponse)
def simulate(req: SimulationRequest, svc: SupplyChainSimulationService = Depends(_sim)):
    return svc.run(req)
```

Wire in `backend/main.py`: `from routers.supply_chain import router as supply_chain_router; app.include_router(supply_chain_router)`.

### β-7. Tests (minimum 8 tests across the 4 services + router)

Create `backend/tests/test_supply_chain_services.py` with mocked repo:

```python
# Tests for all 4 services using MagicMock repo. Mirror test_simulation_service.py pattern.
# 8 tests minimum — 2 per service. Use in-memory fake data.
```

Plus `backend/tests/test_supply_chain_router.py` with TestClient — smoke test on each endpoint.

### η. RBAC extension

Edit `backend/core/rbac_middleware.py`:

Rename `SALES_PERMS` → `PERMS_MATRIX` and append:

```python
PERMS_MATRIX: list[tuple[str, re.Pattern, set[str]]] = [
    # ... existing Sales entries ...
    ("GET",  re.compile(r"^/api/v1/supply-chain/skus$"),          {"manager", "team-member", "compliance", "reporting-monitoring"}),
    ("GET",  re.compile(r"^/api/v1/supply-chain/suppliers$"),     {"manager", "team-member", "compliance", "reporting-monitoring"}),
    ("POST", re.compile(r"^/api/v1/supply-chain/stockout-risk$"), {"manager", "team-member", "compliance", "reporting-monitoring"}),
    ("POST", re.compile(r"^/api/v1/supply-chain/eta$"),           {"manager", "team-member", "compliance", "reporting-monitoring"}),
    ("POST", re.compile(r"^/api/v1/supply-chain/simulate$"),      {"manager"}),   # manager-only
]
```

Add one RBAC test for supply-chain simulate (non-manager → 403).

### γ. RAG corpus for supply chain

Create 4 markdown docs in `data/supply-chain-context/`:

- `network-topology.md` — warehouses, suppliers, lanes, modes
- `logistics-playbook.md` — disruption patterns + responses
- `supplier-scorecard-methodology.md` — scoring formula + weights
- `safety-stock-policies.md` — reorder points + category rules

Each ~300-400 words, H2-structured for chunking. Follow the Sales corpus style.

### γ-2. Corpus selector in RAG

Modify `backend/services/rag_service.py` to accept a `corpus_dir` override per-request (or per-service-instance).

Modify `backend/routers/ai_explain.py` to accept an optional `corpus` query param: `?corpus=sales` (default) or `?corpus=supply-chain`. Each maps to a different `RAGService` instance via a small dict + `lru_cache`.

Modify `backend/schemas/ai_explain.py` `ExplainRequest` to allow an optional `corpus: Literal['sales', 'supply-chain'] | None`.

### ε. Frontend (Wave 2)

Follow Sales ε pattern. Three new tabs:

1. `StockoutRiskTab.jsx` — SKU picker (dropdown from `/supply-chain/skus`), Run button calls `/stockout-risk`, shows risk band + days + reason + Ask-AI button.
2. `SupplierScorecardTab.jsx` — table of scored suppliers from `/suppliers`, color-coded score pills.
3. `NetworkSimTab.jsx` — form + submit calling `/simulate`, renders 3 numbers (service level delta, revenue at risk, stockout prob change).

Enrich `OverviewTab.jsx` for `dept.id === 'supply-chain'` — 4 tiles (SKUs, Suppliers, Top supplier score, Backend status).

Modify `ManagerPage.jsx` — when `dept.id === 'supply-chain'`, append the 3 tabs (becomes 10 tabs, same as Sales).

Create `services/supplyChainApi.js` — mirror `salesApi.js` structure, use `apiFetch` wrapper so RBAC + correlation headers flow.

### θ. Docs

- `docs/demo/supply-chain-walkthrough.md` — 3 narrated scenarios from the scenarios doc.
- `docs/diagrams/supply-chain-sequence.md` — 1 Mermaid sequence diagram for the stockout-risk flow.
- Update `docs/STATUS.md` Sales row + add Supply Chain row.

---

## Completion criteria (all waves)

- [ ] `/api/v1/supply-chain/*` — 5 endpoints respond correctly
- [ ] 10+ new backend tests pass (services + router)
- [ ] RBAC: non-manager → 403 on `/supply-chain/simulate`
- [ ] `/ai/explain?corpus=supply-chain` returns grounded response citing one of the 4 new corpus files
- [ ] Supply Chain Manager page has 10 tabs when dept.id='supply-chain'
- [ ] OverviewTab shows 4 live tiles on /supply-chain
- [ ] 3 new Playwright screenshots: stockout-risk, supplier-scorecard, network-sim
- [ ] `docs/demo/supply-chain-walkthrough.md` + 1 Mermaid + STATUS.md updated
- [ ] All prior 53 backend + 29 Playwright tests still pass
