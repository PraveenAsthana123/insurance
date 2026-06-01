"""
Predictive Maintenance Pipeline — Manufacturing / Maintenance departments.

Combines a Random Forest classifier for failure prediction with an
Isolation Forest for unsupervised anomaly detection. Results are logged
to MLflow.
"""
from __future__ import annotations

import logging
from typing import Any

import mlflow
import mlflow.sklearn
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

logger = logging.getLogger(__name__)

_TARGET_COL_DEFAULT = "failure"


class PredictiveMaintenancePipeline:
    """
    Two-stage maintenance pipeline:
      1. Random Forest classifier — predicts binary failure event.
      2. Isolation Forest — detects novel anomalies in sensor readings.
    """

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
        Encode categoricals, drop non-numeric columns, handle missing values.

        Args:
            df:           Input DataFrame.
            target_col:   Target column (excluded from feature encoding).
            fit_encoders: Fit new LabelEncoders if True (training mode).

        Returns:
            Prepared DataFrame.
        """
        df = df.copy()

        # Parse datetime columns to numeric (timestamp → unix epoch)
        for col in df.select_dtypes(include=["datetime64", "object"]).columns:
            if col == target_col:
                continue
            try:
                converted = pd.to_datetime(df[col], errors="raise")
                df[col] = converted.astype(np.int64) // 10 ** 9
                continue
            except (ValueError, TypeError):
                pass
            # Try label encoding
            if fit_encoders:
                le = LabelEncoder()
                df[col] = le.fit_transform(df[col].astype(str))
                self._label_encoders[col] = le
            elif col in self._label_encoders:
                le = self._label_encoders[col]
                known = set(le.classes_)
                df[col] = df[col].astype(str).apply(
                    lambda v, _k=known, _le=le: v if v in _k else _le.classes_[0]
                )
                df[col] = le.transform(df[col])
            else:
                df = df.drop(columns=[col])

        # Fill remaining NaNs with median
        df = df.fillna(df.median(numeric_only=True))
        return df

    def _feature_matrix(
        self, df: pd.DataFrame, target_col: str
    ) -> tuple[pd.DataFrame, pd.Series | None]:
        exclude = {target_col, "failure_type", "id", "record_id"}
        numeric_cols = [
            c for c in df.select_dtypes(include=[np.number]).columns
            if c not in exclude
        ]
        X = df[numeric_cols]
        y = df[target_col] if target_col in df.columns else None
        return X, y

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train(
        self,
        df: pd.DataFrame,
        target_col: str = _TARGET_COL_DEFAULT,
        experiment_name: str = "predictive_maintenance",
        n_estimators: int = 200,
        class_weight: str = "balanced",
        anomaly_contamination: float = 0.05,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """
        Train Random Forest classifier + Isolation Forest anomaly detector.

        Args:
            df:                    Raw input DataFrame.
            target_col:            Binary target column (0 = no failure, 1 = failure).
            experiment_name:       MLflow experiment name.
            n_estimators:          Number of trees in Random Forest.
            class_weight:          Class weighting strategy ('balanced' handles imbalanced data).
            anomaly_contamination: Expected fraction of anomalies for Isolation Forest.

        Returns:
            dict with: run_id, metrics, classification_report.
        """
        df = self.prepare_features(df, target_col=target_col, fit_encoders=True)
        X, y = self._feature_matrix(df, target_col)

        if y is None:
            raise ValueError(f"Target column '{target_col}' not found in DataFrame")

        # Convert target to binary int
        y = y.astype(int)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        mlflow.set_experiment(experiment_name)
        with mlflow.start_run():
            # --- Random Forest classifier ---
            clf = RandomForestClassifier(
                n_estimators=n_estimators,
                class_weight=class_weight,
                n_jobs=-1,
                random_state=42,
            )
            clf.fit(X_train, y_train)
            y_pred = clf.predict(X_test)
            y_prob = clf.predict_proba(X_test)[:, 1]

            accuracy = float(accuracy_score(y_test, y_pred))
            precision = float(precision_score(y_test, y_pred, zero_division=0))
            recall = float(recall_score(y_test, y_pred, zero_division=0))
            f1 = float(f1_score(y_test, y_pred, zero_division=0))
            roc_auc = float(roc_auc_score(y_test, y_prob))
            clf_report = classification_report(y_test, y_pred, output_dict=True)

            # --- Isolation Forest (unsupervised anomaly detection) ---
            iso_forest = IsolationForest(
                contamination=anomaly_contamination,
                n_estimators=100,
                random_state=42,
                n_jobs=-1,
            )
            iso_forest.fit(X_train)

            mlflow.log_params({
                "n_estimators": n_estimators,
                "class_weight": class_weight,
                "anomaly_contamination": anomaly_contamination,
            })
            mlflow.log_metrics({
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "roc_auc": roc_auc,
            })
            mlflow.sklearn.log_model(clf, "failure_classifier")
            mlflow.sklearn.log_model(iso_forest, "anomaly_detector")

            run_id: str = mlflow.active_run().info.run_id  # type: ignore[union-attr]

        logger.info(
            "PredictiveMaintenancePipeline trained | Accuracy=%.4f F1=%.4f ROC-AUC=%.4f run_id=%s",
            accuracy, f1, roc_auc, run_id,
        )

        return {
            "run_id": run_id,
            "metrics": {
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "roc_auc": roc_auc,
            },
            "classification_report": clf_report,
            "feature_importance": dict(
                zip(X.columns.tolist(), clf.feature_importances_.tolist())
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
    ) -> list[dict[str, Any]]:
        """
        Predict failure probability and anomaly flag for new readings.

        Args:
            model_run_id: MLflow run ID.
            input_df:     Raw sensor reading DataFrame.
            target_col:   Target column name (excluded from features).

        Returns:
            List of dicts: [{failure_prob, failure_pred, is_anomaly}, ...]
        """
        clf = mlflow.sklearn.load_model(f"runs:/{model_run_id}/failure_classifier")
        iso_forest = mlflow.sklearn.load_model(f"runs:/{model_run_id}/anomaly_detector")

        df = self.prepare_features(input_df, target_col=target_col, fit_encoders=False)
        X, _ = self._feature_matrix(df, target_col)

        failure_probs = clf.predict_proba(X)[:, 1]
        failure_preds = clf.predict(X)
        anomaly_labels = iso_forest.predict(X)  # -1 = anomaly, 1 = normal

        results = []
        for prob, pred, anm in zip(failure_probs, failure_preds, anomaly_labels):
            results.append({
                "failure_prob": float(prob),
                "failure_pred": int(pred),
                "is_anomaly": bool(anm == -1),
            })
        return results
