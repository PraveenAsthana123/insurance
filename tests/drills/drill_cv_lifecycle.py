#!/usr/bin/env python3
"""
Drill: HOLY CV lifecycle (§43, §64.20 + §64.32).

Steps (8 total; 3 negative assertions):
    1. (+) CV lifecycle runs end-to-end on MNIST subset (3 models)
    2. (+) ≥ 2 models score (some may fail; verify at least baseline + 1 NN)
    3. (+) Every successful model has accuracy + F1 + confusion matrix
    4. (+) Best model selected + reported in manifest.best_model
    5. (+) ≥ 4 PNG plots generated (comparison + confusion + loss + samples)
    6. (-) NEGATIVE — n_train=0 raises (no silent empty-training)
    7. (-) NEGATIVE — invalid epoch=0 still trains nothing on NN models
    8. (-) NEGATIVE — confusion matrix shape matches n_classes (no fabrication)

# RESOURCES: ml_cv_lifecycle gpu_optional disk_io

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    from ml.reference.cv_lifecycle import CvLifecycle

    print("\nDRILL: HOLY CV lifecycle (MNIST)\n")
    t0 = time.time()

    # ----- Step 1: end-to-end run -----
    runner = CvLifecycle(
        dataset_root=str(REPO_ROOT / "data" / "cv"),
        dept="drill_test",
        pipeline_name="cv_drill",
        n_train=800,
        n_test=200,
        batch_size=64,
        epochs=1,
        artifacts_root=str(REPO_ROOT / "data" / "eval"),
    )
    try:
        manifest = runner.run()
        step(1, "CV lifecycle runs end-to-end", True, f"{manifest.duration_seconds}s on {manifest.device}")
    except Exception as exc:
        step(1, "CV lifecycle runs end-to-end", False, f"raised {type(exc).__name__}: {exc}")
        return

    # ----- Step 2: ≥ 2 successful models -----
    scored = [m for m in manifest.models if "accuracy" in m]
    step(2, "≥ 2 models successfully scored", len(scored) >= 2,
         f"got {len(scored)} of {len(manifest.models)}")

    # ----- Step 3: each scored model has full metrics + confusion matrix -----
    bad = []
    for m in scored:
        for required in ("accuracy", "precision_weighted", "recall_weighted", "f1_weighted", "confusion_matrix"):
            if required not in m:
                bad.append(f"{m['model']}: missing {required}")
    step(3, "every scored model has accuracy + P/R/F1 + confusion matrix", not bad,
         "; ".join(bad) if bad else "")

    # ----- Step 4: best model selected -----
    step(4, "best_model populated in manifest", bool(manifest.best_model),
         f"best={manifest.best_model}")

    # ----- Step 5: ≥ 4 PNG plots -----
    plot_dir = Path(manifest.artifacts_root) / "plots"
    pngs = list(plot_dir.glob("*.png"))
    step(5, "≥ 4 PNG plots generated", len(pngs) >= 4, f"found {len(pngs)} of expected ≥ 4")

    # PNG-header validity check
    bad_png = []
    for p in pngs:
        if p.stat().st_size == 0:
            bad_png.append(f"{p.name} empty")
            continue
        with open(p, "rb") as f:
            header = f.read(8)
        if header[:8] != b"\x89PNG\r\n\x1a\n":
            bad_png.append(f"{p.name} bad header")
    if bad_png:
        step(5.5, "all PNGs valid header", False, ", ".join(bad_png))
    else:
        step(5.5, "all PNGs valid header", True, "")

    # ----- Step 6: NEGATIVE — n_train=0 -----
    try:
        bad_runner = CvLifecycle(
            dataset_root=str(REPO_ROOT / "data" / "cv"),
            dept="drill_test",
            pipeline_name="cv_neg_ntrain0",
            n_train=0,
            n_test=100,
            batch_size=32,
            epochs=1,
            artifacts_root=str(REPO_ROOT / "data" / "eval"),
        )
        bad_manifest = bad_runner.run()
        # With n_train=0, all models should fail OR produce error entries
        successful = [m for m in bad_manifest.models if "accuracy" in m]
        ok = len(successful) == 0
        step(6, "NEGATIVE: n_train=0 produces no successful models (no silent fabrication)",
             ok, f"got {len(successful)} successful (expected 0)")
    except Exception:
        step(6, "NEGATIVE: n_train=0 raises (acceptable)", True)

    # ----- Step 7: NEGATIVE — epochs=0 still doesn't fake NN training -----
    try:
        e0_runner = CvLifecycle(
            dataset_root=str(REPO_ROOT / "data" / "cv"),
            dept="drill_test",
            pipeline_name="cv_neg_epoch0",
            n_train=200,
            n_test=100,
            batch_size=32,
            epochs=0,
            artifacts_root=str(REPO_ROOT / "data" / "eval"),
        )
        e0_manifest = e0_runner.run()
        # epochs=0 means PyTorch models train 0 epochs → loss_curve should be empty
        nn_models = [m for m in e0_manifest.models if m.get("loss_curve") is not None]
        bad = [m for m in nn_models if len(m["loss_curve"]) > 0]
        step(7, "NEGATIVE: epochs=0 produces empty loss curves (no faked training)",
             not bad,
             f"{len(bad)} NN models have non-empty curves" if bad else "")
    except Exception as exc:
        # Acceptable — also a valid failure mode
        step(7, "NEGATIVE: epochs=0 fails gracefully", True, type(exc).__name__)

    # ----- Step 8: confusion-matrix shape matches n_classes -----
    bad_cm = []
    for m in scored:
        cm = m["confusion_matrix"]
        if len(cm) != manifest.n_classes or any(len(row) != manifest.n_classes for row in cm):
            bad_cm.append(f"{m['model']}: cm shape {len(cm)}×{len(cm[0]) if cm else 0}")
    step(8, f"confusion-matrix shape == {manifest.n_classes}×{manifest.n_classes} (no fabrication)",
         not bad_cm,
         "; ".join(bad_cm) if bad_cm else "")

    print(f"\n\033[32mALL 8 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
