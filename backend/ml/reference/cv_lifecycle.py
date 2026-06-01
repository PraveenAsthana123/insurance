"""HOLY reference: CV lifecycle with multi-model score comparison.

Per operator 2026-05-22: "CV: image classification + segmentation + detection
for image data ...compare each model with hyperparam + loss + batch + score"

Image classification on MNIST with three architectures compared side-by-side:

  1. Logistic Regression on flattened pixels   (baseline, sklearn)
  2. Simple CNN (Conv-Conv-FC)                  (custom PyTorch)
  3. ResNet18 (pretrained backbone, frozen)     (transfer learning)

Per-model output:
  - Accuracy / precision / recall / F1 (weighted)
  - Confusion matrix
  - Training loss curve per epoch
  - Sample predictions grid (5 correct + 5 wrong)
  - Loss function + optimizer + batch_size + epochs logged

Detection + segmentation deferred — they need labeled bbox/mask data.
Stubs noted in §64.20 + future commits.

Artifacts: data/evaluation/<dept>/<pipeline>/<run_id>/manifest.json + plots/
(Default artifact root mirrors the structured-ML lifecycle convention.)
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
from torch.utils.data import DataLoader, Subset
from torchvision import datasets, models, transforms

logger = logging.getLogger(__name__)


@dataclass
class CvManifest:
    run_id: str
    dept: str
    pipeline: str
    task: str
    dataset: str
    n_classes: int
    n_train: int
    n_test: int
    duration_seconds: float
    artifacts_root: str
    models: list[dict[str, Any]] = field(default_factory=list)
    plots: dict[str, str] = field(default_factory=dict)
    best_model: str = ""
    device: str = "cpu"


class SimpleCNN(nn.Module):
    def __init__(self, n_classes: int = 10) -> None:
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(32 * 7 * 7, 64),
            nn.ReLU(),
            nn.Linear(64, n_classes),
        )

    def forward(self, x):
        return self.classifier(self.features(x))


class ResNetTransfer(nn.Module):
    def __init__(self, n_classes: int = 10) -> None:
        super().__init__()
        backbone = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
        for p in backbone.parameters():
            p.requires_grad = False
        in_features = backbone.fc.in_features
        backbone.fc = nn.Linear(in_features, n_classes)
        self.backbone = backbone

    def forward(self, x):
        if x.shape[1] == 1:
            x = x.repeat(1, 3, 1, 1)
        if x.shape[-1] < 32:
            x = nn.functional.interpolate(x, size=32, mode="bilinear", align_corners=False)
        return self.backbone(x)


class CvLifecycle:
    def __init__(
        self,
        *,
        dataset_root: str | Path = "data/cv",
        dept: str = "manufacturing",
        pipeline_name: str = "cv_reference",
        n_train: int = 2000,
        n_test: int = 500,
        batch_size: int = 64,
        epochs: int = 3,
        artifacts_root: str | Path = "data/evaluation",
    ) -> None:
        self.dataset_root = Path(dataset_root)
        self.dataset_root.mkdir(parents=True, exist_ok=True)
        self.dept = dept
        self.pipeline_name = pipeline_name
        self.n_train = n_train
        self.n_test = n_test
        self.batch_size = batch_size
        self.epochs = epochs

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.run_id = f"{int(time.time())}-{uuid.uuid4().hex[:6]}"
        self.out = Path(artifacts_root) / dept / pipeline_name / self.run_id
        self.plots_dir = self.out / "plots"
        self.out.mkdir(parents=True, exist_ok=True)
        self.plots_dir.mkdir(parents=True, exist_ok=True)

        self.manifest = CvManifest(
            run_id=self.run_id,
            dept=dept,
            pipeline=pipeline_name,
            task="image_classification",
            dataset="MNIST",
            n_classes=10,
            n_train=n_train,
            n_test=n_test,
            duration_seconds=0.0,
            artifacts_root=str(self.out),
            device=str(self.device),
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

    def load_data(self):
        tf = transforms.Compose([transforms.ToTensor()])
        train_full = datasets.MNIST(root=str(self.dataset_root), train=True, download=True, transform=tf)
        test_full = datasets.MNIST(root=str(self.dataset_root), train=False, download=True, transform=tf)
        torch.manual_seed(42)
        train_idx = torch.randperm(len(train_full))[:self.n_train]
        test_idx = torch.randperm(len(test_full))[:self.n_test]
        return Subset(train_full, train_idx.tolist()), Subset(test_full, test_idx.tolist())

    @staticmethod
    def _to_arrays(subset) -> tuple[np.ndarray, np.ndarray]:
        loader = DataLoader(subset, batch_size=256, shuffle=False)
        xs, ys = [], []
        for x, y in loader:
            xs.append(x.numpy())
            ys.append(y.numpy())
        return np.concatenate(xs), np.concatenate(ys)

    def lr_baseline(self, X_train, y_train, X_test, y_test) -> dict[str, Any]:
        t0 = time.time()
        Xtr = X_train.reshape(len(X_train), -1)
        Xte = X_test.reshape(len(X_test), -1)
        clf = LogisticRegression(max_iter=200, C=1.0, n_jobs=-1)
        clf.fit(Xtr, y_train)
        pred = clf.predict(Xte)
        return self._score(
            y_test, pred, "LogisticRegression (flattened pixels)",
            fit_seconds=round(time.time() - t0, 3),
            loss_function="logistic loss (cross-entropy)",
            hyperparams={"C": 1.0, "max_iter": 200, "input_dim": int(Xtr.shape[1])},
        )

    def _train_pytorch(self, model: nn.Module, train_subset, test_subset, label: str, lr: float = 1e-3):
        model = model.to(self.device)
        opt = optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=lr)
        loss_fn = nn.CrossEntropyLoss()

        train_loader = DataLoader(train_subset, batch_size=self.batch_size, shuffle=True)
        test_loader = DataLoader(test_subset, batch_size=self.batch_size, shuffle=False)

        loss_curve: list[float] = []
        t0 = time.time()
        for epoch in range(self.epochs):
            model.train(True)
            running = 0.0
            n_batches = 0
            for xb, yb in train_loader:
                xb, yb = xb.to(self.device), yb.to(self.device)
                opt.zero_grad()
                pred = model(xb)
                loss = loss_fn(pred, yb)
                loss.backward()
                opt.step()
                running += loss.item()
                n_batches += 1
            avg = running / max(n_batches, 1)
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
            n_trainable_params=int(sum(p.numel() for p in model.parameters() if p.requires_grad)),
        ), model

    def run(self) -> CvManifest:
        t0 = time.time()
        logger.info("CV lifecycle starting on %s (device=%s)", self.dataset_root, self.device)

        train_subset, test_subset = self.load_data()
        X_train, y_train = self._to_arrays(train_subset)
        X_test, y_test = self._to_arrays(test_subset)

        # Model 1: LR baseline
        try:
            res = self.lr_baseline(X_train, y_train, X_test, y_test)
            self.manifest.models.append(res)
            logger.info("  LR: acc=%.3f f1=%.3f", res["accuracy"], res["f1_weighted"])
        except Exception as exc:
            logger.exception("LR baseline failed: %s", exc)
            self.manifest.models.append({"model": "LogisticRegression", "error": str(exc)})

        # Model 2: SimpleCNN
        cnn_model = None
        try:
            res, cnn_model = self._train_pytorch(SimpleCNN(n_classes=10), train_subset, test_subset, "SimpleCNN (Conv-Conv-FC)")
            self.manifest.models.append(res)
            logger.info("  CNN: acc=%.3f f1=%.3f", res["accuracy"], res["f1_weighted"])
        except Exception as exc:
            logger.exception("SimpleCNN failed: %s", exc)
            self.manifest.models.append({"model": "SimpleCNN", "error": str(exc)})

        # Model 3: ResNet18 (frozen backbone + new head)
        try:
            res, _ = self._train_pytorch(ResNetTransfer(n_classes=10), train_subset, test_subset, "ResNet18 (frozen + new head)")
            self.manifest.models.append(res)
            logger.info("  ResNet: acc=%.3f f1=%.3f", res["accuracy"], res["f1_weighted"])
        except Exception as exc:
            logger.exception("ResNet failed: %s", exc)
            self.manifest.models.append({"model": "ResNet18", "error": str(exc)})

        scored = [m for m in self.manifest.models if "f1_weighted" in m]
        if scored:
            best = max(scored, key=lambda m: m["f1_weighted"])
            self.manifest.best_model = best["model"]

        self._plot_comparison(scored)
        self._plot_confusion_matrices(scored)
        self._plot_loss_curves(scored)
        if cnn_model is not None:
            self._plot_sample_predictions(cnn_model, test_subset)

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
        ax.set_title("CV model comparison — same MNIST subset")
        ax.legend()
        self._savefig("model_comparison", fig)

        fig, ax = plt.subplots(figsize=(10, 4))
        lat = [m.get("fit_seconds", 0) for m in scored]
        ax.bar(names, lat, color="#ff7f0e")
        for i, v in enumerate(lat):
            ax.text(i, v, f"{v:.1f}s", ha="center", va="bottom", fontsize=9)
        ax.set_ylabel("Fit seconds")
        ax.set_title("CV training time per model")
        plt.xticks(rotation=15, ha="right")
        self._savefig("training_time", fig)

    def _plot_confusion_matrices(self, scored):
        if not scored:
            return
        n = len(scored)
        fig, axes = plt.subplots(1, n, figsize=(5 * n, 5))
        if n == 1:
            axes = [axes]
        for ax, m in zip(axes, scored):
            cm = np.array(m["confusion_matrix"])
            sns.heatmap(cm, annot=False, cmap="Blues", ax=ax, cbar=False)
            ax.set_title(m["model"][:30], fontsize=10)
            ax.set_xlabel("Predicted")
            ax.set_ylabel("Actual")
        fig.suptitle("Confusion matrices per CV model (MNIST 10 classes)")
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

    def _plot_sample_predictions(self, model, test_subset):
        model.train(False)
        loader = DataLoader(test_subset, batch_size=256, shuffle=False)
        correct_idx, wrong_idx = [], []
        with torch.no_grad():
            offset = 0
            for xb, yb in loader:
                xb_d = xb.to(self.device)
                pred = model(xb_d).argmax(dim=1).cpu().numpy()
                for i in range(len(pred)):
                    if pred[i] == yb[i].item():
                        if len(correct_idx) < 5:
                            correct_idx.append((offset + i, xb[i].numpy()[0], int(pred[i]), int(yb[i])))
                    else:
                        if len(wrong_idx) < 5:
                            wrong_idx.append((offset + i, xb[i].numpy()[0], int(pred[i]), int(yb[i])))
                offset += len(pred)
                if len(correct_idx) >= 5 and len(wrong_idx) >= 5:
                    break

        samples = correct_idx + wrong_idx
        if not samples:
            return
        fig, axes = plt.subplots(2, 5, figsize=(12, 5))
        for ax, (idx, img, p, t) in zip(axes.ravel(), samples):
            ax.imshow(img, cmap="gray")
            color = "green" if p == t else "red"
            ax.set_title(f"pred={p} true={t}", color=color, fontsize=10)
            ax.axis("off")
        fig.suptitle("Sample predictions — top row correct, bottom wrong")
        self._savefig("sample_predictions", fig)


def _main() -> None:
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset-root", default="data/cv")
    parser.add_argument("--dept", default="manufacturing")
    parser.add_argument("--pipeline", default="cv_reference")
    parser.add_argument("--n-train", type=int, default=2000)
    parser.add_argument("--n-test", type=int, default=500)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--artifacts-root", default="data/evaluation")
    args = parser.parse_args()

    runner = CvLifecycle(
        dataset_root=args.dataset_root,
        dept=args.dept,
        pipeline_name=args.pipeline,
        n_train=args.n_train,
        n_test=args.n_test,
        batch_size=args.batch_size,
        epochs=args.epochs,
        artifacts_root=args.artifacts_root,
    )
    manifest = runner.run()
    print(json.dumps(asdict(manifest), indent=2, default=str)[:3000])


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    _main()
