"""
Demand Forecasting Pipeline — Sales / Retail departments.

Uses XGBoost with calendar, lag, and rolling statistical features to
forecast product demand. Results are logged to MLflow.
"""
from __future__ import annotations

import logging
from typing import Any

import mlflow
import mlflow.xgboost
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split

from ml.features.time_features import (
    add_lag_features,
    add_rolling_features,
    add_time_features,
)

logger = logging.getLogger(__name__)

_TARGET_COL_DEFAULT = "sales"
_DATE_COL_DEFAULT = "date"


class DemandForecastPipeline:
    """XGBoost-based demand forecasting pipeline."""

    def __init__(self, mlflow_tracking_uri: str | None = None) -> None:
        if mlflow_tracking_uri:
            mlflow.set_tracking_uri(mlflow_tracking_uri)

    # ------------------------------------------------------------------
    # Feature engineering
    # ------------------------------------------------------------------

    def prepare_features(
        self,
        df: pd.DataFrame,
        target_col: str = _TARGET_COL_DEFAULT,
        date_col: str = _DATE_COL_DEFAULT,
    ) -> pd.DataFrame:
        """
        Build feature matrix from a raw DataFrame.

        Applies calendar features, lag features, and rolling statistics.
        Rows with NaN (introduced by lags) are dropped.
        """
        df = add_time_features(df, date_col)
        df = add_lag_features(df, target_col)
        df = add_rolling_features(df, target_col)
        df = df.dropna().reset_index(drop=True)
        return df

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train(
        self,
        df: pd.DataFrame,
        target_col: str = _TARGET_COL_DEFAULT,
        experiment_name: str = "demand_forecast",
        n_estimators: int = 100,
        max_depth: int = 6,
        learning_rate: float = 0.1,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """
        Train an XGBoost regressor and log to MLflow.

        Args:
            df:              Raw input DataFrame.
            target_col:      Name of the target column.
            experiment_name: MLflow experiment name.
            n_estimators:    Number of boosting rounds.
            max_depth:       Maximum tree depth.
            learning_rate:   XGBoost learning rate (eta).
            **kwargs:        Additional XGBoost params (passed through).

        Returns:
            dict with: run_id, metrics (mae, rmse, mape), feature_importance.
        """
        date_col = kwargs.pop("date_col", _DATE_COL_DEFAULT)
        df = self.prepare_features(df, target_col=target_col, date_col=date_col)

        exclude = {target_col, date_col, "id"}
        feature_cols = [c for c in df.columns if c not in exclude]
        numeric_cols = df[feature_cols].select_dtypes(include=[np.number]).columns.tolist()

        X = df[numeric_cols]
        y = df[target_col]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, shuffle=False
        )

        mlflow.set_experiment(experiment_name)
        with mlflow.start_run():
            model = xgb.XGBRegressor(
                n_estimators=n_estimators,
                max_depth=max_depth,
                learning_rate=learning_rate,
                random_state=42,
                eval_metric="rmse",
            )
            model.fit(
                X_train,
                y_train,
                eval_set=[(X_test, y_test)],
                verbose=False,
            )

            y_pred = model.predict(X_test)

            mae = float(mean_absolute_error(y_test, y_pred))
            rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
            mape = float(np.mean(np.abs((y_test - y_pred) / (y_test + 1e-8))) * 100)

            mlflow.log_params({
                "n_estimators": n_estimators,
                "max_depth": max_depth,
                "learning_rate": learning_rate,
            })
            mlflow.log_metrics({"mae": mae, "rmse": rmse, "mape": mape})
            mlflow.xgboost.log_model(model, "demand_forecast_model")

            run_id: str = mlflow.active_run().info.run_id  # type: ignore[union-attr]

        logger.info(
            "DemandForecastPipeline trained | MAE=%.2f RMSE=%.2f MAPE=%.2f%% run_id=%s",
            mae, rmse, mape, run_id,
        )

        return {
            "run_id": run_id,
            "metrics": {"mae": mae, "rmse": rmse, "mape": mape},
            "feature_importance": dict(
                zip(numeric_cols, model.feature_importances_.tolist())
            ),
        }

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    def predict(
        self,
        model_run_id: str,
        input_df: pd.DataFrame,
        target_col: str = _TARGET_COL_DEFAULT,
    ) -> list[float]:
        """
        Load a model from MLflow and generate predictions.

        Args:
            model_run_id: MLflow run ID.
            input_df:     Raw input DataFrame (same schema as training data).
            target_col:   Target column name (used during feature prep).

        Returns:
            List of predicted values.
        """
        model = mlflow.xgboost.load_model(f"runs:/{model_run_id}/demand_forecast_model")
        prepared = self.prepare_features(input_df, target_col=target_col)
        exclude = {target_col, "date", "id"}
        feature_cols = [c for c in prepared.columns if c not in exclude]
        numeric_cols = prepared[feature_cols].select_dtypes(include=[np.number]).columns.tolist()
        predictions = model.predict(prepared[numeric_cols])
        return predictions.tolist()
