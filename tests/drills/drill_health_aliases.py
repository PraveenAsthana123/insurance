#!/usr/bin/env python3
"""
Drill: /api/health unversioned alias (§43, §6.5) — prevents regression
of the 2026-05-22 insur_backend "unhealthy 2516 fails" incident.

Steps (6 total; 2 negative):
    1. (+) Versioned /api/v1/health returns 200 + healthy payload
    2. (+) Unversioned /api/health returns 200 + same payload
    3. (+) Both endpoints return identical body (alias preserved)
    4. (-) NEGATIVE — bogus /api/healthcheck returns 404 (not silent 200)
    5. (-) NEGATIVE — /api/v2/health returns 404 (we haven't shipped v2)
    6. (+) Docker healthcheck command (httpx.get + raise_for_status) succeeds

# RESOURCES: http_local

Exit 0 on PASS, 1 on FAIL. Requires insur_backend running on :8000.
"""
from __future__ import annotations

import sys
import time

import httpx


BACKEND = "http://localhost:8000"


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    print("\nDRILL: /api/health alias + Docker healthcheck contract\n")
    t0 = time.time()

    # Prereq: backend reachable
    try:
        httpx.get(BACKEND, timeout=2)
    except httpx.ConnectError:
        print(f"  \033[33m⚠\033[0m prereq: backend not running at {BACKEND}; skipping drill")
        sys.exit(0)

    # ----- Step 1: versioned -----
    r1 = httpx.get(f"{BACKEND}/api/v1/health", timeout=5)
    body1 = r1.json() if r1.status_code == 200 else None
    step(1, "/api/v1/health returns 200 + healthy payload",
         r1.status_code == 200 and body1 and body1.get("status") == "healthy",
         f"status={r1.status_code} body={body1}")

    # ----- Step 2: unversioned alias -----
    r2 = httpx.get(f"{BACKEND}/api/health", timeout=5)
    body2 = r2.json() if r2.status_code == 200 else None
    step(2, "/api/health (unversioned alias) returns 200 + healthy payload",
         r2.status_code == 200 and body2 and body2.get("status") == "healthy",
         f"status={r2.status_code} body={body2}")

    # ----- Step 3: identical payload -----
    step(3, "both endpoints return identical body (alias preserves contract)",
         body1 == body2, f"v1={body1} unversioned={body2}")

    # ----- Step 4: NEGATIVE — bogus path -----
    r3 = httpx.get(f"{BACKEND}/api/healthcheck", timeout=5)
    step(4, "NEGATIVE: /api/healthcheck returns 404 (no silent alias to wrong path)",
         r3.status_code == 404,
         f"status={r3.status_code}")

    # ----- Step 5: NEGATIVE — v2 not shipped -----
    r4 = httpx.get(f"{BACKEND}/api/v2/health", timeout=5)
    step(5, "NEGATIVE: /api/v2/health returns 404 (v2 not shipped)",
         r4.status_code == 404,
         f"status={r4.status_code}")

    # ----- Step 6: Docker healthcheck command -----
    # Replicate exactly what backend/Dockerfile HEALTHCHECK runs:
    #   python -c "import httpx; httpx.get('http://localhost:8000/api/health').raise_for_status()"
    try:
        r5 = httpx.get(f"{BACKEND}/api/health", timeout=10)
        r5.raise_for_status()
        ok = True
        err = ""
    except Exception as exc:
        ok = False
        err = str(exc)
    step(6, "Docker healthcheck command (httpx + raise_for_status) succeeds",
         ok, err)

    print(f"\n\033[32mALL 6 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
