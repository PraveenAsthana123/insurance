#!/usr/bin/env python3
"""Drill: HOLY data-downloads router (§38 + §47.6 + §57.6 + §64.6 + §66).

Steps (10 total; 3 negative):
    1. (+) router imports + ALLOWED_EXTENSIONS = {csv, json, svg}
    2. (+) per-dept catalog returns 200 + ≥ 1 dataset with 4-URL file set
    3. (+) every dataset's 4 files exist on disk under data/samples/<dept>/
    4. (+) CSV file serves 200 + correct media-type + non-empty body
    5. (+) JSON file serves 200 + parses as JSON list with row dicts
    6. (-) NEGATIVE — unknown dept → 404 (no info leak)
    7. (-) NEGATIVE — path traversal attempt (../etc/passwd) → 400
    8. (-) NEGATIVE — malformed filename (CapitalLetters.csv, bad ext) → 400
    9. (+) _global rollup returns all 19 depts + n_datasets_total ≥ 21
   10. (+) HOLY_DATA_DOWNLOADS.md exists per dept (under business-layer/)

# RESOURCES: downloads_router disk_io

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import json
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


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    print("\nDRILL: HOLY data-downloads per dept (§38 + §47.6 + §57.6 + §64.6 + §66)\n")
    t0 = time.time()

    # ----- Step 1: router imports + extensions -----
    try:
        from routers import downloads as dl
    except Exception as exc:
        step(1, "downloads router imports", False, f"{type(exc).__name__}: {exc}")
        return
    ok = (
        hasattr(dl, "ALLOWED_EXTENSIONS")
        and dl.ALLOWED_EXTENSIONS == {".csv", ".json", ".svg"}
    )
    step(1, "router imports + ALLOWED_EXTENSIONS = {csv, json, svg}",
         ok, f"exts={sorted(dl.ALLOWED_EXTENSIONS)}")

    # ----- Spin up TestClient -----
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    app = FastAPI()
    app.include_router(dl.router)
    client = TestClient(app)

    # ----- Step 2: per-dept catalog -----
    r = client.get("/api/v1/holy/downloads/sales")
    body = r.json() if r.status_code == 200 else {}
    datasets = body.get("datasets", [])
    ok = (
        r.status_code == 200
        and len(datasets) >= 1
        and all(set(d.get("files", {}).keys()) == {"csv", "json", "before_svg", "after_svg"}
                for d in datasets)
    )
    step(2, "GET /sales → 200 + ≥ 1 dataset + 4-URL file set per dataset",
         ok, f"status={r.status_code} n={len(datasets)}")

    # ----- Step 3: every file exists on disk -----
    # Discover the samples root the way the router does.
    samples_root = dl.SAMPLES_ROOT
    bad_files: list[str] = []
    for dataset in datasets:
        did = dataset["dataset_id"]
        for ext in [".csv", ".json", ".before.svg", ".after.svg"]:
            f = samples_root / "sales" / f"{did}{ext}"
            if not f.exists() or f.stat().st_size == 0:
                bad_files.append(f"{did}{ext}")
    step(3, f"every dataset's 4 files exist + non-empty under {samples_root}",
         not bad_files, f"missing: {bad_files[:3]}" if bad_files else "")

    # ----- Step 4: serve CSV -----
    first_dataset_id = datasets[0]["dataset_id"]
    r = client.get(f"/api/v1/holy/downloads/sales/{first_dataset_id}.csv")
    ok = (
        r.status_code == 200
        and "text/csv" in r.headers.get("content-type", "")
        and len(r.content) > 10
    )
    step(4, f"GET /sales/{first_dataset_id}.csv → 200 + text/csv + non-empty",
         ok,
         f"status={r.status_code} ct={r.headers.get('content-type')} size={len(r.content)}B")

    # ----- Step 5: serve JSON + parse -----
    r = client.get(f"/api/v1/holy/downloads/sales/{first_dataset_id}.json")
    parse_ok = False
    try:
        body = json.loads(r.content)
        parse_ok = isinstance(body, list) and len(body) >= 1 and isinstance(body[0], dict)
    except Exception:
        pass
    step(5, f"GET /sales/{first_dataset_id}.json → 200 + parses as list of dicts",
         r.status_code == 200 and parse_ok,
         f"status={r.status_code} parse_ok={parse_ok}")

    # ----- Step 6: NEGATIVE — unknown dept -----
    r = client.get("/api/v1/holy/downloads/not-a-real-dept")
    step(6, "NEGATIVE: unknown dept → 404 (no info leak)",
         r.status_code == 404, f"got {r.status_code}: {r.text[:80]}")

    # ----- Step 7: NEGATIVE — path traversal -----
    # The router's FILENAME_PAT regex rejects this lexically with 400 BEFORE
    # any path resolution happens. (FastAPI's path routing may also block
    # the leading slash; both outcomes are safe.)
    r = client.get("/api/v1/holy/downloads/sales/..%2F..%2Fetc%2Fpasswd")
    step(7, "NEGATIVE: path traversal attempt → 4xx (rejected)",
         400 <= r.status_code < 500,
         f"got {r.status_code}")

    # ----- Step 8: NEGATIVE — malformed filename -----
    r1 = client.get("/api/v1/holy/downloads/sales/CapitalName.csv")
    r2 = client.get("/api/v1/holy/downloads/sales/some_file.txt")
    step(8, "NEGATIVE: malformed filename (caps OR bad ext) → 400",
         r1.status_code == 400 and r2.status_code == 400,
         f"caps={r1.status_code} bad_ext={r2.status_code}")

    # ----- Step 9: _global rollup -----
    r = client.get("/api/v1/holy/downloads/_global")
    body = r.json() if r.status_code == 200 else {}
    depts_in = set(body.get("depts", []))
    missing = EXPECTED_DEPTS - depts_in
    total = body.get("n_datasets_total", 0)
    # 3 detailed depts × 3 datasets + 16 stub depts × 1 dataset = 9 + 16 = 25
    expected_min = 21
    ok = r.status_code == 200 and not missing and total >= expected_min
    step(9, f"_global → all {len(EXPECTED_DEPTS)} depts + n_datasets_total ≥ {expected_min}",
         ok, f"depts={len(depts_in)} n_datasets_total={total}")

    # ----- Step 10: per-dept MD presence -----
    candidates = [Path("/global-ai-org"), REPO_ROOT / "global-ai-org"]
    gao = next((p for p in candidates if p.exists()), None)
    if gao is None:
        step(10, "global-ai-org/ locatable", False, "tried " + str(candidates))
        return
    missing_md = [
        dept for dept in EXPECTED_DEPTS
        if not (gao / "departments" / dept / "business-layer" / "HOLY_DATA_DOWNLOADS.md").exists()
    ]
    step(10, f"HOLY_DATA_DOWNLOADS.md exists for all {len(EXPECTED_DEPTS)} depts",
         not missing_md, f"missing: {sorted(missing_md)[:3]}" if missing_md else "")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
