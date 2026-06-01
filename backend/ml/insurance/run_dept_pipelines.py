#!/usr/bin/env python3
"""
Per-dept pipeline runner — wires INSUR_PIPELINES.md to backend/ml/reference/*.

Per operator 2026-06-01 ("data preprocessing, model training, model evaluation,
chunking, embedding, vector, ragas, deepeval, opentel"). Each pipeline runs the
corresponding reference impl with the right dept-specific dataset + target.

Output per run lands in `data/eval/insurance/<dept>/<pipeline_id>/<run_id>/`
with manifest + plots + scores + audit row per global §38.3 + §64.7.

Usage:
  # List available pipelines per dept
  python backend/ml/insurance/run_dept_pipelines.py --list

  # Run one pipeline
  python backend/ml/insurance/run_dept_pipelines.py --dept claims --pipeline 1

  # Smoke (small sample, fast)
  python backend/ml/insurance/run_dept_pipelines.py --dept underwriting --pipeline 1 --smoke
"""
from __future__ import annotations
import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
REFERENCE_DIR = REPO / "backend" / "ml" / "reference"
DATA_ROOT = REPO / "data" / "insurance"
EVAL_ROOT = REPO / "data" / "eval" / "insurance"

# ---------------------------------------------------------------------------
# Per-dept pipeline registry (single source of truth per §59 MDD)
# Mirror of INSUR_PIPELINES.md content.
# ---------------------------------------------------------------------------

# Schema per entry: {
#   "id": int,
#   "name": str,
#   "module": str (relative to backend/ml/reference),
#   "dataset": str (relative to data/insurance/),
#   "args": dict[str, str],          # CLI args passed to module
# }

PIPELINE_REGISTRY: dict[str, list[dict]] = {
    "claims": [
        {
            "id": 1, "name": "claim severity (full_lifecycle)",
            "module": "full_lifecycle",
            "dataset": "claims/auto_insurance_claims/insurance_claims.csv",
            "args": {"target": "fraud_reported", "task": "classification",
                     "drop-cols": "policy_number policy_bind_date incident_date insured_zip _c39"},
        },
        {
            "id": 2, "name": "fraud detection (full_lifecycle on vehicle-claim fraud)",
            "module": "full_lifecycle",
            "dataset": "claims/vehicle_insurance_fraud/fraud_oracle.csv",
            "args": {"target": "FraudFound_P", "task": "classification"},
        },
        {
            "id": 3, "name": "RAG over policy + claims (rag_lifecycle)",
            "module": "rag_lifecycle",
            "dataset": "claims/auto_insurance_claims/insurance_claims.csv",
            "args": {},  # rag_lifecycle uses corpus dirs not single dataset
        },
        {
            "id": 4, "name": "anomaly detection (anomaly_lifecycle)",
            "module": "anomaly_lifecycle",
            "dataset": "claims/auto_insurance_claims/insurance_claims.csv",
            "args": {"target": "fraud_reported"},
        },
    ],
    "underwriting": [
        {
            "id": 1, "name": "medical-cost regression (full_lifecycle)",
            "module": "full_lifecycle",
            "dataset": "underwriting/medical_cost/insurance.csv",
            "args": {"target": "charges", "task": "regression"},
        },
        {
            "id": 2, "name": "ensemble compare (ensemble_compare)",
            "module": "ensemble_compare",
            "dataset": "underwriting/medical_cost/insurance.csv",
            "args": {"target": "charges", "task": "regression"},
        },
        {
            "id": 3, "name": "RAG over UW manual (rag_lifecycle)",
            "module": "rag_lifecycle",
            "dataset": "underwriting/medical_cost/insurance.csv",
            "args": {},
        },
    ],
    "customer-service": [
        {
            "id": 1, "name": "telco churn (full_lifecycle)",
            "module": "full_lifecycle",
            "dataset": "customer-service/customer_churn/WA_Fn-UseC_-Telco-Customer-Churn.csv",
            "args": {"target": "Churn", "task": "classification",
                     "drop-cols": "customerID"},
        },
        {
            "id": 2, "name": "NLP intent (nlp_lifecycle)",
            "module": "nlp_lifecycle",
            "dataset": "customer-service/customer_complaints/Insurance_Company_Complaints__Resolutions__Status__and_Recoveries.csv",
            "args": {},
        },
        {
            "id": 3, "name": "anomaly — call-volume (anomaly_lifecycle)",
            "module": "anomaly_lifecycle",
            "dataset": "customer-service/call_center_data/Call Center Data.csv",
            "args": {},
        },
    ],
    "fraud-siu": [
        {
            "id": 1, "name": "credit-card fraud (full_lifecycle, imbalanced)",
            "module": "full_lifecycle",
            "dataset": "fraud-siu/creditcard_fraud/creditcard.csv",
            "args": {"target": "Class", "task": "classification"},
        },
        {
            "id": 2, "name": "vehicle-claim fraud (full_lifecycle)",
            "module": "full_lifecycle",
            "dataset": "fraud-siu/vehicle_claim_fraud/fraud_oracle.csv",
            "args": {"target": "FraudFound_P", "task": "classification"},
        },
        {
            "id": 4, "name": "fraud reference architecture demo (fraud_lifecycle, synthetic)",
            "module": "fraud_lifecycle",
            "dataset": "fraud-siu/creditcard_fraud/creditcard.csv",  # placeholder — module uses synthetic
            "args": {"synthetic": "true"},
        },
        {
            "id": 3, "name": "behavioral anomaly (anomaly_lifecycle)",
            "module": "anomaly_lifecycle",
            "dataset": "fraud-siu/auto_insurance_fraud/insurance_claims.csv",
            "args": {"target": "fraud_reported"},
        },
    ],
}


def list_pipelines() -> None:
    print(f"\n{'Dept':22s} {'#':4s} {'Module':25s} {'Dataset':60s}  Pipeline")
    print("-" * 150)
    for dept, pipelines in PIPELINE_REGISTRY.items():
        for p in pipelines:
            print(f"{dept:22s} {p['id']:<4d} {p['module']:25s} {p['dataset']:60s}  {p['name']}")
    print()


def resolve_pipeline(dept: str, pipeline_id: int) -> dict:
    if dept not in PIPELINE_REGISTRY:
        raise SystemExit(f"unknown dept: {dept} (have: {list(PIPELINE_REGISTRY)})")
    for p in PIPELINE_REGISTRY[dept]:
        if p["id"] == pipeline_id:
            return p
    raise SystemExit(f"unknown pipeline {pipeline_id} for dept {dept}")


def run_pipeline(dept: str, p: dict, smoke: bool = False) -> dict:
    """Invoke the reference lifecycle module via subprocess.

    Returns audit row dict. Writes manifest into data/eval/insurance/<dept>/<id>/<run_id>/.
    """
    run_id = datetime.now(timezone.utc).strftime("run-%Y%m%dT%H%M%SZ")
    artifacts_root = EVAL_ROOT / dept / f"pipeline_{p['id']}"
    artifacts_root.mkdir(parents=True, exist_ok=True)

    dataset_path = DATA_ROOT / p["dataset"]
    if not dataset_path.is_file():
        return {
            "run_id": run_id, "dept": dept, "pipeline_id": p["id"],
            "module": p["module"], "status": "fail",
            "reason": f"dataset missing: {dataset_path}",
        }

    module_path = REFERENCE_DIR / f"{p['module']}.py"
    if not module_path.is_file():
        return {
            "run_id": run_id, "dept": dept, "pipeline_id": p["id"],
            "module": p["module"], "status": "fail",
            "reason": f"module missing: {module_path}",
        }

    # Build CLI args based on module conventions.
    # Most lifecycle modules in this repo follow the full_lifecycle signature:
    # --dataset --target --task --dept --pipeline --drop-cols --n-trials --sample --artifacts-root
    cmd = [
        sys.executable, str(module_path),
        "--dataset", str(dataset_path),
        "--dept", dept,
        "--pipeline", f"insurance_{dept}_{p['id']}",
        "--artifacts-root", str(EVAL_ROOT.parent),  # writes under data/eval/<dept>/<pipeline>/<run>/
    ]
    if "target" in p["args"]:
        cmd += ["--target", p["args"]["target"]]
    if "task" in p["args"]:
        cmd += ["--task", p["args"]["task"]]
    if "drop-cols" in p["args"]:
        cmd += ["--drop-cols"] + p["args"]["drop-cols"].split()

    # Synthetic-data lifecycles (fraud_lifecycle) use a different CLI surface.
    if p["args"].get("synthetic") == "true":
        cmd = [
            sys.executable, str(module_path),
            "--dept", dept,
            "--pipeline", f"insurance_{dept}_{p['id']}",
            "--artifacts-root", str(EVAL_ROOT.parent),
            "--n-total", "500" if smoke else "2000",
            "--fraud-rate", "0.05",
        ]
        print(f"\n[runner] {' '.join(cmd[:6])}... (synthetic)")
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            status = "ok" if result.returncode == 0 else "fail"
            audit_row = {
                "run_id": run_id, "dept": dept, "pipeline_id": p["id"],
                "module": p["module"], "status": status, "returncode": result.returncode,
                "stdout_tail": result.stdout[-1500:], "stderr_tail": result.stderr[-1500:],
                "smoke": smoke, "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            (artifacts_root / f"{run_id}.audit.json").write_text(json.dumps(audit_row, indent=2))
            return audit_row
        except subprocess.TimeoutExpired:
            return {"run_id": run_id, "dept": dept, "pipeline_id": p["id"],
                    "module": p["module"], "status": "timeout"}

    if smoke:
        cmd += ["--n-trials", "3", "--sample", "200"]
    else:
        cmd += ["--n-trials", "10"]

    print(f"\n[runner] {' '.join(cmd[:6])}...")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
        status = "ok" if result.returncode == 0 else "fail"
        # Audit row per §38.3
        audit_row = {
            "run_id": run_id,
            "dept": dept,
            "pipeline_id": p["id"],
            "module": p["module"],
            "dataset": str(dataset_path.relative_to(REPO)),
            "status": status,
            "returncode": result.returncode,
            "stdout_tail": result.stdout[-1500:],
            "stderr_tail": result.stderr[-1500:],
            "smoke": smoke,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        (artifacts_root / f"{run_id}.audit.json").write_text(json.dumps(audit_row, indent=2))
        return audit_row
    except subprocess.TimeoutExpired:
        return {"run_id": run_id, "dept": dept, "pipeline_id": p["id"],
                "module": p["module"], "status": "timeout"}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--list", action="store_true", help="List registered pipelines + exit")
    parser.add_argument("--dept", help="Dept slug (claims/underwriting/customer-service/fraud-siu)")
    parser.add_argument("--pipeline", type=int, help="Pipeline id within dept")
    parser.add_argument("--smoke", action="store_true",
                        help="Smoke mode: sample 200 rows + 3 trials")
    parser.add_argument("--all", action="store_true",
                        help="Run all pipelines for the dept (or every dept if --dept omitted)")
    args = parser.parse_args()

    if args.list:
        list_pipelines()
        return 0

    if args.all:
        depts = [args.dept] if args.dept else list(PIPELINE_REGISTRY.keys())
        results = []
        for dept in depts:
            for p in PIPELINE_REGISTRY[dept]:
                row = run_pipeline(dept, p, smoke=args.smoke)
                results.append(row)
                print(f"  [{row['status'].upper()}] {dept}/{p['id']} {p['name']}")
        ok = sum(1 for r in results if r["status"] == "ok")
        print(f"\nRESULT: {ok}/{len(results)} pipelines ok")
        return 0 if ok == len(results) else 1

    if not (args.dept and args.pipeline):
        print("usage: --list | --dept <slug> --pipeline <id> [--smoke] | --all [--dept ...]",
              file=sys.stderr)
        return 2

    p = resolve_pipeline(args.dept, args.pipeline)
    row = run_pipeline(args.dept, p, smoke=args.smoke)
    print(f"\n[{row['status'].upper()}] {args.dept}/{args.pipeline} — {row.get('module')}")
    if row["status"] != "ok":
        print(json.dumps(row, indent=2, default=str)[:2000])
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
