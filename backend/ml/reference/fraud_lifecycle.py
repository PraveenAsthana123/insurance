"""HOLY reference: fraud-detection lifecycle (§64.23 + §40).

4-layer detection per §64.23 (mandatory for finance / sales / e-commerce /
security-operations / retail-operations / procurement):

  Layer 1 — Rule layer (hard rules first; deterministic, instant block)
            velocity / geo-anomaly / amount-threshold / blacklist
  Layer 2 — ML layer (XGBoost on engineered features + Isolation Forest
            for residual signal)
  Layer 3 — LLM layer (narrative classifier — for transactions with
            descriptive text fields; stubbed against Ollama if available)
  Layer 4 — Decision layer (per §40)
            rule_hit → block
            ml_score > 0.9 → block + review
            ml_score 0.5-0.9 → step_up_auth + human_review
            ml_score < 0.5 → allow + log

Cost-sensitive metrics per §64.23:
  - Recall at FPR ≤ 5% MUST be ≥ 0.90
  - Per-decision cost (false_negative cost >> false_positive cost)
  - Decision audit row coverage = 100% (per §38.3)

Synthetic dataset generator if no labeled fraud data provided.

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
import seaborn as sns
from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import train_test_split

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


@dataclass
class FraudDecision:
    transaction_id: str
    decision: str         # "allow" | "block" | "review" | "step_up"
    reason: str
    layer_triggered: int  # 1=rule, 2=ML, 3=LLM, 4=decision-fallback
    rule_hits: list[str] = field(default_factory=list)
    ml_score: float = 0.0
    llm_flag: bool = False
    confidence: float = 0.0
    cost_usd: float = 0.0


@dataclass
class FraudManifest:
    run_id: str
    dept: str
    pipeline: str
    n_train: int
    n_test: int
    n_fraud_train: int
    n_fraud_test: int
    duration_seconds: float
    artifacts_root: str
    layer_stats: dict[str, Any] = field(default_factory=dict)
    aggregate_metrics: dict[str, Any] = field(default_factory=dict)
    decisions_breakdown: dict[str, int] = field(default_factory=dict)
    sample_decisions: list[dict[str, Any]] = field(default_factory=list)
    plots: dict[str, str] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Synthetic transaction generator
# ---------------------------------------------------------------------------


def generate_synthetic_transactions(
    n: int = 2000, fraud_rate: float = 0.05, seed: int = 42
) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """Synthetic transaction matrix + labels + transaction-narrative texts.

    Features (6 dims): amount, hour_of_day, days_since_last_txn, dist_from_home_km,
                       n_recent_txns_1h, account_age_days
    Fraud rows shifted on 2-3 dims to create separable signal.
    """
    rng = np.random.RandomState(seed)
    legit = np.column_stack([
        rng.lognormal(3.0, 0.8, n),          # amount $20-$500 typical
        rng.normal(13, 4, n).clip(0, 23),     # hour
        rng.exponential(7, n),                # days since last
        rng.exponential(15, n),               # dist from home
        rng.poisson(1.5, n),                  # recent txns
        rng.uniform(180, 3650, n),            # account age days
    ])
    n_fraud = int(n * fraud_rate)
    fraud_idx = rng.choice(n, size=n_fraud, replace=False)
    labels = np.zeros(n, dtype=int)
    labels[fraud_idx] = 1
    # Shift fraud rows: bigger amounts + odd hours + far from home + bursts
    legit[fraud_idx, 0] *= rng.uniform(5, 20, n_fraud)       # 5-20× amount
    legit[fraud_idx, 1] = rng.choice([2, 3, 4, 23], n_fraud) # odd hours
    legit[fraud_idx, 3] += rng.uniform(500, 5000, n_fraud)   # far from home
    legit[fraud_idx, 4] += rng.poisson(8, n_fraud)            # txn bursts

    narratives = []
    for i in range(n):
        if labels[i] == 1 and rng.random() < 0.3:  # 30% of fraud has suspicious narrative
            narratives.append(rng.choice([
                "international wire transfer urgent",
                "crypto withdrawal large amount",
                "gift card bulk purchase",
                "anonymous payment processor",
            ]))
        else:
            narratives.append(rng.choice([
                "coffee shop purchase",
                "monthly subscription renewal",
                "grocery store",
                "gas station refill",
                "online retailer order",
            ]))

    return legit, labels, narratives


# ---------------------------------------------------------------------------
# Layer 1 — Rule engine
# ---------------------------------------------------------------------------


class RuleLayer:
    """Hard rules — fires deterministically, instant block."""

    BLACKLIST_MERCHANTS = {"crypto", "anonymous"}
    AMOUNT_HARD_LIMIT = 10_000  # $10k single-txn hard block
    BURST_LIMIT_1H = 15          # > 15 txns in 1h hard block

    def evaluate(self, features: np.ndarray, narrative: str = "") -> list[str]:
        hits: list[str] = []
        amount, hour, _, dist, n_recent, _ = features
        if amount > self.AMOUNT_HARD_LIMIT:
            hits.append(f"amount > ${self.AMOUNT_HARD_LIMIT}")
        if n_recent > self.BURST_LIMIT_1H:
            hits.append(f"txn burst > {self.BURST_LIMIT_1H}/hour")
        narrative_lower = narrative.lower()
        for term in self.BLACKLIST_MERCHANTS:
            if term in narrative_lower:
                hits.append(f"blacklist term: {term}")
        if dist > 10_000:  # impossibly far
            hits.append("dist_from_home > 10000 km")
        return hits


# ---------------------------------------------------------------------------
# Layer 2 — ML layer
# ---------------------------------------------------------------------------


class MlLayer:
    def __init__(self):
        self.xgb_model = None
        self.iso_model = None
        self.threshold = 0.5

    def fit(self, X_train: np.ndarray, y_train: np.ndarray) -> dict[str, Any]:
        import xgboost as xgb
        t0 = time.time()
        # XGBoost with class-weight for imbalance
        scale_pos_weight = (y_train == 0).sum() / max((y_train == 1).sum(), 1)
        self.xgb_model = xgb.XGBClassifier(
            n_estimators=200, max_depth=4, learning_rate=0.1,
            objective="binary:logistic", scale_pos_weight=scale_pos_weight,
            random_state=42, verbosity=0,
        )
        self.xgb_model.fit(X_train, y_train)
        # IsolationForest for residual anomaly signal
        self.iso_model = IsolationForest(contamination=0.05, random_state=42, n_estimators=100)
        self.iso_model.fit(X_train[y_train == 0])  # fit on legit only
        return {"fit_seconds": round(time.time() - t0, 3),
                "scale_pos_weight": round(scale_pos_weight, 2)}

    def score(self, X: np.ndarray) -> np.ndarray:
        # Blend XGBoost prob + IsolationForest anomaly score (normalized)
        xgb_p = self.xgb_model.predict_proba(X)[:, 1]
        iso_raw = -self.iso_model.decision_function(X)
        # Min-max normalize iso to [0, 1]
        iso_norm = (iso_raw - iso_raw.min()) / (iso_raw.max() - iso_raw.min() + 1e-9)
        # Blend 70% XGBoost / 30% IF (XGBoost is calibrated; IF is auxiliary)
        return 0.7 * xgb_p + 0.3 * iso_norm


# ---------------------------------------------------------------------------
# Layer 3 — LLM narrative layer
# ---------------------------------------------------------------------------


class LlmLayer:
    """Stub: uses keyword heuristic in dry-run; calls Ollama when wired.

    In production:
      - Send narrative + structured fields to LLM
      - Get back {suspicious: bool, reason: str}
      - Use as additional flag on top of ML score
    """

    SUSPICIOUS_KEYWORDS = {
        "international wire", "crypto", "anonymous", "gift card bulk",
        "urgent", "withdrawal large", "untraceable",
    }

    def __init__(self, use_ollama: bool = False, ollama_url: str = "http://localhost:11434"):
        self.use_ollama = use_ollama
        self.ollama_url = ollama_url

    def flag(self, narrative: str) -> tuple[bool, str]:
        if self.use_ollama:
            # Defer real LLM call to operator-confirmed wiring
            pass
        text = narrative.lower()
        for kw in self.SUSPICIOUS_KEYWORDS:
            if kw in text:
                return True, f"matched keyword '{kw}'"
        return False, ""


# ---------------------------------------------------------------------------
# Layer 4 — Decision layer (per §40)
# ---------------------------------------------------------------------------


class DecisionLayer:
    """Combines rule hits + ML score + LLM flag → final decision per §40.

    Thresholds (configurable per dept):
      rule_hits > 0          → block        (layer_triggered=1)
      ml_score > 0.9         → block        (layer_triggered=2)
      ml_score > 0.5 + LLM   → step_up      (layer_triggered=3)
      ml_score > 0.5         → review       (layer_triggered=2)
      else                   → allow        (layer_triggered=4)
    """

    def __init__(self, block_threshold: float = 0.9, review_threshold: float = 0.5):
        self.block_threshold = block_threshold
        self.review_threshold = review_threshold

    def decide(self, txn_id: str, rule_hits: list[str], ml_score: float,
               llm_flag: bool, llm_reason: str) -> FraudDecision:
        # Layer 1 — Rule wins (hardest signal)
        if rule_hits:
            return FraudDecision(
                transaction_id=txn_id, decision="block",
                reason=f"rules hit: {'; '.join(rule_hits)}",
                layer_triggered=1, rule_hits=rule_hits,
                ml_score=ml_score, llm_flag=llm_flag, confidence=1.0, cost_usd=0.0,
            )
        # Layer 2 — High ML confidence
        if ml_score > self.block_threshold:
            return FraudDecision(
                transaction_id=txn_id, decision="block",
                reason=f"ml score {ml_score:.3f} > {self.block_threshold}",
                layer_triggered=2, ml_score=ml_score, llm_flag=llm_flag,
                confidence=ml_score, cost_usd=0.001,
            )
        # Layer 3 — Medium ML + LLM
        if ml_score > self.review_threshold and llm_flag:
            return FraudDecision(
                transaction_id=txn_id, decision="step_up",
                reason=f"ml score {ml_score:.3f} + LLM flag ({llm_reason})",
                layer_triggered=3, ml_score=ml_score, llm_flag=True,
                confidence=ml_score, cost_usd=0.005,
            )
        # Layer 2 fallback — Medium ML alone
        if ml_score > self.review_threshold:
            return FraudDecision(
                transaction_id=txn_id, decision="review",
                reason=f"ml score {ml_score:.3f} in review band",
                layer_triggered=2, ml_score=ml_score, llm_flag=False,
                confidence=ml_score, cost_usd=0.002,
            )
        # Layer 4 — Allow
        return FraudDecision(
            transaction_id=txn_id, decision="allow",
            reason=f"ml score {ml_score:.3f} below review threshold",
            layer_triggered=4, ml_score=ml_score, llm_flag=False,
            confidence=1.0 - ml_score, cost_usd=0.0,
        )


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------


class FraudLifecycle:
    def __init__(
        self,
        *,
        dept: str = "finance",
        pipeline_name: str = "fraud_reference",
        n_total: int = 2000,
        fraud_rate: float = 0.05,
        block_threshold: float = 0.9,
        review_threshold: float = 0.5,
        artifacts_root: str | Path = "data/evaluation",
        seed: int = 42,
    ):
        self.dept = dept
        self.pipeline_name = pipeline_name
        self.n_total = n_total
        self.fraud_rate = fraud_rate
        self.block_threshold = block_threshold
        self.review_threshold = review_threshold
        self.seed = seed

        self.run_id = f"{int(time.time())}-{uuid.uuid4().hex[:6]}"
        self.out = Path(artifacts_root) / dept / pipeline_name / self.run_id
        self.plots_dir = self.out / "plots"
        self.out.mkdir(parents=True, exist_ok=True)
        self.plots_dir.mkdir(parents=True, exist_ok=True)

        self.manifest = FraudManifest(
            run_id=self.run_id, dept=dept, pipeline=pipeline_name,
            n_train=0, n_test=0, n_fraud_train=0, n_fraud_test=0,
            duration_seconds=0.0, artifacts_root=str(self.out),
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

    def run(self) -> FraudManifest:
        t0 = time.time()
        X, y, narratives = generate_synthetic_transactions(
            n=self.n_total, fraud_rate=self.fraud_rate, seed=self.seed,
        )

        # Split
        X_train, X_test, y_train, y_test, n_train_split, n_test_split = train_test_split(
            X, y, np.arange(len(narratives)), test_size=0.3, random_state=42, stratify=y,
        )
        narr_test = [narratives[i] for i in n_test_split]
        self.manifest.n_train = len(X_train)
        self.manifest.n_test = len(X_test)
        self.manifest.n_fraud_train = int(y_train.sum())
        self.manifest.n_fraud_test = int(y_test.sum())

        # Build layers
        rule = RuleLayer()
        ml = MlLayer()
        ml_stats = ml.fit(X_train, y_train)
        llm = LlmLayer(use_ollama=False)
        dec = DecisionLayer(self.block_threshold, self.review_threshold)

        # Score test set
        ml_scores = ml.score(X_test)

        decisions: list[FraudDecision] = []
        layer_counts = {1: 0, 2: 0, 3: 0, 4: 0}
        for i in range(len(X_test)):
            txn_id = f"T{i:05d}"
            hits = rule.evaluate(X_test[i], narr_test[i])
            llm_flag, llm_reason = llm.flag(narr_test[i])
            d = dec.decide(txn_id, hits, float(ml_scores[i]), llm_flag, llm_reason)
            decisions.append(d)
            layer_counts[d.layer_triggered] = layer_counts.get(d.layer_triggered, 0) + 1

        # Aggregate metrics
        # Decision → predicted-fraud: block + review + step_up = positive; allow = negative
        y_pred = np.array([1 if d.decision in ("block", "review", "step_up") else 0
                           for d in decisions])
        # ML-only prediction (for comparison with full system)
        y_ml_pred = (ml_scores >= self.block_threshold).astype(int)

        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, zero_division=0))
        rec = float(recall_score(y_test, y_pred, zero_division=0))
        f1 = float(f1_score(y_test, y_pred, zero_division=0))

        try:
            roc_auc = float(roc_auc_score(y_test, ml_scores))
            pr_auc = float(average_precision_score(y_test, ml_scores))
            # Recall at FPR ≤ 5% (§64.23 mandatory)
            fpr, tpr, thr = roc_curve(y_test, ml_scores)
            mask = fpr <= 0.05
            recall_at_fpr5 = float(tpr[mask].max()) if mask.any() else 0.0
        except Exception:
            roc_auc = pr_auc = recall_at_fpr5 = 0.0

        self.manifest.layer_stats = {
            "ml_layer": ml_stats,
            "decisions_per_layer": {f"layer_{k}": v for k, v in layer_counts.items()},
            "block_threshold": self.block_threshold,
            "review_threshold": self.review_threshold,
        }
        self.manifest.aggregate_metrics = {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "F1": round(f1, 4),
            "ROC_AUC": round(roc_auc, 4),
            "PR_AUC": round(pr_auc, 4),
            "recall_at_FPR_5pct": round(recall_at_fpr5, 4),
            "meets_mandatory_recall_target": recall_at_fpr5 >= 0.90,
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
            "ml_only_F1": round(float(f1_score(y_test, y_ml_pred, zero_division=0)), 4),
            "fraud_loss_prevented_est_usd": round(float(
                X_test[(y_test == 1) & (y_pred == 1)][:, 0].sum()
            ), 2),
            "fraud_loss_leaked_est_usd": round(float(
                X_test[(y_test == 1) & (y_pred == 0)][:, 0].sum()
            ), 2),
        }
        self.manifest.decisions_breakdown = {
            "block":   sum(1 for d in decisions if d.decision == "block"),
            "review":  sum(1 for d in decisions if d.decision == "review"),
            "step_up": sum(1 for d in decisions if d.decision == "step_up"),
            "allow":   sum(1 for d in decisions if d.decision == "allow"),
        }
        # Sample audit rows
        self.manifest.sample_decisions = [
            asdict(d) for d in decisions[:10]
        ]

        # Plots
        self._plot_decisions(layer_counts, decisions)
        self._plot_roc_pr(y_test, ml_scores)
        self._plot_confusion(confusion_matrix(y_test, y_pred))

        self.manifest.duration_seconds = round(time.time() - t0, 2)
        (self.out / "manifest.json").write_text(json.dumps(asdict(self.manifest), indent=2, default=str))
        return self.manifest

    def _plot_decisions(self, layer_counts, decisions):
        fig, axes = plt.subplots(1, 2, figsize=(12, 4))
        labels = ["Layer 1\nRule", "Layer 2\nML", "Layer 3\nLLM+ML", "Layer 4\nAllow"]
        counts = [layer_counts.get(i, 0) for i in (1, 2, 3, 4)]
        axes[0].bar(labels, counts, color=["#d62728", "#ff7f0e", "#1f77b4", "#2ca02c"])
        for i, c in enumerate(counts):
            axes[0].text(i, c, str(c), ha="center", va="bottom", fontsize=10)
        axes[0].set_title("Decisions triggered per layer")
        axes[0].set_ylabel("# transactions")

        # Decision-class breakdown
        d_labels = ["block", "review", "step_up", "allow"]
        d_counts = [self.manifest.decisions_breakdown[k] for k in d_labels]
        axes[1].bar(d_labels, d_counts, color=["#d62728", "#ff7f0e", "#1f77b4", "#2ca02c"])
        for i, c in enumerate(d_counts):
            axes[1].text(i, c, str(c), ha="center", va="bottom", fontsize=10)
        axes[1].set_title("Final decision breakdown")
        axes[1].set_ylabel("# transactions")
        self._savefig("decisions_per_layer", fig)

    def _plot_roc_pr(self, y_test, scores):
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        # ROC
        fpr, tpr, _ = roc_curve(y_test, scores)
        roc_auc = roc_auc_score(y_test, scores)
        axes[0].plot(fpr, tpr, lw=2, label=f"AUC={roc_auc:.3f}")
        axes[0].plot([0, 1], [0, 1], "k--", lw=1)
        axes[0].axvline(0.05, color="r", ls=":", label="FPR=5% gate")
        axes[0].set_xlabel("False Positive Rate")
        axes[0].set_ylabel("True Positive Rate")
        axes[0].set_title("ROC curve (ML score)")
        axes[0].legend()

        # PR
        precision, recall, _ = precision_recall_curve(y_test, scores)
        pr_auc = average_precision_score(y_test, scores)
        axes[1].plot(recall, precision, lw=2, label=f"AP={pr_auc:.3f}")
        axes[1].set_xlabel("Recall")
        axes[1].set_ylabel("Precision")
        axes[1].set_title("Precision-Recall curve")
        axes[1].legend()
        self._savefig("roc_pr_curves", fig)

    def _plot_confusion(self, cm):
        fig, ax = plt.subplots(figsize=(6, 5))
        sns.heatmap(cm, annot=True, fmt="d", cmap="Reds", ax=ax, cbar=False,
                    xticklabels=["legit", "fraud"], yticklabels=["legit", "fraud"])
        ax.set_xlabel("Predicted")
        ax.set_ylabel("Actual")
        ax.set_title("Confusion matrix (4-layer system decision)")
        self._savefig("confusion_matrix", fig)


def _main() -> None:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dept", default="finance")
    parser.add_argument("--pipeline", default="fraud_reference")
    parser.add_argument("--n-total", type=int, default=2000)
    parser.add_argument("--fraud-rate", type=float, default=0.05)
    parser.add_argument("--block-threshold", type=float, default=0.9)
    parser.add_argument("--review-threshold", type=float, default=0.5)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--artifacts-root", default="data/evaluation")
    args = parser.parse_args()

    runner = FraudLifecycle(
        dept=args.dept, pipeline_name=args.pipeline,
        n_total=args.n_total, fraud_rate=args.fraud_rate,
        block_threshold=args.block_threshold, review_threshold=args.review_threshold,
        seed=args.seed, artifacts_root=args.artifacts_root,
    )
    manifest = runner.run()
    print(json.dumps(asdict(manifest), indent=2, default=str)[:3500])


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    _main()
