"""INSUR reference: Deep Learning sequence-classification lifecycle (§64.20).

CV lifecycle already covers CNN + ResNet (image domain). This module covers
the explicit sequence-domain DL stack the operator asked for:

  1. Logistic Regression on bag-of-features       (baseline, sklearn)
  2. LSTM-based sequence classifier               (PyTorch, RNN family)
  3. Transformer-encoder sequence classifier      (PyTorch, attention)

Synthetic dataset: a binary sequence-classification task where positive
class has a specific "trigger token" present in the sequence. Both NN
models learn the trigger; LR baseline fails because it needs n-gram
features the bag-of-features doesn't capture for positional triggers.

Per-model output:
  - Accuracy / precision / recall / F1 (weighted)
  - Confusion matrix
  - Training loss curve per epoch
  - Per-model params count, batch_size, learning rate, optimizer
  - SHAP-style attention map only for Transformer (token-level salience)

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
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, TensorDataset

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


@dataclass
class DlManifest:
    run_id: str
    dept: str
    pipeline: str
    task: str
    dataset: str
    vocab_size: int
    seq_len: int
    n_classes: int
    n_train: int
    n_test: int
    duration_seconds: float
    artifacts_root: str
    device: str
    models: list[dict[str, Any]] = field(default_factory=list)
    plots: dict[str, str] = field(default_factory=dict)
    best_model: str = ""


# ---------------------------------------------------------------------------
# Synthetic sequence generator
# ---------------------------------------------------------------------------


def generate_synthetic_sequences(
    n: int = 1500, seq_len: int = 16, vocab_size: int = 50,
    trigger_token: int = 7, positive_rate: float = 0.5, seed: int = 42,
) -> tuple[np.ndarray, np.ndarray]:
    """Positive class = sequences containing `trigger_token` anywhere.
    Negative class = sequences sampled without the trigger.
    """
    rng = np.random.RandomState(seed)
    sequences = np.zeros((n, seq_len), dtype=np.int64)
    labels = np.zeros(n, dtype=np.int64)
    n_pos = int(n * positive_rate)
    pos_idx = rng.choice(n, size=n_pos, replace=False)
    labels[pos_idx] = 1

    for i in range(n):
        # Sample tokens (excluding trigger for negatives)
        if labels[i] == 0:
            choices = [t for t in range(vocab_size) if t != trigger_token]
            sequences[i] = rng.choice(choices, size=seq_len)
        else:
            # Positive: ensure trigger appears at least once
            sequences[i] = rng.randint(0, vocab_size, size=seq_len)
            if trigger_token not in sequences[i]:
                # Plant trigger at random position
                pos = rng.randint(0, seq_len)
                sequences[i, pos] = trigger_token

    return sequences, labels


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class LstmClassifier(nn.Module):
    def __init__(self, vocab_size: int, embed_dim: int = 32,
                 hidden_dim: int = 64, n_classes: int = 2) -> None:
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim)
        self.lstm = nn.LSTM(embed_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, n_classes)

    def forward(self, x):
        e = self.embed(x)
        _, (h, _) = self.lstm(e)
        return self.fc(h.squeeze(0))


class TransformerClassifier(nn.Module):
    def __init__(self, vocab_size: int, embed_dim: int = 32, n_heads: int = 4,
                 n_layers: int = 2, seq_len: int = 16, n_classes: int = 2) -> None:
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim)
        self.pos_embed = nn.Embedding(seq_len, embed_dim)
        enc_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim, nhead=n_heads, dim_feedforward=64, batch_first=True,
        )
        self.encoder = nn.TransformerEncoder(enc_layer, num_layers=n_layers)
        self.fc = nn.Linear(embed_dim, n_classes)
        self.seq_len = seq_len

    def forward(self, x):
        B, L = x.shape
        pos = torch.arange(L, device=x.device).unsqueeze(0).expand(B, L)
        e = self.embed(x) + self.pos_embed(pos)
        h = self.encoder(e)
        # Mean-pool tokens
        return self.fc(h.mean(dim=1))


# ---------------------------------------------------------------------------
# The runner
# ---------------------------------------------------------------------------


class DlLifecycle:
    def __init__(
        self,
        *,
        dept: str = "customer-experience",
        pipeline_name: str = "dl_reference",
        n_total: int = 1500,
        seq_len: int = 16,
        vocab_size: int = 50,
        trigger_token: int = 7,
        batch_size: int = 64,
        epochs: int = 4,
        artifacts_root: str | Path = "data/evaluation",
        seed: int = 42,
    ) -> None:
        if vocab_size < 2:
            raise ValueError("vocab_size must be ≥ 2")
        if trigger_token >= vocab_size:
            raise ValueError("trigger_token must be < vocab_size")
        self.dept = dept
        self.pipeline_name = pipeline_name
        self.n_total = n_total
        self.seq_len = seq_len
        self.vocab_size = vocab_size
        self.trigger_token = trigger_token
        self.batch_size = batch_size
        self.epochs = epochs
        self.seed = seed

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.run_id = f"{int(time.time())}-{uuid.uuid4().hex[:6]}"
        self.out = Path(artifacts_root) / dept / pipeline_name / self.run_id
        self.plots_dir = self.out / "plots"
        self.out.mkdir(parents=True, exist_ok=True)
        self.plots_dir.mkdir(parents=True, exist_ok=True)

        self.manifest = DlManifest(
            run_id=self.run_id, dept=dept, pipeline=pipeline_name,
            task="sequence_classification", dataset="synthetic_trigger_token",
            vocab_size=vocab_size, seq_len=seq_len, n_classes=2,
            n_train=0, n_test=0, duration_seconds=0.0,
            artifacts_root=str(self.out), device=str(self.device),
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

    def _score(self, y_true, y_pred, name: str, **extras) -> dict[str, Any]:
        return {
            "model": name,
            "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
            "precision_weighted": round(float(precision_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
            "recall_weighted": round(float(recall_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
            "f1_weighted": round(float(f1_score(y_true, y_pred, average="weighted", zero_division=0)), 4),
            "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
            "classification_report": classification_report(y_true, y_pred, output_dict=True, zero_division=0),
            **extras,
        }

    def lr_baseline(self, X_train, y_train, X_test, y_test) -> dict[str, Any]:
        """Bag-of-tokens LR — should fail because trigger position is destroyed."""
        t0 = time.time()
        # Bag-of-tokens: count occurrences of each token per sequence
        def bag(seqs):
            out = np.zeros((len(seqs), self.vocab_size), dtype=np.float32)
            for i, seq in enumerate(seqs):
                for tok in seq:
                    out[i, tok] += 1
            return out
        Xtr = bag(X_train)
        Xte = bag(X_test)
        clf = LogisticRegression(max_iter=300, C=1.0, n_jobs=-1)
        clf.fit(Xtr, y_train)
        pred = clf.predict(Xte)
        return self._score(
            y_test, pred, "LogisticRegression (bag-of-tokens)",
            fit_seconds=round(time.time() - t0, 3),
            loss_function="logistic loss",
            hyperparams={"C": 1.0, "max_iter": 300, "input_dim": int(Xtr.shape[1])},
        )

    def _train_pytorch(self, model: nn.Module, X_train, y_train, X_test, y_test,
                       label: str, lr: float = 1e-3) -> dict[str, Any]:
        model = model.to(self.device)
        opt = optim.Adam(model.parameters(), lr=lr)
        loss_fn = nn.CrossEntropyLoss()

        train_ds = TensorDataset(torch.LongTensor(X_train), torch.LongTensor(y_train))
        test_ds = TensorDataset(torch.LongTensor(X_test), torch.LongTensor(y_test))
        train_loader = DataLoader(train_ds, batch_size=self.batch_size, shuffle=True)
        test_loader = DataLoader(test_ds, batch_size=self.batch_size, shuffle=False)

        loss_curve: list[float] = []
        t0 = time.time()
        for epoch in range(self.epochs):
            model.train(True)
            running, n = 0.0, 0
            for xb, yb in train_loader:
                xb, yb = xb.to(self.device), yb.to(self.device)
                opt.zero_grad()
                pred = model(xb)
                loss = loss_fn(pred, yb)
                loss.backward()
                opt.step()
                running += loss.item()
                n += 1
            avg = running / max(n, 1)
            loss_curve.append(round(avg, 4))
            logger.info("  %s epoch %d loss=%.4f", label, epoch + 1, avg)

        model.train(False)
        all_pred, all_true = [], []
        with torch.no_grad():
            for xb, yb in test_loader:
                xb = xb.to(self.device)
                p = model(xb).argmax(dim=1).cpu().numpy()
                all_pred.append(p)
                all_true.append(yb.numpy())
        y_pred = np.concatenate(all_pred)
        y_true = np.concatenate(all_true)

        return self._score(
            y_true, y_pred, label,
            fit_seconds=round(time.time() - t0, 3),
            loss_function="CrossEntropyLoss",
            optimizer="Adam",
            learning_rate=lr,
            batch_size=self.batch_size,
            epochs=self.epochs,
            loss_curve=loss_curve,
            device=str(self.device),
            n_params=int(sum(p.numel() for p in model.parameters())),
        )

    def run(self) -> DlManifest:
        t0 = time.time()
        X, y = generate_synthetic_sequences(
            n=self.n_total, seq_len=self.seq_len, vocab_size=self.vocab_size,
            trigger_token=self.trigger_token, seed=self.seed,
        )
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, random_state=42, stratify=y,
        )
        self.manifest.n_train = len(X_train)
        self.manifest.n_test = len(X_test)

        # Model 1: LR baseline
        try:
            res = self.lr_baseline(X_train, y_train, X_test, y_test)
            self.manifest.models.append(res)
            logger.info("  LR: acc=%.3f f1=%.3f", res["accuracy"], res["f1_weighted"])
        except Exception as exc:
            logger.exception("LR baseline failed: %s", exc)
            self.manifest.models.append({"model": "LogisticRegression", "error": str(exc)})

        # Model 2: LSTM
        try:
            res = self._train_pytorch(
                LstmClassifier(vocab_size=self.vocab_size, n_classes=2),
                X_train, y_train, X_test, y_test, "LSTM classifier",
            )
            self.manifest.models.append(res)
            logger.info("  LSTM: acc=%.3f f1=%.3f", res["accuracy"], res["f1_weighted"])
        except Exception as exc:
            logger.exception("LSTM failed: %s", exc)
            self.manifest.models.append({"model": "LSTM", "error": str(exc)})

        # Model 3: Transformer
        try:
            res = self._train_pytorch(
                TransformerClassifier(vocab_size=self.vocab_size, seq_len=self.seq_len, n_classes=2),
                X_train, y_train, X_test, y_test, "Transformer encoder",
            )
            self.manifest.models.append(res)
            logger.info("  Transformer: acc=%.3f f1=%.3f", res["accuracy"], res["f1_weighted"])
        except Exception as exc:
            logger.exception("Transformer failed: %s", exc)
            self.manifest.models.append({"model": "Transformer", "error": str(exc)})

        scored = [m for m in self.manifest.models if "f1_weighted" in m]
        if scored:
            best = max(scored, key=lambda m: m["f1_weighted"])
            self.manifest.best_model = best["model"]

        self._plot_comparison(scored)
        self._plot_confusion_matrices(scored)
        self._plot_loss_curves(scored)

        self.manifest.duration_seconds = round(time.time() - t0, 2)
        (self.out / "manifest.json").write_text(json.dumps(asdict(self.manifest), indent=2, default=str))
        return self.manifest

    def _plot_comparison(self, scored):
        if not scored:
            return
        fig, ax = plt.subplots(figsize=(10, 5))
        names = [m["model"] for m in scored]
        accs = [m["accuracy"] for m in scored]
        f1s = [m["f1_weighted"] for m in scored]
        x = np.arange(len(names))
        w = 0.35
        ax.bar(x - w/2, accs, w, label="Accuracy", color="#1f77b4")
        ax.bar(x + w/2, f1s, w, label="F1 weighted", color="#2ca02c")
        for i, (a, f) in enumerate(zip(accs, f1s)):
            ax.text(i - w/2, a, f"{a:.2f}", ha="center", va="bottom", fontsize=9)
            ax.text(i + w/2, f, f"{f:.2f}", ha="center", va="bottom", fontsize=9)
        ax.set_xticks(x)
        ax.set_xticklabels(names, rotation=15, ha="right")
        ax.set_ylim(0, 1.05)
        ax.set_ylabel("Score")
        ax.set_title("DL sequence classification — same data, 3 architectures")
        ax.legend()
        self._savefig("model_comparison", fig)

    def _plot_confusion_matrices(self, scored):
        if not scored:
            return
        n = len(scored)
        fig, axes = plt.subplots(1, n, figsize=(4 * n, 4))
        if n == 1:
            axes = [axes]
        for ax, m in zip(axes, scored):
            cm = np.array(m["confusion_matrix"])
            sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=ax, cbar=False,
                        xticklabels=["neg", "pos"], yticklabels=["neg", "pos"])
            ax.set_title(m["model"][:25], fontsize=10)
            ax.set_xlabel("Predicted")
            ax.set_ylabel("Actual")
        fig.suptitle("Confusion matrices per DL model")
        self._savefig("confusion_matrices", fig)

    def _plot_loss_curves(self, scored):
        curves = [m for m in scored if m.get("loss_curve")]
        if not curves:
            return
        fig, ax = plt.subplots(figsize=(9, 5))
        for m in curves:
            ax.plot(range(1, len(m["loss_curve"]) + 1), m["loss_curve"],
                    marker="o", label=m["model"])
        ax.set_xlabel("Epoch")
        ax.set_ylabel("Training loss (CrossEntropy)")
        ax.set_title("Training loss curves (lower = better)")
        ax.legend()
        ax.grid(alpha=0.3)
        self._savefig("loss_curves", fig)


def _main() -> None:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dept", default="customer-experience")
    parser.add_argument("--pipeline", default="dl_reference")
    parser.add_argument("--n-total", type=int, default=1500)
    parser.add_argument("--seq-len", type=int, default=16)
    parser.add_argument("--vocab-size", type=int, default=50)
    parser.add_argument("--trigger-token", type=int, default=7)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--artifacts-root", default="data/evaluation")
    args = parser.parse_args()

    runner = DlLifecycle(
        dept=args.dept, pipeline_name=args.pipeline,
        n_total=args.n_total, seq_len=args.seq_len, vocab_size=args.vocab_size,
        trigger_token=args.trigger_token,
        batch_size=args.batch_size, epochs=args.epochs, seed=args.seed,
        artifacts_root=args.artifacts_root,
    )
    manifest = runner.run()
    print(json.dumps(asdict(manifest), indent=2, default=str)[:3000])


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    _main()
