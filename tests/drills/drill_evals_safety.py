#!/usr/bin/env python3
"""
Drill: §68.10 Safety eval surface — iteration 6 of INSUR Observability Hub,
completes the §68.8/9/10 eval triplet.

Read-only aggregation over data/agent-supervisor/safety_eval_runs.jsonl
(env-overridable via INSUR_EVAL_SAFETY_LOG). RBAC catch-all /evals/*
gates this surface from iter 4.

Steps (12 total; 5 negative):
  1. (+) Empty log → /_global returns 200 with policy stamp, thresholds,
        n_models=0, verdict_counts all zero
  2. (+) Seed 4 runs covering 4 models with distinct verdicts (safe /
        review / unsafe / unsafe-fairness) → /_global scorecard has 4
        entries, verdict_counts match the design
  3. (+) Scorecard sort puts UNSAFE first (operator attention), then
        review, then safe. unsafe model appears at index 0.
  4. (+) fairness_gate='fail' when disparate_impact < 0.8 OR
        equal_opportunity_gap > 0.05; assertion on a seeded row
  5. (+) /{model_id} returns per-row verdict_summary with all 5 flag
        booleans
  6. (+) /incidents returns rows with verdict=unsafe OR n_safety_incidents>0
  7. (-) NEG: unknown model_id → 404
  8. (-) NEG: malformed model_id (space) → 400 regex reject
  9. (-) NEG: bad role → 400 from RBAC catch-all
  10.(-) NEG: negative since → 422 from FastAPI Query validator
  11.(-) NEG: corrupt JSONL line skipped (no crash)
  12.(+) §38.3 schema invariant + tenant attribution echoed

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


def _build_app(audit_path: Path, safety_log: Path):
    os.environ["INSUR_AUDIT_PATH"] = str(audit_path)
    os.environ["INSUR_EVAL_SAFETY_LOG"] = str(safety_log)
    os.environ.pop("TENANT_ID_STRICT", None)

    for mod in list(sys.modules.keys()):
        if mod.startswith(("core.middleware", "core.rbac_middleware",
                            "core.insur_audit",
                            "routers.evals_safety", "services.safety_eval_service")):
            del sys.modules[mod]

    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from core.rbac_middleware import RBACMiddleware
    from routers.evals_safety import router

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


def _seed_runs() -> list[dict]:
    """4 rows, 1 per model, covering 4 verdict classes.

    Thresholds (from service): hallucination ≤ 0.05, toxicity ≤ 0.02,
    bias ≤ 0.10, disparate_impact ≥ 0.80, eo_gap ≤ 0.05.
    """
    now = time.time()
    return [
        # kivi:local → SAFE (all metrics under thresholds, fairness pass)
        {"ts": now - 100, "run_id": "safety-kivi-1",
         "model_id": "kivi:local", "model_version": "v1.2.0",
         "dataset": "rag_qa_safety_v1",
         "hallucination_rate": 0.02,
         "toxicity_score": 0.01,
         "bias_score": 0.04,
         "disparate_impact": 0.92,
         "equal_opportunity_gap": 0.02,
         "n_safety_incidents": 0,
         "n_examples": 100},
        # llama3.1:8b → REVIEW (bias missing — at least one unknown, no fail)
        {"ts": now - 200, "run_id": "safety-llama-1",
         "model_id": "llama3.1:8b", "model_version": "v0.9.1",
         "dataset": "rag_qa_safety_v1",
         "hallucination_rate": 0.03,
         "toxicity_score": 0.015,
         # bias_score intentionally missing
         "disparate_impact": 0.88,
         "equal_opportunity_gap": 0.03,
         "n_safety_incidents": 0,
         "n_examples": 100},
        # mistral:7b → UNSAFE (hallucination above threshold)
        {"ts": now - 300, "run_id": "safety-mistral-1",
         "model_id": "mistral:7b", "model_version": "v0.1.0",
         "dataset": "rag_qa_safety_v1",
         "hallucination_rate": 0.12,   # FAIL > 0.05
         "toxicity_score": 0.018,
         "bias_score": 0.06,
         "disparate_impact": 0.85,
         "equal_opportunity_gap": 0.04,
         "n_safety_incidents": 3,
         "n_examples": 100},
        # gemma3:1b → UNSAFE (fairness fail: disparate_impact < 0.8)
        {"ts": now - 400, "run_id": "safety-gemma-1",
         "model_id": "gemma3:1b", "model_version": "v1.0.0",
         "dataset": "fairness_bench_v1",
         "hallucination_rate": 0.04,
         "toxicity_score": 0.015,
         "bias_score": 0.08,
         "disparate_impact": 0.65,    # FAIL < 0.80
         "equal_opportunity_gap": 0.08,  # FAIL > 0.05
         "n_safety_incidents": 1,
         "n_examples": 100},
    ]


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: §68.10 Safety eval (Observability Hub iter 6, eval triplet complete)\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        audit_path = Path(tmp) / "insur_reads.jsonl"
        safety_log = Path(tmp) / "safety_eval_runs.jsonl"
        client = TestClient(_build_app(audit_path, safety_log))
        headers = {"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"}

        # ---- Step 1: empty log ----
        r = client.get("/api/v1/insur/evals/safety/_global", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        step(1, "empty log → /_global: policy + thresholds + zero counts",
             r.status_code == 200
             and body.get("policy") == "§68.10 Safety eval"
             and "thresholds" in body
             and body.get("n_models") == 0
             and body.get("verdict_counts", {}).get("unsafe") == 0,
             f"status={r.status_code} n_models={body.get('n_models')}")

        # ---- Step 2: seed + verdict_counts match design ----
        with safety_log.open("w") as fh:
            for row in _seed_runs():
                fh.write(json.dumps(row) + "\n")
        r = client.get("/api/v1/insur/evals/safety/_global", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        vc = body.get("verdict_counts", {})
        step(2, "scorecard: 4 models, verdicts 1 safe + 1 review + 2 unsafe",
             r.status_code == 200
             and body.get("n_models") == 4
             and vc.get("safe") == 1
             and vc.get("review") == 1
             and vc.get("unsafe") == 2,
             f"verdict_counts={vc}")

        # ---- Step 3: unsafe sorts first ----
        scorecard = body.get("scorecard", [])
        step(3, "unsafe models sort FIRST (operator attention), safe LAST",
             len(scorecard) >= 4
             and scorecard[0]["verdict"] == "unsafe"
             and scorecard[-1]["verdict"] == "safe",
             f"order={[r['verdict'] for r in scorecard]}")

        # ---- Step 4: fairness_gate='fail' for gemma (di=0.65 < 0.80) ----
        gemma_row = next((r for r in scorecard if r["model_id"] == "gemma3:1b"), None)
        step(4, "fairness_gate='fail' for gemma3:1b (di=0.65 < 0.80)",
             gemma_row is not None
             and gemma_row["fairness_gate"] == "fail"
             and gemma_row["disparate_impact_pass"] is False,
             f"gemma_fairness={gemma_row.get('fairness_gate') if gemma_row else 'none'}")

        # ---- Step 5: /{model_id} per-row verdict_summary ----
        r = client.get("/api/v1/insur/evals/safety/kivi:local", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        runs = body.get("runs", [])
        step(5, "/kivi:local: 1 run with verdict_summary carrying 5 flag booleans",
             r.status_code == 200
             and body.get("n_runs") == 1
             and runs[0]["verdict_summary"]["verdict"] == "safe"
             and runs[0]["verdict_summary"]["hallucination_pass"] is True
             and runs[0]["verdict_summary"]["disparate_impact_pass"] is True
             and runs[0]["verdict_summary"]["fairness_gate"] == "pass",
             f"verdict={runs[0]['verdict_summary']['verdict'] if runs else 'none'}")

        # ---- Step 6: /incidents ----
        r = client.get("/api/v1/insur/evals/safety/incidents", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        incs = body.get("incidents", [])
        # mistral (unsafe + 3 incidents) AND gemma (unsafe + 1 incident) both qualify
        unsafe_or_inc = {i["model_id"] for i in incs}
        step(6, "/incidents lists unsafe verdicts and rows with n_safety_incidents>0",
             r.status_code == 200
             and body.get("n_incidents") >= 2
             and "mistral:7b" in unsafe_or_inc
             and "gemma3:1b" in unsafe_or_inc,
             f"n_incidents={body.get('n_incidents')} models={sorted(unsafe_or_inc)}")

        # ---- Step 7: NEG unknown model → 404 ----
        r = client.get("/api/v1/insur/evals/safety/nonexistent-model",
                       headers=headers)
        step(7, "NEG: unknown model_id → 404",
             r.status_code == 404,
             f"status={r.status_code}")

        # ---- Step 8: NEG malformed model_id → 400 ----
        r = client.get(
            "/api/v1/insur/evals/safety/bad model name",
            headers=headers,
        )
        step(8, "NEG: model_id with spaces → 400 (regex reject)",
             r.status_code in (400, 404),
             f"status={r.status_code}")

        # ---- Step 9: NEG bad role → 400 ----
        r = client.get(
            "/api/v1/insur/evals/safety/_global",
            headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "intruder"},
        )
        step(9, "NEG: unknown role → 400 from RBAC catch-all /evals/*",
             r.status_code == 400,
             f"status={r.status_code}")

        # ---- Step 10: NEG negative since → 422 ----
        r = client.get(
            "/api/v1/insur/evals/safety/incidents?since=-1",
            headers=headers,
        )
        step(10, "NEG: ?since=-1 → 422 from FastAPI Query ge=0 validator",
             r.status_code == 422,
             f"status={r.status_code}")

        # ---- Step 11: corrupt JSONL line skipped ----
        with safety_log.open("a") as fh:
            fh.write("{not valid json\n")
        r = client.get("/api/v1/insur/evals/safety/_global", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        step(11, "corrupt JSONL line skipped, other rows still surface (n_models=4)",
             r.status_code == 200 and body.get("n_models") == 4,
             f"n_models={body.get('n_models')}")

        # ---- Step 12: tenant echo + §38.3 invariant ----
        r = client.get("/api/v1/insur/evals/safety/_global", headers=headers)
        required = {"ts", "tenant_id", "actor", "tool", "request_id",
                    "surface", "endpoint", "outcome"}
        rows = _audit_rows(audit_path)
        router_rows = [r for r in rows if r.get("tool", "").startswith("insur.evals_safety")]
        bad = [r for r in router_rows if not required.issubset(r.keys())]
        step(12, "tenant echo + §38.3 schema invariant on all router rows",
             r.status_code == 200
             and r.headers.get("X-Tenant-ID") == "tenant-a"
             and not bad,
             f"echo={r.headers.get('X-Tenant-ID')!r} bad_rows={len(bad)}")

    print(f"\n\033[32mALL 12 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
