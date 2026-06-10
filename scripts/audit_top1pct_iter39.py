#!/usr/bin/env python3
"""Iter 39 audit · 8 enterprise governance tables + endpoints + org tree + UI."""
import logging, os, sys
from pathlib import Path
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")
logging.disable(logging.CRITICAL)

def main():
    fails = 0
    def a(label, ok, detail=""):
        nonlocal fails
        mark = "✓" if ok else "✗"
        sfx = f" · {detail}" if detail else ""
        print(f"  {label[:55]:<55} | {mark} {('PASS' if ok else 'FAIL')}{sfx}")
        if not ok: fails += 1

    print("Iter 39 audit · 8 enterprise governance tables + UI\n")
    print(f"  {'Step':<55} | Result")
    print(f"  {'-' * 55} | ------")

    from main import create_app
    from fastapi.testclient import TestClient
    c = TestClient(create_app())

    r = c.get("/api/v1/governance/health")
    d = r.json()
    a(f"1. /governance/health · {len(d.get('counts', {}))} tables",
      r.status_code == 200 and len(d.get("counts", {})) == 8)

    # Create one row per table
    r = c.post("/api/v1/governance/value-streams", json={
        "value_stream_name": "Claims Value Stream", "annual_business_value": 35_000_000,
    })
    vs_id = r.json().get("value_stream_id")
    a(f"2. POST /value-streams creates ({vs_id})", vs_id and r.status_code == 200)

    r = c.post("/api/v1/governance/departments", json={
        "department_name": "Claims", "executive_owner": "Chief Claims Officer",
        "primary_value_stream": vs_id, "maturity_level": "L4",
    })
    d_id = r.json().get("department_id")
    a(f"3. POST /departments creates ({d_id})", d_id and r.status_code == 200)

    r = c.post("/api/v1/governance/teams", json={
        "team_name": "Claims AgentOps", "team_type": "Operations",
        "department_id": d_id, "support_level": "L3", "on_call_enabled": True,
    })
    t_id = r.json().get("team_id")
    a(f"4. POST /teams creates ({t_id})", t_id and r.status_code == 200)

    r = c.post("/api/v1/governance/roles", json={
        "team_id": t_id, "role_name": "AgentOps Engineer",
        "role_category": "Operations", "seniority_level": "Senior",
        "production_access": True, "on_call_eligible": True,
    })
    r_id = r.json().get("role_id")
    a(f"5. POST /roles creates ({r_id})", r_id and r.status_code == 200)

    r = c.post("/api/v1/governance/raci", json={
        "object_type": "agent", "object_id": "incident_triage",
        "role_id": r_id, "responsibility_type": "R",
    })
    a(f"6. POST /raci creates ({r.json().get('raci_id')})", r.status_code == 200)

    r = c.post("/api/v1/governance/stakeholders", json={
        "stakeholder_name": "Chief Claims Officer",
        "stakeholder_type": "Executive Sponsor",
        "influence_level": "High", "interest_level": "High",
        "decision_authority": True, "funding_authority": True,
    })
    a("7. POST /stakeholders creates", r.status_code == 200)

    r = c.post("/api/v1/governance/policies", json={
        "policy_name": "Responsible AI Policy",
        "policy_category": "Responsible AI",
        "enforcement_level": "Mandatory",
    })
    pol_id = r.json().get("policy_id")
    a(f"8. POST /policies creates ({pol_id})", pol_id and r.status_code == 200)

    r = c.post("/api/v1/governance/standards", json={
        "policy_id": pol_id, "standard_name": "Agent Design Standard",
        "standard_category": "Agent",
    })
    a("9. POST /standards creates", r.status_code == 200)

    r = c.get("/api/v1/governance/org-tree")
    d = r.json()
    a(f"10. /org-tree returns nested ({d.get('n_value_streams')} VS, {d.get('n_teams')} teams)",
      r.status_code == 200 and d.get("n_value_streams", 0) >= 1)

    print(f"\n  Summary: {10 - fails}/10 pass · {fails} fail")
    print(f"  Reference: Iter 39 · 8 governance tables (value_stream + dept + team + role + RACI + stakeholder + policy + standard)")
    return 0 if fails == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
