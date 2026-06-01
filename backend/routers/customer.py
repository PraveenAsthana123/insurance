"""customer.py — HTTP-only FastAPI routes for the Customer Analytics pilot.

Only the Customer Manager hub consumes these endpoints. Follows the same
pattern as routers/sales.py and routers/supply_chain.py (lru_cache DI,
thin route handlers, domain exceptions → 4xx).
"""
from __future__ import annotations

import logging
from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, Query, status

from repositories.customer_repo import CustomerRepo
from schemas.customer import (
    AtRiskCustomer,
    ChurnMetricsResponse,
    ChurnPredictionRequest,
    ChurnPredictionResponse,
    ChurnTopNResponse,
)
from services.churn_model_service import ChurnModelService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/customer", tags=["customer"])


@lru_cache(maxsize=1)
def _repo() -> CustomerRepo:
    return CustomerRepo()


@lru_cache(maxsize=1)
def _churn_service() -> ChurnModelService:
    return ChurnModelService(repo=_repo())


def get_repo() -> CustomerRepo:
    return _repo()


def get_churn_service() -> ChurnModelService:
    return _churn_service()


@router.post("/churn-predict", response_model=ChurnPredictionResponse)
def churn_predict(
    req: ChurnPredictionRequest,
    svc: ChurnModelService = Depends(get_churn_service),
) -> ChurnPredictionResponse:
    """Predict churn probability for a single customer."""
    try:
        result = svc.predict(req.customer_id)
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))
    return ChurnPredictionResponse(**result)


@router.get("/churn-top", response_model=ChurnTopNResponse)
def churn_top(
    n: int = Query(20, ge=1, le=200),
    svc: ChurnModelService = Depends(get_churn_service),
) -> ChurnTopNResponse:
    """Return the top-N at-risk customers ranked by churn probability.

    Backed by the scikit-learn ensemble model; scores whole population once
    per process lifetime and caches in-memory.
    """
    customers = [AtRiskCustomer(**r) for r in svc.rank_top_n(n=n)]
    metrics = svc.backtest_metrics()
    return ChurnTopNResponse(
        model_version=metrics["model_version"],
        n=len(customers),
        customers=customers,
        auc=metrics["auc"],
        precision_at_10=metrics["precision_at_10"],
    )


@router.get("/churn-metrics", response_model=ChurnMetricsResponse)
def churn_metrics(
    svc: ChurnModelService = Depends(get_churn_service),
) -> ChurnMetricsResponse:
    """Return training/backtest metrics for the fitted churn model."""
    return ChurnMetricsResponse(**svc.backtest_metrics())
