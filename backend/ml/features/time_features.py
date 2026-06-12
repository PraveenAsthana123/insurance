"""
Time-series feature engineering utilities.

Functions here add calendar, lag, and rolling statistical features to a
pandas DataFrame. Designed to be composable — call each function independently
or chain them together before fitting a model.
"""
from __future__ import annotations

import pandas as pd


def add_time_features(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """
    Add calendar and temporal features derived from a date column.

    Added columns:
        year, month, day_of_week, day_of_month, week_of_year,
        is_weekend, quarter

    Args:
        df:        Input DataFrame. Must contain ``date_col``.
        date_col:  Name of the date/datetime column.

    Returns:
        A copy of ``df`` with new feature columns appended.
    """
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])
    df["year"] = df[date_col].dt.year
    df["month"] = df[date_col].dt.month
    df["day_of_week"] = df[date_col].dt.dayofweek
    df["day_of_month"] = df[date_col].dt.day
    df["week_of_year"] = df[date_col].dt.isocalendar().week.astype(int)
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
    df["quarter"] = df[date_col].dt.quarter
    return df


def add_lag_features(
    df: pd.DataFrame,
    target_col: str = "sales",
    lags: list[int] | None = None,
) -> pd.DataFrame:
    """
    Add lag features for time-series forecasting.

    Args:
        df:         Input DataFrame sorted by time.
        target_col: Column to lag.
        lags:       List of lag periods (default: [1, 7, 14, 28]).

    Returns:
        A copy of ``df`` with ``lag_<n>`` columns appended.
    """
    if lags is None:
        lags = [1, 7, 14, 28]
    df = df.copy()
    for lag in lags:
        df[f"lag_{lag}"] = df[target_col].shift(lag)
    return df


def add_rolling_features(
    df: pd.DataFrame,
    target_col: str = "sales",
    windows: list[int] | None = None,
) -> pd.DataFrame:
    """
    Add rolling mean and standard deviation features.

    Args:
        df:         Input DataFrame sorted by time.
        target_col: Column to compute rolling statistics on.
        windows:    Rolling window sizes in rows (default: [7, 14, 28]).

    Returns:
        A copy of ``df`` with ``rolling_mean_<w>`` and ``rolling_std_<w>`` columns.
    """
    if windows is None:
        windows = [7, 14, 28]
    df = df.copy()
    for window in windows:
        df[f"rolling_mean_{window}"] = df[target_col].rolling(window).mean()
        df[f"rolling_std_{window}"] = df[target_col].rolling(window).std()
    return df


def add_ewm_features(
    df: pd.DataFrame,
    target_col: str = "sales",
    spans: list[int] | None = None,
) -> pd.DataFrame:
    """
    Add exponentially weighted moving average features.

    Args:
        df:         Input DataFrame sorted by time.
        target_col: Column to compute EWM statistics on.
        spans:      EWM span values (default: [7, 14]).

    Returns:
        A copy of ``df`` with ``ewm_<span>`` columns.
    """
    if spans is None:
        spans = [7, 14]
    df = df.copy()
    for span in spans:
        df[f"ewm_{span}"] = df[target_col].ewm(span=span, adjust=False).mean()
    return df
