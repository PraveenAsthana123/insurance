"""
Sentiment Analysis / NLP Pipeline — Governance department.

Classifies text (product reviews, complaints, recall reasons) as
positive / negative / neutral using a TF-IDF + Logistic Regression
pipeline. Results are logged to MLflow.

For production upgrade paths, replace the sklearn classifier with a
fine-tuned transformer (e.g. HuggingFace distilbert-base-uncased).
"""
from __future__ import annotations

import logging
from typing import Any

import mlflow
import mlflow.sklearn
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer

from ml.features.text_features import add_text_features, clean_text

logger = logging.getLogger(__name__)

_TEXT_COL_DEFAULT = "text"
_TARGET_COL_DEFAULT = "label"


class SentimentAnalysisPipeline:
    """TF-IDF + Logistic Regression text classification pipeline."""

    def __init__(self, mlflow_tracking_uri: str | None = None) -> None:
        if mlflow_tracking_uri:
            mlflow.set_tracking_uri(mlflow_tracking_uri)

    # ------------------------------------------------------------------
    # Feature engineering
    # ------------------------------------------------------------------

    def prepare_features(
        self,
        df: pd.DataFrame,
        text_col: str = _TEXT_COL_DEFAULT,
        target_col: str = _TARGET_COL_DEFAULT,
    ) -> tuple[list[str], pd.Series | None]:
        """
        Clean text and extract the target series.

        Args:
            df:         Input DataFrame.
            text_col:   Column containing raw text.
            target_col: Column containing class labels.

        Returns:
            Tuple of (cleaned_texts, labels_series_or_None).
        """
        if text_col not in df.columns:
            # Try to infer a text column — use the first object column
            obj_cols = df.select_dtypes(include=["object"]).columns.tolist()
            text_col = obj_cols[0] if obj_cols else ""

        texts = df[text_col].fillna("").astype(str).apply(clean_text).tolist()
        y = df[target_col] if target_col in df.columns else None
        return texts, y

    def _infer_labels(self, df: pd.DataFrame, target_col: str) -> pd.Series:
        """
        If labels are not present, synthesise them from the polarity score
        so the pipeline can still demonstrate training.
        """
        from ml.features.text_features import polarity_score

        obj_cols = df.select_dtypes(include=["object"]).columns.tolist()
        text_col = obj_cols[0] if obj_cols else None

        if text_col:
            polarities = df[text_col].fillna("").astype(str).apply(polarity_score)
            return polarities.apply(
                lambda p: "positive" if p > 0.1 else ("negative" if p < -0.1 else "neutral")
            )
        return pd.Series(["neutral"] * len(df))

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train(
        self,
        df: pd.DataFrame,
        text_col: str = _TEXT_COL_DEFAULT,
        target_col: str = _TARGET_COL_DEFAULT,
        experiment_name: str = "sentiment_analysis",
        max_features: int = 5000,
        ngram_range: tuple[int, int] = (1, 2),
        C: float = 1.0,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """
        Train a TF-IDF + Logistic Regression classifier.

        If the target column is absent, polarity-based pseudo-labels are
        generated so the pipeline can still produce a demo run.

        Args:
            df:              Input DataFrame with a text column.
            text_col:        Name of the text column.
            target_col:      Name of the label column.
            experiment_name: MLflow experiment name.
            max_features:    TF-IDF vocabulary size.
            ngram_range:     N-gram range for TF-IDF.
            C:               Logistic Regression regularisation strength.

        Returns:
            dict with: run_id, metrics (accuracy, f1_weighted), classes.
        """
        texts, y = self.prepare_features(df, text_col=text_col, target_col=target_col)

        if y is None:
            logger.warning(
                "Target column '%s' not found — using polarity-based pseudo-labels.", target_col
            )
            y = self._infer_labels(df, target_col)

        X_train, X_test, y_train, y_test = train_test_split(
            texts, y, test_size=0.2, random_state=42, stratify=y
        )

        mlflow.set_experiment(experiment_name)
        with mlflow.start_run():
            pipeline = Pipeline([
                (
                    "tfidf",
                    TfidfVectorizer(
                        max_features=max_features,
                        ngram_range=ngram_range,
                        sublinear_tf=True,
                        strip_accents="unicode",
                    ),
                ),
                (
                    "clf",
                    LogisticRegression(
                        C=C,
                        max_iter=500,
                        multi_class="auto",
                        solver="lbfgs",
                        random_state=42,
                    ),
                ),
            ])
            pipeline.fit(X_train, y_train)
            y_pred = pipeline.predict(X_test)

            accuracy = float(accuracy_score(y_test, y_pred))
            f1_weighted = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))
            clf_report = classification_report(y_test, y_pred, output_dict=True)

            classes = pipeline.classes_.tolist()

            mlflow.log_params({
                "max_features": max_features,
                "ngram_range": str(ngram_range),
                "C": C,
            })
            mlflow.log_metrics({"accuracy": accuracy, "f1_weighted": f1_weighted})
            mlflow.sklearn.log_model(pipeline, "sentiment_model")

            run_id: str = mlflow.active_run().info.run_id  # type: ignore[union-attr]

        logger.info(
            "SentimentAnalysisPipeline trained | Accuracy=%.4f F1=%.4f run_id=%s",
            accuracy, f1_weighted, run_id,
        )

        return {
            "run_id": run_id,
            "metrics": {"accuracy": accuracy, "f1_weighted": f1_weighted},
            "classification_report": clf_report,
            "classes": classes,
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
        Classify text records and return label + probabilities.

        Args:
            model_run_id: MLflow run ID.
            input_df:     DataFrame with a text column.
            target_col:   Unused (interface consistency).

        Returns:
            List of dicts: [{label, probabilities}, ...]
        """
        pipeline = mlflow.sklearn.load_model(f"runs:/{model_run_id}/sentiment_model")

        obj_cols = input_df.select_dtypes(include=["object"]).columns.tolist()
        text_col = obj_cols[0] if obj_cols else "text"
        texts = input_df[text_col].fillna("").astype(str).apply(clean_text).tolist()

        labels = pipeline.predict(texts)
        probs_matrix = pipeline.predict_proba(texts)
        classes = pipeline.classes_.tolist()

        return [
            {
                "label": str(lbl),
                "probabilities": {cls: float(p) for cls, p in zip(classes, probs)},
            }
            for lbl, probs in zip(labels, probs_matrix)
        ]
