"""§142 · Real RPA demo · Playwright accesses local backend (acts as legacy 'portal').

Demonstrates the RPA pattern end-to-end with REAL Playwright + REAL local HTTP target.
No remote ops · no scraping public sites · per §42 boundary respected.
"""
from __future__ import annotations
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

R = Path("/mnt/deepa/insur_project")
LOG = R / "data/n8n_rpa/rpa_runs"
LOG.mkdir(parents=True, exist_ok=True)


def run():
    from playwright.sync_api import sync_playwright
    t0 = time.perf_counter()
    out = {"started_at": datetime.now().isoformat(), "steps": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Step 1 · navigate to docs portal (local FastAPI swagger UI)
            page.goto("http://localhost:8001/docs", timeout=30000)
            out["steps"].append({"step": 1, "name": "navigate /docs",
                                  "url": page.url, "title": page.title(),
                                  "ts": datetime.now().isoformat()})

            # Step 2 · check OpenAPI JSON loads
            resp = page.request.get("http://localhost:8001/openapi.json")
            spec = resp.json()
            out["steps"].append({"step": 2, "name": "fetch OpenAPI",
                                  "status": resp.status,
                                  "n_paths": len(spec.get("paths", {})),
                                  "title": spec.get("info", {}).get("title"),
                                  "ts": datetime.now().isoformat()})

            # Step 3 · call /api/v1/health
            resp = page.request.get("http://localhost:8001/api/v1/health")
            out["steps"].append({"step": 3, "name": "GET health",
                                  "status": resp.status,
                                  "body": resp.json() if resp.status == 200 else None,
                                  "ts": datetime.now().isoformat()})

            # Step 4 · POST text2sql (real RPA: simulate operator filling a form)
            resp = page.request.post(
                "http://localhost:8001/api/v1/text2sql/run",
                data=json.dumps({"question": "How many agent invocations?"}),
                headers={"Content-Type": "application/json"},
            )
            body = resp.json() if resp.status == 200 else None
            out["steps"].append({"step": 4, "name": "POST text2sql/run",
                                  "status": resp.status,
                                  "generated_sql": body.get("generated_sql") if body else None,
                                  "n_rows": body.get("n_rows") if body else None,
                                  "ts": datetime.now().isoformat()})

            # Step 5 · check score-card
            resp = page.request.get("http://localhost:8001/api/v1/use-case-matrix/score-card")
            out["steps"].append({"step": 5, "name": "GET use-case-matrix score-card",
                                  "status": resp.status,
                                  "score": resp.json().get("score") if resp.status == 200 else None,
                                  "ts": datetime.now().isoformat()})

            # Step 6 · screenshot for evidence
            shot_path = LOG / f"rpa_run_{int(time.time())}.png"
            page.screenshot(path=str(shot_path))
            out["steps"].append({"step": 6, "name": "screenshot evidence",
                                  "path": str(shot_path.relative_to(R)),
                                  "ts": datetime.now().isoformat()})

        finally:
            browser.close()

    out["duration_ms"] = round((time.perf_counter() - t0) * 1000, 1)
    out["n_steps_ok"] = sum(1 for s in out["steps"] if s.get("status") in (200, None))
    out["spec"] = "§142 RPA demo"
    log_path = LOG / "latest_run.json"
    log_path.write_text(json.dumps(out, indent=2))
    print(f"  ✓ RPA run: {len(out['steps'])} steps · {out['duration_ms']:.0f}ms")
    print(f"  Log: {log_path}")
    return out


if __name__ == "__main__":
    print(f"[§142] Playwright RPA demo · {datetime.now()}")
    print("=" * 70)
    try:
        result = run()
        print(json.dumps({"summary": {
            "n_steps": len(result["steps"]),
            "duration_ms": result["duration_ms"],
        }}, indent=2))
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        sys.exit(1)
