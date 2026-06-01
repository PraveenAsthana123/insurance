"""
Customer Segmentation Pipeline — Customer department.

Uses K-Means clustering to identify customer segments based on demographic
and behavioural features. Results and cluster labels are logged to MLflow.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import mlflow
import mlflow.sklearn
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import davies_bouldin_score, silhouette_score
from sklearn.preprocessing import LabelEncoder, StandardScaler

logger = logging.getLogger(__name__)

_DEFAULT_N_CLUSTERS = 5


class CustomerSegmentationPipeline:
    """K-Means clustering pipeline for customer segmentation."""

    def __init__(self, mlflow_tracking_uri: str | None = None) -> None:
        if mlflow_tracking_uri:
            mlflow.set_tracking_uri(mlflow_tracking_uri)
        self._scaler: StandardScaler | None = None
        self._label_encoders: dict[str, LabelEncoder] = {}
        self._feature_cols: list[str] = []

    # ------------------------------------------------------------------
    # Feature engineering
    # ------------------------------------------------------------------

    def prepare_features(
        self,
        df: pd.DataFrame,
        exclude_cols: list[str] | None = None,
        fit: bool = True,
    ) -> np.ndarray:
        """
        Encode, scale, and select numeric features for clustering.

        Args:
            df:           Input DataFrame.
            exclude_cols: Columns to exclude (e.g. IDs).
            fit:          If True, fit the scaler and encoders (training mode).

        Returns:
            Scaled feature matrix as a NumPy array.
        """
        df = df.copy()
        exclude_set = set(exclude_cols or ["customer_id", "id"])

        # Label-encode categoricals
        for col in df.select_dtypes(include=["object", "category"]).columns:
            if col in exclude_set:
                continue
            if fit:
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
                self._label_encoders[col] = le
            elif col in self._label_encoders:
                le = self._label_encoders[col]
                known = set(le.classes_)
                df[col] = df[col].astype(str).apply(
                    lambda v, _known=known, _le=le: v if v in _known else _le.classes_[0]
                )
                df[col] = le.transform(df[col])
            else:
                df = df.drop(columns=[col])

        # Select numeric columns
        numeric_cols = [
            c for c in df.select_dtypes(include=[np.number]).columns
            if c not in exclude_set
        ]
        df = df[numeric_cols].fillna(0)

        if fit:
            self._feature_cols = numeric_cols
            self._scaler = StandardScaler()
            X = self._scaler.fit_transform(df)
        else:
            # Align columns with training
            for col in self._feature_cols:
                if col not in df.columns:
                    df[col] = 0.0
            df = df[self._feature_cols]
            X = self._scaler.transform(df) if self._scaler else df.to_numpy()

        return X

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train(
        self,
        df: pd.DataFrame,
        n_clusters: int = _DEFAULT_N_CLUSTERS,
        experiment_name: str = "customer_segmentation",
        exclude_cols: list[str] | None = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """
        Fit K-Means and log cluster metrics to MLflow.

        Args:
            df:              Raw input DataFrame.
            n_clusters:      Number of clusters.
            experiment_name: MLflow experiment name.
            exclude_cols:    Columns to exclude from feature set.

        Returns:
            dict with: run_id, metrics (silhouette, davies_bouldin, inertia),
                       cluster_sizes, n_clusters.
        """
        X = self.prepare_features(df, exclude_cols=exclude_cols, fit=True)

        mlflow.set_experiment(experiment_name)
        with mlflow.start_run():
            model = KMeans(
                n_clusters=n_clusters,
                init="k-means++",
                n_init=10,
                max_iter=300,
                random_state=42,
            )
            labels = model.fit_predict(X)

            silhouette = float(silhouette_score(X, labels)) if len(set(labels)) > 1 else 0.0
            db_index = float(davies_bouldin_score(X, labels)) if len(set(labels)) > 1 else float("inf")
            inertia = float(model.inertia_)

            unique, counts = np.unique(labels, return_counts=True)
            cluster_sizes = {int(k): int(v) for k, v in zip(unique, counts)}

            mlflow.log_params({"n_clusters": n_clusters, "init": "k-means++"})
            mlflow.log_metrics({
                "silhouette_score": silhouette,
                "davies_bouldin_index": db_index,
                "inertia": inertia,
            })
            mlflow.sklearn.log_model(model, "segmentation_model")

            # Persist scaler params as JSON (safe, no pickle)
            scaler_params: dict[str, Any] = {}
            if self._scaler is not None:
                scaler_params = {
                    "mean_": self._scaler.mean_.tolist(),
                    "scale_": self._scaler.scale_.tolist(),
                    "feature_cols": self._feature_cols,
                }
            scaler_json_path = "/tmp/scaler_params.json"  # noqa: S108
            with open(scaler_json_path, "w") as f:
                json.dump(scaler_params, f)
            mlflow.log_artifact(scaler_json_path, "scaler")

            run_id: str = mlflow.active_run().info.run_id  # type: ignore[union-attr]

        logger.info(
            "CustomerSegmentationPipeline trained | silhouette=%.4f db=%.4f "
            "inertia=%.2f n_clusters=%d run_id=%s",
            silhouette, db_index, inertia, n_clusters, run_id,
        )

        return {
            "run_id": run_id,
            "metrics": {
                "silhouette_score": silhouette,
                "davies_bouldin_index": db_index,
                "inertia": inertia,
            },
            "cluster_sizes": cluster_sizes,
            "n_clusters": n_clusters,
        }

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    def predict(
        self,
        model_run_id: str,
        input_df: pd.DataFrame,
        target_col: str = "segment",
    ) -> list[int]:
        """
        Assign cluster labels to new customers.

        Args:
            model_run_id: MLflow run ID.
            input_df:     Raw input DataFrame.
            target_col:   Unused (present for interface consistency).

        Returns:
            List of integer cluster labels.
        """
        model = mlflow.sklearn.load_model(f"runs:/{model_run_id}/segmentation_model")
        X = self.prepare_features(input_df, fit=False)
        return model.predict(X).tolist()
