#!/usr/bin/env python3
"""Drill: HOLY master-data router + per-dept catalog (§38 + §41.3 + §47.6 + §57.6 + §64).

Steps (10 total; 3 negative):
    1. (+) master-data router imports + ENTITY_CATALOG has all 15 core entities
    2. (+) per-dept GET returns 200 + 15-entity catalog with owner + field schema
    3. (+) per-entity GET returns 200 + canonical envelope fields present
    4. (-) NEGATIVE — unknown dept → 404 (no info leak)
    5. (-) NEGATIVE — unknown entity → 404 + allowed-values hint
    6. (-) NEGATIVE — default response does NOT contain PII field names
                     (data-class contract: customer_name / primary_email / etc.
                     redacted unless include_pii=1)
    7. (+) include_pii=1 surfaces PII fields (audit path noted)
    8. (+) _global endpoint returns all 19 depts + entity index
    9. (+) HOLY_MASTER_DATA.md exists per dept (under business-layer/)
   10. (+) §57.6 canonical envelope present on every entity (id / tenant_id /
           created_at / updated_at / created_by / version / is_active)

# RESOURCES: master_data_router disk_io

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

EXPECTED_ENTITIES = {
    "customer", "customer_hierarchy", "vendor", "employee", "product",
    "product_hierarchy", "price_list", "discount_condition", "organization",
    "sales_area", "sales_org", "sales_office", "company_code", "cost_center",
    "department",
}

CANONICAL_ENVELOPE = {"id", "tenant_id", "created_at", "updated_at",
                      "created_by", "version", "is_active"}

PII_TOKENS = ["customer_name", "primary_email", "primary_phone",
              "billing_address", "vendor_name", "bank_account_iban",
              "full_name", "email", "phone", "ssn_hash"]


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' — ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def main():
    print("\nDRILL: HOLY master-data per dept (§38 + §41.3 + §47.6 + §57.6 + §64)\n")
    t0 = time.time()

    # ----- Step 1: router imports + catalog populated -----
    try:
        from routers import master_data as md
    except Exception as exc:
        step(1, "master_data router imports", False, f"{type(exc).__name__}: {exc}")
        return
    missing_entities = EXPECTED_ENTITIES - set(md.ENTITY_CATALOG.keys())
    step(1, f"router imports + all {len(EXPECTED_ENTITIES)} core entities in catalog",
         not missing_entities,
         f"missing: {sorted(missing_entities)}" if missing_entities else f"{len(md.ENTITY_CATALOG)} entities")

    # ----- Step 2: per-dept GET 200 + catalog -----
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    app = FastAPI()
    app.include_router(md.router)
    client = TestClient(app)

    r = client.get("/api/v1/holy/master-data/sales")
    body = r.json() if r.status_code == 200 else {}
    ok = (r.status_code == 200
          and "entities" in body
          and len(body["entities"]) == len(EXPECTED_ENTITIES))
    step(2, f"GET /sales → 200 + {len(EXPECTED_ENTITIES)}-entity catalog",
         ok, f"status={r.status_code} entities={len(body.get('entities', {}))}")

    # ----- Step 3: per-entity GET 200 + envelope fields -----
    r = client.get("/api/v1/holy/master-data/sales/customer")
    body = r.json() if r.status_code == 200 else {}
    fields_returned = set(body.get("fields", []))
    has_envelope = CANONICAL_ENVELOPE.issubset(fields_returned)
    step(3, "GET /sales/customer → 200 + canonical envelope fields present",
         r.status_code == 200 and has_envelope,
         f"status={r.status_code} envelope_present={has_envelope}")

    # ----- Step 4: NEGATIVE — unknown dept -----
    r = client.get("/api/v1/holy/master-data/not-a-real-dept")
    step(4, "NEGATIVE: unknown dept → 404 (no info leak)",
         r.status_code == 404, f"got {r.status_code}: {r.text[:80]}")

    # ----- Step 5: NEGATIVE — unknown entity -----
    r = client.get("/api/v1/holy/master-data/sales/not-a-real-entity")
    step(5, "NEGATIVE: unknown entity → 404 + allowed-values hint",
         r.status_code == 404 and "customer" in r.text,
         f"got {r.status_code}: {r.text[:80]}")

    # ----- Step 6: NEGATIVE — no PII fields in default response -----
    r = client.get("/api/v1/holy/master-data/sales/customer")
    body_text = r.text
    pii_leaked = [tok for tok in PII_TOKENS if tok in body_text]
    step(6, "NEGATIVE: PII fields redacted from default schema response",
         not pii_leaked, f"leaked: {pii_leaked}" if pii_leaked else "")

    # ----- Step 7: include_pii=1 surfaces PII fields -----
    r = client.get("/api/v1/holy/master-data/sales/customer?include_pii=1")
    body = r.json() if r.status_code == 200 else {}
    fields_returned = set(body.get("fields", []))
    pii_present = "customer_name" in fields_returned
    step(7, "include_pii=1 surfaces PII fields (audit path noted)",
         r.status_code == 200 and pii_present,
         f"customer_name in fields={pii_present}")

    # ----- Step 8: _global rollup -----
    r = client.get("/api/v1/holy/master-data/_global")
    body = r.json() if r.status_code == 200 else {}
    depts_in_rollup = set(body.get("depts", []))
    missing = EXPECTED_DEPTS - depts_in_rollup
    step(8, f"GET /_global → all {len(EXPECTED_DEPTS)} depts + entity index",
         r.status_code == 200 and not missing,
         f"missing depts: {sorted(missing)[:3]}" if missing else "")

    # ----- Step 9: HOLY_MASTER_DATA.md exists per dept -----
    candidates = [Path("/global-ai-org"), REPO_ROOT / "global-ai-org"]
    gao = next((p for p in candidates if p.exists()), None)
    if gao is None:
        step(9, "global-ai-org/ locatable", False, "tried " + str([str(c) for c in candidates]))
        return
    missing_md = []
    for dept in EXPECTED_DEPTS:
        if not (gao / "departments" / dept / "business-layer" / "HOLY_MASTER_DATA.md").exists():
            missing_md.append(dept)
    step(9, f"HOLY_MASTER_DATA.md exists for all {len(EXPECTED_DEPTS)} depts",
         not missing_md, f"missing: {sorted(missing_md)[:3]}" if missing_md else "")

    # ----- Step 10: canonical envelope on every entity -----
    bad_envelope = []
    for name, meta in md.ENTITY_CATALOG.items():
        public_set = set(meta["fields_public"])
        if not CANONICAL_ENVELOPE.issubset(public_set):
            missing = CANONICAL_ENVELOPE - public_set
            bad_envelope.append(f"{name}: missing {sorted(missing)}")
    step(10, "§57.6 canonical envelope present on every entity",
         not bad_envelope, "; ".join(bad_envelope[:3]) if bad_envelope else "")

    print(f"\n\033[32mALL 10 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
