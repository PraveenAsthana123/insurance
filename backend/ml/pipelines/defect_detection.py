"""
Defect Detection Pipeline — Quality department.

Classifies manufacturing defects using:
  - scikit-learn's GradientBoostingClassifier on tabular metadata (current default)
  - TensorFlow/Keras CNN placeholder for image-based classification

The pipeline is designed so the sklearn path works without a GPU or
TensorFlow installation. Swap to the CNN path when image data is available
and TensorFlow is installed.
"""
from __future__ import annotations

import logging
from typing import Any

import mlflow
import mlflow.sklearn
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

logger = logging.getLogger(__name__)

_TARGET_COL_DEFAULT = "defect_detected"


class DefectDetectionPipeline:
    """
    Defect detection pipeline.

    Tabular mode (default): GradientBoostingClassifier on quality metadata.
    Image mode (TF placeholder): CNN on image pixels — enable by setting
    ``use_cnn=True`` in ``train()`` (requires TensorFlow).
    """

    def __init__(self, mlflow_tracking_uri: str | None = None) -> None:
        if mlflow_tracking_uri:
            mlflow.set_tracking_uri(mlflow_tracking_uri)
        self._label_encoders: dict[str, LabelEncoder] = {}
        self._feature_cols: list[str] = []

    # ------------------------------------------------------------------
    # Feature engineering (tabular)
    # ------------------------------------------------------------------

    def prepare_features(
        self,
        df: pd.DataFrame,
        target_col: str = _TARGET_COL_DEFAULT,
        fit_encoders: bool = True,
    ) -> pd.DataFrame:
        """
        Encode categoricals and select numeric columns for tabular mode.

        Args:
            df:           Input DataFrame with quality-control metadata.
            target_col:   Binary target (0 = pass, 1 = defect).
            fit_encoders: Fit LabelEncoders if True (training).

        Returns:
            Prepared DataFrame.
        """
        df = df.copy()
        skip = {target_col, "sample_id", "id", "image_file"}

        for col in df.select_dtypes(include=["object", "category"]).columns:
            if col in skip:
                continue
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

        df = df.fillna(0)
        return df

    # ------------------------------------------------------------------
    # CNN placeholder (TensorFlow)
    # ------------------------------------------------------------------

    @staticmethod
    def _build_cnn(input_shape: tuple[int, int, int] = (224, 224, 3), n_classes: int = 2) -> Any:
        """
        Build a minimal CNN for image classification.

        Requires TensorFlow to be installed. This is a placeholder — replace
        with a pre-trained backbone (e.g. MobileNetV2) for production use.

        Args:
            input_shape: (height, width, channels).
            n_classes:   Number of output classes.

        Returns:
            Compiled Keras model.
        """
        try:
            import tensorflow as tf  # noqa: PLC0415
            from tensorflow import keras  # noqa: PLC0415

            model = keras.Sequential([
                keras.layers.Input(shape=input_shape),
                keras.layers.Conv2D(32, (3, 3), activation="relu", padding="same"),
                keras.layers.MaxPooling2D(2, 2),
                keras.layers.Conv2D(64, (3, 3), activation="relu", padding="same"),
                keras.layers.MaxPooling2D(2, 2),
                keras.layers.GlobalAveragePooling2D(),
                keras.layers.Dense(128, activation="relu"),
                keras.layers.Dropout(0.4),
                keras.layers.Dense(n_classes, activation="softmax"),
            ])
            model.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
                loss="sparse_categorical_crossentropy",
                metrics=["accuracy"],
            )
            return model
        except ImportError:
            raise ImportError(
                "TensorFlow is required for CNN mode. "
                "Install it with: pip install tensorflow"
            ) from None

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train(
        self,
        df: pd.DataFrame,
        target_col: str = _TARGET_COL_DEFAULT,
        experiment_name: str = "defect_detection",
        n_estimators: int = 200,
        learning_rate: float = 0.05,
        max_depth: int = 5,
        use_cnn: bool = False,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """
        Train a defect detector and log to MLflow.

        Args:
            df:              Quality-control metadata DataFrame.
            target_col:      Binary target column.
            experiment_name: MLflow experiment name.
            n_estimators:    GBM number of estimators.
            learning_rate:   GBM learning rate.
            max_depth:       GBM max tree depth.
            use_cnn:         Set True to use the TF CNN path (image arrays
                             must be provided separately — not yet wired up
                             in this scaffold).

        Returns:
            dict with: run_id, metrics, classification_report.
        """
        if use_cnn:
            logger.warning(
                "CNN path selected but no image arrays provided. "
                "Falling back to tabular GBM mode."
            )

        df = self.prepare_features(df, target_col=target_col, fit_encoders=True)

        exclude = {target_col, "sample_id", "id", "image_file"}
        numeric_cols = [
            c for c in df.select_dtypes(include=[np.number]).columns
            if c not in exclude
        ]
        self._feature_cols = numeric_cols

        X = df[numeric_cols]
        y = df[target_col].astype(int)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        mlflow.set_experiment(experiment_name)
        with mlflow.start_run():
            model = GradientBoostingClassifier(
                n_estimators=n_estimators,
                learning_rate=learning_rate,
                max_depth=max_depth,
                random_state=42,
            )
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            y_prob = model.predict_proba(X_test)[:, 1]

            accuracy = float(accuracy_score(y_test, y_pred))
            f1 = float(f1_score(y_test, y_pred, zero_division=0))
            roc_auc = float(roc_auc_score(y_test, y_prob))
            clf_report = classification_report(y_test, y_pred, output_dict=True)

            mlflow.log_params({
                "n_estimators": n_estimators,
                "learning_rate": learning_rate,
                "max_depth": max_depth,
                "mode": "tabular_gbm",
            })
            mlflow.log_metrics({
                "accuracy": accuracy,
                "f1": f1,
                "roc_auc": roc_auc,
            })
            mlflow.sklearn.log_model(model, "defect_model")

            run_id: str = mlflow.active_run().info.run_id  # type: ignore[union-attr]

        logger.info(
            "DefectDetectionPipeline trained | Accuracy=%.4f F1=%.4f ROC-AUC=%.4f run_id=%s",
            accuracy, f1, roc_auc, run_id,
        )

        return {
            "run_id": run_id,
            "metrics": {"accuracy": accuracy, "f1": f1, "roc_auc": roc_auc},
            "classification_report": clf_report,
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
    ) -> list[dict[str, Any]]:
        """
        Predict defect probability for new quality-control samples.

        Args:
            model_run_id: MLflow run ID.
            input_df:     Quality-control metadata DataFrame.
            target_col:   Target column name (excluded from features).

        Returns:
            List of dicts: [{defect_prob, defect_pred}, ...]
        """
        model = mlflow.sklearn.load_model(f"runs:/{model_run_id}/defect_model")
        df = self.prepare_features(input_df, target_col=target_col, fit_encoders=False)

        exclude = {target_col, "sample_id", "id", "image_file"}
        numeric_cols = [
            c for c in df.select_dtypes(include=[np.number]).columns
            if c not in exclude
        ]
        X = df[numeric_cols]

        probs = model.predict_proba(X)[:, 1]
        preds = model.predict(X)

        return [
            {"defect_prob": float(p), "defect_pred": int(pred)}
            for p, pred in zip(probs, preds)
        ]
