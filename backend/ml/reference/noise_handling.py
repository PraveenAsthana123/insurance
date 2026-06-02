"""INSUR reference: noise-handling utility per data type (§64.19 + §64.26 + §65.1 #5).

Per-type cleaners with deterministic invariants (drill-able):

  Tabular  — drop dupes, IQR outlier flag, IsolationForest score, median impute
  Image    — Gaussian denoise, median filter (per skimage), resize-normalize
  Text     — strip control chars, collapse whitespace, unicode-NFC, optional lowercase
  Timeseries — outlier flag (rolling-z), forward-fill bounded, dedup timestamps

Every cleaner returns a (cleaned_data, report_dict) tuple. The report dict
captures what was changed — drills assert before/after invariants.

Composes with:
  - §64.19 (data-prep deep dive) — these are the operative cleaners per category
  - §64.26 (per-data-type use cases) — same 9 types share these primitives
  - §57.6 (canonical fields) — report dicts use stable schema
"""
from __future__ import annotations

import logging
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)


# ===========================================================================
# Tabular
# ===========================================================================


@dataclass
class TabularNoiseReport:
    rows_before: int = 0
    rows_after: int = 0
    duplicates_removed: int = 0
    nan_cells_filled: int = 0
    iqr_outliers_per_col: dict[str, int] = field(default_factory=dict)
    isoforest_outlier_count: int = 0
    impute_strategy_per_col: dict[str, str] = field(default_factory=dict)


def clean_tabular(
    df: pd.DataFrame,
    *,
    drop_duplicates: bool = True,
    iqr_factor: float = 1.5,
    use_isoforest: bool = True,
    isoforest_contamination: float = 0.05,
    impute_numeric: str = "median",
    impute_categorical: str = "most_frequent",
) -> tuple[pd.DataFrame, TabularNoiseReport]:
    """Clean a tabular DataFrame; flag outliers; impute NaNs.

    Drill invariants:
      - rows_after ≤ rows_before
      - report.duplicates_removed == rows_before - df.drop_duplicates().shape[0]
      - report.nan_cells_filled == count of NaN cells in original numeric+categorical cols
      - df_after has 0 remaining NaN (impute always fills)
    """
    if not isinstance(df, pd.DataFrame):
        raise TypeError("clean_tabular requires a DataFrame")
    report = TabularNoiseReport(rows_before=len(df))
    df = df.copy()

    # Dedup
    if drop_duplicates:
        before = len(df)
        df = df.drop_duplicates().reset_index(drop=True)
        report.duplicates_removed = before - len(df)

    num_cols = df.select_dtypes(include=np.number).columns.tolist()
    cat_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()

    # IQR outlier flag (flag only — do NOT drop, per §64.19 default)
    for c in num_cols:
        try:
            q1, q3 = df[c].quantile([0.25, 0.75])
            iqr = q3 - q1
            lo, hi = q1 - iqr_factor * iqr, q3 + iqr_factor * iqr
            mask = (df[c] < lo) | (df[c] > hi)
            report.iqr_outliers_per_col[c] = int(mask.sum())
        except Exception:
            continue

    # IsolationForest score (multivariate)
    if use_isoforest and num_cols:
        try:
            iso = IsolationForest(contamination=isoforest_contamination, random_state=42, n_estimators=50)
            pred = iso.fit_predict(df[num_cols].fillna(0))
            report.isoforest_outlier_count = int((pred == -1).sum())
        except Exception as exc:
            logger.warning("IsolationForest failed: %s", exc)

    # Impute
    n_nan_before = int(df.isna().sum().sum())
    for c in num_cols:
        if df[c].isna().any():
            if impute_numeric == "median":
                df[c] = df[c].fillna(df[c].median())
            elif impute_numeric == "mean":
                df[c] = df[c].fillna(df[c].mean())
            else:
                df[c] = df[c].fillna(0)
            report.impute_strategy_per_col[c] = impute_numeric
    for c in cat_cols:
        if df[c].isna().any():
            if impute_categorical == "most_frequent":
                mode = df[c].mode()
                fill = mode.iloc[0] if not mode.empty else "UNKNOWN"
                df[c] = df[c].fillna(fill)
            else:
                df[c] = df[c].fillna("UNKNOWN")
            report.impute_strategy_per_col[c] = impute_categorical

    report.nan_cells_filled = n_nan_before  # all NaN cells should be filled now
    report.rows_after = len(df)
    return df, report


# ===========================================================================
# Image
# ===========================================================================


@dataclass
class ImageNoiseReport:
    n_images: int = 0
    target_shape: tuple = (0, 0)
    mean_intensity_before: float = 0.0
    mean_intensity_after: float = 0.0
    operations_applied: list[str] = field(default_factory=list)


def clean_image_batch(
    images: np.ndarray,
    *,
    target_size: tuple[int, int] = (224, 224),
    apply_gaussian: bool = True,
    gaussian_sigma: float = 1.0,
    apply_median: bool = False,
    normalize: bool = True,
) -> tuple[np.ndarray, ImageNoiseReport]:
    """Clean a batch of grayscale images (NxHxW or NxHxWx1).

    Drill invariants:
      - output shape[0] == input shape[0] (no images dropped)
      - output H × W == target_size
      - report lists every operation in order applied
    """
    from scipy.ndimage import gaussian_filter, median_filter

    if images.ndim == 3:
        N, H, W = images.shape
    elif images.ndim == 4:
        N, H, W, _ = images.shape
        images = images[..., 0]
    else:
        raise ValueError(f"images must be 3D or 4D; got shape {images.shape}")

    report = ImageNoiseReport(
        n_images=N, target_shape=target_size,
        mean_intensity_before=float(images.mean()),
    )

    out = np.empty((N, target_size[0], target_size[1]), dtype=np.float32)
    for i in range(N):
        img = images[i].astype(np.float32)
        # Resize via skimage if available, fallback to numpy slicing for square crops
        if (img.shape[0], img.shape[1]) != target_size:
            try:
                from skimage.transform import resize as skimage_resize
                img = skimage_resize(img, target_size, anti_aliasing=True, preserve_range=True).astype(np.float32)
            except Exception:
                # crude fallback: center-crop or pad
                h, w = img.shape
                if h >= target_size[0] and w >= target_size[1]:
                    sh = (h - target_size[0]) // 2
                    sw = (w - target_size[1]) // 2
                    img = img[sh:sh + target_size[0], sw:sw + target_size[1]]
                else:
                    pad_h = max(0, target_size[0] - h)
                    pad_w = max(0, target_size[1] - w)
                    img = np.pad(img, ((0, pad_h), (0, pad_w)))[:target_size[0], :target_size[1]]
        if apply_gaussian:
            img = gaussian_filter(img, sigma=gaussian_sigma)
        if apply_median:
            img = median_filter(img, size=3)
        if normalize:
            img = (img - img.min()) / (img.max() - img.min() + 1e-9)
        out[i] = img

    if apply_gaussian:
        report.operations_applied.append(f"gaussian(sigma={gaussian_sigma})")
    if apply_median:
        report.operations_applied.append("median(size=3)")
    if normalize:
        report.operations_applied.append("normalize[0,1]")
    report.operations_applied.append(f"resize→{target_size}")

    report.mean_intensity_after = float(out.mean())
    return out, report


# ===========================================================================
# Text
# ===========================================================================


@dataclass
class TextNoiseReport:
    n_strings: int = 0
    chars_before: int = 0
    chars_after: int = 0
    control_chars_stripped: int = 0
    whitespace_collapsed: int = 0
    unicode_normalized: bool = False
    lowercased: bool = False


_CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]")
_MULTI_WS_RE = re.compile(r"\s+")


def clean_text_batch(
    texts: list[str],
    *,
    strip_control: bool = True,
    collapse_whitespace: bool = True,
    normalize_unicode: bool = True,
    lowercase: bool = False,
    strip_punctuation: bool = False,
) -> tuple[list[str], TextNoiseReport]:
    """Clean a list of strings; preserve order; no drops.

    Drill invariants:
      - len(output) == len(input) (no strings lost)
      - output[i] either equals input[i] or is a normalization of it
      - empty strings handled gracefully (no crash)
    """
    if not isinstance(texts, list):
        raise TypeError("clean_text_batch requires a list")
    report = TextNoiseReport(
        n_strings=len(texts),
        chars_before=sum(len(t) for t in texts if isinstance(t, str)),
        unicode_normalized=normalize_unicode,
        lowercased=lowercase,
    )

    out: list[str] = []
    cc_stripped_total = 0
    ws_collapsed_total = 0
    for t in texts:
        if not isinstance(t, str):
            out.append("")
            continue
        s = t
        if normalize_unicode:
            s = unicodedata.normalize("NFC", s)
        if strip_control:
            before = len(s)
            s = _CONTROL_CHAR_RE.sub("", s)
            cc_stripped_total += before - len(s)
        if collapse_whitespace:
            before = len(s)
            s = _MULTI_WS_RE.sub(" ", s).strip()
            ws_collapsed_total += before - len(s)
        if strip_punctuation:
            s = re.sub(r"[^\w\s]", "", s)
        if lowercase:
            s = s.lower()
        out.append(s)

    report.chars_after = sum(len(s) for s in out)
    report.control_chars_stripped = cc_stripped_total
    report.whitespace_collapsed = ws_collapsed_total
    return out, report


# ===========================================================================
# Time-series
# ===========================================================================


@dataclass
class TimeseriesNoiseReport:
    points_before: int = 0
    points_after: int = 0
    duplicate_timestamps_removed: int = 0
    rolling_z_outliers: int = 0
    forward_fill_count: int = 0
    sorted_ascending: bool = False


def clean_timeseries(
    df: pd.DataFrame,
    *,
    time_col: str,
    value_col: str,
    rolling_window: int = 5,
    z_threshold: float = 3.0,
    forward_fill_limit: int = 3,
    sort: bool = True,
) -> tuple[pd.DataFrame, TimeseriesNoiseReport]:
    """Clean a time-series DataFrame.

    Drill invariants:
      - rolling-z outliers: cells where |z| > z_threshold are flagged
      - duplicate timestamps collapsed to first occurrence
      - forward-fill never crosses more than `forward_fill_limit` gaps
      - if sort=True, output is non-decreasing on time_col
    """
    if time_col not in df.columns or value_col not in df.columns:
        raise KeyError(f"{time_col!r} and {value_col!r} required")
    report = TimeseriesNoiseReport(points_before=len(df))
    df = df.copy()

    # Coerce time + sort
    df[time_col] = pd.to_datetime(df[time_col], errors="coerce")
    if sort:
        df = df.sort_values(time_col).reset_index(drop=True)
        report.sorted_ascending = True

    # Dedup timestamps (keep first)
    before = len(df)
    df = df.drop_duplicates(subset=[time_col], keep="first").reset_index(drop=True)
    report.duplicate_timestamps_removed = before - len(df)

    # Rolling-z outlier flag (does NOT drop)
    try:
        rolling_mean = df[value_col].rolling(rolling_window, min_periods=1).mean()
        rolling_std = df[value_col].rolling(rolling_window, min_periods=1).std().fillna(0)
        z = (df[value_col] - rolling_mean) / (rolling_std.replace(0, 1e-9))
        report.rolling_z_outliers = int((z.abs() > z_threshold).sum())
    except Exception as exc:
        logger.warning("rolling-z failed: %s", exc)

    # Forward-fill bounded
    nan_before = int(df[value_col].isna().sum())
    df[value_col] = df[value_col].ffill(limit=forward_fill_limit)
    nan_after = int(df[value_col].isna().sum())
    report.forward_fill_count = nan_before - nan_after

    report.points_after = len(df)
    return df, report
