"""
Shared ML utilities for the BEV Analytics platform.

Functions here are intentionally generic — they do not import from any
specific pipeline so they can be used across all departments without
circular dependencies.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Dataset loading
# ---------------------------------------------------------------------------


def load_dataset(path: str | Path, **read_kwargs: Any) -> pd.DataFrame:
    """
    Load a dataset from a CSV, Parquet, or JSON file.

    Args:
        path:         Absolute or relative path to the data file.
        **read_kwargs: Extra keyword arguments forwarded to the pandas reader.

    Returns:
        Loaded DataFrame.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError:        If the file extension is not supported.
    """
    file_path = Path(path)
    if not file_path.exists():
        raise FileNotFoundError(f"Dataset file not found: {file_path}")

    suffix = file_path.suffix.lower()
    loaders = {
        ".csv": pd.read_csv,
        ".tsv": lambda p, **kw: pd.read_csv(p, sep="\t", **kw),
        ".parquet": pd.read_parquet,
        ".json": pd.read_json,
        ".jsonl": lambda p, **kw: pd.read_json(p, lines=True, **kw),
    }

    if suffix not in loaders:
        raise ValueError(
            f"Unsupported file format '{suffix}'. "
            f"Supported: {sorted(loaders.keys())}"
        )

    df = loaders[suffix](file_path, **read_kwargs)
    logger.info("Loaded dataset: %s (%d rows × %d cols)", file_path.name, len(df), len(df.columns))
    return df


# ---------------------------------------------------------------------------
# Metric calculation
# ---------------------------------------------------------------------------


def calculate_metrics(
    y_true: np.ndarray | pd.Series,
    y_pred: np.ndarray | pd.Series,
    task: str = "regression",
    y_prob: np.ndarray | pd.Series | None = None,
) -> dict[str, float]:
    """
    Compute a standard set of evaluation metrics for a given task type.

    Args:
        y_true: Ground-truth labels or values.
        y_pred: Model predictions.
        task:   ``"regression"`` or ``"classification"``.
        y_prob: Predicted probabilities (classification only, for ROC-AUC).

    Returns:
        dict of metric_name → float value.

    Raises:
        ValueError: If ``task`` is not recognised.
    """
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)

    if task == "regression":
        mae = float(np.mean(np.abs(y_true - y_pred)))
        mse = float(np.mean((y_true - y_pred) ** 2))
        rmse = float(np.sqrt(mse))
        # MAPE — avoid divide-by-zero
        with np.errstate(divide="ignore", invalid="ignore"):
            mape = float(np.mean(np.abs((y_true - y_pred) / (np.abs(y_true) + 1e-8))) * 100)
        ss_res = np.sum((y_true - y_pred) ** 2)
        ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
        r2 = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0
        return {"mae": mae, "mse": mse, "rmse": rmse, "mape": mape, "r2": r2}

    if task == "classification":
        from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

        accuracy = float(accuracy_score(y_true, y_pred))
        precision = float(precision_score(y_true, y_pred, average="weighted", zero_division=0))
        recall = float(recall_score(y_true, y_pred, average="weighted", zero_division=0))
        f1 = float(f1_score(y_true, y_pred, average="weighted", zero_division=0))
        metrics: dict[str, float] = {
            "accuracy": accuracy,
            "precision": precision,
            "recall": recall,
            "f1_weighted": f1,
        }
        if y_prob is not None:
            from sklearn.metrics import roc_auc_score
            try:
                y_prob_arr = np.asarray(y_prob)
                if y_prob_arr.ndim == 2 and y_prob_arr.shape[1] == 2:
                    y_prob_arr = y_prob_arr[:, 1]
                roc_auc = float(roc_auc_score(y_true, y_prob_arr))
                metrics["roc_auc"] = roc_auc
            except ValueError as exc:
                logger.warning("Could not compute ROC-AUC: %s", exc)
        return metrics

    if task == "clustering":
        from sklearn.metrics import davies_bouldin_score, silhouette_score

        # y_pred contains cluster labels; y_true contains the feature matrix (passed as array)
        labels = y_pred.astype(int)
        n_unique = len(set(labels))
        if n_unique < 2:
            return {"silhouette_score": 0.0, "davies_bouldin_index": float("inf")}
        # y_true is treated as the feature matrix for clustering metrics
        silhouette = float(silhouette_score(y_true, labels))
        db_index = float(davies_bouldin_score(y_true, labels))
        return {"silhouette_score": silhouette, "davies_bouldin_index": db_index}

    raise ValueError(f"Unsupported task: '{task}'. Use 'regression', 'classification', or 'clustering'.")


# ---------------------------------------------------------------------------
# Result formatting
# ---------------------------------------------------------------------------


def format_results(
    run_id: str,
    metrics: dict[str, float],
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Format pipeline results into a standardised response envelope.

    Args:
        run_id:  MLflow run ID.
        metrics: Metric name → float value mapping.
        extra:   Optional additional fields (feature_importance, classes, etc.).

    Returns:
        Standardised result dict ready for API serialisation.
    """
    result: dict[str, Any] = {
        "run_id": run_id,
        "metrics": {k: round(v, 6) for k, v in metrics.items()},
        "status": "success",
    }
    if extra:
        result.update(extra)
    return result


def describe_dataset(df: pd.DataFrame) -> dict[str, Any]:
    """
    Produce a concise statistical summary of a DataFrame.

    Args:
        df: Input DataFrame.

    Returns:
        dict with shape, dtypes, missing-value counts, and numeric summary stats.
    """
    numeric_summary = (
        df.describe(include=[np.number])
        .round(4)
        .to_dict()
    )
    missing = df.isnull().sum()
    missing_counts = {col: int(cnt) for col, cnt in missing.items() if cnt > 0}

    return {
        "n_rows": len(df),
        "n_cols": len(df.columns),
        "columns": df.columns.tolist(),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "missing_values": missing_counts,
        "numeric_summary": numeric_summary,
    }
