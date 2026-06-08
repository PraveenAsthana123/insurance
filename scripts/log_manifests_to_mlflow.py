#!/usr/bin/env python3
"""Back-fill MLflow with the manifest.json files already on disk.

Discovers data/eval/<dept>/<pipeline>/<run_id>/manifest.json,
logs each as an MLflow run (params + metrics + manifest as artifact).

Per the deep audit: `mlruns/` was empty even though 6 manifests
existed on disk. This script catches MLflow up to disk reality.

Usage:
  python3 scripts/log_manifests_to_mlflow.py            # dry-run summary
  python3 scripts/log_manifests_to_mlflow.py --apply    # actually log
  python3 scripts/log_manifests_to_mlflow.py --apply --tracking-uri http://localhost:5001
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
EVAL_ROOT = REPO / "data" / "eval"


def discover_manifests() -> list[Path]:
    return sorted(EVAL_ROOT.glob("*/*/*/manifest.json"))


def parse_run(manifest_path: Path) -> dict:
    data = json.loads(manifest_path.read_text())
    # Path structure: data/eval/<dept>/<pipeline>/<run_id>/manifest.json
    parts = manifest_path.relative_to(EVAL_ROOT).parts
    dept = parts[0] if len(parts) > 0 else "?"
    pipeline = parts[1] if len(parts) > 1 else "?"
    run_id = parts[2] if len(parts) > 2 else "?"
    return {
        "manifest_path": str(manifest_path),
        "dept": dept,
        "pipeline": pipeline,
        "run_id": run_id,
        "data": data,
    }


def log_to_mlflow(runs: list[dict], tracking_uri: str) -> int:
    try:
        import mlflow
    except ImportError:
        print(f"  ERROR: mlflow not installed in venv ({sys.executable})", file=sys.stderr)
        return 4

    mlflow.set_tracking_uri(tracking_uri)
    logged = 0
    for r in runs:
        d = r["data"]
        exp_name = f"insurance.{r['dept']}"
        mlflow.set_experiment(exp_name)
        with mlflow.start_run(run_name=r["run_id"]):
            mlflow.log_params({
                "pipeline_id": d.get("pipeline") or r["pipeline"],
                "dept": r["dept"],
                "task": d.get("task") or "unknown",
                "dataset_path": d.get("dataset_path") or "unknown",
                "target_col": d.get("target_col") or "unknown",
                "n_rows": d.get("n_rows") or 0,
                "n_features_in": d.get("n_features_in") or 0,
                "n_features_selected": d.get("n_features_selected") or 0,
            })
            metrics = d.get("metrics") or {}
            for k, v in metrics.items():
                if isinstance(v, (int, float)):
                    mlflow.log_metric(k, float(v))
            # Note: artifact upload skipped — MLflow container's /mlartifacts
            # is not writable from outside; params + metrics persist via the
            # tracking server's DB. Manifest paths logged as tag for traceability.
            mlflow.set_tag("manifest_path", r["manifest_path"])
            logged += 1
            print(f"  ✓ Logged {exp_name}/{r['run_id']}")
    return logged


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Actually log to MLflow (default = dry-run)")
    parser.add_argument(
        "--tracking-uri",
        default=os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5001"),
        help="MLflow tracking server URI",
    )
    args = parser.parse_args()

    manifests = discover_manifests()
    if not manifests:
        print("No manifests found under data/eval/*/*/*/manifest.json")
        return 0

    print(f"Found {len(manifests)} manifest(s):")
    runs = [parse_run(p) for p in manifests]
    for r in runs:
        metrics = (r["data"].get("metrics") or {})
        # Pick best summary metric
        summary = (
            f"acc={metrics['accuracy']:.3f}" if "accuracy" in metrics
            else f"r2={metrics['r2']:.3f}" if "r2" in metrics
            else "metrics=?"
        )
        print(f"  {r['dept']}/{r['pipeline']}/{r['run_id']}  {summary}")

    if not args.apply:
        print(f"\nDry-run. Re-run with --apply to log to {args.tracking_uri}")
        return 0

    print(f"\nLogging to {args.tracking_uri} …")
    logged = log_to_mlflow(runs, args.tracking_uri)
    if isinstance(logged, int) and logged > 4:
        print(f"\nLogged {logged} run(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
