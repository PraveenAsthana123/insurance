"""INSUR reference: NLP lifecycle with multiple-technique score comparison.

Per operator 2026-05-22: "for nlp all the technique with score"

Techniques compared on the same text corpus + same task (binary
sentiment / topic classification):

  1. TF-IDF + Logistic Regression          (baseline)
  2. TF-IDF + LinearSVC                    (linear margin)
  3. Sentence-BERT embeddings + LR         (semantic)
  4. Zero-shot (facebook/bart-large-mnli)  (no training)

Side outputs (every run):
  - Score comparison table + bar chart (accuracy / F1 / latency)
  - Confusion matrix per technique
  - Per-class precision/recall breakdown
  - Sample misclassifications (interpretability)
  - Loss function + hyperparams logged per technique

Artifacts: data/eval/<dept>/<pipeline>/<run_id>/manifest.json + plots/
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
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import train_test_split
from sklearn.svm import LinearSVC

logger = logging.getLogger(__name__)


@dataclass
class NlpManifest:
    run_id: str
    dept: str
    pipeline: str
    task: str
    n_samples: int
    duration_seconds: float
    artifacts_root: str
    techniques: list[dict[str, Any]] = field(default_factory=list)
    plots: dict[str, str] = field(default_factory=dict)
    best_technique: str = ""
    sample_predictions: list[dict[str, Any]] = field(default_factory=list)


class NlpLifecycle:
    """Compare multiple NLP techniques on the same labeled corpus."""

    def __init__(
        self,
        *,
        texts: list[str],
        labels: list[str],
        dept: str,
        pipeline_name: str,
        task: str = "classification",
        artifacts_root: str | Path = "data/eval",
        techniques: list[str] | None = None,
    ) -> None:
        self.texts = texts
        self.labels = labels
        self.dept = dept
        self.pipeline_name = pipeline_name
        self.task = task
        self.requested = techniques or [
            "tfidf_lr",
            "tfidf_svm",
            "sbert_lr",
            "zero_shot",
        ]

        self.run_id = f"{int(time.time())}-{uuid.uuid4().hex[:6]}"
        self.out = Path(artifacts_root) / dept / pipeline_name / self.run_id
        self.plots_dir = self.out / "plots"
        self.out.mkdir(parents=True, exist_ok=True)
        self.plots_dir.mkdir(parents=True, exist_ok=True)

        self.manifest = NlpManifest(
            run_id=self.run_id,
            dept=dept,
            pipeline=pipeline_name,
            task=task,
            n_samples=len(texts),
            duration_seconds=0.0,
            artifacts_root=str(self.out),
        )

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

    def _score(self, y_true, y_pred, label: str, **extras) -> dict[str, Any]:
        return {
            "technique": label,
            "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
            "f1_weighted": round(float(f1_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
            "classification_report": classification_report(y_true, y_pred, output_dict=True, zero_division=0),
            "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
            **extras,
        }

    def tfidf_lr(self, X_train, X_test, y_train, y_test) -> dict[str, Any]:
        t0 = time.time()
        vec = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
        Xtr = vec.fit_transform(X_train)
        Xte = vec.transform(X_test)
        clf = LogisticRegression(max_iter=500, C=1.0)
        clf.fit(Xtr, y_train)
        pred = clf.predict(Xte)
        return self._score(
            y_test, pred, "TF-IDF + LogisticRegression",
            fit_seconds=round(time.time() - t0, 3),
            loss_function="binary cross-entropy (sklearn default for LR)",
            hyperparams={"C": 1.0, "max_iter": 500, "ngram_range": [1, 2], "max_features": 5000},
        )

    def tfidf_svm(self, X_train, X_test, y_train, y_test) -> dict[str, Any]:
        t0 = time.time()
        vec = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
        Xtr = vec.fit_transform(X_train)
        Xte = vec.transform(X_test)
        clf = LinearSVC(C=1.0, max_iter=2000)
        clf.fit(Xtr, y_train)
        pred = clf.predict(Xte)
        return self._score(
            y_test, pred, "TF-IDF + LinearSVC",
            fit_seconds=round(time.time() - t0, 3),
            loss_function="hinge loss (LinearSVC)",
            hyperparams={"C": 1.0, "max_iter": 2000, "ngram_range": [1, 2]},
        )

    def sbert_lr(self, X_train, X_test, y_train, y_test) -> dict[str, Any]:
        from sentence_transformers import SentenceTransformer
        t0 = time.time()
        model = SentenceTransformer("all-MiniLM-L6-v2")
        Xtr = model.encode(X_train, show_progress_bar=False, convert_to_numpy=True)
        Xte = model.encode(X_test, show_progress_bar=False, convert_to_numpy=True)
        clf = LogisticRegression(max_iter=500, C=1.0)
        clf.fit(Xtr, y_train)
        pred = clf.predict(Xte)
        return self._score(
            y_test, pred, "sentence-BERT (MiniLM) + LR",
            fit_seconds=round(time.time() - t0, 3),
            loss_function="binary cross-entropy on dense embeddings",
            hyperparams={"embedding_model": "all-MiniLM-L6-v2 (384-d)", "C": 1.0},
        )

    def zero_shot(self, X_test, y_test, candidate_labels: list[str]) -> dict[str, Any]:
        from transformers import pipeline
        t0 = time.time()
        zs = pipeline("zero-shot-classification", model="facebook/bart-large-mnli", device=-1)
        preds = []
        n = min(30, len(X_test))
        for txt in X_test[:n]:
            try:
                out = zs(txt[:512], candidate_labels=candidate_labels)
                preds.append(out["labels"][0])
            except Exception as exc:
                logger.warning("zero-shot error: %s", exc)
                preds.append(candidate_labels[0])
        y_eval = list(y_test[:n])
        return self._score(
            y_eval, preds, "Zero-shot (BART-MNLI)",
            fit_seconds=round(time.time() - t0, 3),
            loss_function="N/A — uses NLI entailment scores",
            hyperparams={"model": "facebook/bart-large-mnli", "candidate_labels": candidate_labels, "samples_evaluated": n},
        )

    # ------------------------------------------------------------------

    def run(self) -> NlpManifest:
        t0 = time.time()
        X_train, X_test, y_train, y_test = train_test_split(
            self.texts, self.labels, test_size=0.3, random_state=42, stratify=self.labels
        )

        for name in self.requested:
            try:
                if name == "tfidf_lr":
                    res = self.tfidf_lr(X_train, X_test, y_train, y_test)
                elif name == "tfidf_svm":
                    res = self.tfidf_svm(X_train, X_test, y_train, y_test)
                elif name == "sbert_lr":
                    res = self.sbert_lr(X_train, X_test, y_train, y_test)
                elif name == "zero_shot":
                    candidates = sorted(set(self.labels))
                    res = self.zero_shot(X_test, y_test, candidates)
                else:
                    logger.warning("unknown technique %s, skipping", name)
                    continue
                self.manifest.techniques.append(res)
                logger.info("  %s: acc=%.3f f1=%.3f (%.1fs)", res["technique"], res["accuracy"], res["f1_weighted"], res.get("fit_seconds", 0))
            except Exception as exc:
                logger.exception("technique %s failed: %s", name, exc)
                self.manifest.techniques.append({"technique": name, "error": str(exc)})

        scored = [t for t in self.manifest.techniques if "f1_weighted" in t]
        if scored:
            best = max(scored, key=lambda t: t["f1_weighted"])
            self.manifest.best_technique = best["technique"]

        self._plot_comparison(scored)
        self._plot_confusion_matrices(scored)

        if scored:
            try:
                self._sample_errors_tfidf(X_train, X_test, y_train, y_test)
            except Exception as exc:
                logger.warning("sample errors failed: %s", exc)

        self.manifest.duration_seconds = round(time.time() - t0, 2)
        (self.out / "manifest.json").write_text(json.dumps(asdict(self.manifest), indent=2, default=str))
        return self.manifest

    # ------------------------------------------------------------------

    def _plot_comparison(self, scored: list[dict]) -> None:
        if not scored:
            return
        fig, ax = plt.subplots(figsize=(10, 5))
        names = [t["technique"] for t in scored]
        accs = [t["accuracy"] for t in scored]
        f1s = [t["f1_weighted"] for t in scored]
        x = np.arange(len(names))
        w = 0.35
        ax.bar(x - w/2, accs, w, label="Accuracy", color="#1f77b4")
        ax.bar(x + w/2, f1s, w, label="F1 (weighted)", color="#2ca02c")
        for i, (a, f) in enumerate(zip(accs, f1s)):
            ax.text(i - w/2, a, f"{a:.2f}", ha="center", va="bottom", fontsize=9)
            ax.text(i + w/2, f, f"{f:.2f}", ha="center", va="bottom", fontsize=9)
        ax.set_xticks(x)
        ax.set_xticklabels(names, rotation=15, ha="right")
        ax.set_ylim(0, 1.1)
        ax.set_ylabel("Score")
        ax.set_title("NLP technique comparison (same task, same data)")
        ax.legend()
        self._savefig("technique_comparison", fig)

        fig, ax = plt.subplots(figsize=(10, 4))
        lat = [t.get("fit_seconds", 0) for t in scored]
        ax.bar(names, lat, color="#ff7f0e")
        for i, v in enumerate(lat):
            ax.text(i, v, f"{v:.1f}s", ha="center", va="bottom", fontsize=9)
        ax.set_ylabel("Fit / inference seconds")
        ax.set_title("NLP technique latency (lower = better)")
        plt.xticks(rotation=15, ha="right")
        self._savefig("technique_latency", fig)

    def _plot_confusion_matrices(self, scored: list[dict]) -> None:
        if not scored:
            return
        n = len(scored)
        fig, axes = plt.subplots(1, n, figsize=(4 * n, 4))
        if n == 1:
            axes = [axes]
        for ax, t in zip(axes, scored):
            cm = np.array(t["confusion_matrix"])
            sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=ax, cbar=False)
            ax.set_title(t["technique"][:30], fontsize=10)
            ax.set_xlabel("Predicted")
            ax.set_ylabel("Actual")
        fig.suptitle("Confusion matrices per NLP technique")
        self._savefig("confusion_matrices", fig)

    def _sample_errors_tfidf(self, X_train, X_test, y_train, y_test) -> None:
        vec = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
        Xtr = vec.fit_transform(X_train)
        Xte = vec.transform(X_test)
        clf = LogisticRegression(max_iter=500)
        clf.fit(Xtr, y_train)
        pred = clf.predict(Xte)
        errors = [
            {"text": X_test[i][:300], "actual": y_test[i], "predicted": pred[i]}
            for i in range(len(pred))
            if pred[i] != y_test[i]
        ][:5]
        self.manifest.sample_predictions = errors


def _main() -> None:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus", nargs="+", required=True)
    parser.add_argument("--dept", default="customer-experience")
    parser.add_argument("--pipeline", default="nlp_reference")
    parser.add_argument("--artifacts-root", default="data/eval")
    parser.add_argument("--techniques", nargs="*",
                        default=["tfidf_lr", "tfidf_svm", "sbert_lr"])
    args = parser.parse_args()

    texts, labels = [], []
    for spec in args.corpus:
        root = Path(spec)
        files = [root] if root.is_file() else sorted([*root.glob("*.md"), *root.glob("*.txt")])
        for f in files:
            try:
                t = f.read_text(encoding="utf-8")
                if t.strip():
                    for para in t.split("\n\n"):
                        para = para.strip()
                        if len(para) > 50:
                            texts.append(para)
                            labels.append(f.parent.name)
            except Exception as exc:
                logger.warning("skip %s: %s", f, exc)

    if len(set(labels)) < 2:
        print(f"Need ≥ 2 distinct labels; got {set(labels)}")
        return

    runner = NlpLifecycle(
        texts=texts, labels=labels,
        dept=args.dept, pipeline_name=args.pipeline,
        artifacts_root=args.artifacts_root, techniques=args.techniques,
    )
    manifest = runner.run()
    print(json.dumps(asdict(manifest), indent=2, default=str)[:2500])


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    _main()
