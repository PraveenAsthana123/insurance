"""INSUR reference: ensemble model comparison (Voting + Stacking) per §65.1 #5.

Generic wrapper that takes a list of base sklearn-compatible classifiers (or
regressors) and produces a side-by-side comparison of:

  - Each base model alone
  - VotingClassifier / VotingRegressor (hard + soft for classification)
  - StackingClassifier / StackingRegressor (with cross-validation)

Returns a manifest with per-model metrics + a winner. Used inside
`full_lifecycle.py` (when it benchmarks XGBoost + LightGBM + Dummy) and
as a standalone tool when the operator wants ensemble exploration.

Composes with §64.20 (mandatory tabular ML row) + §64.42 (no external
framework lock-in — pure sklearn).
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Literal

import numpy as np
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    StackingClassifier,
    StackingRegressor,
    VotingClassifier,
    VotingRegressor,
)
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import train_test_split

logger = logging.getLogger(__name__)

Task = Literal["classification", "regression"]


@dataclass
class EnsembleManifest:
    task: Task
    n_train: int
    n_test: int
    base_models: list[str] = field(default_factory=list)
    per_model_metrics: list[dict[str, Any]] = field(default_factory=list)
    voting_metrics: dict[str, Any] = field(default_factory=dict)
    stacking_metrics: dict[str, Any] = field(default_factory=dict)
    winner: str = ""
    winner_method: str = ""  # "base" | "voting" | "stacking"
    duration_seconds: float = 0.0


def _score_classifier(y_true, y_pred, name: str, fit_seconds: float, predict_proba=None) -> dict[str, Any]:
    out = {
        "model": name,
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "f1_weighted": round(float(f1_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
        "fit_seconds": round(fit_seconds, 3),
    }
    if predict_proba is not None and len(np.unique(y_true)) == 2:
        from sklearn.metrics import roc_auc_score
        try:
            out["roc_auc"] = round(float(roc_auc_score(y_true, predict_proba)), 4)
        except Exception:
            pass
    return out


def _score_regressor(y_true, y_pred, name: str, fit_seconds: float) -> dict[str, Any]:
    return {
        "model": name,
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 4),
        "r2": round(float(r2_score(y_true, y_pred)), 4),
        "fit_seconds": round(fit_seconds, 3),
    }


def default_classifiers() -> list[tuple[str, Any]]:
    """Reasonable defaults if operator doesn't pass `base_estimators`."""
    return [
        ("baseline_majority", DummyClassifier(strategy="most_frequent")),
        ("logistic_regression", LogisticRegression(max_iter=200)),
        ("gradient_boosting", GradientBoostingClassifier(n_estimators=50, random_state=42)),
    ]


def default_regressors() -> list[tuple[str, Any]]:
    return [
        ("baseline_mean", DummyRegressor(strategy="mean")),
        ("ridge", Ridge(alpha=1.0)),
        ("gradient_boosting", GradientBoostingRegressor(n_estimators=50, random_state=42)),
    ]


def compare_ensemble(
    X: np.ndarray,
    y: np.ndarray,
    *,
    task: Task,
    base_estimators: list[tuple[str, Any]] | None = None,
    test_size: float = 0.25,
    seed: int = 42,
    voting_kind: Literal["hard", "soft"] = "soft",
    final_estimator: Any | None = None,
) -> EnsembleManifest:
    """Compare base models + voting + stacking on the same train/test split.

    Drill invariants:
      - len(per_model_metrics) == len(base_estimators)
      - voting_metrics + stacking_metrics each populated
      - winner is named explicitly (no None)
      - winner_method ∈ {"base", "voting", "stacking"}
    """
    t0 = time.time()
    if task not in ("classification", "regression"):
        raise ValueError(f"unknown task '{task}'")
    if base_estimators is None:
        base_estimators = default_classifiers() if task == "classification" else default_regressors()
    if len(base_estimators) < 2:
        raise ValueError("ensemble requires ≥ 2 base estimators")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=seed,
        stratify=y if task == "classification" else None,
    )

    manifest = EnsembleManifest(
        task=task, n_train=len(X_train), n_test=len(X_test),
        base_models=[n for n, _ in base_estimators],
    )

    # Score each base model alone (refit each from scratch — voting/stacking
    # will re-fit internally; that's fine, it lets us measure each in isolation).
    per_model: list[dict[str, Any]] = []
    for name, est in base_estimators:
        # Clone so the original isn't fitted (voting/stacking will fit clones too)
        from sklearn.base import clone
        clf = clone(est)
        t = time.time()
        clf.fit(X_train, y_train)
        elapsed = time.time() - t
        pred = clf.predict(X_test)
        if task == "classification":
            proba = None
            try:
                proba = clf.predict_proba(X_test)[:, 1] if len(np.unique(y_train)) == 2 else None
            except Exception:
                proba = None
            per_model.append(_score_classifier(y_test, pred, name, elapsed, proba))
        else:
            per_model.append(_score_regressor(y_test, pred, name, elapsed))
    manifest.per_model_metrics = per_model

    # Voting
    try:
        from sklearn.base import clone
        voters = [(n, clone(e)) for n, e in base_estimators]
        if task == "classification":
            voting = VotingClassifier(estimators=voters, voting=voting_kind)
        else:
            voting = VotingRegressor(estimators=voters)
        t = time.time()
        voting.fit(X_train, y_train)
        vpred = voting.predict(X_test)
        if task == "classification":
            vproba = voting.predict_proba(X_test)[:, 1] if voting_kind == "soft" and len(np.unique(y_train)) == 2 else None
            manifest.voting_metrics = _score_classifier(y_test, vpred, f"voting_{voting_kind}", time.time() - t, vproba)
        else:
            manifest.voting_metrics = _score_regressor(y_test, vpred, "voting_regressor", time.time() - t)
    except Exception as exc:
        logger.warning("voting failed: %s", exc)
        manifest.voting_metrics = {"model": "voting", "error": str(exc)}

    # Stacking
    try:
        from sklearn.base import clone
        stackers = [(n, clone(e)) for n, e in base_estimators]
        if task == "classification":
            final = final_estimator or LogisticRegression(max_iter=200)
            stacking = StackingClassifier(estimators=stackers, final_estimator=final, cv=3)
        else:
            final = final_estimator or Ridge(alpha=1.0)
            stacking = StackingRegressor(estimators=stackers, final_estimator=final, cv=3)
        t = time.time()
        stacking.fit(X_train, y_train)
        spred = stacking.predict(X_test)
        if task == "classification":
            sproba = None
            try:
                sproba = stacking.predict_proba(X_test)[:, 1] if len(np.unique(y_train)) == 2 else None
            except Exception:
                pass
            manifest.stacking_metrics = _score_classifier(y_test, spred, "stacking", time.time() - t, sproba)
        else:
            manifest.stacking_metrics = _score_regressor(y_test, spred, "stacking", time.time() - t)
    except Exception as exc:
        logger.warning("stacking failed: %s", exc)
        manifest.stacking_metrics = {"model": "stacking", "error": str(exc)}

    # Pick winner (best primary metric across all approaches)
    candidates: list[tuple[str, str, dict]] = []
    for m in per_model:
        candidates.append(("base", m["model"], m))
    if manifest.voting_metrics and "error" not in manifest.voting_metrics:
        candidates.append(("voting", manifest.voting_metrics["model"], manifest.voting_metrics))
    if manifest.stacking_metrics and "error" not in manifest.stacking_metrics:
        candidates.append(("stacking", manifest.stacking_metrics["model"], manifest.stacking_metrics))

    if candidates:
        if task == "classification":
            best_method, best_name, best_m = max(candidates, key=lambda c: c[2].get("f1_weighted", 0))
        else:
            # For regression: pick lowest RMSE
            best_method, best_name, best_m = min(candidates, key=lambda c: c[2].get("rmse", float("inf")))
        manifest.winner = best_name
        manifest.winner_method = best_method

    manifest.duration_seconds = round(time.time() - t0, 3)
    return manifest


def _main() -> None:
    """Smoke: synthetic binary classification + regression sanity."""
    import json
    from dataclasses import asdict
    rng = np.random.RandomState(42)

    # Classification smoke
    X_clf = rng.randn(500, 6)
    y_clf = (X_clf[:, 0] + 0.5 * X_clf[:, 1] - 0.3 * X_clf[:, 2] > 0).astype(int)
    m_clf = compare_ensemble(X_clf, y_clf, task="classification")
    print("=== Classification ===")
    print(json.dumps(asdict(m_clf), indent=2, default=str)[:2000])

    # Regression smoke
    X_reg = rng.randn(500, 6)
    y_reg = X_reg[:, 0] + 0.5 * X_reg[:, 1] + 0.1 * rng.randn(500)
    m_reg = compare_ensemble(X_reg, y_reg, task="regression")
    print("\n=== Regression ===")
    print(json.dumps(asdict(m_reg), indent=2, default=str)[:2000])


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    _main()
