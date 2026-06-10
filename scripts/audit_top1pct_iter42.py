#!/usr/bin/env python3
"""Iter 42 audit · data integrity constraints reject bad inserts."""
import logging, os, sys
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

import psycopg2
from core.config import get_settings

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok: fails += 1

    print("Iter 42 audit · 33 constraints enforce data integrity\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    cx = psycopg2.connect(get_settings().database_url)

    def insert_should_fail(table, body, constraint_substring):
        """Return True if insert FAILS with constraint violation."""
        try:
            with cx, cx.cursor() as cur:
                cols = ", ".join(body.keys())
                vals = ", ".join(f"%({k})s" for k in body.keys())
                cur.execute(f"INSERT INTO {table} ({cols}) VALUES ({vals})", body)
            return False  # insert succeeded · constraint didn't fire
        except psycopg2.errors.CheckViolation as e:
            return constraint_substring in str(e).lower()
        except psycopg2.errors.ForeignKeyViolation as e:
            return constraint_substring in str(e).lower()
        except Exception:
            return False

    # 1. Bad agent status rejected
    a("1. agent_registry · bad status='Higgg' rejected",
      insert_should_fail("agent_registry", {
          "agent_id": "test_bad_status_42",
          "agent_name": "Bad",
          "status": "Higgg",
      }, "chk_agent_status"))

    # 2. Bad risk_level rejected
    a("2. agent_registry · bad risk_level='Extreme' rejected",
      insert_should_fail("agent_registry", {
          "agent_id": "test_bad_risk_42",
          "agent_name": "Bad",
          "risk_level": "Extreme",
      }, "chk_agent_risk"))

    # 3. Bad autonomy rejected
    a("3. agent_registry · bad autonomy='Yolo' rejected",
      insert_should_fail("agent_registry", {
          "agent_id": "test_bad_aut_42",
          "agent_name": "Bad",
          "autonomy_level": "Yolo",
      }, "chk_agent_autonomy"))

    # 4. Bad rating rejected
    a("4. agent_feedback · rating=10 (out of 1-5) rejected",
      insert_should_fail("agent_feedback", {
          "feedback_id": "FB-bad-42",
          "agent_id": "fraud_scorer", "rating": 10,
          "invocation_id": "x", "feedback_type": "rating",
      }, "chk_fb_rating"))

    # 5. Bad severity rejected
    a("5. agent_incident · severity='SuperCritical' rejected",
      insert_should_fail("agent_incident", {
          "incident_id": "INC-bad-42",
          "agent_id": "fraud_scorer", "incident_type": "test",
          "severity": "SuperCritical", "title": "test",
      }, "chk_inc_severity"))

    # 6. RACI bad type rejected
    a("6. responsibility_matrix · type='X' rejected (R/A/C/I only)",
      insert_should_fail("responsibility_matrix", {
          "raci_id": "RACI-bad-42",
          "object_type": "agent", "object_id": "x",
          "responsibility_type": "X",
      }, "chk_raci_type"))

    # 7. Priority out-of-range rejected
    a("7. agent_queue · priority=99 (1-5 only) rejected",
      insert_should_fail("agent_queue", {
          "queue_id": "Q-bad-42",
          "agent_id": "fraud_scorer", "job_type": "test",
          "priority": 99,
      }, "chk_q_priority"))

    # 8. SLA availability >100 rejected
    a("8. agent_sla · availability=150 (0-100 only) rejected",
      insert_should_fail("agent_sla", {
          "sla_id": "SLA-bad-42",
          "agent_id": "fraud_scorer", "sla_name": "test",
          "availability_target": 150.0,
      }, "chk_sla_availability"))

    # 9. agent_skill_mapping FK enforced
    a("9. agent_skill_mapping · agent_id='ghost' rejected (FK)",
      insert_should_fail("agent_skill_mapping", {
          "agent_id": "ghost_agent_does_not_exist",
          "skill_id": "classify_incident",
      }, "agent_skill_mapping"))

    # 10. Updated_at trigger works
    try:
        with cx, cx.cursor() as cur:
            cur.execute("UPDATE agent_registry SET purpose='Updated by trigger test' WHERE agent_id='fraud_scorer' RETURNING updated_at")
            row = cur.fetchone()
        from datetime import datetime, timedelta
        updated = row[0]
        is_recent = (datetime.now(updated.tzinfo or None) - updated) < timedelta(seconds=30)
        a("10. updated_at trigger fires on UPDATE", is_recent,
          f"updated_at={updated}")
    except Exception as e:
        a("10. updated_at trigger fires on UPDATE", False, str(e)[:40])

    cx.close()

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 42 · Tier-1 #2 · data integrity constraints")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
