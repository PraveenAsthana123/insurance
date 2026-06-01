#!/usr/bin/env python3
"""
Insurance dataset downloader — pulls Kaggle datasets per dept's
INSUR_DATA_MGMT.md catalog. Per operator 2026-06-01 + global §36.

Skips datasets known to be (a) >500MB or (b) competition-only.
Writes a manifest at data/insurance/_manifest.json showing what succeeded.

Usage: python3 scripts/download_insurance_datasets.py [--dry-run]
"""
from __future__ import annotations
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DATA_ROOT = REPO / "data" / "insurance"

# (slug, kaggle_dataset, description, skip_reason or None)
DOWNLOADS = [
    # claims
    ("claims/auto_insurance_claims", "buntyshah/auto-insurance-claims-data", "Auto claims with fraud flags", None),
    ("claims/vehicle_insurance_fraud", "shivamb/vehicle-claim-fraud-detection", "Vehicle claim fraud detection", None),
    ("claims/health_insurance_claims", "teertha/ushealthinsurancedataset", "US Health Insurance dataset", None),
    ("claims/property_claims", "litvinenko630/insurance-claims", "Insurance Claims Dataset (Litvinenko)", None),
    # underwriting
    ("underwriting/life_insurance_data", "bhanageviraj/life-insurance-death-claims-dataindia-2018-2022", "Life Insurance Death Claims (India 2018-2022)", None),
    ("underwriting/auto_insurance_underwriting", "easonlai/sample-insurance-claim-prediction-dataset", "Auto UW + claims features", None),
    ("underwriting/medical_cost", "mirichoi0218/insurance", "Medical cost personal dataset", None),
    # customer-service
    ("customer-service/call_center_data", "satvicoder/call-center-data", "Call Center metrics dataset", None),
    ("customer-service/customer_complaints", "adelanseur/insurance-company-complaints", "Insurance Company Complaints", None),
    ("customer-service/customer_churn", "blastchar/telco-customer-churn", "Telco Customer Churn (Kaggle classic, 550K downloads)", None),
    ("customer-service/nlp_intent_classification", "bittlingmayer/amazonreviews", "Sentiment / intent corpus", "skipped: ~3GB too large for scaffold"),
    # fraud-siu
    ("fraud-siu/vehicle_claim_fraud", "shivamb/vehicle-claim-fraud-detection", "Vehicle fraud (also in claims)", None),
    ("fraud-siu/creditcard_fraud", "mlg-ulb/creditcardfraud", "Credit-card fraud benchmark", None),
    ("fraud-siu/auto_insurance_fraud", "buntyshah/auto-insurance-claims-data", "Auto fraud (also in claims)", None),
    ("fraud-siu/ieee_fraud", "ieee-fraud-detection/ieee-fraud-detection", "IEEE-CIS fraud", "skipped: competition-only, requires acceptance"),
]


def download(slug: str, dataset: str, dry_run: bool, refresh: bool = False) -> tuple[bool, str]:
    out_dir = DATA_ROOT / slug
    out_dir.mkdir(parents=True, exist_ok=True)

    # Skip if already present (idempotent) unless --refresh
    existing = [p for p in out_dir.iterdir() if p.is_file() and p.suffix != ".json"]
    if existing and not refresh:
        return (True, f"already present ({len(existing)} files)")
    if existing and refresh:
        for p in existing:
            p.unlink()

    if dry_run:
        return (True, "DRY-RUN")

    try:
        result = subprocess.run(
            ["kaggle", "datasets", "download", "-d", dataset, "-p", str(out_dir), "--unzip"],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode == 0:
            files = sorted(p.name for p in out_dir.iterdir() if p.is_file())
            return (True, f"downloaded ({len(files)} files): {', '.join(files[:3])}")
        else:
            err_tail = result.stderr.strip().split("\n")[-1] if result.stderr.strip() else "unknown"
            return (False, f"kaggle error: {err_tail[:200]}")
    except subprocess.TimeoutExpired:
        return (False, "timeout (>300s)")
    except Exception as e:
        return (False, f"exception: {e!s:.200}")


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    refresh = "--refresh" in sys.argv
    only = None
    for i, a in enumerate(sys.argv):
        if a == "--only" and i + 1 < len(sys.argv):
            only = sys.argv[i + 1]

    DATA_ROOT.mkdir(parents=True, exist_ok=True)

    # Preserve existing manifest entries when running --only (per-data cron)
    manifest_path = DATA_ROOT / "_manifest.json"
    if only and manifest_path.is_file():
        prev = json.loads(manifest_path.read_text())
        manifest = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "dry_run": dry_run,
            "refresh": refresh,
            "downloads": [d for d in prev["downloads"] if d["slug"] != only],
        }
    else:
        manifest = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "dry_run": dry_run,
            "refresh": refresh,
            "downloads": [],
        }

    success = 0
    skipped = 0
    failed = 0

    for slug, dataset, desc, skip_reason in DOWNLOADS:
        if only and slug != only:
            continue
        if skip_reason:
            print(f"  SKIP   {slug:50s}  {skip_reason}")
            manifest["downloads"].append({
                "slug": slug, "dataset": dataset, "desc": desc,
                "status": "skipped", "reason": skip_reason,
            })
            skipped += 1
            continue

        ok, msg = download(slug, dataset, dry_run, refresh)
        status = "ok" if ok else "fail"
        print(f"  {status.upper():6s} {slug:50s}  {msg}")
        manifest["downloads"].append({
            "slug": slug, "dataset": dataset, "desc": desc,
            "status": status, "message": msg,
        })
        if ok:
            success += 1
        else:
            failed += 1

    manifest_path = DATA_ROOT / "_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(f"\nSummary: {success} ok · {skipped} skipped · {failed} failed")
    print(f"Manifest: {manifest_path}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
