#!/usr/bin/env python3
"""
Drill: HOLY security API endpoints (§43, §64.32).

Steps (8 total; 3 negative):
    1. (+) GET /attack-classes returns 12 classes
    2. (+) GET /attack-classes shows executor_authorized flag
    3. (+) POST /generate-corpus enqueues payloads (n=3) + returns audit info
    4. (+) GET /corpora lists the newly-generated corpus
    5. (+) GET /corpora/<class>/<id> returns full payload list
    6. (-) NEGATIVE: POST with bogus attack_class returns 400
    7. (-) NEGATIVE: GET corpora/<class>/<bogus_id> returns 404
    8. (-) NEGATIVE: path-traversal in corpus_id (../) rejected

# RESOURCES: http_local

Requires insur_backend running. Skips gracefully if not.

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations

import sys
import time

import httpx


BACKEND = "http://localhost:8000"
API = f"{BACKEND}/api/v1/holy/security"
DEPT = "drill_test_security"


def step(n, label, ok, detail=""):
    marker = "\033[32mOK\033[0m" if ok else "\033[31mFAIL\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    print("\nDRILL: HOLY security API (section 64.32)\n")
    t0 = time.time()

    # Prereq: backend reachable
    try:
        httpx.get(BACKEND, timeout=2)
    except httpx.ConnectError:
        print(f"  WARN prereq: backend not reachable at {BACKEND}; skipping drill")
        sys.exit(0)

    # ----- Step 1: 12 attack classes -----
    r = httpx.get(f"{API}/attack-classes", timeout=5)
    data = r.json() if r.status_code == 200 else {}
    ok = r.status_code == 200 and data.get("count") == 12
    step(1, "GET /attack-classes returns 12 classes",
         ok, f"status={r.status_code} count={data.get('count')}")

    # ----- Step 2: executor_authorized flag present -----
    has_flag = "executor_authorized" in data and isinstance(data["executor_authorized"], bool)
    step(2, "executor_authorized flag exposed in /attack-classes response",
         has_flag, f"flag={data.get('executor_authorized')}")

    # ----- Step 3: POST /generate-corpus -----
    r = httpx.post(
        f"{API}/{DEPT}/generate-corpus",
        json={"attack_class": "sql_injection", "n": 3, "seed": 7},
        timeout=10,
    )
    corpus = r.json() if r.status_code == 200 else {}
    ok = (
        r.status_code == 200
        and corpus.get("attack_class") == "sql_injection"
        and corpus.get("n_payloads") == 3
        and len(corpus.get("payloads", [])) == 3
    )
    step(3, "POST /generate-corpus produces 3-payload sql_injection corpus",
         ok, f"status={r.status_code} n={corpus.get('n_payloads')}")
    new_corpus_id = corpus.get("corpus_id", "")

    # ----- Step 4: corpus appears in /corpora list -----
    r = httpx.get(f"{API}/{DEPT}/corpora", timeout=5)
    list_data = r.json() if r.status_code == 200 else {"corpora": []}
    ids = {c["corpus_id"] for c in list_data.get("corpora", [])}
    step(4, "newly-generated corpus appears in /corpora",
         new_corpus_id in ids,
         f"new_id={new_corpus_id} found_in_list={new_corpus_id in ids}")

    # ----- Step 5: GET corpus by id returns full payload list -----
    r = httpx.get(f"{API}/{DEPT}/corpora/sql_injection/{new_corpus_id}", timeout=5)
    detail = r.json() if r.status_code == 200 else {}
    step(5, "GET corpora/<class>/<id> returns full payload list",
         r.status_code == 200 and len(detail.get("payloads", [])) == 3,
         f"status={r.status_code} n_payloads={len(detail.get('payloads', []))}")

    # ----- Step 6: NEGATIVE bogus attack_class -----
    r = httpx.post(
        f"{API}/{DEPT}/generate-corpus",
        json={"attack_class": "totally_bogus_class_xyz", "n": 1},
        timeout=5,
    )
    step(6, "NEGATIVE: bogus attack_class returns 400",
         r.status_code == 400, f"status={r.status_code}")

    # ----- Step 7: NEGATIVE bogus corpus_id -----
    r = httpx.get(f"{API}/{DEPT}/corpora/sql_injection/does-not-exist-xyz", timeout=5)
    step(7, "NEGATIVE: GET non-existent corpus returns 404",
         r.status_code == 404, f"status={r.status_code}")

    # ----- Step 8: NEGATIVE path-traversal -----
    # FastAPI normalizes some traversal patterns; for the ones that pass through, the
    # safe handler MUST reject with 400 (not silently serve a file outside SECURITY_ROOT).
    # We assert the response is non-200 (could be 400 / 404 / 422 depending on URL parsing).
    r = httpx.get(
        f"{API}/{DEPT}/corpora/sql_injection/..%2F..%2F..%2Fetc%2Fpasswd",
        timeout=5,
    )
    step(8, "NEGATIVE: path-traversal-encoded corpus_id is non-200",
         r.status_code != 200, f"status={r.status_code}")

    print(f"\n\033[32mALL 8 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
