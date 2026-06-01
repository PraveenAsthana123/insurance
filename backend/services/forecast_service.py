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

from core.structured_logger import emit_event
from repositories.sales_repo import SalesRepo
from schemas.sales import (
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

        emit_event(
            "sales.forecast",
            store_id=store_id,
            horizon_days=horizon_days,
            mape=fitted.mape,
            fit_time_ms=fitted.fit_time_ms,
            predict_time_ms=predict_ms,
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
        # NOTE: promo + state_holiday regressors TODO in a later phase — reintroduce
        # together once a future-values policy (holiday calendar + promo calendar
        # lookup) is designed. For now: trend + weekly + yearly seasonality only.
        train_fit = train.rename(columns={"date": "ds", "sales": "y"})[["ds", "y"]]
        model.fit(train_fit)
        fit_ms = int((time.perf_counter() - t0) * 1000)

        # Compute backtest MAPE on holdout.
        holdout_ds = holdout.rename(columns={"date": "ds", "sales": "y"})[["ds", "y"]]
        pred = model.predict(holdout_ds[["ds"]])
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
        emit_event(
            "sales.forecast.fit",
            store_id=store_id,
            mape=mape,
            fit_time_ms=fit_ms,
            history_rows=len(train),
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
