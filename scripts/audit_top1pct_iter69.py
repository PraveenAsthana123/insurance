#!/usr/bin/env python3
"""Iter 69 · §99 A+ push · concurrency + secrets + golden + synthetic + UI tab."""
import os, sys, logging
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO)); sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1"); os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{(' · ' + detail) if detail else ''}")
        if not ok: fails += 1
    print("Iter 69 · §99 A+ push\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    import psycopg2
    cx = psycopg2.connect(host='localhost', port=5434, user='insur_user',
                          password='insur_secret_password', dbname='insur_analytics')
    with cx, cx.cursor() as cur:
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_name IN ('concurrency_control','secrets_vault','golden_test_set','synthetic_dataset')
        """)
        n = cur.fetchone()[0]
    cx.close()
    a(f"1. 4 new tables created ({n})", n == 4)

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/governance-registries/concurrency")
    a(f"2. concurrency_control · 4 seeded ({r.json().get('count')})",
      r.json().get("count") == 4)

    r = c.post("/api/v1/governance-registries/concurrency/acquire",
               json={"control_id": "cc-fraud-scorer", "increment": 1})
    a("3. concurrency/acquire works",
      r.json().get("acquired") is True)

    r = c.get("/api/v1/governance-registries/secrets-vault")
    d = r.json()
    a(f"4. secrets_vault · 4 seeded ({d.get('count')})",
      d.get("count") == 4)
    a("5. secrets · encrypted_value masked",
      d['secrets'][0]['encrypted_value'] == '__masked__')

    r = c.get("/api/v1/governance-registries/golden-tests")
    a(f"6. golden_test_set · ≥10 cases ({r.json().get('count')})",
      r.json().get("count") >= 10)

    r = c.get("/api/v1/governance-registries/synthetic-datasets")
    a(f"7. synthetic_dataset · 3 seeded ({r.json().get('count')})",
      r.json().get("count") == 3)

    r = c.post("/api/v1/governance-registries/synthetic/generate",
               json={"synth_id": "synth-customer", "n": 5})
    a("8. synthetic/generate returns rows",
      r.json().get("generated") == 5)

    # §99 climbed
    r = c.get("/api/v1/production-checklist/summary")
    s = r.json()
    a(f"9. §99 prod-ready ≥ 95% A+ ({s['production_ready_pct']}%)",
      s["production_ready_pct"] >= 95)

    a(f"10. §99 done ≥ 95 ({s['done']})", s["done"] >= 95)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
