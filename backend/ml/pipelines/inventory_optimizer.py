"""
Inventory Optimizer Pipeline — Supply Chain / Procurement / Logistics departments.

Uses a Random Forest regressor to predict optimal stock levels and demand,
minimising stockouts and overstock situations. Results are logged to MLflow.
"""
from __future__ import annotations

import logging
from typing import Any

import mlflow
import mlflow.sklearn
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

logger = logging.getLogger(__name__)

_TARGET_COL_DEFAULT = "demand"


class InventoryOptimizerPipeline:
    """Random Forest-based inventory level / demand prediction pipeline."""

    def __init__(self, mlflow_tracking_uri: str | None = None) -> None:
        if mlflow_tracking_uri:
            mlflow.set_tracking_uri(mlflow_tracking_uri)
        self._label_encoders: dict[str, LabelEncoder] = {}

    # ------------------------------------------------------------------
    # Feature engineering
    # ------------------------------------------------------------------

    def prepare_features(
        self,
        df: pd.DataFrame,
        target_col: str = _TARGET_COL_DEFAULT,
        fit_encoders: bool = True,
    ) -> pd.DataFrame:
        """
        Encode categoricals and select numeric features.

        Label-encodes string columns. Drops rows with NaN target.

        Args:
            df:           Input DataFrame.
            target_col:   Name of the regression target column.
            fit_encoders: If True, fit new LabelEncoders (training mode).
                          If False, use encoders fitted during ``train()``.

        Returns:
            Prepared DataFrame ready for model training/inference.
        """
        df = df.copy()

        # Drop rows where target is missing
        if target_col in df.columns:
            df = df.dropna(subset=[target_col]).reset_index(drop=True)

        # Encode object / category columns
        for col in df.select_dtypes(include=["object", "category"]).columns:
            if col == target_col:
                continue
            if fit_encoders:
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
                self._label_encoders[col] = le
            elif col in self._label_encoders:
                le = self._label_encoders[col]
                # Handle unseen labels gracefully
                known = set(le.classes_)
                df[col] = df[col].astype(str).apply(
                    lambda v: v if v in known else le.classes_[0]
                )
                df[col] = le.transform(df[col])
            else:
                df = df.drop(columns=[col])

        return df

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train(
        self,
        df: pd.DataFrame,
        target_col: str = _TARGET_COL_DEFAULT,
        experiment_name: str = "inventory_optimizer",
        n_estimators: int = 150,
        max_depth: int | None = None,
        min_samples_leaf: int = 5,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """
        Train a Random Forest regressor and log to MLflow.

        Args:
            df:               Raw input DataFrame.
            target_col:       Name of the target column.
            experiment_name:  MLflow experiment name.
            n_estimators:     Number of trees.
            max_depth:        Maximum tree depth (None = unlimited).
            min_samples_leaf: Minimum samples per leaf node.

        Returns:
            dict with: run_id, metrics (mae, rmse, r2), feature_importance.
        """
        df = self.prepare_features(df, target_col=target_col, fit_encoders=True)

        exclude = {target_col}
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        feature_cols = [c for c in numeric_cols if c not in exclude]

        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in DataFrame")

        X = df[feature_cols]
        y = df[target_col]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        mlflow.set_experiment(experiment_name)
        with mlflow.start_run():
            model = RandomForestRegressor(
                n_estimators=n_estimators,
                max_depth=max_depth,
                min_samples_leaf=min_samples_leaf,
                n_jobs=-1,
                random_state=42,
            )
            model.fit(X_train, y_train)

            y_pred = model.predict(X_test)

            mae = float(mean_absolute_error(y_test, y_pred))
            rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
            r2 = float(r2_score(y_test, y_pred))

            mlflow.log_params({
                "n_estimators": n_estimators,
                "max_depth": str(max_depth),
                "min_samples_leaf": min_samples_leaf,
            })
            mlflow.log_metrics({"mae": mae, "rmse": rmse, "r2": r2})
            mlflow.sklearn.log_model(model, "inventory_model")

            run_id: str = mlflow.active_run().info.run_id  # type: ignore[union-attr]

        logger.info(
            "InventoryOptimizerPipeline trained | MAE=%.2f RMSE=%.2f R2=%.4f run_id=%s",
            mae, rmse, r2, run_id,
        )

        return {
            "run_id": run_id,
            "metrics": {"mae": mae, "rmse": rmse, "r2": r2},
            "feature_importance": dict(zip(feature_cols, model.feature_importances_.tolist())),
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
        Load model from MLflow and predict stock levels / demand.

        Args:
            model_run_id: MLflow run ID.
            input_df:     Raw input DataFrame.
            target_col:   Target column name (excluded from features).

        Returns:
            List of predicted values.
        """
        model = mlflow.sklearn.load_model(f"runs:/{model_run_id}/inventory_model")
        prepared = self.prepare_features(input_df, target_col=target_col, fit_encoders=False)
        exclude = {target_col}
        numeric_cols = [
            c for c in prepared.select_dtypes(include=[np.number]).columns
            if c not in exclude
        ]
        return model.predict(prepared[numeric_cols]).tolist()
