#!/usr/bin/env python3
"""
Drill: §68 Observability Hub aggregator — completes the §68 read-surface story.

One endpoint: GET /api/v1/insur/observability-hub/_overview that probes
all 7 §68 read surfaces' source-of-truth logs in one call. Mirrors
the §56 /api/v1/agent-platform/adapters shape.

Steps (10 total; 4 negative):
  1. (+) GET /_overview → 200, n_surfaces==7, policy stamp present
  2. (+) All 7 expected surface keys present (dbviewer / pii /
        guardrails / security / evals_functional / evals_cost /
        evals_safety) — stable set
  3. (+) Per-surface row carries (key, policy, endpoint_prefix,
        write_status, source.{kind,path,status})
  4. (+) On clean tmpdir (no log files), absent JSONL surfaces report
        status='absent' n_rows=0; dbviewer json_catalog reports
        status='present' (it ships with the repo)
  5. (+) Seed one JSONL log → corresponding surface reports
        status='present' + n_rows=2 + last_ts is the seeded ts
  6. (+) Corrupt JSONL line counted in n_corrupt_lines; valid rows
        still surface in n_rows
  7. (-) NEG: broken surface (mocked _probe_one raising) → aggregator
        still returns 200 with status='probe_error' on the bad row
  8. (-) NEG: unknown role → 400 from RBAC catch-all
  9. (-) NEG: no role + TENANT_ID_STRICT not set → defaults still work
        (manager role assumed; tenant_id='default')
  10.(+) §38.3 schema invariant on audit row; tenant attribution echo

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

EXPECTED_SURFACE_KEYS = {
    "dbviewer", "pii", "guardrails", "security",
    "evals_functional", "evals_cost", "evals_safety",
}


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _build_app(audit_path: Path):
    # Point all §68 surface env vars at a per-test tmp dir so each
    # surface reports absent unless we seed it.
    os.environ["INSUR_AUDIT_PATH"] = str(audit_path)
    os.environ["INSUR_GUARDRAIL_LOG"] = str(audit_path.parent / "guardrails.jsonl")
    os.environ["INSUR_SECURITY_POSTURE_PATH"] = str(audit_path.parent / "security_posture.json")
    os.environ["INSUR_EVAL_FUNCTIONAL_LOG"] = str(audit_path.parent / "functional_eval.jsonl")
    os.environ["INSUR_EVAL_COST_LOG"] = str(audit_path.parent / "cost.jsonl")
    os.environ["INSUR_EVAL_SAFETY_LOG"] = str(audit_path.parent / "safety.jsonl")
    os.environ.pop("TENANT_ID_STRICT", None)

    for mod in list(sys.modules.keys()):
        if mod.startswith(("core.middleware", "core.rbac_middleware",
                            "core.insur_audit",
                            "routers.observability_hub",
                            "services.observability_hub_service")):
            del sys.modules[mod]

    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from core.rbac_middleware import RBACMiddleware
    from routers.observability_hub import router

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


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: §68 Observability Hub aggregator (iter 7 — discoverability complete)\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        audit_path = Path(tmp) / "insur_reads.jsonl"
        client = TestClient(_build_app(audit_path))
        headers = {"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"}

        # ---- Step 1: /_overview envelope ----
        r = client.get(
            "/api/v1/insur/observability-hub/_overview", headers=headers,
        )
        body = r.json() if r.status_code == 200 else {}
        step(1, "/_overview → 200, n_surfaces=7, policy stamp present",
             r.status_code == 200
             and body.get("policy", "").startswith("§68")
             and body.get("n_surfaces") == 7,
             f"status={r.status_code} n_surfaces={body.get('n_surfaces')}")

        # ---- Step 2: 7 expected keys present ----
        keys = {s["key"] for s in body.get("surfaces", [])}
        step(2, "all 7 expected surface keys present (stable set)",
             keys == EXPECTED_SURFACE_KEYS,
             f"got={sorted(keys)} expected={sorted(EXPECTED_SURFACE_KEYS)}")

        # ---- Step 3: per-row schema ----
        required_top = {"key", "policy", "endpoint_prefix",
                        "write_status", "source"}
        required_source = {"kind", "path", "status"}
        bad = [s for s in body.get("surfaces", [])
               if not required_top.issubset(s.keys())
               or not required_source.issubset(s.get("source", {}).keys())]
        step(3, "every surface row carries canonical fields",
             not bad,
             f"{len(bad)} bad rows; first={bad[0] if bad else None}")

        # ---- Step 4: clean tmpdir → absent for JSONLs, present for dbviewer catalog ----
        by_key = {s["key"]: s for s in body["surfaces"]}
        # dbviewer reads per_process_tables.json from the REPO (not tmp), so it should be present
        dbv_status = by_key["dbviewer"]["source"]["status"]
        # JSONL surfaces all point to tmp files — absent
        absent_jsonls = [k for k in ("guardrails", "evals_functional",
                                     "evals_cost", "evals_safety")
                         if by_key[k]["source"]["status"] != "absent"]
        # PII reads the audit log — initially absent in tmp; will get rows once we call endpoints
        # On the FIRST call before any audit writes, audit_path doesn't exist → absent
        step(4, "fresh tmpdir: JSONLs absent (4), dbviewer catalog present from repo",
             dbv_status == "present"
             and not absent_jsonls,
             f"dbviewer={dbv_status} non_absent_jsonls={absent_jsonls}")

        # ---- Step 5: seed guardrail log + re-probe ----
        guardrail_log = Path(os.environ["INSUR_GUARDRAIL_LOG"])
        now = time.time()
        seed_rows = [
            {"ts": now - 100, "tenant_id": "tenant-a", "actor": "rag-svc",
             "guardrail_type": "prompt_injection", "decision": "deny",
             "input_hash": "abc123", "filter_id": "rebuff", "latency_ms": 12},
            {"ts": now - 50, "tenant_id": "tenant-a", "actor": "rag-svc",
             "guardrail_type": "output_toxicity", "decision": "allow",
             "input_hash": "def456", "filter_id": "llama-guard3", "latency_ms": 48},
        ]
        guardrail_log.parent.mkdir(parents=True, exist_ok=True)
        with guardrail_log.open("w") as fh:
            for row in seed_rows:
                fh.write(json.dumps(row) + "\n")
        r = client.get(
            "/api/v1/insur/observability-hub/_overview", headers=headers,
        )
        body = r.json() if r.status_code == 200 else {}
        gr = next(s for s in body["surfaces"] if s["key"] == "guardrails")
        step(5, "after seed, guardrails surface: status=present, n_rows=2, last_ts matches",
             gr["source"]["status"] == "present"
             and gr["source"]["n_rows"] == 2
             and gr["source"]["last_ts"] == now - 50,
             f"status={gr['source']['status']} n_rows={gr['source']['n_rows']}")

        # ---- Step 6: corrupt JSONL line counted separately ----
        with guardrail_log.open("a") as fh:
            fh.write("{not valid json\n")
        r = client.get(
            "/api/v1/insur/observability-hub/_overview", headers=headers,
        )
        body = r.json() if r.status_code == 200 else {}
        gr = next(s for s in body["surfaces"] if s["key"] == "guardrails")
        step(6, "corrupt line counted in n_corrupt_lines, valid rows still surface",
             gr["source"]["status"] == "present"
             and gr["source"]["n_rows"] == 2
             and gr["source"]["n_corrupt_lines"] == 1,
             f"n_rows={gr['source']['n_rows']} n_corrupt={gr['source'].get('n_corrupt_lines')}")

        # ---- Step 7: NEG broken surface → status='probe_error' on bad row ----
        # Monkeypatch the service's _probe_one to raise for ONE surface
        import services.observability_hub_service as ohub_svc
        orig_probe = ohub_svc._probe_one

        def broken_probe(surface):
            if surface.get("key") == "security":
                raise RuntimeError("simulated probe failure")
            return orig_probe(surface)

        ohub_svc._probe_one = broken_probe
        try:
            r = client.get(
                "/api/v1/insur/observability-hub/_overview", headers=headers,
            )
            body = r.json() if r.status_code == 200 else {}
            sec = next((s for s in body.get("surfaces", []) if s["key"] == "security"), None)
            step(7, "NEG: broken probe for 'security' → aggregator 200; bad row carries status='probe_error'",
                 r.status_code == 200
                 and sec is not None
                 and sec["source"]["status"] == "probe_error"
                 and sec["source"].get("error_type") == "RuntimeError",
                 f"status={r.status_code} sec_status={sec['source'].get('status') if sec else None}")
        finally:
            ohub_svc._probe_one = orig_probe

        # ---- Step 8: NEG bad role → 400 ----
        r = client.get(
            "/api/v1/insur/observability-hub/_overview",
            headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "intruder"},
        )
        step(8, "NEG: unknown role → 400 from RBAC catch-all",
             r.status_code == 400,
             f"status={r.status_code}")

        # ---- Step 9: no role header → defaults to manager (TENANT_ID_STRICT unset) ----
        r = client.get(
            "/api/v1/insur/observability-hub/_overview",
            headers={"X-Tenant-ID": "tenant-a"},  # no X-Demo-Role
        )
        step(9, "no X-Demo-Role + TENANT_ID_STRICT unset → defaults to manager → 200",
             r.status_code == 200,
             f"status={r.status_code}")

        # ---- Step 10: §38.3 schema invariant + tenant echo ----
        r = client.get(
            "/api/v1/insur/observability-hub/_overview", headers=headers,
        )
        required = {"ts", "tenant_id", "actor", "tool", "request_id",
                    "surface", "endpoint", "outcome"}
        rows = _audit_rows(audit_path)
        router_rows = [r for r in rows
                       if r.get("tool", "").startswith("insur.observability_hub")]
        bad = [r for r in router_rows if not required.issubset(r.keys())]
        step(10, "tenant echo + §38.3 schema invariant on all router rows",
             r.status_code == 200
             and r.headers.get("X-Tenant-ID") == "tenant-a"
             and not bad,
             f"echo={r.headers.get('X-Tenant-ID')!r} bad_rows={len(bad)}")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
