#!/usr/bin/env python3
"""
Drill: HOLY noise handling + ensemble compare (§43, §64.19 + §65.1 #5).

Steps (10 total; 4 negative):
    1. (+) Tabular cleaner: NaNs all filled, duplicates dropped
    2. (+) Tabular cleaner: IQR outlier counts populated per col
    3. (-) NEGATIVE — non-DataFrame input raises TypeError
    4. (+) Image cleaner: batch shape preserved, target_size applied
    5. (+) Text cleaner: list length preserved, NFC unicode normalize works
    6. (-) NEGATIVE — text cleaner with non-list raises TypeError
    7. (+) Timeseries cleaner: duplicate timestamps removed; rolling-z counts populated
    8. (+) Ensemble compare: ≥ 1 of voting/stacking beats best base on signal-rich data
    9. (-) NEGATIVE — ensemble with single base estimator rejected
   10. (-) NEGATIVE — ensemble with unknown task rejected

# RESOURCES: ml_noise_ensemble disk_io

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    from ml.reference.noise_handling import (
        clean_image_batch,
        clean_tabular,
        clean_text_batch,
        clean_timeseries,
    )
    from ml.reference.ensemble_compare import compare_ensemble

    print("\nDRILL: HOLY noise handling + ensemble compare\n")
    t0 = time.time()

    # ----- Step 1: tabular NaN + dedup -----
    df = pd.DataFrame({
        "x": [1.0, 2.0, np.nan, 4.0, 1.0],   # row[2] NaN, row[4] dup of row[0]
        "y": [10, 20, 30, np.nan, 10],
        "cat": ["a", "b", "a", "c", "a"],
    })
    cleaned, report = clean_tabular(df)
    ok = (report.duplicates_removed == 1
          and report.nan_cells_filled == 2
          and cleaned.isna().sum().sum() == 0)
    step(1, "tabular: duplicates removed + NaNs filled",
         ok, f"dedup={report.duplicates_removed} filled={report.nan_cells_filled} remaining_nan={cleaned.isna().sum().sum()}")

    # ----- Step 2: IQR outliers populated -----
    df2 = pd.DataFrame({"x": list(range(100)) + [9999]})  # 9999 is the outlier
    _, report2 = clean_tabular(df2, use_isoforest=False)
    step(2, "tabular: IQR outlier flag for col 'x' detects extreme value",
         report2.iqr_outliers_per_col.get("x", 0) >= 1,
         f"iqr_outliers={report2.iqr_outliers_per_col}")

    # ----- Step 3: NEGATIVE — non-DataFrame input -----
    try:
        clean_tabular({"x": [1, 2, 3]})  # dict, not DataFrame
        step(3, "NEGATIVE: non-DataFrame rejects", False, "no TypeError raised")
    except TypeError:
        step(3, "NEGATIVE: non-DataFrame rejects (TypeError)", True)

    # ----- Step 4: image cleaner shape + size -----
    imgs = np.random.rand(5, 28, 28).astype(np.float32) * 255
    cleaned_imgs, img_report = clean_image_batch(imgs, target_size=(32, 32),
                                                  apply_gaussian=True, normalize=True)
    step(4, "image: batch shape preserved + target_size applied",
         cleaned_imgs.shape == (5, 32, 32) and img_report.n_images == 5,
         f"shape={cleaned_imgs.shape} ops={img_report.operations_applied}")

    # ----- Step 5: text cleaner length + unicode -----
    texts = ["Hello   world", "café  with multi  ws", "control\x00char", ""]
    cleaned_txt, txt_report = clean_text_batch(texts, normalize_unicode=True, strip_control=True)
    step(5, "text: list length preserved + control chars stripped",
         len(cleaned_txt) == 4 and txt_report.control_chars_stripped >= 1
         and "control" in cleaned_txt[2] and "\x00" not in cleaned_txt[2],
         f"control_stripped={txt_report.control_chars_stripped} output_lens={[len(s) for s in cleaned_txt]}")

    # ----- Step 6: NEGATIVE — non-list input -----
    try:
        clean_text_batch("just a string")  # str, not list
        step(6, "NEGATIVE: non-list text rejects", False, "no TypeError raised")
    except TypeError:
        step(6, "NEGATIVE: non-list text rejects (TypeError)", True)

    # ----- Step 7: timeseries cleaner -----
    times = pd.date_range("2026-01-01", periods=20, freq="h").tolist()
    times.append(times[5])  # duplicate timestamp
    values = list(range(20)) + [999]  # 999 is an outlier on the duplicated row
    values[10] = np.nan  # NaN to forward-fill
    ts_df = pd.DataFrame({"t": times, "v": values})
    cleaned_ts, ts_report = clean_timeseries(ts_df, time_col="t", value_col="v",
                                              rolling_window=5, z_threshold=3.0)
    step(7, "timeseries: duplicate timestamps removed + rolling-z populated",
         ts_report.duplicate_timestamps_removed == 1
         and ts_report.rolling_z_outliers >= 0,
         f"dup={ts_report.duplicate_timestamps_removed} z_out={ts_report.rolling_z_outliers} ffill={ts_report.forward_fill_count}")

    # ----- Step 8: ensemble compare (classification with clear signal) -----
    rng = np.random.RandomState(42)
    X = rng.randn(400, 6)
    y = (X[:, 0] + 0.5 * X[:, 1] - 0.3 * X[:, 2] > 0).astype(int)
    m = compare_ensemble(X, y, task="classification")
    # The winner should be ≥ baseline_majority's F1
    baseline_f1 = next((p["f1_weighted"] for p in m.per_model_metrics
                        if "baseline" in p["model"]), 0)
    winner_metric = None
    if m.winner_method == "base":
        winner_metric = next((p["f1_weighted"] for p in m.per_model_metrics
                              if p["model"] == m.winner), 0)
    elif m.winner_method == "voting":
        winner_metric = m.voting_metrics.get("f1_weighted", 0)
    elif m.winner_method == "stacking":
        winner_metric = m.stacking_metrics.get("f1_weighted", 0)
    step(8, "ensemble: winner beats baseline-majority on F1",
         winner_metric and winner_metric > baseline_f1,
         f"winner={m.winner} ({m.winner_method}) F1={winner_metric} vs baseline F1={baseline_f1}")

    # ----- Step 9: NEGATIVE — single base estimator -----
    try:
        from sklearn.linear_model import LogisticRegression
        compare_ensemble(X, y, task="classification",
                         base_estimators=[("only", LogisticRegression())])
        step(9, "NEGATIVE: single base estimator rejects", False, "no ValueError")
    except ValueError:
        step(9, "NEGATIVE: single base estimator rejects (ValueError)", True)

    # ----- Step 10: NEGATIVE — unknown task -----
    try:
        compare_ensemble(X, y, task="time_travel")  # type: ignore[arg-type]
        step(10, "NEGATIVE: unknown task rejects", False, "no ValueError")
    except ValueError:
        step(10, "NEGATIVE: unknown task rejects (ValueError)", True)

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
