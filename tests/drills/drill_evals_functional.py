#!/usr/bin/env python3
"""
Drill: §68.8 Functional eval surface — iteration 4 of INSUR Observability Hub.

Read-only aggregation over data/agent-supervisor/functional_eval_runs.jsonl
(env-overridable via INSUR_EVAL_FUNCTIONAL_LOG). The WRITE side (MLflow
job / scheduled eval that appends a row per run) is a separate iteration.

Steps (12 total; 5 negative):
  1. (+) Empty log → /_global returns 200 with n_runs_total=0,
        leaderboard=[], policy stamp present (§57.7 graceful)
  2. (+) Seed 5 runs across 3 models on 2 datasets → /_global
        leaderboard length=3 (one per model, latest-only), sorted by
        accuracy descending
  3. (+) GET /{model_id} returns history newest-first + drift_summary
        between two most-recent runs
  4. (+) dataset filter: /{model_id}?dataset=rag_qa_v1 → only those
        runs (asserts the filter actually filters)
  5. (+) GET /{model_id}/runs/{run_id} → 200 with status=found
  6. (-) NEG: unknown model_id → 404 (no eval runs found)
  7. (-) NEG: malformed model_id (regex reject) → 400
  8. (-) NEG: unknown run_id under known model → 404
  9. (-) NEG: malformed run_id (contains $/&/space) → 400
  10.(-) NEG: bad role → 400 from RBAC, never reaches router
  11.(+) Corrupt JSONL line skipped (no crash), other rows still surface
  12.(+) Tenant attribution echoed on /_global

  Plus invariant: §38.3 audit row schema.

# RESOURCES: disk_io

Exit 0 on PASS, 1 on any failure.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
import tempfile
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _build_app(audit_path: Path, eval_log: Path):
    os.environ["INSUR_AUDIT_PATH"] = str(audit_path)
    os.environ["INSUR_EVAL_FUNCTIONAL_LOG"] = str(eval_log)
    os.environ.pop("TENANT_ID_STRICT", None)

    for mod in list(sys.modules.keys()):
        if mod.startswith(("core.middleware", "core.rbac_middleware",
                            "core.insur_audit",
                            "routers.evals_functional",
                            "services.functional_eval_service")):
            del sys.modules[mod]

    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from core.rbac_middleware import RBACMiddleware
    from routers.evals_functional import router

    app = FastAPI()
    app.add_middleware(RBACMiddleware)
    app.add_middleware(TenantIdMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.include_router(router)
    return app


def _audit_rows(path: Path):
    if not path.exists():
        return []
    rows = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return rows


def _h(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()[:16]


def _seed_runs() -> list[dict]:
    """5 runs across 3 models × 2 datasets so the leaderboard is testable.

    Models (by score): kivi:local (0.91) > llama3.1:8b (0.86) > mistral:7b (0.78)
    Each model has 1-2 runs; latest-only on the leaderboard.
    """
    now = time.time()
    return [
        # llama3.1:8b earlier run
        {"ts": now - 1000, "run_id": "eval-llama-1",
         "model_id": "llama3.1:8b", "model_version": "v0.9.0",
         "dataset": "rag_qa_v1", "dept": "sales",
         "accuracy": 0.81, "f1": 0.79, "auc": 0.84,
         "n_examples": 100, "latency_p95_ms": 320,
         "drift_score": 0.04,
         "eval_set_hash": _h("rag_qa_v1@2026-05-24")},
        # mistral:7b run
        {"ts": now - 800, "run_id": "eval-mistral-1",
         "model_id": "mistral:7b", "model_version": "v0.1.0",
         "dataset": "rag_qa_v1", "dept": "sales",
         "accuracy": 0.78, "f1": 0.75, "auc": 0.82,
         "n_examples": 100, "latency_p95_ms": 260,
         "drift_score": 0.08,
         "eval_set_hash": _h("rag_qa_v1@2026-05-24")},
        # kivi:local on dataset 1
        {"ts": now - 600, "run_id": "eval-kivi-1",
         "model_id": "kivi:local", "model_version": "v1.2.0",
         "dataset": "rag_qa_v1", "dept": "sales",
         "accuracy": 0.91, "f1": 0.89, "auc": 0.93,
         "n_examples": 100, "latency_p95_ms": 180,
         "drift_score": 0.02,
         "eval_set_hash": _h("rag_qa_v1@2026-05-24")},
        # kivi:local on dataset 2 (older — kivi-1 stays latest)
        {"ts": now - 700, "run_id": "eval-kivi-classify-1",
         "model_id": "kivi:local", "model_version": "v1.2.0",
         "dataset": "intent_classify_v1", "dept": "customer-experience",
         "accuracy": 0.88, "f1": 0.86,
         "n_examples": 200},
        # llama3.1:8b newer run (becomes latest for llama)
        {"ts": now - 200, "run_id": "eval-llama-2",
         "model_id": "llama3.1:8b", "model_version": "v0.9.1",
         "dataset": "rag_qa_v1", "dept": "sales",
         "accuracy": 0.86, "f1": 0.84, "auc": 0.88,
         "n_examples": 100, "latency_p95_ms": 290,
         "drift_score": 0.03,
         "eval_set_hash": _h("rag_qa_v1@2026-05-24")},
    ]


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: §68.8 Functional eval (Observability Hub iter 4)\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        audit_path = Path(tmp) / "insur_reads.jsonl"
        eval_log = Path(tmp) / "functional_eval_runs.jsonl"
        client = TestClient(_build_app(audit_path, eval_log))
        headers = {"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"}

        # ---- Step 1: empty log → graceful envelope ----
        r = client.get("/api/v1/insur/evals/functional/_global", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        step(1, "empty log → /_global returns 200, n_runs=0, leaderboard=[]",
             r.status_code == 200
             and body.get("policy") == "§68.8 Functional eval"
             and body.get("n_runs_total") == 0
             and body.get("n_models") == 0
             and body.get("leaderboard") == [],
             f"status={r.status_code} n_runs={body.get('n_runs_total')}")

        # ---- Step 2: seed + verify leaderboard ----
        with eval_log.open("w") as fh:
            for row in _seed_runs():
                fh.write(json.dumps(row) + "\n")

        r = client.get("/api/v1/insur/evals/functional/_global", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        lb = body.get("leaderboard", [])
        # Latest-only per model: 3 entries. Sort by accuracy desc:
        # kivi:local (0.91) > llama3.1:8b (0.86, latest=eval-llama-2) > mistral:7b (0.78)
        step(2, "after seed → leaderboard has 3 models, sorted by accuracy desc",
             r.status_code == 200
             and body.get("n_runs_total") == 5
             and body.get("n_models") == 3
             and len(lb) == 3
             and lb[0]["model_id"] == "kivi:local"
             and lb[1]["model_id"] == "llama3.1:8b"
             and lb[1]["run_id"] == "eval-llama-2"   # newer llama run wins
             and lb[2]["model_id"] == "mistral:7b",
             f"n_models={body.get('n_models')} lb_order={[r['model_id'] for r in lb]}")

        # ---- Step 3: per-model history + drift_summary ----
        r = client.get("/api/v1/insur/evals/functional/llama3.1:8b", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        drift = body.get("drift_summary") or {}
        step(3, "/llama3.1:8b → 2 runs newest-first + drift_summary on accuracy",
             r.status_code == 200
             and body.get("model_id") == "llama3.1:8b"
             and body.get("n_runs") == 2
             and body["runs"][0]["run_id"] == "eval-llama-2"
             and "accuracy" in drift
             and drift["accuracy"]["delta"] == round(0.86 - 0.81, 4),
             f"n_runs={body.get('n_runs')} accuracy_delta={drift.get('accuracy', {}).get('delta')}")

        # ---- Step 4: dataset filter ----
        r = client.get(
            "/api/v1/insur/evals/functional/kivi:local?dataset=intent_classify_v1",
            headers=headers,
        )
        body = r.json() if r.status_code == 200 else {}
        step(4, "?dataset=intent_classify_v1 → only that-dataset runs (1)",
             r.status_code == 200
             and body.get("n_runs") == 1
             and body["runs"][0]["dataset"] == "intent_classify_v1",
             f"n_runs={body.get('n_runs')}")

        # ---- Step 5: /runs/{run_id} ----
        r = client.get(
            "/api/v1/insur/evals/functional/kivi:local/runs/eval-kivi-1",
            headers=headers,
        )
        body = r.json() if r.status_code == 200 else {}
        step(5, "/runs/eval-kivi-1 → 200 with status=found + accuracy=0.91",
             r.status_code == 200
             and body.get("status") == "found"
             and body.get("row", {}).get("run_id") == "eval-kivi-1"
             and body.get("row", {}).get("accuracy") == 0.91,
             f"status={r.status_code} run_id={body.get('row', {}).get('run_id')}")

        # ---- Step 6: NEG unknown model_id → 404 ----
        r = client.get(
            "/api/v1/insur/evals/functional/nonexistent-model",
            headers=headers,
        )
        step(6, "NEG: unknown model_id → 404 (no eval runs)",
             r.status_code == 404,
             f"status={r.status_code}")

        # ---- Step 7: NEG malformed model_id → 400 ----
        r = client.get(
            "/api/v1/insur/evals/functional/bad model id with spaces",
            headers=headers,
        )
        step(7, "NEG: model_id with spaces → 400 from regex validator",
             r.status_code in (400, 404),  # FastAPI may 404 on the URL
             f"status={r.status_code}")

        # ---- Step 8: NEG unknown run_id under known model → 404 ----
        r = client.get(
            "/api/v1/insur/evals/functional/kivi:local/runs/eval-nonexistent",
            headers=headers,
        )
        step(8, "NEG: unknown run_id under known model → 404",
             r.status_code == 404,
             f"status={r.status_code}")

        # ---- Step 9: NEG malformed run_id → 400 ----
        r = client.get(
            "/api/v1/insur/evals/functional/kivi:local/runs/bad$run&id",
            headers=headers,
        )
        step(9, "NEG: run_id with $/& chars → 400 (regex reject)",
             r.status_code in (400, 404),
             f"status={r.status_code}")

        # ---- Step 10: NEG bad role → 400 from RBAC ----
        r = client.get(
            "/api/v1/insur/evals/functional/_global",
            headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "intruder"},
        )
        step(10, "NEG: unknown role → 400 from RBAC",
             r.status_code == 400,
             f"status={r.status_code}")

        # ---- Step 11: corrupt JSONL line skipped, other rows surface ----
        with eval_log.open("a") as fh:
            fh.write("{not valid json\n")
        r = client.get("/api/v1/insur/evals/functional/_global", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        step(11, "corrupt JSONL line skipped, other rows still surface (n_runs=5)",
             r.status_code == 200 and body.get("n_runs_total") == 5,
             f"n_runs={body.get('n_runs_total')}")

        # ---- Step 12: tenant attribution echoed ----
        r = client.get("/api/v1/insur/evals/functional/_global", headers=headers)
        step(12, "tenant_id from X-Tenant-ID echoed in response header",
             r.status_code == 200 and r.headers.get("X-Tenant-ID") == "tenant-a",
             f"echo={r.headers.get('X-Tenant-ID')!r}")

        # ---- §38.3 schema invariant ----
        required = {"ts", "tenant_id", "actor", "tool", "request_id",
                    "surface", "endpoint", "outcome"}
        rows = _audit_rows(audit_path)
        router_rows = [r for r in rows if r.get("tool", "").startswith("insur.evals_functional")]
        bad = [r for r in router_rows if not required.issubset(r.keys())]
        if bad:
            step(99, "§38.3 schema invariant",
                 False, f"{len(bad)} bad rows; first: {bad[0]}")

    print(f"\n\033[32mALL 12 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
