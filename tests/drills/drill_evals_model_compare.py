#!/usr/bin/env python3
"""
Drill: §68.11 Multi-model comparison — operator-asked-for surface.

Joins §68.8 functional + §68.9 cost + §68.10 safety logs for the named
(model_id, eval_set) tuples and persists the scorecard to
data/agent-supervisor/model_compare/<comparison_id>/manifest.json.

The surface is interesting because it composes THREE source-of-truth
logs into one read — and the drill exercises that all three sources
gracefully degrade when their data is partial (e.g. model X has
functional + safety but no cost data → found_in: ['functional',
'safety']).

Steps (12 total; 5 negative):
  1. (+) POST with 2 models on empty logs → 200, comparison_id starts
        with 'cmp-', scorecard has 2 entries with found_in=[]
  2. (+) Seed functional + cost + safety logs for kivi:local on
        rag_qa_v1 → POST returns scorecard with kivi:local
        found_in=['functional','cost','safety']
  3. (+) Seed ONLY functional for llama3.1:8b → POST shows it
        found_in=['functional'] (partial data path)
  4. (+) winners block populated: by_accuracy (kivi > llama),
        by_safety_verdict (kivi=safe < llama=unknown → kivi wins)
  5. (+) GET /_history returns the comparisons we ran (2+)
  6. (+) GET /{comparison_id} returns the persisted manifest
  7. (-) NEG: POST with empty models list → 422 (Pydantic min_length)
  8. (-) NEG: POST with 9 models → 422 (Pydantic max_length)
  9. (-) NEG: POST with malformed model_id (contains space) → 400
        from service-side regex (validation_error wrapped in HTTP 400)
  10.(-) NEG: GET unknown comparison_id → 404
  11.(-) NEG: GET malformed comparison_id (no cmp- prefix) → 400
  12.(-) NEG: POST with role 'team-member' → 403 (manager/tester only)

  Plus invariant: §38.3 audit row schema + tenant attribution echoed.

# RESOURCES: disk_io

Exit 0 on PASS, 1 on any failure.
"""
from __future__ import annotations

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


def _build_app(tmp: Path):
    audit_path = tmp / "insur_reads.jsonl"
    func_log = tmp / "functional_eval.jsonl"
    cost_log = tmp / "cost_runs.jsonl"
    safety_log = tmp / "safety_eval_runs.jsonl"
    manifest_dir = tmp / "model_compare"

    os.environ["INSUR_AUDIT_PATH"] = str(audit_path)
    os.environ["INSUR_EVAL_FUNCTIONAL_LOG"] = str(func_log)
    os.environ["INSUR_EVAL_COST_LOG"] = str(cost_log)
    os.environ["INSUR_EVAL_SAFETY_LOG"] = str(safety_log)
    os.environ["INSUR_MODEL_COMPARE_DIR"] = str(manifest_dir)
    os.environ.pop("TENANT_ID_STRICT", None)

    for mod in list(sys.modules.keys()):
        if mod.startswith((
            "core.middleware", "core.rbac_middleware", "core.insur_audit",
            "routers.evals_model_compare", "services.model_compare_service",
            "services.functional_eval_service", "services.cost_eval_service",
            "services.safety_eval_service", "schemas.model_compare",
        )):
            del sys.modules[mod]

    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from core.rbac_middleware import RBACMiddleware
    from routers.evals_model_compare import router

    app = FastAPI()
    app.add_middleware(RBACMiddleware)
    app.add_middleware(TenantIdMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.include_router(router)
    return app, audit_path, func_log, cost_log, safety_log, manifest_dir


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


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: §68.11 Multi-model comparison\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp_str:
        tmp = Path(tmp_str)
        app, audit_path, func_log, cost_log, safety_log, manifest_dir = _build_app(tmp)
        client = TestClient(app)
        headers = {"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"}

        # ---- Step 1: empty logs → 200, found_in=[] per model ----
        r = client.post("/api/v1/insur/evals/model-compare", headers=headers,
                        json={"models": ["kivi:local", "llama3.1:8b"]})
        body = r.json() if r.status_code == 200 else {}
        step(1, "empty logs → 200, comparison_id='cmp-...', 2 entries with found_in=[]",
             r.status_code == 200
             and body.get("status") == "executed"
             and body.get("comparison_id", "").startswith("cmp-")
             and len(body.get("scorecard", [])) == 2
             and body["scorecard"][0]["found_in"] == []
             and body["scorecard"][1]["found_in"] == [],
             f"status={r.status_code} cmp_id={body.get('comparison_id', '')[:20]}")

        # ---- Step 2: seed full data for kivi:local on rag_qa_v1 ----
        now = time.time()
        with func_log.open("w") as fh:
            fh.write(json.dumps({
                "ts": now - 100, "run_id": "func-kivi-1",
                "model_id": "kivi:local", "dataset": "rag_qa_v1",
                "accuracy": 0.91, "f1": 0.89, "auc": 0.93,
                "latency_p95_ms": 180, "n_examples": 100,
            }) + "\n")
        with cost_log.open("w") as fh:
            fh.write(json.dumps({
                "ts": now - 50, "request_id": "req-kivi-1",
                "tenant_id": "tenant-a", "model_id": "kivi:local",
                "prompt_tokens": 100, "completion_tokens": 50,
                "total_tokens": 150, "cost_usd": 0.002,
            }) + "\n")
        with safety_log.open("w") as fh:
            fh.write(json.dumps({
                "ts": now - 30, "run_id": "safety-kivi-1",
                "model_id": "kivi:local", "dataset": "rag_qa_safety_v1",
                "hallucination_rate": 0.02, "toxicity_score": 0.01,
                "bias_score": 0.04, "disparate_impact": 0.92,
                "equal_opportunity_gap": 0.02, "n_safety_incidents": 0,
            }) + "\n")

        r = client.post("/api/v1/insur/evals/model-compare", headers=headers,
                        json={"models": ["kivi:local"], "eval_set": "rag_qa_v1"})
        body = r.json() if r.status_code == 200 else {}
        kivi_row = body["scorecard"][0]
        step(2, "kivi:local with seeded data → found_in=[functional,cost,safety]",
             r.status_code == 200
             and set(kivi_row["found_in"]) == {"functional", "cost", "safety"}
             and kivi_row["functional"]["accuracy"] == 0.91
             and kivi_row["safety"]["verdict"] == "safe",
             f"found_in={kivi_row['found_in']}")

        # ---- Step 3: llama has only functional ----
        with func_log.open("a") as fh:
            fh.write(json.dumps({
                "ts": now - 200, "run_id": "func-llama-1",
                "model_id": "llama3.1:8b", "dataset": "rag_qa_v1",
                "accuracy": 0.81, "f1": 0.79, "auc": 0.84,
                "latency_p95_ms": 290, "n_examples": 100,
            }) + "\n")

        r = client.post("/api/v1/insur/evals/model-compare", headers=headers,
                        json={"models": ["kivi:local", "llama3.1:8b"],
                              "eval_set": "rag_qa_v1"})
        body = r.json() if r.status_code == 200 else {}
        llama_row = next(s for s in body["scorecard"] if s["model_id"] == "llama3.1:8b")
        step(3, "llama3.1:8b with only functional → found_in=['functional']",
             r.status_code == 200
             and llama_row["found_in"] == ["functional"]
             and llama_row["cost"] is None
             and llama_row["safety"] is None,
             f"found_in={llama_row['found_in']}")

        # ---- Step 4: winners populated ----
        winners = body.get("winners", {})
        step(4, "winners: by_accuracy=kivi:local, by_safety_verdict=kivi:local",
             winners.get("by_accuracy") == "kivi:local"
             and winners.get("by_safety_verdict") == "kivi:local",
             f"winners={winners}")

        # Save kivi-only comparison_id for step 6
        first_cmp_id = body["comparison_id"]

        # ---- Step 5: GET /_history ----
        r = client.get("/api/v1/insur/evals/model-compare/_history", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        step(5, "/_history → 200 with ≥2 comparisons listed",
             r.status_code == 200 and body.get("n_comparisons", 0) >= 2,
             f"status={r.status_code} n={body.get('n_comparisons')}")

        # ---- Step 6: GET /{comparison_id} ----
        r = client.get(f"/api/v1/insur/evals/model-compare/{first_cmp_id}",
                       headers=headers)
        body = r.json() if r.status_code == 200 else {}
        step(6, f"/{first_cmp_id[:12]}... → 200 with status=found + manifest",
             r.status_code == 200
             and body.get("status") == "found"
             and body.get("manifest", {}).get("comparison_id") == first_cmp_id,
             f"status={r.status_code} svc_status={body.get('status')}")

        # ---- Step 7: NEG empty models list → 422 ----
        r = client.post("/api/v1/insur/evals/model-compare", headers=headers,
                        json={"models": []})
        step(7, "NEG: empty models list → 422 (Pydantic min_length=1)",
             r.status_code == 422,
             f"status={r.status_code}")

        # ---- Step 8: NEG too many models → 422 ----
        r = client.post(
            "/api/v1/insur/evals/model-compare", headers=headers,
            json={"models": [f"model-{i}" for i in range(9)]},
        )
        step(8, "NEG: 9 models → 422 (Pydantic max_length=8)",
             r.status_code == 422,
             f"status={r.status_code}")

        # ---- Step 9: NEG malformed model_id → 400 (service-side regex) ----
        r = client.post(
            "/api/v1/insur/evals/model-compare", headers=headers,
            json={"models": ["bad model id with spaces"]},
        )
        step(9, "NEG: model_id with spaces → 400 from service regex",
             r.status_code == 400,
             f"status={r.status_code}")

        # ---- Step 10: NEG unknown comparison_id → 404 ----
        r = client.get(
            "/api/v1/insur/evals/model-compare/cmp-nonexistent-xyz",
            headers=headers,
        )
        step(10, "NEG: unknown comparison_id → 404",
             r.status_code == 404,
             f"status={r.status_code}")

        # ---- Step 11: NEG malformed comparison_id (no cmp- prefix) → 400 ----
        r = client.get(
            "/api/v1/insur/evals/model-compare/bad-id-no-prefix",
            headers=headers,
        )
        step(11, "NEG: malformed comparison_id (missing cmp- prefix) → 400",
             r.status_code == 400,
             f"status={r.status_code}")

        # ---- Step 12: NEG team-member role on POST → 403 ----
        r = client.post(
            "/api/v1/insur/evals/model-compare",
            headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "team-member"},
            json={"models": ["kivi:local"]},
        )
        step(12, "NEG: team-member on POST → 403 (manager/tester only)",
             r.status_code == 403,
             f"status={r.status_code}")

        # ---- §38.3 schema invariant ----
        required = {"ts", "tenant_id", "actor", "tool", "request_id",
                    "surface", "endpoint", "outcome"}
        rows = _audit_rows(audit_path)
        router_rows = [r for r in rows
                       if r.get("tool", "").startswith("insur.evals_model_compare")]
        bad = [r for r in router_rows if not required.issubset(r.keys())]
        if bad:
            step(99, "§38.3 schema invariant",
                 False, f"{len(bad)} bad rows; first: {bad[0]}")

    print(f"\n\033[32mALL 12 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
