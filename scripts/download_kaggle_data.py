"""
Download Kaggle datasets for all 11 BEV Analytics departments.

Usage:
    python scripts/download_kaggle_data.py [--dept DEPT_NAME] [--all]

Requirements:
    - kaggle CLI credentials at ~/.kaggle/kaggle.json
    - pip install kaggle

Fallback:
    If Kaggle credentials are missing, run generate_sample_data.py instead.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import Any

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Root data directory (can be overridden by BEV_DATA_DIR env var)
DATA_ROOT = Path(os.environ.get("BEV_DATA_DIR", "/mnt/deepa/insur/data"))
KAGGLE_DIR = DATA_ROOT / "kaggle"

DATASETS: dict[str, dict[str, Any]] = {
    "sales": {
        "kaggle_id": "competitions/store-sales-time-series-forecasting",
        "kind": "competition",
        "files": ["train.csv", "test.csv", "stores.csv", "oil.csv", "holidays_events.csv", "transactions.csv"],
        "data_type": "csv",
        "description": "Store sales time series forecasting",
    },
    "supply_chain": {
        "kaggle_id": "datasets/bhanupratapbiswas/inventory-and-demand-forecasting-dataset",
        "kind": "dataset",
        "data_type": "csv",
        "description": "Inventory forecasting dataset",
    },
    "logistics": {
        "kaggle_id": "datasets/laurinbrechter/supply-chain-data",
        "kind": "dataset",
        "data_type": "csv",
        "description": "Supply chain logistics dataset",
    },
    "manufacturing": {
        "kaggle_id": "datasets/shivamb/machine-predictive-maintenance-classification",
        "kind": "dataset",
        "data_type": "csv",
        "description": "Machine predictive maintenance",
    },
    "maintenance": {
        "kaggle_id": "datasets/shivamb/machine-predictive-maintenance-classification",
        "kind": "dataset",
        "data_type": "csv",
        "description": "Predictive maintenance dataset",
    },
    "retail": {
        "kaggle_id": "datasets/pranavuikey/online-retail-dataset",
        "kind": "dataset",
        "data_type": "csv",
        "description": "Online retail transactions",
    },
    "customer": {
        "kaggle_id": "datasets/vjchoudhary7/customer-segmentation-tutorial-in-python",
        "kind": "dataset",
        "data_type": "csv",
        "description": "Customer segmentation dataset",
    },
    "finance": {
        "kaggle_id": "datasets/shivamb/finance-data",
        "kind": "dataset",
        "data_type": "csv",
        "description": "Financial data",
    },
    "procurement": {
        "kaggle_id": "datasets/laurinbrechter/supply-chain-data",
        "kind": "dataset",
        "data_type": "csv",
        "description": "Supply chain / procurement data",
    },
    "quality": {
        "kaggle_id": "datasets/ravirajsinh45/real-life-industrial-dataset-of-casting-product",
        "kind": "dataset",
        "data_type": "image",
        "description": "Casting product defect detection images",
    },
    "governance": {
        "kaggle_id": "datasets/fda/food-enforcement",
        "kind": "dataset",
        "data_type": "csv",
        "description": "FDA food enforcement / safety",
    },
}


def _check_kaggle_credentials() -> bool:
    """Return True if kaggle credentials exist and are valid."""
    kaggle_json = Path.home() / ".kaggle" / "kaggle.json"
    if not kaggle_json.exists():
        logger.warning("Kaggle credentials not found at %s", kaggle_json)
        return False
    try:
        with open(kaggle_json) as f:
            creds = json.load(f)
        if "username" not in creds or "key" not in creds:
            logger.warning("kaggle.json is missing 'username' or 'key' fields")
            return False
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Could not read kaggle.json: %s", exc)
        return False
    return True


def _run_kaggle_download(dept: str, info: dict[str, Any], dest_dir: Path) -> bool:
    """Download a single Kaggle dataset/competition into dest_dir."""
    kaggle_id = info["kaggle_id"]
    kind = info.get("kind", "dataset")

    dest_dir.mkdir(parents=True, exist_ok=True)
    logger.info("[%s] Downloading %s (%s) → %s", dept, kaggle_id, info["description"], dest_dir)

    try:
        if kind == "competition":
            # Competition download: kaggle competitions download -c <name> -p <path>
            competition_name = kaggle_id.split("/")[-1]
            cmd = [
                "kaggle", "competitions", "download",
                "-c", competition_name,
                "-p", str(dest_dir),
            ]
        else:
            # Dataset download: kaggle datasets download -d <owner/dataset> -p <path> --unzip
            dataset_slug = "/".join(kaggle_id.split("/")[1:])
            cmd = [
                "kaggle", "datasets", "download",
                "-d", dataset_slug,
                "-p", str(dest_dir),
                "--unzip",
            ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            logger.error("[%s] kaggle CLI error: %s", dept, result.stderr.strip())
            return False

        # Unzip any .zip files left over (competitions don't auto-unzip)
        for zf_path in dest_dir.glob("*.zip"):
            logger.info("[%s] Extracting %s", dept, zf_path.name)
            with zipfile.ZipFile(zf_path, "r") as zf:
                zf.extractall(dest_dir)
            zf_path.unlink()

        # List downloaded files
        files = list(dest_dir.iterdir())
        logger.info("[%s] Downloaded %d file(s): %s", dept, len(files), [f.name for f in files])
        return True

    except FileNotFoundError:
        logger.error(
            "kaggle CLI not found. Install it with: pip install kaggle"
        )
        return False
    except subprocess.TimeoutExpired:
        logger.error("[%s] Download timed out after 600 seconds", dept)
        return False
    except Exception as exc:  # noqa: BLE001
        logger.error("[%s] Unexpected error: %s", dept, exc)
        return False


def download_all(departments: list[str] | None = None) -> dict[str, bool]:
    """Download datasets for the specified departments (default: all)."""
    if not _check_kaggle_credentials():
        logger.error(
            "Kaggle credentials missing. Run 'scripts/generate_sample_data.py' "
            "to create synthetic data instead."
        )
        return {dept: False for dept in (departments or DATASETS)}

    targets = {
        dept: info
        for dept, info in DATASETS.items()
        if departments is None or dept in departments
    }

    results: dict[str, bool] = {}
    for dept, info in targets.items():
        dest_dir = KAGGLE_DIR / dept
        results[dept] = _run_kaggle_download(dept, info, dest_dir)

    # Summary
    successes = [d for d, ok in results.items() if ok]
    failures = [d for d, ok in results.items() if not ok]
    logger.info("Download complete. Success: %s | Failed: %s", successes, failures)
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Download Kaggle datasets for BEV departments")
    parser.add_argument(
        "--dept",
        nargs="+",
        choices=list(DATASETS.keys()),
        help="Download only specific department(s)",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available departments and exit",
    )
    args = parser.parse_args()

    if args.list:
        for dept, info in DATASETS.items():
            print(f"  {dept:<20} — {info['description']}")
        return 0

    results = download_all(departments=args.dept)
    return 0 if all(results.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
