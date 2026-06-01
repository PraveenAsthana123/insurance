"""supply_chain.py — HTTP-only FastAPI routes for Supply Chain deep-dive.

Mirrors backend/routers/sales.py structure: lru_cache dependency factories,
thin route handlers that translate ValueError → 404, everything else to the
service layer.
"""
from __future__ import annotations

import logging
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, status

from repositories.supply_chain_repo import SupplyChainRepo
from schemas.supply_chain import (
    ETARequest,
    ETAResponse,
    SimulationRequest,
    SimulationResponse,
    SkuSummary,
    StockoutRiskRequest,
    StockoutRiskResponse,
    SupplierScored,
)
from services.eta_service import ETAService
from services.stockout_service import StockoutService
from services.supplier_score_service import SupplierScoreService
from services.supply_chain_simulation_service import SupplyChainSimulationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/supply-chain", tags=["supply-chain"])


@lru_cache(maxsize=1)
def _repo() -> SupplyChainRepo:
    return SupplyChainRepo()


@lru_cache(maxsize=1)
def _stockout_service() -> StockoutService:
    return StockoutService(repo=_repo())


@lru_cache(maxsize=1)
def _eta_service() -> ETAService:
    return ETAService(repo=_repo())


@lru_cache(maxsize=1)
def _score_service() -> SupplierScoreService:
    return SupplierScoreService(repo=_repo())


@lru_cache(maxsize=1)
def _simulation_service() -> SupplyChainSimulationService:
    return SupplyChainSimulationService(repo=_repo())


def get_repo() -> SupplyChainRepo:
    return _repo()


def get_stockout_service() -> StockoutService:
    return _stockout_service()


def get_eta_service() -> ETAService:
    return _eta_service()


def get_score_service() -> SupplierScoreService:
    return _score_service()


def get_simulation_service() -> SupplyChainSimulationService:
    return _simulation_service()


@router.get("/skus", response_model=list[SkuSummary])
def list_skus(repo: SupplyChainRepo = Depends(get_repo)) -> list[SkuSummary]:
    rows = repo.list_skus()
    return [
        SkuSummary(
            sku_id=r["sku_id"],
            product_type=r.get("product_type"),
            price=float(r["price"]) if r.get("price") is not None else None,
            stock_levels=r.get("stock_levels"),
            lead_time_days=r.get("lead_time_days"),
            defect_rate=float(r["defect_rate"]) if r.get("defect_rate") is not None else None,
        )
        for r in rows
    ]


@router.get("/suppliers", response_model=list[SupplierScored])
def list_suppliers(
    svc: SupplierScoreService = Depends(get_score_service),
) -> list[SupplierScored]:
    return svc.scored()


@router.post("/stockout-risk", response_model=StockoutRiskResponse)
def stockout_risk(
    req: StockoutRiskRequest,
    svc: StockoutService = Depends(get_stockout_service),
) -> StockoutRiskResponse:
    try:
        return svc.assess(req)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/eta", response_model=ETAResponse)
def eta(
    req: ETARequest,
    svc: ETAService = Depends(get_eta_service),
) -> ETAResponse:
    try:
        return svc.predict(req)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/simulate", response_model=SimulationResponse)
def simulate(
    req: SimulationRequest,
    svc: SupplyChainSimulationService = Depends(get_simulation_service),
) -> SimulationResponse:
    return svc.run(req)
