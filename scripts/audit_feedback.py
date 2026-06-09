#!/usr/bin/env python3
"""Decision feedback audit · Tier 7 governance gate #4.

Per PATH_E backlog · closes gate #4 (explicit + implicit feedback).
Companion to audit_corrections.py (gate #5).

11 assertions:
  1. Table decision_feedback exists with expected schema
  2. /feedback/health returns 200 with allowed values
  3-5. POST explicit good/bad/correct OK
  6. POST implicit accepted OK
  7. POST invalid kind=wrong returns 400
  8. POST invalid value for explicit returns 400
  9. POST invalid value for implicit returns 400
 10. GET filter by kind returns correct count
 11. /stats/summary returns by_value counts
"""
import logging
import os
import sys
import uuid
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
logging.disable(logging.CRITICAL)


TEST_PREFIX = "AUDIT-T74-"


def _cleanup():
    try:
        from core.config import get_settings
        import psycopg2
        with psycopg2.connect(get_settings().database_url) as c, c.cursor() as cur:
            cur.execute(
                "DELETE FROM decision_feedback WHERE reviewer LIKE %s",
                (f"{TEST_PREFIX}%",),
            )
            n = cur.rowcount
            c.commit()
        return n
    except Exception:
        return 0


def main() -> int:
    print("Decision feedback audit · §38.3 + Tier 7 gate #4\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    fails = 0
    rid = uuid.uuid4().hex[:6]
    reviewer = f"{TEST_PREFIX}{rid}"

    def assert_(label: str, ok: bool, detail: str = ""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok:
            fails += 1

    pre = _cleanup()
    if pre:
        print(f"  0. pre-cleanup · swept {pre} orphan row(s)        | ✓ INFO")

    # 1. Table schema
    try:
        from core.config import get_settings
        import psycopg2
        with psycopg2.connect(get_settings().database_url) as c, c.cursor() as cur:
            cur.execute(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'decision_feedback' ORDER BY ordinal_position",
            )
            cols = [r[0] for r in cur.fetchall()]
        expected = {"id", "feedback_ref", "run_ref", "decision_iter",
                    "decision_action", "feedback_kind", "feedback_value",
                    "note", "reviewer", "correlation_id", "tenant_id",
                    "created_at"}
        missing = expected - set(cols)
        assert_("1. decision_feedback schema ≥ 12 columns",
                len(missing) == 0,
                f"missing={missing}" if missing else "")
    except Exception as e:
        assert_("1. table schema", False, f"{type(e).__name__}: {e}")

    # 2-11. API
    try:
        from main import create_app
        from fastapi.testclient import TestClient
        client = TestClient(create_app())

        r = client.get("/api/v1/feedback/health")
        d = r.json()
        ok = (r.status_code == 200
              and "explicit_values" in d
              and "implicit_values" in d)
        assert_("2. /feedback/health 200 + lists allowed values", ok)

        # 3-6. POST valid combinations
        cases = [
            ("explicit", "good",     "3. POST explicit good"),
            ("explicit", "bad",      "4. POST explicit bad"),
            ("explicit", "correct",  "5. POST explicit correct"),
            ("implicit", "accepted", "6. POST implicit accepted"),
        ]
        for kind, value, label in cases:
            body = {
                "run_ref": f"TEST-RUN-{rid}",
                "decision_iter": 1,
                "decision_action": "measure",
                "feedback_kind": kind,
                "feedback_value": value,
                "reviewer": reviewer,
            }
            r = client.post("/api/v1/feedback", json=body)
            assert_(label, r.status_code == 201, f"http={r.status_code}")

        # 7. Invalid kind
        r = client.post("/api/v1/feedback", json={
            "run_ref": f"TEST-RUN-{rid}", "decision_iter": 1,
            "decision_action": "measure", "feedback_kind": "wrong",
            "feedback_value": "good", "reviewer": reviewer,
        })
        assert_("7. invalid feedback_kind returns 400", r.status_code == 400)

        # 8. Invalid explicit value
        r = client.post("/api/v1/feedback", json={
            "run_ref": f"TEST-RUN-{rid}", "decision_iter": 1,
            "decision_action": "measure", "feedback_kind": "explicit",
            "feedback_value": "accepted", "reviewer": reviewer,
        })
        assert_("8. explicit · implicit value rejected (400)",
                r.status_code == 400)

        # 9. Invalid implicit value
        r = client.post("/api/v1/feedback", json={
            "run_ref": f"TEST-RUN-{rid}", "decision_iter": 1,
            "decision_action": "measure", "feedback_kind": "implicit",
            "feedback_value": "good", "reviewer": reviewer,
        })
        assert_("9. implicit · explicit value rejected (400)",
                r.status_code == 400)

        # 10. Filter by kind
        r = client.get(f"/api/v1/feedback?kind=explicit")
        rows = r.json() if r.status_code == 200 else []
        explicit_rows = [x for x in rows if x.get("reviewer") == reviewer]
        assert_(f"10. kind=explicit filter · ≥3 rows ({len(explicit_rows)})",
                len(explicit_rows) >= 3, f"count={len(explicit_rows)}")

        # 11. Stats
        r = client.get("/api/v1/feedback/stats/summary")
        s = r.json() if r.status_code == 200 else {}
        ok = (r.status_code == 200
              and isinstance(s.get("explicit"), dict)
              and isinstance(s.get("implicit"), dict)
              and s["total"] >= 4)
        assert_("11. /stats/summary returns by-value counts", ok,
                f"total={s.get('total')}")

    except Exception as e:
        assert_("2-11. API round-trips", False, f"{type(e).__name__}: {e}")

    cleaned = _cleanup()
    print(f"  ⇧ post-cleanup · removed {cleaned} row(s)")

    print(f"\n  Summary: {11 - fails}/11 pass · {fails} fail")
    print(f"  Reference: §38.3 + Tier 7 governance gate #4")
    return 0 if fails == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
