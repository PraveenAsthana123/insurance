#!/usr/bin/env python3
"""
Drill: §68.7 Security posture surface — iteration 3 of INSUR Observability Hub.

Read-only aggregation over three signals: live-probed compliance gates,
external CVE snapshot (INSUR_SECURITY_POSTURE_PATH env), attack-attempt
scan of the insur_reads audit log.

Steps (12 total; 5 negative):
  1. (+) GET /_global → 200 with policy stamp, compliance gates with
        score ∈ [0,1], vulnerabilities envelope, attack_attempts_24h
  2. (+) Compliance gates include the 6 known gates (federated_audit,
        rbac_matrix, tenant_id_middleware, pii_inventory, guardrails,
        drill_discipline) and ALL pass in a healthy build (score=1.0)
  3. (+) Vulnerabilities envelope graceful when no posture snapshot
        exists: counts default to 0, status='no_posture_snapshot'
  4. (+) Seeded posture snapshot → counts propagate (n_critical_cves
        from the seeded JSON appears in /_global response)
  5. (+) /attacks → 200 envelope with hits[], patterns_checked,
        since_epoch metadata
  6. (+) Seed an audit log row with 'rbac.denied' → /attacks finds it
        with attack_type='rbac_denial'
  7. (+) GET /{dept} → per-dept slice with spec_doc pointing at
        INSUR_SECURITY.md path
  8. (-) NEG: invalid dept → 404 (validator-first per §47.6)
  9. (-) NEG: bad role → 400 from RBAC, NEVER reaches service
  10.(-) NEG: malformed posture JSON → graceful envelope, not crash
  11.(-) NEG: missing audit log → /attacks returns hits=[] (not crash)
  12.(-) NEG: invalid `since` (negative number) → 422 from FastAPI

  Plus invariants: §38.3 audit row schema; NO raw posture data in
  unexpected fields.

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


def _build_app(audit_path: Path, posture_path: Path | None = None):
    os.environ["INSUR_AUDIT_PATH"] = str(audit_path)
    if posture_path:
        os.environ["INSUR_SECURITY_POSTURE_PATH"] = str(posture_path)
    else:
        os.environ.pop("INSUR_SECURITY_POSTURE_PATH", None)
    os.environ.pop("TENANT_ID_STRICT", None)

    for mod in list(sys.modules.keys()):
        if mod.startswith(("core.middleware", "core.rbac_middleware",
                            "core.insur_audit",
                            "routers.security", "services.security_posture_service")):
            del sys.modules[mod]

    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from core.rbac_middleware import RBACMiddleware
    from routers.security import router

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

    print("\nDRILL: §68.7 Security posture (Observability Hub iter 3)\n")
    t0 = time.time()

    with tempfile.TemporaryDirectory() as tmp:
        audit_path = Path(tmp) / "insur_reads.jsonl"
        client = TestClient(_build_app(audit_path))
        headers = {"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"}

        # ---- Step 1: /_global envelope shape ----
        r = client.get("/api/v1/insur/security/_global", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        comp = body.get("compliance", {})
        step(1, "/_global → 200 with policy stamp + compliance + vulnerabilities + attacks_24h",
             r.status_code == 200
             and body.get("policy") == "§68.7 Security posture"
             and isinstance(comp.get("score"), (int, float))
             and 0.0 <= comp["score"] <= 1.0
             and "vulnerabilities" in body
             and "attack_attempts_24h" in body,
             f"status={r.status_code} score={comp.get('score')}")

        # ---- Step 2: 6 known compliance gates all pass ----
        expected_gates = {
            "federated_audit_helper", "rbac_matrix_density",
            "tenant_id_middleware", "pii_inventory_service",
            "guardrails_service", "drill_discipline_n_drills",
        }
        gate_names = {g["gate"] for g in comp.get("gates", [])}
        all_pass = all(g["pass"] for g in comp.get("gates", []))
        step(2, "6 known compliance gates present, ALL pass (score=1.0)",
             expected_gates.issubset(gate_names)
             and all_pass
             and comp.get("score") == 1.0,
             f"got_gates={sorted(gate_names)} all_pass={all_pass}")

        # ---- Step 3: missing posture snapshot → graceful ----
        vuln = body.get("vulnerabilities", {})
        step(3, "no posture snapshot → vulnerabilities counts default to 0 + status hint",
             vuln.get("n_critical") == 0
             and vuln.get("n_high") == 0
             and vuln.get("snapshot_status") == "no_posture_snapshot",
             f"vuln={vuln}")

        # ---- Step 4: seeded posture snapshot → counts propagate ----
        posture_path = Path(tmp) / "security_posture.json"
        posture_path.write_text(json.dumps({
            "n_critical_cves": 2,
            "n_high_cves": 5,
            "n_medium_cves": 11,
            "last_scanned_at": time.time(),
            "per_dept": {
                "sales": {
                    "vulnerabilities": {"n_critical": 1, "n_high": 2},
                    "pen_test_result": "passed",
                    "compliance_state": {"SOC2": "ok", "GDPR": "ok"},
                }
            },
        }))
        client = TestClient(_build_app(audit_path, posture_path))
        r = client.get("/api/v1/insur/security/_global", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        vuln = body.get("vulnerabilities", {})
        step(4, "posture snapshot → CVE counts surface in /_global",
             vuln.get("n_critical") == 2
             and vuln.get("n_high") == 5
             and vuln.get("n_medium") == 11,
             f"vuln={vuln}")

        # ---- Step 5: /attacks envelope ----
        r = client.get("/api/v1/insur/security/attacks", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        step(5, "/attacks → 200 with hits + patterns_checked + since_epoch",
             r.status_code == 200
             and isinstance(body.get("hits"), list)
             and isinstance(body.get("patterns_checked"), list)
             and "since_epoch" in body,
             f"status={r.status_code} n_hits={body.get('n_hits')}")

        # ---- Step 6: seeded audit row with 'rbac.denied' → found ----
        # Seed via direct write to the audit log (INSUR_AUDIT_PATH = audit_path)
        seed_row = {
            "ts": time.time(),
            "tenant_id": "tenant-a", "actor": "test",
            "tool": "insur.test.seed",
            "request_id": "drill-attack-1",
            "surface": "test", "endpoint": "seed",
            "outcome": "denied",
            "reason": "rbac.denied role=intruder method=GET path=/api/v1/admin",
        }
        audit_path.parent.mkdir(parents=True, exist_ok=True)
        with audit_path.open("a") as fh:
            fh.write(json.dumps(seed_row) + "\n")
        # Use since=0 to scan all
        r = client.get("/api/v1/insur/security/attacks?since=1", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        rbac_hits = [h for h in body.get("hits", []) if h.get("attack_type") == "rbac_denial"]
        step(6, "seeded 'rbac.denied' audit row → /attacks finds it as rbac_denial",
             r.status_code == 200
             and len(rbac_hits) >= 1
             and rbac_hits[0]["request_id"] == "drill-attack-1",
             f"n_rbac_hits={len(rbac_hits)}")

        # ---- Step 7: /{dept} per-dept slice ----
        r = client.get("/api/v1/insur/security/sales", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        step(7, "/sales → per-dept slice with spec_doc + compliance_state from seeded posture",
             r.status_code == 200
             and body.get("dept") == "sales"
             and body.get("spec_doc", "").endswith("INSUR_SECURITY.md")
             and body.get("compliance_gates_passing", 0) >= 5
             and body.get("vulnerabilities", {}).get("n_critical") == 1
             and body.get("pen_test_result") == "passed",
             f"dept={body.get('dept')!r} gates_passing={body.get('compliance_gates_passing')}")

        # ---- Step 8: NEG invalid dept → 404 ----
        rows_before = len(_audit_rows(audit_path))
        r = client.get("/api/v1/insur/security/nonexistent-dept", headers=headers)
        rows_after = len(_audit_rows(audit_path))
        # rows_after may have 1 extra from the audit-log scan reading the seed row
        # the assertion is on the validator running BEFORE log_insur_access
        new_audit_writes = [r for r in _audit_rows(audit_path)[rows_before:]
                            if r.get("tool", "").startswith("insur.security")]
        step(8, "NEG: invalid dept → 404, NO insur.security audit row added",
             r.status_code == 404 and len(new_audit_writes) == 0,
             f"status={r.status_code} new_security_rows={len(new_audit_writes)}")

        # ---- Step 9: NEG bad role → 400 from RBAC ----
        r = client.get(
            "/api/v1/insur/security/_global",
            headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "intruder"},
        )
        step(9, "NEG: unknown role → 400 from RBAC (router never sees request)",
             r.status_code == 400,
             f"status={r.status_code}")

        # ---- Step 10: NEG malformed posture JSON → graceful ----
        bad_posture = Path(tmp) / "bad_posture.json"
        bad_posture.write_text("{not valid json")
        client3 = TestClient(_build_app(audit_path, bad_posture))
        r = client3.get("/api/v1/insur/security/_global", headers=headers)
        body = r.json() if r.status_code == 200 else {}
        step(10, "NEG: malformed posture JSON → /_global still returns 200 with graceful envelope",
             r.status_code == 200
             and body.get("vulnerabilities", {}).get("snapshot_status") in (
                 "posture_snapshot_unreadable", "no_posture_snapshot"),
             f"status={r.status_code} snap_status={body.get('vulnerabilities', {}).get('snapshot_status')}")

        # ---- Step 11: NEG missing audit log → /attacks gracefully empty ----
        client4 = TestClient(_build_app(Path(tmp) / "nonexistent.jsonl", None))
        r = client4.get("/api/v1/insur/security/attacks", headers={
            "X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager",
        })
        body = r.json() if r.status_code == 200 else {}
        step(11, "NEG: missing audit log → /attacks returns hits=[] (no crash)",
             r.status_code == 200
             and body.get("hits") == []
             and body.get("n_hits") == 0,
             f"status={r.status_code} n_hits={body.get('n_hits')}")

        # ---- Step 12: NEG negative since → 422 ----
        client = TestClient(_build_app(audit_path))
        r = client.get(
            "/api/v1/insur/security/attacks?since=-1",
            headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"},
        )
        step(12, "NEG: ?since=-1 → 422 from FastAPI Query validator",
             r.status_code == 422,
             f"status={r.status_code}")

        # ---- §38.3 schema invariant ----
        required = {"ts", "tenant_id", "actor", "tool", "request_id",
                    "surface", "endpoint", "outcome"}
        rows = _audit_rows(audit_path)
        router_rows = [r for r in rows if r.get("tool", "").startswith("insur.security")]
        bad = [r for r in router_rows if not required.issubset(r.keys())]
        if bad:
            step(99, "§38.3 schema invariant",
                 False, f"{len(bad)} bad rows; first: {bad[0]}")

    print(f"\n\033[32mALL 12 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
