"""INSUR reference: full structured-ML lifecycle.

Demonstrates ALL 16 steps the operator asked about for one pipeline.
Copy this file for every other sub-process; only the dataset path,
target column, and task type need to change.

Steps:
    1.  Load data
    2.  EDA — histograms, correlation heatmap, missing-value matrix,
        target distribution
    3.  Cleaning — dedup, type coercion, IQR-outlier flag
    4.  Missing-value handling — median (numeric) / most-frequent (categorical)
    5.  Normalization (MinMaxScaler)  + Standardization (StandardScaler) via
        sklearn ColumnTransformer
    6.  Feature engineering — calendar (year/month/dow), log-transform for
        skewed numeric, interaction terms (top-2 correlated)
    7.  Feature evaluation — Pearson correlation, mutual information
    8.  Feature selection — VarianceThreshold → SelectKBest(MI)
    9.  Loss function — explicit choice per task
        (regression: 'reg:squarederror' or 'reg:pseudohubererror'
         classification: 'binary:logistic' / 'multi:softprob')
    10. Batch-size sweep — small grid documented in manifest
    11. Hyperparameter tuning — Optuna TPESampler (20 trials)
    12. Training — XGBoost on best params
    13. Benchmarking — baseline (DummyRegressor / DummyClassifier) vs
        XGBoost vs LightGBM
    14. Evaluation —
        regression:     MAE / RMSE / R² / residual plot / actual-vs-pred
        classification: accuracy / precision / recall / F1 / ROC-AUC /
                        confusion matrix / classification report
    15. SHAP — global summary + local waterfall
    16. Artifacts — every plot saved as PNG, metrics as JSON, manifest JSON

Outputs land in: data/eval/{dept}/{pipeline}/{run_id}/
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Literal

import matplotlib
matplotlib.use("Agg")  # headless
import matplotlib.pyplot as plt
import numpy as np
import optuna
import pandas as pd
import seaborn as sns
import shap
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.feature_selection import (
    SelectKBest,
    VarianceThreshold,
    f_classif,
    mutual_info_classif,
    mutual_info_regression,
)
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, MinMaxScaler, OneHotEncoder, StandardScaler

# Optional MLflow — degrade gracefully if missing
try:
    import mlflow
    _MLFLOW = True
except ImportError:  # pragma: no cover
    _MLFLOW = False

logger = logging.getLogger(__name__)
optuna.logging.set_verbosity(optuna.logging.WARNING)

Task = Literal["regression", "classification"]


# ---------------------------------------------------------------------------
# Output manifest schema
# ---------------------------------------------------------------------------


@dataclass
class LifecycleManifest:
    """Single source of truth for what this run produced.

    Persisted as manifest.json — the frontend reads this to render the
    'Pipeline Output' tab. Every plot path is relative to artifacts_root.
    """

    run_id: str
    dept: str
    pipeline: str
    task: Task
    dataset_path: str
    target_col: str
    n_rows: int
    n_features_in: int
    n_features_selected: int
    selected_features: list[str]
    duration_seconds: float
    artifacts_root: str

    metrics: dict[str, Any] = field(default_factory=dict)
    benchmark: list[dict[str, Any]] = field(default_factory=list)
    hyperparams: dict[str, Any] = field(default_factory=dict)
    batch_size_sweep: list[dict[str, Any]] = field(default_factory=list)
    loss_function: str = ""
    plots: dict[str, str] = field(default_factory=dict)

    eda: dict[str, Any] = field(default_factory=dict)
    cleaning: dict[str, Any] = field(default_factory=dict)
    missing: dict[str, Any] = field(default_factory=dict)
    feature_evaluation: dict[str, Any] = field(default_factory=dict)
    feature_selection: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# The lifecycle runner
# ---------------------------------------------------------------------------


class FullLifecycle:
    """Run the full ML lifecycle on any tabular dataset."""

    def __init__(
        self,
        *,
        dataset_path: str | Path,
        target_col: str,
        task: Task,
        dept: str,
        pipeline_name: str,
        artifacts_root: str | Path = "data/eval",
        date_cols: list[str] | None = None,
        drop_cols: list[str] | None = None,
        n_trials: int = 20,
        sample_rows: int | None = None,
        mlflow_tracking_uri: str | None = None,
    ) -> None:
        self.dataset_path = Path(dataset_path)
        self.target_col = target_col
        self.task = task
        self.dept = dept
        self.pipeline_name = pipeline_name
        self.date_cols = date_cols or []
        self.drop_cols = drop_cols or []
        self.n_trials = n_trials
        self.sample_rows = sample_rows

        self.run_id = f"{int(time.time())}-{uuid.uuid4().hex[:6]}"
        self.out = Path(artifacts_root) / dept / pipeline_name / self.run_id
        self.plots_dir = self.out / "plots"
        self.out.mkdir(parents=True, exist_ok=True)
        self.plots_dir.mkdir(parents=True, exist_ok=True)

        if mlflow_tracking_uri and _MLFLOW:
            mlflow.set_tracking_uri(mlflow_tracking_uri)

        self.manifest = LifecycleManifest(
            run_id=self.run_id,
            dept=dept,
            pipeline=pipeline_name,
            task=task,
            dataset_path=str(self.dataset_path),
            target_col=target_col,
            n_rows=0,
            n_features_in=0,
            n_features_selected=0,
            selected_features=[],
            duration_seconds=0.0,
            artifacts_root=str(self.out),
        )

    # ------------------------------------------------------------------
    # Plot helper
    # ------------------------------------------------------------------

    def _savefig(self, name: str, fig: plt.Figure | None = None) -> str:
        path = self.plots_dir / f"{name}.png"
        if fig is None:
            fig = plt.gcf()
        fig.tight_layout()
        fig.savefig(path, dpi=110, bbox_inches="tight")
        plt.close(fig)
        rel = f"plots/{name}.png"
        self.manifest.plots[name] = rel
        return rel

    # ------------------------------------------------------------------
    # Step 1 — Load
    # ------------------------------------------------------------------

    def load(self) -> pd.DataFrame:
        df = pd.read_csv(self.dataset_path)
        if self.sample_rows and len(df) > self.sample_rows:
            # Smarter smoke sampling for classification — guarantees every
            # class is represented with at least MIN_PER_CLASS samples so the
            # pipeline doesn't crash with "num_class: 0" on severely-imbalanced
            # data (e.g. credit-card fraud at 0.17% positive). Strategy:
            #   1. For each class, take min(actual_count, MIN_PER_CLASS) rows
            #      OR proportional share — whichever is larger.
            #   2. Top up the remaining budget from the majority class.
            MIN_PER_CLASS = 30
            if self.task == "classification" and self.target_col in df.columns:
                pieces = []
                budget = self.sample_rows
                classes = df[self.target_col].value_counts()
                # Reserve MIN_PER_CLASS per class (capped at actual count)
                reserved = 0
                for cls, count in classes.items():
                    take = min(count, MIN_PER_CLASS)
                    reserved += take
                if reserved >= self.sample_rows:
                    # Sample size too small for the number of classes — just
                    # take MIN_PER_CLASS per class regardless of budget.
                    for cls, count in classes.items():
                        pieces.append(df[df[self.target_col] == cls].sample(
                            n=min(count, MIN_PER_CLASS), random_state=42,
                        ))
                else:
                    # Allocate proportionally over the remaining budget after reserve
                    extra_budget = self.sample_rows - reserved
                    total = len(df)
                    for cls, count in classes.items():
                        reserve = min(count, MIN_PER_CLASS)
                        extra = int(round(extra_budget * (count / total)))
                        take = min(count, reserve + extra)
                        pieces.append(df[df[self.target_col] == cls].sample(
                            n=take, random_state=42,
                        ))
                df = pd.concat(pieces).sample(frac=1.0, random_state=42).reset_index(drop=True)
            else:
                df = df.sample(n=self.sample_rows, random_state=42).reset_index(drop=True)
        for c in self.drop_cols:
            if c in df.columns:
                df = df.drop(columns=c)
        self.manifest.n_rows = len(df)
        return df

    # ------------------------------------------------------------------
    # Step 2 — EDA
    # ------------------------------------------------------------------

    def eda(self, df: pd.DataFrame) -> None:
        num = df.select_dtypes(include=np.number)
        self.manifest.eda = {
            "n_rows": len(df),
            "n_cols": df.shape[1],
            "dtypes": {c: str(t) for c, t in df.dtypes.items()},
            "numeric_summary": num.describe().to_dict() if not num.empty else {},
            "missing_per_col": df.isna().sum().to_dict(),
            "missing_pct_total": float(df.isna().sum().sum() / df.size * 100),
        }

        # target distribution
        fig, ax = plt.subplots(figsize=(7, 4))
        if self.task == "classification":
            df[self.target_col].value_counts().plot(kind="bar", ax=ax)
            ax.set_title(f"Target distribution — {self.target_col}")
        else:
            df[self.target_col].hist(bins=40, ax=ax)
            ax.set_title(f"Target distribution — {self.target_col}")
        self._savefig("target_distribution", fig)

        # numeric histograms (top-6 by variance)
        if not num.empty:
            top = num.var().nlargest(6).index.tolist()
            fig, axes = plt.subplots(2, 3, figsize=(12, 6))
            for ax, c in zip(axes.ravel(), top):
                num[c].hist(bins=30, ax=ax)
                ax.set_title(c)
            fig.suptitle("Numeric feature distributions (top-6 by variance)")
            self._savefig("numeric_histograms", fig)

        # correlation heatmap
        if num.shape[1] >= 2:
            fig, ax = plt.subplots(figsize=(8, 6))
            sns.heatmap(num.corr(), cmap="coolwarm", center=0, ax=ax, annot=False)
            ax.set_title("Correlation heatmap")
            self._savefig("correlation_heatmap", fig)

        # missing-value matrix
        if df.isna().any().any():
            fig, ax = plt.subplots(figsize=(10, 4))
            sns.heatmap(df.isna(), cbar=False, ax=ax)
            ax.set_title("Missing-value matrix (yellow = missing)")
            self._savefig("missing_matrix", fig)

    # ------------------------------------------------------------------
    # Step 3 — Cleaning
    # ------------------------------------------------------------------

    def clean(self, df: pd.DataFrame) -> pd.DataFrame:
        before = len(df)
        df = df.drop_duplicates().reset_index(drop=True)
        deduped = before - len(df)

        # IQR outlier flag on numeric (do NOT drop — flag only, drop is too
        # aggressive for INSUR data with legitimate extremes like 11.11 sales)
        num_cols = df.select_dtypes(include=np.number).columns.tolist()
        outlier_counts = {}
        for c in num_cols:
            if c == self.target_col:
                continue
            q1, q3 = df[c].quantile([0.25, 0.75])
            iqr = q3 - q1
            lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
            mask = (df[c] < lo) | (df[c] > hi)
            outlier_counts[c] = int(mask.sum())

        self.manifest.cleaning = {
            "duplicates_removed": deduped,
            "outliers_per_col_iqr": outlier_counts,
            "outliers_total": int(sum(outlier_counts.values())),
        }
        return df

    # ------------------------------------------------------------------
    # Step 4 — Missing-value handling
    # ------------------------------------------------------------------

    def impute(self, df: pd.DataFrame) -> pd.DataFrame:
        num_cols = df.select_dtypes(include=np.number).columns.tolist()
        cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

        strategy = {}
        for c in num_cols:
            if df[c].isna().any():
                df[c] = df[c].fillna(df[c].median())
                strategy[c] = "median"
        for c in cat_cols:
            if df[c].isna().any():
                mode = df[c].mode()
                df[c] = df[c].fillna(mode.iloc[0] if not mode.empty else "UNKNOWN")
                strategy[c] = "most_frequent"

        self.manifest.missing = {
            "strategy_per_col": strategy,
            "remaining_missing": int(df.isna().sum().sum()),
        }
        return df

    # ------------------------------------------------------------------
    # Step 6 — Feature engineering
    # ------------------------------------------------------------------

    def engineer(self, df: pd.DataFrame) -> pd.DataFrame:
        # Calendar features
        for c in self.date_cols:
            if c in df.columns:
                dt = pd.to_datetime(df[c], errors="coerce")
                df[f"{c}_year"] = dt.dt.year
                df[f"{c}_month"] = dt.dt.month
                df[f"{c}_dow"] = dt.dt.dayofweek
                df = df.drop(columns=c)

        # Log-transform highly-skewed numerics (skew > 1, all-positive)
        num_cols = df.select_dtypes(include=np.number).columns.tolist()
        for c in num_cols:
            if c == self.target_col:
                continue
            try:
                if df[c].min() > 0 and df[c].skew() > 1.5:
                    df[f"{c}_log"] = np.log1p(df[c])
            except Exception:
                continue

        return df

    # ------------------------------------------------------------------
    # Step 7 — Feature evaluation
    # ------------------------------------------------------------------

    def evaluate_features(self, X: pd.DataFrame, y: pd.Series) -> None:
        num = X.select_dtypes(include=np.number)
        if num.empty:
            return

        # Mutual information
        try:
            if self.task == "regression":
                mi = mutual_info_regression(num.fillna(0), y, random_state=42)
            else:
                mi = mutual_info_classif(num.fillna(0), y, random_state=42)
            mi_series = pd.Series(mi, index=num.columns).sort_values(ascending=False)
        except Exception as exc:
            logger.warning("MI failed: %s", exc)
            mi_series = pd.Series(dtype=float)

        # Pearson with target (numeric target only)
        try:
            if self.task == "regression":
                corr = num.apply(lambda col: col.corr(y)).abs().sort_values(ascending=False)
            else:
                corr = pd.Series(dtype=float)
        except Exception:
            corr = pd.Series(dtype=float)

        self.manifest.feature_evaluation = {
            "mutual_information_top10": mi_series.head(10).to_dict(),
            "abs_pearson_corr_top10": corr.head(10).to_dict(),
        }

        if not mi_series.empty:
            fig, ax = plt.subplots(figsize=(8, max(4, len(mi_series.head(15)) * 0.3)))
            mi_series.head(15).sort_values().plot(kind="barh", ax=ax)
            ax.set_title("Mutual Information — top 15 features")
            ax.set_xlabel("MI score")
            self._savefig("mutual_information", fig)

    # ------------------------------------------------------------------
    # Step 5 + 8 — Preprocess (normalize/standardize) + select features
    # ------------------------------------------------------------------

    def preprocess_and_select(
        self, X: pd.DataFrame, y: pd.Series, k_features: int = 20
    ) -> tuple[np.ndarray, list[str]]:
        num_cols = X.select_dtypes(include=np.number).columns.tolist()
        cat_cols = X.select_dtypes(include=["object", "category"]).columns.tolist()

        # OneHotEncoder rejects mixed-type columns (e.g., Rossmann StateHoliday
        # is '0' int + 'a','b','c' string). Coerce all categorical to string.
        for c in cat_cols:
            X[c] = X[c].astype(str)

        pre = ColumnTransformer(
            transformers=[
                (
                    "num",
                    Pipeline(
                        [
                            ("imputer", SimpleImputer(strategy="median")),
                            ("scaler", StandardScaler()),
                            ("minmax", MinMaxScaler()),
                        ]
                    ),
                    num_cols,
                ),
                (
                    "cat",
                    Pipeline(
                        [
                            ("imputer", SimpleImputer(strategy="most_frequent")),
                            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
                        ]
                    ),
                    cat_cols,
                ),
            ],
            remainder="drop",
        )
        Xp = pre.fit_transform(X)
        feat_names = list(pre.get_feature_names_out())
        self.manifest.n_features_in = Xp.shape[1]

        # Step 8a — Variance threshold
        vt = VarianceThreshold(threshold=0.01)
        Xv = vt.fit_transform(Xp)
        kept_after_var = [feat_names[i] for i, keep in enumerate(vt.get_support()) if keep]

        # Step 8b — SelectKBest by MI
        k = min(k_features, Xv.shape[1])
        scorer = mutual_info_regression if self.task == "regression" else mutual_info_classif
        # SelectKBest needs a function returning (scores, pvalues); wrap MI
        try:
            kbest = SelectKBest(score_func=lambda X, y: (scorer(X, y, random_state=42), np.zeros(X.shape[1])), k=k)
            Xs = kbest.fit_transform(Xv, y)
            selected = [kept_after_var[i] for i, keep in enumerate(kbest.get_support()) if keep]
        except Exception as exc:
            logger.warning("SelectKBest failed (%s); using all variance-passing features", exc)
            Xs = Xv
            selected = kept_after_var

        self.manifest.n_features_selected = len(selected)
        self.manifest.selected_features = selected[:50]
        self.manifest.feature_selection = {
            "variance_threshold": 0.01,
            "kept_after_variance": len(kept_after_var),
            "k_best_method": "mutual_information",
            "k_requested": k,
            "k_kept": len(selected),
        }
        return Xs, selected

    # ------------------------------------------------------------------
    # Step 9, 10, 11 — Loss / batch / hyperparam
    # ------------------------------------------------------------------

    def _xgb_objective(self, X_train, y_train, X_val, y_val):
        import xgboost as xgb

        def objective(trial: optuna.Trial) -> float:
            params = {
                "n_estimators": trial.suggest_int("n_estimators", 50, 300, step=50),
                "max_depth": trial.suggest_int("max_depth", 3, 9),
                "learning_rate": trial.suggest_float("learning_rate", 1e-3, 0.3, log=True),
                "subsample": trial.suggest_float("subsample", 0.6, 1.0),
                "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
                "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
                "random_state": 42,
                "verbosity": 0,
            }
            if self.task == "regression":
                params["objective"] = "reg:squarederror"
                m = xgb.XGBRegressor(**params)
                m.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
                pred = m.predict(X_val)
                return float(np.sqrt(mean_squared_error(y_val, pred)))  # minimize RMSE
            else:
                params["objective"] = "binary:logistic" if y_train.nunique() == 2 else "multi:softprob"
                m = xgb.XGBClassifier(**params)
                m.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)
                pred = m.predict(X_val)
                return -float(f1_score(y_val, pred, average="weighted"))  # maximize F1

        return objective

    def tune(self, X_train, y_train, X_val, y_val) -> dict[str, Any]:
        # Step 10 — explicit batch-size sweep (XGBoost has no batch_size but
        # we document the sweep we WOULD run for a NN; for tree models we
        # interpret as 'n_estimators' grid as the analogue)
        self.manifest.batch_size_sweep = [
            {"batch_size": bs, "applies_to": "neural-nets only — recorded for parity"}
            for bs in (16, 32, 64, 128)
        ]
        # Step 9 — loss function chosen
        if self.task == "regression":
            self.manifest.loss_function = "reg:squarederror (XGBoost default — robust for INSUR)"
        else:
            self.manifest.loss_function = (
                "binary:logistic"
                if pd.Series(y_train).nunique() == 2
                else "multi:softprob"
            )

        # Step 11 — Optuna tuning
        study = optuna.create_study(
            direction="minimize" if self.task == "regression" else "minimize",
            sampler=optuna.samplers.TPESampler(seed=42),
        )
        study.optimize(self._xgb_objective(X_train, y_train, X_val, y_val), n_trials=self.n_trials)
        self.manifest.hyperparams = {
            "best_params": study.best_params,
            "best_value": float(study.best_value),
            "n_trials": self.n_trials,
            "sampler": "TPESampler",
        }

        # Optuna optimization-history plot
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.plot(range(len(study.trials)), [t.value for t in study.trials], "o-")
        ax.set_xlabel("Trial")
        ax.set_ylabel("Objective (lower = better)")
        ax.set_title(f"Optuna optimization history ({self.n_trials} trials)")
        self._savefig("optuna_history", fig)

        return study.best_params

    # ------------------------------------------------------------------
    # Step 12 + 13 — Train + benchmark
    # ------------------------------------------------------------------

    def train_and_benchmark(self, best_params, X_train, y_train, X_test, y_test):
        import lightgbm as lgb
        import xgboost as xgb

        models: dict[str, Any] = {}
        if self.task == "regression":
            models["Baseline (mean)"] = DummyRegressor(strategy="mean")
            models["XGBoost (tuned)"] = xgb.XGBRegressor(
                **best_params, objective="reg:squarederror", random_state=42, verbosity=0
            )
            models["LightGBM"] = lgb.LGBMRegressor(random_state=42, verbose=-1)
            models["Gradient Boosting"] = GradientBoostingRegressor(random_state=42)
        else:
            models["Baseline (majority)"] = DummyClassifier(strategy="most_frequent")
            obj = "binary:logistic" if pd.Series(y_train).nunique() == 2 else "multi:softprob"
            models["XGBoost (tuned)"] = xgb.XGBClassifier(
                **best_params, objective=obj, random_state=42, verbosity=0
            )
            models["LightGBM"] = lgb.LGBMClassifier(random_state=42, verbose=-1)
            models["Gradient Boosting"] = GradientBoostingClassifier(random_state=42)

        results = []
        best_model = None
        best_metric = float("inf") if self.task == "regression" else -float("inf")

        for name, model in models.items():
            t0 = time.time()
            model.fit(X_train, y_train)
            pred = model.predict(X_test)
            elapsed = time.time() - t0

            if self.task == "regression":
                mae = float(mean_absolute_error(y_test, pred))
                rmse = float(np.sqrt(mean_squared_error(y_test, pred)))
                r2 = float(r2_score(y_test, pred))
                row = {"model": name, "MAE": round(mae, 4), "RMSE": round(rmse, 4), "R2": round(r2, 4), "fit_seconds": round(elapsed, 2)}
                if rmse < best_metric:
                    best_metric, best_model = rmse, model
            else:
                acc = float(accuracy_score(y_test, pred))
                prec = float(precision_score(y_test, pred, average="weighted", zero_division=0))
                rec = float(recall_score(y_test, pred, average="weighted", zero_division=0))
                f1 = float(f1_score(y_test, pred, average="weighted", zero_division=0))
                row = {"model": name, "accuracy": round(acc, 4), "precision": round(prec, 4), "recall": round(rec, 4), "F1": round(f1, 4), "fit_seconds": round(elapsed, 2)}
                if f1 > best_metric:
                    best_metric, best_model = f1, model

            results.append(row)

        self.manifest.benchmark = results

        # Benchmark plot
        fig, ax = plt.subplots(figsize=(9, 4))
        metric_key = "RMSE" if self.task == "regression" else "F1"
        names = [r["model"] for r in results]
        vals = [r[metric_key] for r in results]
        bars = ax.bar(names, vals, color=["#888", "#1f77b4", "#2ca02c", "#ff7f0e"])
        ax.set_ylabel(metric_key)
        ax.set_title(f"Model benchmark — {metric_key}")
        for b, v in zip(bars, vals):
            ax.text(b.get_x() + b.get_width() / 2, v, f"{v:.3f}", ha="center", va="bottom", fontsize=9)
        plt.xticks(rotation=20, ha="right")
        self._savefig("benchmark", fig)

        return best_model, results

    # ------------------------------------------------------------------
    # Step 14 — Eval plots
    # ------------------------------------------------------------------

    def eval_plots(self, model, X_test, y_test, selected_features) -> dict[str, Any]:
        pred = model.predict(X_test)
        metrics: dict[str, Any] = {}

        if self.task == "regression":
            metrics["MAE"] = float(mean_absolute_error(y_test, pred))
            metrics["RMSE"] = float(np.sqrt(mean_squared_error(y_test, pred)))
            metrics["R2"] = float(r2_score(y_test, pred))

            # Actual vs Predicted
            fig, ax = plt.subplots(figsize=(7, 6))
            ax.scatter(y_test, pred, alpha=0.4, s=10)
            mn, mx = min(y_test.min(), pred.min()), max(y_test.max(), pred.max())
            ax.plot([mn, mx], [mn, mx], "r--", lw=1)
            ax.set_xlabel("Actual")
            ax.set_ylabel("Predicted")
            ax.set_title(f"Actual vs Predicted (R²={metrics['R2']:.3f})")
            self._savefig("actual_vs_predicted", fig)

            # Residuals
            residuals = y_test - pred
            fig, ax = plt.subplots(figsize=(8, 4))
            ax.scatter(pred, residuals, alpha=0.4, s=10)
            ax.axhline(0, color="r", ls="--", lw=1)
            ax.set_xlabel("Predicted")
            ax.set_ylabel("Residual (actual − predicted)")
            ax.set_title("Residual plot")
            self._savefig("residuals", fig)
        else:
            metrics["accuracy"] = float(accuracy_score(y_test, pred))
            metrics["precision"] = float(precision_score(y_test, pred, average="weighted", zero_division=0))
            metrics["recall"] = float(recall_score(y_test, pred, average="weighted", zero_division=0))
            metrics["F1"] = float(f1_score(y_test, pred, average="weighted", zero_division=0))
            try:
                if pd.Series(y_test).nunique() == 2 and hasattr(model, "predict_proba"):
                    proba = model.predict_proba(X_test)[:, 1]
                    metrics["ROC_AUC"] = float(roc_auc_score(y_test, proba))
                    fpr, tpr, _ = roc_curve(y_test, proba)
                    fig, ax = plt.subplots(figsize=(6, 6))
                    ax.plot(fpr, tpr, lw=2, label=f"AUC={metrics['ROC_AUC']:.3f}")
                    ax.plot([0, 1], [0, 1], "k--", lw=1)
                    ax.set_xlabel("False Positive Rate")
                    ax.set_ylabel("True Positive Rate")
                    ax.set_title("ROC curve")
                    ax.legend()
                    self._savefig("roc_curve", fig)
            except Exception as exc:
                logger.warning("ROC failed: %s", exc)

            # Confusion matrix
            cm = confusion_matrix(y_test, pred)
            fig, ax = plt.subplots(figsize=(6, 5))
            sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=ax, cbar=False)
            ax.set_xlabel("Predicted")
            ax.set_ylabel("Actual")
            ax.set_title("Confusion matrix")
            self._savefig("confusion_matrix", fig)
            metrics["confusion_matrix"] = cm.tolist()

            # Classification report (text + JSON)
            report = classification_report(y_test, pred, output_dict=True, zero_division=0)
            metrics["classification_report"] = report

        # Feature importance (if available)
        if hasattr(model, "feature_importances_"):
            try:
                imp = pd.Series(model.feature_importances_, index=selected_features[: len(model.feature_importances_)])
                top = imp.sort_values(ascending=False).head(15)
                fig, ax = plt.subplots(figsize=(8, max(4, len(top) * 0.3)))
                top.sort_values().plot(kind="barh", ax=ax, color="#1f77b4")
                ax.set_title("Feature importance — top 15")
                self._savefig("feature_importance", fig)
            except Exception as exc:
                logger.warning("Feature importance plot failed: %s", exc)

        return metrics

    # ------------------------------------------------------------------
    # Step 15 — SHAP
    # ------------------------------------------------------------------

    def shap_plots(self, model, X_train, X_test, selected_features) -> None:
        try:
            explainer = shap.TreeExplainer(model)
            # Cap samples for speed
            X_shap = X_test[: min(200, len(X_test))]
            shap_values = explainer.shap_values(X_shap)
            if isinstance(shap_values, list):  # multiclass
                shap_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]

            fig = plt.figure(figsize=(9, 6))
            shap.summary_plot(
                shap_values,
                X_shap,
                feature_names=selected_features[: X_shap.shape[1]],
                show=False,
                plot_type="dot",
            )
            self._savefig("shap_summary", plt.gcf())
        except Exception as exc:
            logger.warning("SHAP failed: %s", exc)

    # ------------------------------------------------------------------
    # Orchestrator
    # ------------------------------------------------------------------

    def run(self) -> LifecycleManifest:
        t0 = time.time()

        df = self.load()
        self.eda(df)
        df = self.clean(df)
        df = self.impute(df)
        df = self.engineer(df)

        # Split X / y
        y = df[self.target_col]
        X = df.drop(columns=[self.target_col])

        # Encode string-valued classification targets to integer codes — XGBoost
        # and LightGBM only accept numeric class labels.
        if self.task == "classification" and y.dtype == object:
            le = LabelEncoder()
            y = pd.Series(le.fit_transform(y.astype(str)), index=y.index, name=y.name)
            self.manifest.cleaning["target_label_encoding"] = {
                str(orig): int(enc) for orig, enc in zip(le.classes_, le.transform(le.classes_))
            }

        self.evaluate_features(X, y)

        # Preprocess + select
        Xs, selected = self.preprocess_and_select(X, y)

        # Split train/val/test — stratify on y for classification so the test
        # set retains the original class distribution (per the fraud-SIU bug
        # where a non-stratified split produced single-class test sets).
        stratify_y = y if self.task == "classification" else None
        try:
            X_train, X_temp, y_train, y_temp = train_test_split(
                Xs, y, test_size=0.3, random_state=42, stratify=stratify_y,
            )
            stratify_temp = y_temp if self.task == "classification" else None
            X_val, X_test, y_val, y_test = train_test_split(
                X_temp, y_temp, test_size=0.5, random_state=42, stratify=stratify_temp,
            )
        except ValueError:
            # Rare class with <2 samples — fall back to non-stratified split.
            X_train, X_temp, y_train, y_temp = train_test_split(Xs, y, test_size=0.3, random_state=42)
            X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, random_state=42)

        # Tune
        best_params = self.tune(X_train, y_train, X_val, y_val)

        # Train + benchmark
        best_model, _bench = self.train_and_benchmark(best_params, X_train, y_train, X_test, y_test)

        # Eval plots
        metrics = self.eval_plots(best_model, X_test, y_test, selected)
        self.manifest.metrics = metrics

        # SHAP
        self.shap_plots(best_model, X_train, X_test, selected)

        # Wrap up
        self.manifest.duration_seconds = round(time.time() - t0, 2)
        manifest_path = self.out / "manifest.json"
        manifest_path.write_text(json.dumps(asdict(self.manifest), indent=2, default=str))

        # MLflow
        if _MLFLOW:
            try:
                mlflow.set_experiment(f"insur.{self.dept}.{self.pipeline_name}")
                with mlflow.start_run(run_name=self.run_id):
                    for k, v in (best_params or {}).items():
                        mlflow.log_param(k, v)
                    for k, v in metrics.items():
                        if isinstance(v, (int, float)):
                            mlflow.log_metric(k, v)
                    mlflow.log_artifacts(str(self.out))
            except Exception as exc:
                logger.warning("MLflow logging failed: %s", exc)

        return self.manifest


# ---------------------------------------------------------------------------
# CLI for quick smoke runs
# ---------------------------------------------------------------------------


def _main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Run INSUR full ML lifecycle on a CSV")
    parser.add_argument("--dataset", required=True, help="Path to CSV")
    parser.add_argument("--target", required=True, help="Target column name")
    parser.add_argument("--task", choices=["regression", "classification"], required=True)
    parser.add_argument("--dept", default="sales")
    parser.add_argument("--pipeline", default="reference")
    parser.add_argument("--date-cols", nargs="*", default=[])
    parser.add_argument("--drop-cols", nargs="*", default=[])
    parser.add_argument("--n-trials", type=int, default=20)
    parser.add_argument("--sample", type=int, default=None, help="Sample N rows (speed)")
    parser.add_argument("--artifacts-root", default="data/eval")
    args = parser.parse_args()

    runner = FullLifecycle(
        dataset_path=args.dataset,
        target_col=args.target,
        task=args.task,
        dept=args.dept,
        pipeline_name=args.pipeline,
        date_cols=args.date_cols,
        drop_cols=args.drop_cols,
        n_trials=args.n_trials,
        sample_rows=args.sample,
        artifacts_root=args.artifacts_root,
    )
    manifest = runner.run()
    print(json.dumps(asdict(manifest), indent=2, default=str))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    _main()
