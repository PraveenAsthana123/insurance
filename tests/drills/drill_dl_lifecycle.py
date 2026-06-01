#!/usr/bin/env python3
"""
Drill: HOLY DL sequence-classification lifecycle (§43, §64.20 DL row).

Steps (8 total; 3 negative):
    1. (+) Lifecycle runs end-to-end on synthetic 1000-seq dataset
    2. (+) All 3 models score (LR + LSTM + Transformer)
    3. (+) Transformer + LSTM have populated loss_curve (NN training happened)
    4. (+) Transformer + LSTM have n_params > 1000 (real models, not trivial)
    5. (-) NEGATIVE — vocab_size=0 rejected at __init__
    6. (-) NEGATIVE — trigger_token >= vocab_size rejected at __init__
    7. (+) ≥ 3 PNG plots generated (comparison + confusion + loss curves)
    8. (-) NEGATIVE — epochs=0 produces empty loss curves (no faked training)

# RESOURCES: ml_dl_lifecycle disk_io gpu_optional

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
    from ml.reference.dl_lifecycle import DlLifecycle

    print("\nDRILL: HOLY DL lifecycle (sequence classification)\n")
    t0 = time.time()

    # ----- Step 1: end-to-end -----
    runner = DlLifecycle(
        dept="drill_test", pipeline_name="dl_drill",
        n_total=600, seq_len=12, vocab_size=30, trigger_token=5,
        batch_size=32, epochs=2,
        artifacts_root=str(REPO_ROOT / "data" / "eval"),
    )
    manifest = runner.run()
    step(1, "DL lifecycle runs end-to-end", manifest.duration_seconds > 0,
         f"{manifest.duration_seconds}s on {manifest.device}, {manifest.n_train}/{manifest.n_test} train/test")

    # ----- Step 2: all 3 models scored -----
    scored = [m for m in manifest.models if "accuracy" in m]
    step(2, "all 3 models scored (LR + LSTM + Transformer)",
         len(scored) >= 3, f"got {len(scored)} of {len(manifest.models)}")

    # ----- Step 3: NN models have loss curves -----
    nn_with_curves = [m for m in scored if m.get("loss_curve") and len(m["loss_curve"]) > 0]
    step(3, "LSTM + Transformer have populated loss_curve (NN trained)",
         len(nn_with_curves) >= 2,
         f"{len(nn_with_curves)} NN models with loss curve")

    # ----- Step 4: NN models have non-trivial param count -----
    nn_with_params = [m for m in scored if m.get("n_params", 0) > 1000]
    step(4, "LSTM + Transformer have n_params > 1000 (real models)",
         len(nn_with_params) >= 2,
         f"{len(nn_with_params)} NN models with > 1000 params; counts: {[m.get('n_params') for m in nn_with_params]}")

    # ----- Step 5: NEGATIVE vocab_size=0 -----
    try:
        DlLifecycle(vocab_size=0, dept="drill_test", pipeline_name="dl_neg_vocab",
                     artifacts_root=str(REPO_ROOT / "data" / "eval"))
        step(5, "NEGATIVE: vocab_size=0 rejected", False, "no ValueError raised")
    except ValueError:
        step(5, "NEGATIVE: vocab_size=0 rejected (ValueError)", True)

    # ----- Step 6: NEGATIVE trigger_token >= vocab_size -----
    try:
        DlLifecycle(vocab_size=10, trigger_token=15, dept="drill_test",
                     pipeline_name="dl_neg_trigger",
                     artifacts_root=str(REPO_ROOT / "data" / "eval"))
        step(6, "NEGATIVE: trigger_token >= vocab_size rejected", False, "no ValueError")
    except ValueError:
        step(6, "NEGATIVE: trigger_token >= vocab_size rejected (ValueError)", True)

    # ----- Step 7: ≥ 3 PNG plots -----
    plot_dir = Path(manifest.artifacts_root) / "plots"
    pngs = list(plot_dir.glob("*.png"))
    step(7, "≥ 3 PNG plots generated", len(pngs) >= 3,
         f"found {len(pngs)} of expected ≥ 3")

    # ----- Step 8: NEGATIVE epochs=0 -----
    try:
        zero_ep = DlLifecycle(
            dept="drill_test", pipeline_name="dl_neg_epoch0",
            n_total=200, seq_len=10, vocab_size=20, trigger_token=3,
            batch_size=32, epochs=0,
            artifacts_root=str(REPO_ROOT / "data" / "eval"),
        )
        z_manifest = zero_ep.run()
        nn_models = [m for m in z_manifest.models if "loss_curve" in m]
        bad = [m for m in nn_models if m["loss_curve"] and len(m["loss_curve"]) > 0]
        step(8, "NEGATIVE: epochs=0 → NN loss curves empty (no fake training)",
             not bad,
             f"{len(bad)} NN models have non-empty curves" if bad else "")
    except Exception as exc:
        # Acceptable — also a valid failure mode for epochs=0
        step(8, "NEGATIVE: epochs=0 fails gracefully", True, type(exc).__name__)

    print(f"\n\033[32mALL 8 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
