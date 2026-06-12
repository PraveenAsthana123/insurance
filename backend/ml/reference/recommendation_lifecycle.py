"""INSUR reference: recommendation lifecycle with content + CF + hybrid comparison.

Per §64.22 — every dept needs a recommender; this is the reference template.

Algorithms compared on the same synthetic-but-realistic user × item matrix:

  1. Popularity baseline           (always recommend most-popular items)
  2. Content-based                 (item-feature cosine similarity)
  3. Collaborative filtering       (ALS-style matrix factorization)
  4. Hybrid (content + CF)         (weighted blend)

Metrics per algorithm:
  - Precision@k / Recall@k / nDCG@k / MAP@k (k=10)
  - Diversity (intra-list, avg pairwise distance)
  - Novelty (1 - mean log-popularity of recommended items)
  - Latency p95 per user

Synthetic dataset structure:
  N=300 users, M=80 items, ~12 latent factors injected.
  Train/test split: held-out 20% of each user's interactions for eval.

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
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)


@dataclass
class RecoManifest:
    run_id: str
    dept: str
    pipeline: str
    n_users: int
    n_items: int
    n_interactions: int
    top_k: int
    duration_seconds: float
    artifacts_root: str
    algorithms: list[dict[str, Any]] = field(default_factory=list)
    plots: dict[str, str] = field(default_factory=dict)
    best_algorithm: str = ""
    notes: str = ""


# ---------------------------------------------------------------------------
# Synthetic dataset generator
# ---------------------------------------------------------------------------


def generate_synthetic_data(n_users: int = 300, n_items: int = 80, n_factors: int = 12,
                             interaction_density: float = 0.15, seed: int = 42):
    """Generate user × item interaction matrix from latent factors.

    Returns:
        interactions: (n_users, n_items) binary matrix (1 = positive interaction)
        item_features: (n_items, n_factors) content features
    """
    rng = np.random.RandomState(seed)
    user_factors = rng.randn(n_users, n_factors)
    item_factors = rng.randn(n_items, n_factors)
    # Score matrix from dot product
    scores = user_factors @ item_factors.T
    # Sigmoid + threshold → binary interactions
    probs = 1 / (1 + np.exp(-scores))
    # Adjust threshold to hit target density
    threshold = np.quantile(probs, 1 - interaction_density)
    interactions = (probs >= threshold).astype(np.float32)
    # Item content features = item_factors + noise (so content-based has signal)
    item_features = item_factors + rng.randn(n_items, n_factors) * 0.3
    return interactions, item_features


# ---------------------------------------------------------------------------
# Recommenders
# ---------------------------------------------------------------------------


class PopularityReco:
    def fit(self, train_matrix: np.ndarray) -> None:
        self.popularity = train_matrix.sum(axis=0)

    def recommend(self, user_idx: int, train_matrix: np.ndarray, k: int) -> np.ndarray:
        # Exclude items already seen by this user
        seen = train_matrix[user_idx] > 0
        scores = self.popularity.copy()
        scores[seen] = -np.inf
        return np.argsort(-scores)[:k]


class ContentReco:
    def fit(self, train_matrix: np.ndarray, item_features: np.ndarray) -> None:
        self.item_features = item_features
        self.item_sim = cosine_similarity(item_features)
        np.fill_diagonal(self.item_sim, 0)  # no self-similarity

    def recommend(self, user_idx: int, train_matrix: np.ndarray, k: int) -> np.ndarray:
        seen_items = np.where(train_matrix[user_idx] > 0)[0]
        if len(seen_items) == 0:
            # Cold start fallback
            return np.argsort(-self.item_features.sum(axis=1))[:k]
        # Sum of similarities to user's seen items
        scores = self.item_sim[seen_items].sum(axis=0)
        scores[seen_items] = -np.inf
        return np.argsort(-scores)[:k]


class CollabReco:
    def __init__(self, n_factors: int = 16):
        self.n_factors = n_factors

    def fit(self, train_matrix: np.ndarray) -> None:
        # Matrix factorization via TruncatedSVD
        from scipy.sparse import csr_matrix
        sparse = csr_matrix(train_matrix)
        n_factors = min(self.n_factors, min(train_matrix.shape) - 1)
        svd = TruncatedSVD(n_components=n_factors, random_state=42)
        self.user_factors = svd.fit_transform(sparse)
        self.item_factors = svd.components_.T
        self.predicted = self.user_factors @ self.item_factors.T

    def recommend(self, user_idx: int, train_matrix: np.ndarray, k: int) -> np.ndarray:
        scores = self.predicted[user_idx].copy()
        seen = train_matrix[user_idx] > 0
        scores[seen] = -np.inf
        return np.argsort(-scores)[:k]


class HybridReco:
    def __init__(self, alpha: float = 0.5):
        self.alpha = alpha  # weight for CF; (1-alpha) for content

    def fit(self, train_matrix: np.ndarray, item_features: np.ndarray) -> None:
        self.cf = CollabReco(n_factors=16)
        self.cf.fit(train_matrix)
        self.content = ContentReco()
        self.content.fit(train_matrix, item_features)
        # Pre-normalize predicted score matrix
        cf_max = max(abs(self.cf.predicted.max()), abs(self.cf.predicted.min()), 1e-9)
        self.cf_scores = self.cf.predicted / cf_max
        # Content score per (user, item) = sum of similarities × interactions
        self.content_scores = train_matrix @ self.content.item_sim
        cs_max = max(abs(self.content_scores.max()), 1e-9)
        self.content_scores = self.content_scores / cs_max

    def recommend(self, user_idx: int, train_matrix: np.ndarray, k: int) -> np.ndarray:
        combined = self.alpha * self.cf_scores[user_idx] + (1 - self.alpha) * self.content_scores[user_idx]
        seen = train_matrix[user_idx] > 0
        combined[seen] = -np.inf
        return np.argsort(-combined)[:k]


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------


def precision_at_k(recommended: np.ndarray, relevant_set: set, k: int) -> float:
    top_k = recommended[:k]
    hits = sum(1 for i in top_k if i in relevant_set)
    return hits / k


def recall_at_k(recommended: np.ndarray, relevant_set: set, k: int) -> float:
    if not relevant_set:
        return 0.0
    top_k = recommended[:k]
    hits = sum(1 for i in top_k if i in relevant_set)
    return hits / len(relevant_set)


def ndcg_at_k(recommended: np.ndarray, relevant_set: set, k: int) -> float:
    dcg = sum(1.0 / np.log2(i + 2) for i, item in enumerate(recommended[:k]) if item in relevant_set)
    ideal = sum(1.0 / np.log2(i + 2) for i in range(min(len(relevant_set), k)))
    return dcg / ideal if ideal > 0 else 0.0


def average_precision_at_k(recommended: np.ndarray, relevant_set: set, k: int) -> float:
    if not relevant_set:
        return 0.0
    hits, sum_prec = 0, 0.0
    for i, item in enumerate(recommended[:k]):
        if item in relevant_set:
            hits += 1
            sum_prec += hits / (i + 1)
    return sum_prec / min(len(relevant_set), k) if min(len(relevant_set), k) > 0 else 0.0


def diversity(recommended_lists: list[np.ndarray], item_features: np.ndarray) -> float:
    """Intra-list diversity = avg pairwise distance between recommended items."""
    dists = []
    for rec in recommended_lists:
        if len(rec) < 2:
            continue
        feats = item_features[rec]
        sims = cosine_similarity(feats)
        # Upper triangle pairwise
        n = len(rec)
        upper = sims[np.triu_indices(n, k=1)]
        dists.append(float(1 - upper.mean()))
    return float(np.mean(dists)) if dists else 0.0


def novelty(recommended_lists: list[np.ndarray], popularity: np.ndarray) -> float:
    """Novelty = 1 - mean log-popularity of recommendations (higher = more novel)."""
    log_pop = np.log1p(popularity)
    max_log = log_pop.max() if log_pop.max() > 0 else 1
    novelties = []
    for rec in recommended_lists:
        rec_log_pop = log_pop[rec] / max_log
        novelties.append(float(1 - rec_log_pop.mean()))
    return float(np.mean(novelties))


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------


class RecoLifecycle:
    def __init__(
        self,
        *,
        dept: str = "e-commerce",
        pipeline_name: str = "recommendation_reference",
        n_users: int = 300,
        n_items: int = 80,
        top_k: int = 10,
        test_holdout_pct: float = 0.2,
        artifacts_root: str | Path = "data/evaluation",
        seed: int = 42,
    ) -> None:
        self.dept = dept
        self.pipeline_name = pipeline_name
        self.n_users = n_users
        self.n_items = n_items
        self.top_k = top_k
        self.test_holdout_pct = test_holdout_pct
        self.seed = seed

        self.run_id = f"{int(time.time())}-{uuid.uuid4().hex[:6]}"
        self.out = Path(artifacts_root) / dept / pipeline_name / self.run_id
        self.plots_dir = self.out / "plots"
        self.out.mkdir(parents=True, exist_ok=True)
        self.plots_dir.mkdir(parents=True, exist_ok=True)

        self.manifest = RecoManifest(
            run_id=self.run_id,
            dept=dept,
            pipeline=pipeline_name,
            n_users=n_users,
            n_items=n_items,
            n_interactions=0,
            top_k=top_k,
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

    def _eval_algorithm(self, name: str, recommend_fn, train_matrix, test_matrix, item_features, popularity, hp: dict) -> dict:
        t0 = time.time()
        recommended_per_user = []
        precisions, recalls, ndcgs, maps = [], [], [], []
        latencies = []

        for u in range(self.n_users):
            relevant = set(np.where(test_matrix[u] > 0)[0].tolist())
            if not relevant:
                continue
            t_user = time.time()
            rec = recommend_fn(u, train_matrix, self.top_k)
            latencies.append((time.time() - t_user) * 1000)  # ms
            recommended_per_user.append(rec)
            precisions.append(precision_at_k(rec, relevant, self.top_k))
            recalls.append(recall_at_k(rec, relevant, self.top_k))
            ndcgs.append(ndcg_at_k(rec, relevant, self.top_k))
            maps.append(average_precision_at_k(rec, relevant, self.top_k))

        return {
            "algorithm": name,
            "precision_at_k": round(float(np.mean(precisions)) if precisions else 0, 4),
            "recall_at_k": round(float(np.mean(recalls)) if recalls else 0, 4),
            "ndcg_at_k": round(float(np.mean(ndcgs)) if ndcgs else 0, 4),
            "map_at_k": round(float(np.mean(maps)) if maps else 0, 4),
            "diversity": round(diversity(recommended_per_user, item_features), 4),
            "novelty": round(novelty(recommended_per_user, popularity), 4),
            "latency_ms_p95": round(float(np.percentile(latencies, 95)) if latencies else 0, 3),
            "latency_ms_mean": round(float(np.mean(latencies)) if latencies else 0, 3),
            "fit_seconds": round(time.time() - t0, 3),
            "n_users_evaluated": len(precisions),
            "hyperparams": hp,
        }

    def run(self) -> RecoManifest:
        t0 = time.time()

        # Generate synthetic data
        interactions, item_features = generate_synthetic_data(
            n_users=self.n_users, n_items=self.n_items, seed=self.seed
        )
        self.manifest.n_interactions = int(interactions.sum())
        self.manifest.notes = f"Synthetic {self.n_users}×{self.n_items} matrix with 12 latent factors"

        # Train/test split per user
        rng = np.random.RandomState(self.seed)
        train_matrix = interactions.copy()
        test_matrix = np.zeros_like(interactions)
        for u in range(self.n_users):
            interacted = np.where(interactions[u] > 0)[0]
            if len(interacted) < 2:
                continue
            n_test = max(1, int(len(interacted) * self.test_holdout_pct))
            test_idx = rng.choice(interacted, size=n_test, replace=False)
            train_matrix[u, test_idx] = 0
            test_matrix[u, test_idx] = 1

        popularity = train_matrix.sum(axis=0)

        # Fit + eval each algorithm
        algos = [
            ("Popularity baseline", PopularityReco(), {}),
        ]
        # Build then add
        pop = PopularityReco()
        pop.fit(train_matrix)
        algos = []
        algos.append(("Popularity baseline", pop.recommend, {}))

        content = ContentReco()
        content.fit(train_matrix, item_features)
        algos.append(("Content-based", content.recommend, {"item_feature_dim": item_features.shape[1]}))

        cf = CollabReco(n_factors=16)
        cf.fit(train_matrix)
        algos.append(("Collaborative (SVD)", cf.recommend, {"n_factors": 16}))

        hybrid = HybridReco(alpha=0.6)
        hybrid.fit(train_matrix, item_features)
        algos.append(("Hybrid (0.6×CF + 0.4×content)", hybrid.recommend, {"alpha": 0.6, "n_factors": 16}))

        for name, recommend_fn, hp in algos:
            try:
                res = self._eval_algorithm(name, recommend_fn, train_matrix, test_matrix, item_features, popularity, hp)
                self.manifest.algorithms.append(res)
                logger.info("  %s: P@k=%.3f R@k=%.3f nDCG=%.3f", name, res["precision_at_k"], res["recall_at_k"], res["ndcg_at_k"])
            except Exception as exc:
                logger.exception("%s failed: %s", name, exc)
                self.manifest.algorithms.append({"algorithm": name, "error": str(exc)})

        scored = [a for a in self.manifest.algorithms if "ndcg_at_k" in a]
        if scored:
            best = max(scored, key=lambda a: a["ndcg_at_k"])
            self.manifest.best_algorithm = best["algorithm"]

        self._plot_comparison(scored)
        self._plot_div_novel(scored)
        self._plot_latency(scored)

        self.manifest.duration_seconds = round(time.time() - t0, 2)
        (self.out / "manifest.json").write_text(json.dumps(asdict(self.manifest), indent=2, default=str))
        return self.manifest

    def _plot_comparison(self, scored):
        if not scored:
            return
        fig, ax = plt.subplots(figsize=(10, 5))
        names = [a["algorithm"] for a in scored]
        p = [a["precision_at_k"] for a in scored]
        r = [a["recall_at_k"] for a in scored]
        n = [a["ndcg_at_k"] for a in scored]
        m = [a["map_at_k"] for a in scored]
        x = np.arange(len(names))
        w = 0.2
        ax.bar(x - 1.5*w, p, w, label=f"P@{self.top_k}", color="#1f77b4")
        ax.bar(x - 0.5*w, r, w, label=f"R@{self.top_k}", color="#2ca02c")
        ax.bar(x + 0.5*w, n, w, label=f"nDCG@{self.top_k}", color="#ff7f0e")
        ax.bar(x + 1.5*w, m, w, label=f"MAP@{self.top_k}", color="#d62728")
        ax.set_xticks(x)
        ax.set_xticklabels(names, rotation=15, ha="right")
        ax.set_ylabel("Score")
        ax.set_title(f"Recommendation algorithm comparison (k={self.top_k})")
        ax.legend()
        self._savefig("algorithm_comparison", fig)

    def _plot_div_novel(self, scored):
        if not scored:
            return
        fig, ax = plt.subplots(figsize=(9, 4))
        names = [a["algorithm"] for a in scored]
        div = [a["diversity"] for a in scored]
        nov = [a["novelty"] for a in scored]
        x = np.arange(len(names))
        w = 0.35
        ax.bar(x - w/2, div, w, label="Diversity", color="#9467bd")
        ax.bar(x + w/2, nov, w, label="Novelty", color="#8c564b")
        ax.set_xticks(x)
        ax.set_xticklabels(names, rotation=15, ha="right")
        ax.set_ylim(0, 1.05)
        ax.set_ylabel("Score")
        ax.set_title("Diversity + Novelty per algorithm")
        ax.legend()
        self._savefig("diversity_novelty", fig)

    def _plot_latency(self, scored):
        if not scored:
            return
        fig, ax = plt.subplots(figsize=(9, 4))
        names = [a["algorithm"] for a in scored]
        p95 = [a["latency_ms_p95"] for a in scored]
        mean = [a["latency_ms_mean"] for a in scored]
        x = np.arange(len(names))
        w = 0.35
        ax.bar(x - w/2, mean, w, label="mean", color="#1f77b4")
        ax.bar(x + w/2, p95, w, label="p95", color="#d62728")
        for i, (m, p) in enumerate(zip(mean, p95)):
            ax.text(i - w/2, m, f"{m:.1f}", ha="center", va="bottom", fontsize=8)
            ax.text(i + w/2, p, f"{p:.1f}", ha="center", va="bottom", fontsize=8)
        ax.set_xticks(x)
        ax.set_xticklabels(names, rotation=15, ha="right")
        ax.set_ylabel("Latency (ms per user)")
        ax.set_title("Per-user recommendation latency")
        ax.legend()
        self._savefig("latency", fig)


def _main() -> None:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dept", default="e-commerce")
    parser.add_argument("--pipeline", default="recommendation_reference")
    parser.add_argument("--n-users", type=int, default=300)
    parser.add_argument("--n-items", type=int, default=80)
    parser.add_argument("--top-k", type=int, default=10)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--artifacts-root", default="data/evaluation")
    args = parser.parse_args()

    runner = RecoLifecycle(
        dept=args.dept,
        pipeline_name=args.pipeline,
        n_users=args.n_users,
        n_items=args.n_items,
        top_k=args.top_k,
        seed=args.seed,
        artifacts_root=args.artifacts_root,
    )
    manifest = runner.run()
    print(json.dumps(asdict(manifest), indent=2, default=str)[:3000])


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    _main()
