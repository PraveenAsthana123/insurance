"""HOLY reference: anomaly-detection lifecycle with multi-detector comparison.

Per operator 2026-05-22 + §64.23 + §64.32: every dept needs anomaly detection.

Detectors compared on the same labeled (or label-injected) dataset:

  1. Z-score (univariate)         baseline
  2. IsolationForest (multivariate)
  3. One-Class SVM (multivariate)
  4. AutoEncoder reconstruction error (deep)
  5. LocalOutlierFactor (density-based)

Per detector: precision + recall + F1 + ROC-AUC + PR-AUC at the labeled
anomaly threshold + latency.

If no labels are provided, the lifecycle injects synthetic outliers (5%
of rows shifted by 3-5σ) so all metrics have ground truth.

Artifacts: data/evaluation/<dept>/<pipeline>/<run_id>/manifest.json + plots/
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler
from sklearn.svm import OneClassSVM

logger = logging.getLogger(__name__)


@dataclass
class AnomalyManifest:
    run_id: str
    dept: str
    pipeline: str
    dataset_path: str
    n_rows: int
    n_features: int
    n_true_anomalies: int
    contamination_pct: float
    duration_seconds: float
    artifacts_root: str
    detectors: list[dict[str, Any]] = field(default_factory=list)
    plots: dict[str, str] = field(default_factory=dict)
    best_detector: str = ""
    notes: str = ""


class AnomalyLifecycle:
    def __init__(
        self,
        *,
        dataset_path: str | Path,
        dept: str,
        pipeline_name: str = "anomaly_reference",
        label_col: str | None = None,
        contamination: float = 0.05,
        sample_rows: int | None = None,
        artifacts_root: str | Path = "data/evaluation",
    ) -> None:
        self.dataset_path = Path(dataset_path)
        self.dept = dept
        self.pipeline_name = pipeline_name
        self.label_col = label_col
        self.contamination = contamination
        self.sample_rows = sample_rows

        self.run_id = f"{int(time.time())}-{uuid.uuid4().hex[:6]}"
        self.out = Path(artifacts_root) / dept / pipeline_name / self.run_id
        self.plots_dir = self.out / "plots"
        self.out.mkdir(parents=True, exist_ok=True)
        self.plots_dir.mkdir(parents=True, exist_ok=True)

        self.manifest = AnomalyManifest(
            run_id=self.run_id,
            dept=dept,
            pipeline=pipeline_name,
            dataset_path=str(self.dataset_path),
            n_rows=0,
            n_features=0,
            n_true_anomalies=0,
            contamination_pct=contamination * 100,
            duration_seconds=0.0,
            artifacts_root=str(self.out),
        )

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

    def _score(self, y_true, y_pred, scores, name: str, **extras) -> dict[str, Any]:
        """y_pred ∈ {0, 1} where 1 = anomaly; scores = continuous anomaly scores."""
        result = {
            "detector": name,
            "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
            "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
            "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
            **extras,
        }
        # ROC + PR AUC (need scores, not labels)
        try:
            if scores is not None and len(np.unique(y_true)) >= 2:
                result["ROC_AUC"] = round(float(roc_auc_score(y_true, scores)), 4)
                result["PR_AUC"] = round(float(average_precision_score(y_true, scores)), 4)
        except Exception as exc:
            logger.warning("AUC failed for %s: %s", name, exc)
        return result

    # ------------------------------------------------------------------
    # Data loading
    # ------------------------------------------------------------------

    def load(self) -> tuple[np.ndarray, np.ndarray]:
        df = pd.read_csv(self.dataset_path)
        if self.sample_rows and len(df) > self.sample_rows:
            df = df.sample(n=self.sample_rows, random_state=42).reset_index(drop=True)

        # Extract numeric features
        num_df = df.select_dtypes(include=[np.number]).copy()

        if self.label_col and self.label_col in df.columns:
            y = df[self.label_col].astype(int).values
            num_df = num_df.drop(columns=[self.label_col], errors="ignore")
            self.manifest.notes = f"Using ground-truth labels from column '{self.label_col}'"
        else:
            # Inject synthetic anomalies: shift 5% of rows by ~4σ
            n = len(num_df)
            n_anom = int(n * self.contamination)
            rng = np.random.RandomState(42)
            anom_idx = rng.choice(n, size=n_anom, replace=False)
            y = np.zeros(n, dtype=int)
            y[anom_idx] = 1
            # Shift anomaly rows by 4σ in each feature
            std = num_df.std()
            for idx in anom_idx:
                shift_dir = rng.choice([-1, 1], size=num_df.shape[1])
                shift_mag = rng.uniform(3, 5, size=num_df.shape[1])
                num_df.iloc[idx] = num_df.iloc[idx] + shift_dir * shift_mag * std.values
            self.manifest.notes = f"Injected {n_anom} synthetic anomalies ({self.contamination*100:.1f}%) by shifting numeric features 3-5σ"

        # Impute NaNs (anomaly detectors don't accept them)
        num_df = num_df.fillna(num_df.median(numeric_only=True))

        # Standardize
        X = StandardScaler().fit_transform(num_df.values)

        self.manifest.n_rows = X.shape[0]
        self.manifest.n_features = X.shape[1]
        self.manifest.n_true_anomalies = int(y.sum())
        return X, y

    # ------------------------------------------------------------------
    # Detectors
    # ------------------------------------------------------------------

    def zscore(self, X, y) -> dict[str, Any]:
        t0 = time.time()
        # Max abs z-score across features → 1 score per row
        zs = np.abs(X)
        scores = zs.max(axis=1)
        threshold = np.quantile(scores, 1 - self.contamination)
        pred = (scores >= threshold).astype(int)
        return self._score(
            y, pred, scores, "Z-score (univariate, max-abs)",
            fit_seconds=round(time.time() - t0, 3),
            hyperparams={"threshold_quantile": 1 - self.contamination, "threshold_value": round(float(threshold), 3)},
        )

    def isolation_forest(self, X, y) -> dict[str, Any]:
        t0 = time.time()
        clf = IsolationForest(contamination=self.contamination, random_state=42, n_estimators=100)
        clf.fit(X)
        # decision_function: higher = normal; we want anomaly score (negate)
        scores = -clf.decision_function(X)
        pred_raw = clf.predict(X)  # 1 = normal, -1 = anomaly
        pred = (pred_raw == -1).astype(int)
        return self._score(
            y, pred, scores, "IsolationForest",
            fit_seconds=round(time.time() - t0, 3),
            hyperparams={"n_estimators": 100, "contamination": self.contamination},
        )

    def one_class_svm(self, X, y) -> dict[str, Any]:
        t0 = time.time()
        # For speed: subsample if huge
        n_fit = min(2000, len(X))
        rng = np.random.RandomState(42)
        fit_idx = rng.choice(len(X), size=n_fit, replace=False)
        clf = OneClassSVM(nu=self.contamination, kernel="rbf", gamma="scale")
        clf.fit(X[fit_idx])
        scores = -clf.decision_function(X)
        pred_raw = clf.predict(X)
        pred = (pred_raw == -1).astype(int)
        return self._score(
            y, pred, scores, "OneClassSVM (RBF)",
            fit_seconds=round(time.time() - t0, 3),
            hyperparams={"nu": self.contamination, "kernel": "rbf", "n_fit": n_fit},
        )

    def local_outlier_factor(self, X, y) -> dict[str, Any]:
        t0 = time.time()
        clf = LocalOutlierFactor(contamination=self.contamination, n_neighbors=20)
        pred_raw = clf.fit_predict(X)
        pred = (pred_raw == -1).astype(int)
        scores = -clf.negative_outlier_factor_
        return self._score(
            y, pred, scores, "LocalOutlierFactor",
            fit_seconds=round(time.time() - t0, 3),
            hyperparams={"n_neighbors": 20, "contamination": self.contamination},
        )

    def autoencoder(self, X, y) -> dict[str, Any]:
        """Simple PyTorch autoencoder; reconstruction error = anomaly score."""
        t0 = time.time()
        try:
            import torch
            import torch.nn as nn
            import torch.optim as optim
            from torch.utils.data import DataLoader, TensorDataset
        except ImportError as exc:
            return {"detector": "AutoEncoder", "error": f"torch unavailable: {exc}"}

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        Xt = torch.FloatTensor(X).to(device)

        n_features = X.shape[1]
        hidden = max(2, n_features // 2)
        bottleneck = max(2, n_features // 4)

        class AE(nn.Module):
            def __init__(self):
                super().__init__()
                self.enc = nn.Sequential(
                    nn.Linear(n_features, hidden), nn.ReLU(),
                    nn.Linear(hidden, bottleneck),
                )
                self.dec = nn.Sequential(
                    nn.Linear(bottleneck, hidden), nn.ReLU(),
                    nn.Linear(hidden, n_features),
                )

            def forward(self, x):
                return self.dec(self.enc(x))

        model = AE().to(device)
        opt = optim.Adam(model.parameters(), lr=1e-3)
        loss_fn = nn.MSELoss(reduction="none")

        loader = DataLoader(TensorDataset(Xt), batch_size=128, shuffle=True)
        for epoch in range(10):
            model.train(True)
            for (batch,) in loader:
                opt.zero_grad()
                recon = model(batch)
                loss = loss_fn(recon, batch).mean()
                loss.backward()
                opt.step()

        # Per-row reconstruction error
        model.train(False)
        with torch.no_grad():
            recon = model(Xt)
            err = ((recon - Xt) ** 2).mean(dim=1).cpu().numpy()

        threshold = np.quantile(err, 1 - self.contamination)
        pred = (err >= threshold).astype(int)
        return self._score(
            y, pred, err, "AutoEncoder (10 epochs)",
            fit_seconds=round(time.time() - t0, 3),
            hyperparams={"hidden": hidden, "bottleneck": bottleneck, "epochs": 10, "lr": 1e-3,
                         "threshold_quantile": 1 - self.contamination},
            loss_function="MSELoss (reconstruction)",
            optimizer="Adam",
        )

    # ------------------------------------------------------------------
    # Orchestrator
    # ------------------------------------------------------------------

    def run(self) -> AnomalyManifest:
        t0 = time.time()
        X, y = self.load()
        logger.info("Anomaly lifecycle: %d rows × %d features, %d true anomalies",
                    X.shape[0], X.shape[1], y.sum())

        for fn in (
            ("Z-score", self.zscore),
            ("IsolationForest", self.isolation_forest),
            ("OneClassSVM", self.one_class_svm),
            ("LocalOutlierFactor", self.local_outlier_factor),
            ("AutoEncoder", self.autoencoder),
        ):
            name, runner = fn
            try:
                res = runner(X, y)
                self.manifest.detectors.append(res)
                if "f1" in res:
                    logger.info("  %s: F1=%.3f P=%.3f R=%.3f", res["detector"], res["f1"], res["precision"], res["recall"])
            except Exception as exc:
                logger.exception("%s failed: %s", name, exc)
                self.manifest.detectors.append({"detector": name, "error": str(exc)})

        scored = [d for d in self.manifest.detectors if "f1" in d]
        if scored:
            best = max(scored, key=lambda d: d["f1"])
            self.manifest.best_detector = best["detector"]

        self._plot_comparison(scored)
        self._plot_confusion_matrices(scored)
        self._plot_roc_pr(scored, X, y)

        self.manifest.duration_seconds = round(time.time() - t0, 2)
        (self.out / "manifest.json").write_text(json.dumps(asdict(self.manifest), indent=2, default=str))
        return self.manifest

    def _plot_comparison(self, scored):
        if not scored:
            return
        fig, ax = plt.subplots(figsize=(10, 5))
        names = [d["detector"] for d in scored]
        p = [d["precision"] for d in scored]
        r = [d["recall"] for d in scored]
        f1 = [d["f1"] for d in scored]
        x = np.arange(len(names))
        w = 0.25
        ax.bar(x - w, p, w, label="Precision", color="#1f77b4")
        ax.bar(x, r, w, label="Recall", color="#2ca02c")
        ax.bar(x + w, f1, w, label="F1", color="#ff7f0e")
        ax.set_xticks(x)
        ax.set_xticklabels(names, rotation=15, ha="right")
        ax.set_ylim(0, 1.05)
        ax.set_ylabel("Score")
        ax.set_title("Anomaly detector comparison (precision / recall / F1)")
        ax.legend()
        self._savefig("detector_comparison", fig)

    def _plot_confusion_matrices(self, scored):
        if not scored:
            return
        n = len(scored)
        fig, axes = plt.subplots(1, n, figsize=(4 * n, 4))
        if n == 1:
            axes = [axes]
        for ax, d in zip(axes, scored):
            cm = np.array(d["confusion_matrix"])
            sns.heatmap(cm, annot=True, fmt="d", cmap="Reds", ax=ax, cbar=False,
                        xticklabels=["normal", "anomaly"], yticklabels=["normal", "anomaly"])
            ax.set_title(d["detector"][:25], fontsize=10)
            ax.set_xlabel("Predicted")
            ax.set_ylabel("Actual")
        fig.suptitle("Confusion matrices per detector (2×2)")
        self._savefig("confusion_matrices", fig)

    def _plot_roc_pr(self, scored, X, y):
        """ROC + PR curves require continuous scores; re-extract per detector."""
        if not scored:
            return
        # Build score arrays again per detector (cheaper than caching for POC)
        score_map = {}
        try:
            score_map["Z-score (univariate, max-abs)"] = np.abs(X).max(axis=1)
        except Exception:
            pass
        try:
            clf = IsolationForest(contamination=self.contamination, random_state=42, n_estimators=50)
            clf.fit(X)
            score_map["IsolationForest"] = -clf.decision_function(X)
        except Exception:
            pass

        # ROC
        fig, ax = plt.subplots(figsize=(7, 6))
        for d in scored:
            name = d["detector"]
            scores = score_map.get(name)
            if scores is None:
                continue
            try:
                fpr, tpr, _ = roc_curve(y, scores)
                auc = d.get("ROC_AUC", 0)
                ax.plot(fpr, tpr, lw=2, label=f"{name[:25]} (AUC={auc:.2f})")
            except Exception:
                continue
        ax.plot([0, 1], [0, 1], "k--", lw=1)
        ax.set_xlabel("False Positive Rate")
        ax.set_ylabel("True Positive Rate")
        ax.set_title("ROC curves per detector")
        ax.legend(fontsize=9, loc="lower right")
        self._savefig("roc_curves", fig)

        # PR
        fig, ax = plt.subplots(figsize=(7, 6))
        for d in scored:
            name = d["detector"]
            scores = score_map.get(name)
            if scores is None:
                continue
            try:
                precision, recall, _ = precision_recall_curve(y, scores)
                pr_auc = d.get("PR_AUC", 0)
                ax.plot(recall, precision, lw=2, label=f"{name[:25]} (AP={pr_auc:.2f})")
            except Exception:
                continue
        ax.set_xlabel("Recall")
        ax.set_ylabel("Precision")
        ax.set_title("Precision-Recall curves per detector")
        ax.legend(fontsize=9, loc="lower left")
        self._savefig("pr_curves", fig)


def _main() -> None:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True, help="CSV path")
    parser.add_argument("--dept", default="security-operations")
    parser.add_argument("--pipeline", default="anomaly_reference")
    parser.add_argument("--label-col", default=None, help="Optional ground-truth column")
    parser.add_argument("--contamination", type=float, default=0.05)
    parser.add_argument("--sample", type=int, default=None)
    parser.add_argument("--artifacts-root", default="data/evaluation")
    args = parser.parse_args()

    runner = AnomalyLifecycle(
        dataset_path=args.dataset,
        dept=args.dept,
        pipeline_name=args.pipeline,
        label_col=args.label_col,
        contamination=args.contamination,
        sample_rows=args.sample,
        artifacts_root=args.artifacts_root,
    )
    manifest = runner.run()
    print(json.dumps(asdict(manifest), indent=2, default=str)[:3000])


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    _main()
