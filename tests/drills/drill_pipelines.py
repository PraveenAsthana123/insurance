#!/usr/bin/env python3
"""Drill: HOLY automated-pipelines router (§38 + §40 + §47 + §57.5 + §57.6 + §66).

Steps (10 total; 3 negative):
    1. (+) pipelines router imports + PHASES canonical 5-tuple intact
    2. (+) per-dept GET returns 200 + ≥ 1 pipeline + phase_sequence == PHASES
    3. (+) every pipeline carries the canonical 5 phase keys
           (input / data_process / model / output / report)
    4. (+) per-process detail returns 200 + audit_row_template carries §57.6 envelope
    5. (-) NEGATIVE — unknown dept → 404 (no info leak)
    6. (-) NEGATIVE — unknown process_id → 404 + lists available process_ids
    7. (-) NEGATIVE — malformed process_id (uppercase / special chars) → 400
    8. (+) _global inventory returns all 19 depts + n_processes_total > 19
    9. (+) HOLY_PIPELINES.md exists per dept (under business-layer/)
   10. (+) phase ordering deterministic across all pipelines (Input → Report)

# RESOURCES: pipelines_router disk_io

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))

EXPECTED_DEPTS = {
    "digital-marketing", "customer-experience", "supply-chain", "manufacturing",
    "product-rd", "retail-operations", "sales", "finance", "hr", "procurement",
    "executive-leadership", "e-commerce", "customer-support", "engineering",
    "it-operations", "legal", "marketing", "operations", "security-operations",
}

EXPECTED_PHASES = ("input", "data_process", "model", "output", "report")

CANONICAL_AUDIT_ENVELOPE = {
    "request_id", "tenant_id", "pipeline_id", "phase",
    "latency_ms", "outcome", "model_v", "confidence",
}


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    print("\nDRILL: HOLY automated-pipelines per dept (§38 + §40 + §57.6 + §66)\n")
    t0 = time.time()

    # ----- Step 1: router imports + PHASES intact -----
    try:
        from routers import pipelines as pl
    except Exception as exc:
        step(1, "pipelines router imports", False, f"{type(exc).__name__}: {exc}")
        return
    phases_ok = (
        hasattr(pl, "PHASES") and tuple(pl.PHASES) == EXPECTED_PHASES
        and hasattr(pl, "PIPELINE_CATALOG") and hasattr(pl, "HOLY_DEPTS")
    )
    step(1, "router imports + PHASES == (input/data_process/model/output/report)",
         phases_ok, f"phases={pl.PHASES}")

    # ----- Spin up TestClient -----
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    app = FastAPI()
    app.include_router(pl.router)
    client = TestClient(app)

    # ----- Step 2: per-dept GET 200 + catalog + phase_sequence -----
    r = client.get("/api/v1/holy/pipelines/sales")
    body = r.json() if r.status_code == 200 else {}
    ok = (
        r.status_code == 200
        and len(body.get("pipelines", [])) >= 1
        and tuple(body.get("phase_sequence", [])) == EXPECTED_PHASES
    )
    step(2, "GET /sales → 200 + ≥1 pipeline + phase_sequence canonical",
         ok, f"status={r.status_code} n={len(body.get('pipelines', []))} phases={body.get('phase_sequence')}")

    # ----- Step 3: every pipeline has all 5 phase keys -----
    bad_phases: list[str] = []
    for pipeline in body.get("pipelines", []):
        missing = set(EXPECTED_PHASES) - set(pipeline.get("phases", {}).keys())
        if missing:
            bad_phases.append(f"{pipeline.get('process_id')}: missing {sorted(missing)}")
    step(3, "every pipeline carries all 5 phase keys",
         not bad_phases, "; ".join(bad_phases[:3]) if bad_phases else "")

    # ----- Step 4: per-process detail + audit envelope -----
    r = client.get("/api/v1/holy/pipelines/sales/lead_scoring")
    body = r.json() if r.status_code == 200 else {}
    envelope_keys = set(body.get("audit_row_template", {}).keys())
    has_envelope = CANONICAL_AUDIT_ENVELOPE.issubset(envelope_keys)
    step(4, "GET /sales/lead_scoring → 200 + audit_row_template has §57.6 envelope",
         r.status_code == 200 and has_envelope,
         f"status={r.status_code} envelope_present={has_envelope}")

    # ----- Step 5: NEGATIVE — unknown dept -----
    r = client.get("/api/v1/holy/pipelines/not-a-real-dept")
    step(5, "NEGATIVE: unknown dept → 404 (no info leak)",
         r.status_code == 404, f"got {r.status_code}: {r.text[:80]}")

    # ----- Step 6: NEGATIVE — unknown process_id -----
    r = client.get("/api/v1/holy/pipelines/sales/totally_bogus_process_xyz")
    step(6, "NEGATIVE: unknown process_id → 404 + lists available",
         r.status_code == 404 and "lead_scoring" in r.text,
         f"got {r.status_code}: {r.text[:100]}")

    # ----- Step 7: NEGATIVE — malformed process_id -----
    r = client.get("/api/v1/holy/pipelines/sales/Bogus-CapitalLetters!")
    step(7, "NEGATIVE: malformed process_id (caps/special) → 400",
         r.status_code == 400, f"got {r.status_code}: {r.text[:80]}")

    # ----- Step 8: _global rollup -----
    r = client.get("/api/v1/holy/pipelines/_global")
    body = r.json() if r.status_code == 200 else {}
    depts_returned = set(body.get("per_dept_processes", {}).keys())
    missing = EXPECTED_DEPTS - depts_returned
    ok = (
        r.status_code == 200
        and not missing
        and body.get("n_processes_total", 0) >= 19
    )
    step(8, f"_global → all {len(EXPECTED_DEPTS)} depts + n_processes_total ≥ 19",
         ok,
         f"depts={len(depts_returned)} total_processes={body.get('n_processes_total')} missing={sorted(missing)[:3]}")

    # ----- Step 9: HOLY_PIPELINES.md per dept -----
    candidates = [Path("/global-ai-org"), REPO_ROOT / "global-ai-org"]
    gao = next((p for p in candidates if p.exists()), None)
    if gao is None:
        step(9, "global-ai-org/ locatable", False, "tried " + str(candidates))
        return
    missing_md = [
        dept for dept in EXPECTED_DEPTS
        if not (gao / "departments" / dept / "business-layer" / "HOLY_PIPELINES.md").exists()
    ]
    step(9, f"HOLY_PIPELINES.md exists for all {len(EXPECTED_DEPTS)} depts",
         not missing_md, f"missing: {sorted(missing_md)[:3]}" if missing_md else "")

    # ----- Step 10: phase ordering deterministic -----
    # For every dept, every pipeline, the catalog's `phases` dict must have
    # keys that match EXPECTED_PHASES order (when iterated). Python 3.7+
    # dicts preserve insertion order; we assert phase[0] is "input" and
    # phase[4] is "report" in every pipeline definition.
    bad_order = []
    for dept in pl.HOLY_DEPTS:
        catalog = pl._catalog_for(dept)
        for pipeline in catalog:
            phase_keys = list(pipeline["phases"].keys())
            if not phase_keys:
                continue
            # Strict order check
            if tuple(phase_keys[: len(EXPECTED_PHASES)]) != EXPECTED_PHASES:
                bad_order.append(f"{dept}/{pipeline['process_id']}: {phase_keys}")
    step(10, "phase ordering deterministic across all pipelines (Input → Report)",
         not bad_order, "; ".join(bad_order[:3]) if bad_order else "")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
