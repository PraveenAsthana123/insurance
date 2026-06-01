"""sales.py — HTTP-only FastAPI routes for the Sales deep-dive."""
from __future__ import annotations

import logging
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, status

from repositories.sales_repo import SalesRepo
from schemas.sales import (
    ForecastRequest,
    ForecastResponse,
    SimulationRequest,
    SimulationResponse,
    StoreSummary,
)
from services.forecast_service import ForecastService
from services.simulation_service import SimulationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/sales", tags=["sales"])


@lru_cache(maxsize=1)
def _repo() -> SalesRepo:
    return SalesRepo()


@lru_cache(maxsize=1)
def _forecast_service() -> ForecastService:
    return ForecastService(repo=_repo())


@lru_cache(maxsize=1)
def _simulation_service() -> SimulationService:
    return SimulationService(forecast_service=_forecast_service())


def get_repo() -> SalesRepo:
    return _repo()


def get_forecast_service() -> ForecastService:
    return _forecast_service()


def get_simulation_service() -> SimulationService:
    return _simulation_service()


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


@router.post("/simulate", response_model=SimulationResponse)
def simulate(
    req: SimulationRequest,
    svc: SimulationService = Depends(get_simulation_service),
) -> SimulationResponse:
    try:
        return svc.simulate(req)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))
