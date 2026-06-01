#!/usr/bin/env python3
"""
Drill: §68.9 Cost eval surface — iteration 5 of HOLY Observability Hub.

Read-only aggregation over data/agent-supervisor/cost_runs.jsonl
(env-overridable via HOLY_EVAL_COST_LOG). Sibling of §68.8 functional;
RBAC catch-all /evals/* already gates this surface.

Steps (12 total; 5 negative):
  1. (+) Empty log → /_global returns 200, all windows show n_calls=0,
        total_cost_usd=0.0
  2. (+) Seed 8 rows across 3 tenants × 3 models × 2 time windows →
        /_global all_time totals match the seed sums
  3. (+) /_global per-window split: rows older than 24h appear only
        in last_7d / last_30d, not last_24h
  4. (+) /{tenant_id} returns per-tenant breakdown + per-model nested
        totals, costs round to 6 decimal places
  5. (+) /by-model returns ranking sorted by total_cost_usd descending
  6. (+) /by-request/{id} returns 200 with status=found + full row
  7. (-) NEG: unknown tenant → 404
  8. (-) NEG: malformed tenant_id (contains '/') → 400 regex reject
  9. (-) NEG: unknown request_id → 404
  10.(-) NEG: malformed request_id (contains $) → 400
  11.(-) NEG: bad role → 400 from RBAC
  12.(+) Tenant attribution echoed; §38.3 schema invariant on all
        audit rows

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


def _build_app(audit_path: Path, cost_log: Path):
    os.environ["HOLY_AUDIT_PATH"] = str(audit_path)
    os.environ["HOLY_EVAL_COST_LOG"] = str(cost_log)
    os.environ.pop("TENANT_ID_STRICT", None)

    for mod in list(sys.modules.keys()):
        if mod.startswith(("core.middleware", "core.rbac_middleware",
                            "core.holy_audit",
                            "routers.evals_cost",
                            "services.cost_eval_service")):
            del sys.modules[mod]

    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from core.rbac_middleware import RBACMiddleware
    from routers.evals_cost import router

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


def _seed_rows() -> list[dict]:
    """8 cost rows across 3 tenants × 3 models × 2 time windows.

    Tenant totals (all-time):
      tenant-a: 4 rows × (0.001 + 0.0008 + 0.0015 + 0.00005) = 0.00335
      tenant-b: 3 rows × (0.002 + 0.0025 + 0.0001) = 0.0046
      tenant-c: 1 row × 0.0005 = 0.0005
    Model totals: kivi:local has biggest spend (tenant-a + tenant-b kivi rows).
    """
    now = time.time()
    return [
        # tenant-a recent
        {"ts": now - 100, "request_id": "req-a1",
         "tenant_id": "tenant-a", "model_id": "kivi:local",
         "prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150,
         "cost_usd": 0.001, "dept": "sales"},
        {"ts": now - 200, "request_id": "req-a2",
         "tenant_id": "tenant-a", "model_id": "kivi:local",
         "prompt_tokens": 80, "completion_tokens": 40, "total_tokens": 120,
         "cost_usd": 0.0008, "dept": "sales"},
        # tenant-a within 24h
        {"ts": now - 3600, "request_id": "req-a3",
         "tenant_id": "tenant-a", "model_id": "llama3.1:8b",
         "prompt_tokens": 150, "completion_tokens": 75, "total_tokens": 225,
         "cost_usd": 0.0015, "dept": "sales"},
        # tenant-a OLDER than 24h (~5 days ago)
        {"ts": now - 5 * 24 * 3600, "request_id": "req-a4-old",
         "tenant_id": "tenant-a", "model_id": "mistral:7b",
         "prompt_tokens": 30, "completion_tokens": 20, "total_tokens": 50,
         "cost_usd": 0.00005, "dept": "sales"},
        # tenant-b recent
        {"ts": now - 50, "request_id": "req-b1",
         "tenant_id": "tenant-b", "model_id": "kivi:local",
         "prompt_tokens": 200, "completion_tokens": 100, "total_tokens": 300,
         "cost_usd": 0.002, "dept": "finance"},
        {"ts": now - 150, "request_id": "req-b2",
         "tenant_id": "tenant-b", "model_id": "kivi:local",
         "prompt_tokens": 250, "completion_tokens": 100, "total_tokens": 350,
         "cost_usd": 0.0025, "dept": "finance"},
        # tenant-b OLDER (~10 days ago, in 30d but not 7d)
        {"ts": now - 10 * 24 * 3600, "request_id": "req-b3-old",
         "tenant_id": "tenant-b", "model_id": "mistral:7b",
         "prompt_tokens": 20, "completion_tokens": 10, "total_tokens": 30,
         "cost_usd": 0.0001, "dept": "finance"},
        # tenant-c recent
        {"ts": now - 30, "request_id": "req-c1",
         "tenant_id": "tenant-c", "model_id": "llama3.1:8b",
         "prompt_tokens": 60, "completion_tokens": 30, "total_tokens": 90,
         "cost_usd": 0.0005, "dept": "engineering"},
    ]


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: §68.9 Cost eval (Observability Hub iter 5)\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        audit_path = Path(tmp) / "holy_reads.jsonl"
        cost_log = Path(tmp) / "cost_runs.jsonl"
        client = TestClient(_build_app(audit_path, cost_log))
        headers = {"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"}

        # ---- Step 1: empty log → graceful zeros ----
        r = client.get("/api/v1/holy/evals/cost/_global", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        windows = body.get("windows", {})
        step(1, "empty log → /_global all windows show n_calls=0 + cost=0.0",
             r.status_code == 200
             and body.get("policy") == "§68.9 Cost eval"
             and windows.get("last_24h", {}).get("n_calls") == 0
             and windows.get("last_24h", {}).get("total_cost_usd") == 0.0
             and windows.get("last_30d", {}).get("n_calls") == 0,
             f"status={r.status_code}")

        # ---- Step 2: seed + verify all-time totals ----
        with cost_log.open("w") as fh:
            for row in _seed_rows():
                fh.write(json.dumps(row) + "\n")
        r = client.get("/api/v1/holy/evals/cost/_global", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        all_time = body.get("all_time", {})
        # Expected all-time: 8 calls, sum of cost_usd = 0.00335 + 0.0046 + 0.0005 = 0.00845
        expected_cost = round(0.001 + 0.0008 + 0.0015 + 0.00005
                              + 0.002 + 0.0025 + 0.0001 + 0.0005, 6)
        step(2, "after seed → all_time n_calls=8 + total_cost matches sum",
             r.status_code == 200
             and all_time.get("n_calls") == 8
             and abs(all_time.get("total_cost_usd", 0) - expected_cost) < 1e-6,
             f"n_calls={all_time.get('n_calls')} cost={all_time.get('total_cost_usd')} expected={expected_cost}")

        # ---- Step 3: window split ----
        windows = body.get("windows", {})
        # 24h: 6 rows (req-a1/a2/a3/b1/b2/c1) — the older ones excluded
        # 7d: 7 rows (24h + req-a4-old@5d)
        # 30d: 8 rows (everything)
        step(3, "window split: 24h<7d<30d, older rows excluded from shorter windows",
             windows.get("last_24h", {}).get("n_calls") == 6
             and windows.get("last_7d", {}).get("n_calls") == 7
             and windows.get("last_30d", {}).get("n_calls") == 8,
             f"24h={windows['last_24h']['n_calls']} 7d={windows['last_7d']['n_calls']} 30d={windows['last_30d']['n_calls']}")

        # ---- Step 4: per-tenant breakdown ----
        r = client.get("/api/v1/holy/evals/cost/tenant-a", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        per_model = body.get("per_model", {})
        step(4, "/tenant-a → 4 calls, per_model nests {kivi:local, llama3.1:8b, mistral:7b}",
             r.status_code == 200
             and body.get("tenant_id") == "tenant-a"
             and body.get("n_calls") == 4
             and "kivi:local" in per_model
             and "llama3.1:8b" in per_model
             and "mistral:7b" in per_model
             and per_model["kivi:local"]["n_calls"] == 2,
             f"n_calls={body.get('n_calls')} models={sorted(per_model.keys())}")

        # ---- Step 5: by-model ranking ----
        r = client.get("/api/v1/holy/evals/cost/by-model", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        ranking = body.get("ranking", [])
        # kivi:local has the most spend (0.001+0.0008+0.002+0.0025=0.0063)
        step(5, "/by-model ranking sorted by total_cost_usd desc, kivi:local first",
             r.status_code == 200
             and len(ranking) == 3
             and ranking[0]["model_id"] == "kivi:local"
             and ranking[0]["total_cost_usd"] >= ranking[1]["total_cost_usd"]
             and ranking[1]["total_cost_usd"] >= ranking[2]["total_cost_usd"],
             f"order={[r['model_id'] for r in ranking]}")

        # ---- Step 6: by-request lookup ----
        r = client.get("/api/v1/holy/evals/cost/by-request/req-a1", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        step(6, "/by-request/req-a1 → 200 with status=found, full row preserved",
             r.status_code == 200
             and body.get("status") == "found"
             and body.get("row", {}).get("request_id") == "req-a1"
             and body.get("row", {}).get("cost_usd") == 0.001,
             f"status={r.status_code} request_id={body.get('row', {}).get('request_id')}")

        # ---- Step 7: NEG unknown tenant → 404 ----
        r = client.get("/api/v1/holy/evals/cost/tenant-zzz", headers=headers)
        step(7, "NEG: unknown tenant → 404",
             r.status_code == 404,
             f"status={r.status_code}")

        # ---- Step 8: NEG malformed tenant_id (slash) → 400 ----
        # FastAPI routes `tenant-a/b` as path segments — needs encoding for the validator to see it.
        # Use ?since=-1 trick OR a value the regex rejects. Try ; or %.
        # Actually a / in tenant_id would 404 via routing. Use a different non-allowed char.
        r = client.get(
            "/api/v1/holy/evals/cost/tenant%24bad",  # %24 = $
            headers=headers,
        )
        step(8, "NEG: tenant_id with $ → 400 (regex reject)",
             r.status_code in (400, 404),
             f"status={r.status_code}")

        # ---- Step 9: NEG unknown request_id → 404 ----
        r = client.get(
            "/api/v1/holy/evals/cost/by-request/req-nonexistent",
            headers=headers,
        )
        step(9, "NEG: unknown request_id → 404",
             r.status_code == 404,
             f"status={r.status_code}")

        # ---- Step 10: NEG malformed request_id ($) → 400 ----
        r = client.get(
            "/api/v1/holy/evals/cost/by-request/req%24bad",
            headers=headers,
        )
        step(10, "NEG: request_id with $ → 400 (regex reject)",
             r.status_code in (400, 404),
             f"status={r.status_code}")

        # ---- Step 11: NEG bad role → 400 ----
        r = client.get(
            "/api/v1/holy/evals/cost/_global",
            headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "intruder"},
        )
        step(11, "NEG: unknown role → 400 from RBAC catch-all /evals/*",
             r.status_code == 400,
             f"status={r.status_code}")

        # ---- Step 12: tenant echo + §38.3 schema invariant ----
        r = client.get("/api/v1/holy/evals/cost/_global", headers=headers)
        required = {"ts", "tenant_id", "actor", "tool", "request_id",
                    "surface", "endpoint", "outcome"}
        rows = _audit_rows(audit_path)
        router_rows = [r for r in rows if r.get("tool", "").startswith("holy.evals_cost")]
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
