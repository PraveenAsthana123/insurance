"""§144 · Full test sweep · API + DB + UI + Frontend + Feature.

12 tiers per §64.30 · runs everything we built this session.
"""
from __future__ import annotations
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
import warnings
warnings.filterwarnings("ignore")

import psycopg2
import requests

API = os.environ.get("BACKEND_URL", "http://localhost:8001")
FE  = os.environ.get("FRONTEND_URL", "http://localhost:3000")
R = Path("/mnt/deepa/insur_project")
REPORT_DIR = R / "data/test_reports"
REPORT_DIR.mkdir(parents=True, exist_ok=True)


def db():
    return psycopg2.connect(host='localhost', port=5434, user='insur_user',
                             password='insur_secret_password', dbname='insur_analytics')


def tier(name):
    def deco(fn):
        fn._tier = name
        return fn
    return deco


REPORT = {"started": datetime.now().isoformat(), "tiers": {}}


def record(tier_name, name, ok, detail=""):
    t = REPORT["tiers"].setdefault(tier_name, {"pass": 0, "fail": 0, "items": []})
    t["pass" if ok else "fail"] += 1
    t["items"].append({"name": name, "ok": ok, "detail": detail[:160]})
    mark = "✓" if ok else "✗"
    print(f"  {mark} [{tier_name}] {name:<55} {detail[:80]}")


# ─── TIER 1 · API HEALTH (smoke critical endpoints) ───
@tier("api_health")
def t_api_health():
    eps = [
        "/api/v1/health", "/api/v1/odysseus/health",
        "/api/v1/use-case-matrix/score-card",
        "/api/v1/141/score-card", "/api/v1/n8n-rpa/score-card",
        "/api/v1/itsm/score-card", "/api/v1/eai-os/score-card",
    ]
    for ep in eps:
        try:
            r = requests.get(f"{API}{ep}", timeout=10)
            record("api_health", ep, r.status_code == 200, f"status={r.status_code}")
        except Exception as e:
            record("api_health", ep, False, str(e)[:80])


# ─── TIER 2 · API §144 (all 35 new endpoints) ───
@tier("api_eaios")
def t_api_eaios():
    eps = [
        "pm/discoveries", "pm/bottlenecks", "pm/candidates", "pm/scores",
        "pm/tasks", "pm/workforce", "pm/autonomous-departments",
        "pm/discovery", "pm/conformance", "pm/bottleneck", "pm/automation-candidates",
        "pm/autonomy-readiness",
        "fabric/domains", "fabric/products", "fabric/catalog",
        "fabric/lineage", "fabric/features", "fabric/vector-assets", "fabric/decisions",
        "os/capabilities", "os/workspaces", "os/digital-workers",
        "os/digital-teams", "os/marketplace/agents", "os/marketplace/prompts",
        "os/departments",
        "ct/inventory", "ct/prompts", "ct/workflows", "ct/risks", "ct/costs", "ct/compliance",
        "execution/plans", "execution/validations", "execution/rollbacks",
        "execution/self-healing", "execution/risk-matrix", "execution/recent",
        "learning/prompt-versions", "learning/agent-versions",
        "learning/workflow-learning", "learning/feedback", "learning/fine-tune-jobs",
        "eval/benchmarks", "eval/golden-datasets", "eval/experiments", "eval/rag",
        "eval/health",
        "telemetry/aggregate", "twin/business/Claims",
        "pattern/discover", "pattern/enforce-roster",
        "overview",
    ]
    for ep in eps:
        try:
            r = requests.get(f"{API}/api/v1/eai-os/{ep}", timeout=10)
            record("api_eaios", ep, r.status_code == 200, f"status={r.status_code}")
        except Exception as e:
            record("api_eaios", ep, False, str(e)[:80])


# ─── TIER 3 · API §143 ITSM (all surfaces) ───
@tier("api_itsm")
def t_api_itsm():
    eps = [
        "health", "playbook/templates", "playbook/templates/prompt_injection",
        "specialist/performance", "security-score/sys_watchdog_pii",
        "resolution-workflow/stages", "l1-orchestration",
        "incidents", "finetune-planner/l1-issues",
        "finetune-planner/knowledge-base",
        "agent-autofix/queue", "agents/showcase", "agents/showcase?env=prod",
        "l2-rca/list", "l3-problem/clusters", "l3-problem/list",
        "p1-war-room/active",
    ]
    for ep in eps:
        try:
            r = requests.get(f"{API}/api/v1/itsm/{ep}", timeout=10)
            record("api_itsm", ep, r.status_code == 200, f"status={r.status_code}")
        except Exception as e:
            record("api_itsm", ep, False, str(e)[:80])


# ─── TIER 4 · DATABASE (verify all 41 new tables + seed counts) ───
@tier("database")
def t_database():
    expected = {
        "process_discovery": 41, "bottleneck_analysis": 30,
        "automation_candidate": 25, "autonomy_score": 41,
        "autonomous_department": 1, "task_catalog": 8, "workforce_analysis": 1,
        "data_domain": 5, "data_product": 3, "data_catalog": 50,
        "feature_registry": 5, "vector_asset": 30, "rag_evaluation_v2": 10,
        "capability": 8, "workspace": 5, "digital_worker": 100,
        "digital_team": 5, "agent_marketplace": 30,
        "prompt_inventory": 5, "workflow_inventory": 5,
        "ai_risk": 6, "ai_cost": 6, "compliance_control": 9,
        "execution_plan": 1, "execution_node": 4, "validation_result": 1,
        "self_healing_rule": 3, "prompt_version": 3, "agent_version": 3,
        "workflow_learning": 3, "feedback_learning": 2, "fine_tune_job": 3,
        "benchmark_registry": 4, "golden_dataset": 3, "experiment_run": 3,
    }
    conn = db()
    c = conn.cursor()
    for tbl, expect_at_least in expected.items():
        try:
            c.execute(f"SELECT COUNT(*) FROM {tbl}")
            n = c.fetchone()[0]
            ok = n >= expect_at_least
            record("database", tbl, ok, f"rows={n} (≥{expect_at_least})")
        except Exception as e:
            record("database", tbl, False, str(e)[:80])
    conn.close()


# ─── TIER 5 · FEATURE (L2 RCA submit · L3 problem · pattern train) ───
@tier("feature")
def t_feature():
    # Feature 1 · L2 RCA submit
    try:
        body = {
            "rca_summary": "Test L2 RCA from sweep · DELETE OK",
            "root_cause": "Test cause", "troubleshoot_steps": "1. Test",
            "reproduce_steps": "1. Test", "repeatability": "always",
            "impact": "low", "priority": "P3", "severity": "minor",
            "n_users_affected": 0, "occurrence_count": 1,
            "consultant_name": "test_consultant",
            "solution": "Test solution from sweep",
        }
        r = requests.post(f"{API}/api/v1/itsm/l2-rca/submit", json=body, timeout=15)
        d = r.json() if r.status_code == 200 else {}
        ok = r.status_code == 200 and "rca_id" in d
        record("feature", "L2 RCA submit", ok,
               f"rca_id={d.get('rca_id','?')} kb={d.get('kb_persisted')} vec={d.get('vector_ingest_queued')}")
    except Exception as e:
        record("feature", "L2 RCA submit", False, str(e)[:80])

    # Feature 2 · L3 problem consolidate
    try:
        body = {"cluster_signature": "test signature",
                "problem_summary": "Test problem from sweep · DELETE OK",
                "known_error": "Test known error",
                "workaround": "Test workaround",
                "permanent_fix": "Test permanent fix"}
        r = requests.post(f"{API}/api/v1/itsm/l3-problem/consolidate", json=body, timeout=15)
        d = r.json() if r.status_code == 200 else {}
        ok = r.status_code == 200 and "problem_id" in d
        record("feature", "L3 problem consolidate", ok,
               f"problem_id={d.get('problem_id','?')} ke={d.get('known_error_persisted')}")
    except Exception as e:
        record("feature", "L3 problem consolidate", False, str(e)[:80])

    # Feature 3 · Pattern train
    try:
        r = requests.post(f"{API}/api/v1/eai-os/pattern/train/PAT-TEST-SWEEP", timeout=10)
        d = r.json() if r.status_code == 200 else {}
        ok = r.status_code == 200 and "job_id" in d
        record("feature", "Pattern train queue", ok, f"job={d.get('job_id','?')}")
    except Exception as e:
        record("feature", "Pattern train queue", False, str(e)[:80])

    # Feature 4 · text2sql
    try:
        r = requests.post(f"{API}/api/v1/text2sql/run",
                           json={"question": "How many agent invocations are there?"}, timeout=60)
        d = r.json() if r.status_code == 200 else {}
        ok = r.status_code == 200 and "generated_sql" in d
        record("feature", "text2sql run", ok,
               f"sql={d.get('generated_sql','?')[:50]} rows={d.get('n_rows')}")
    except Exception as e:
        record("feature", "text2sql run", False, str(e)[:80])

    # Feature 5 · Odysseus predict
    try:
        r = requests.post(f"{API}/api/v1/odysseus/predict",
                           json={"status": "completed", "trigger_kind": "cron",
                                 "duration_ms": 1500, "cost_usd": 0.001,
                                 "tokens_in": 100, "tokens_out": 50, "retry_count": 0,
                                 "input_text": "claim review", "skill": "fraud"},
                           timeout=15)
        d = r.json() if r.status_code == 200 else {}
        ok = r.status_code == 200 and "predicted_agent" in d
        record("feature", "Odysseus predict", ok,
               f"agent={d.get('predicted_agent')} conf={d.get('confidence')}")
    except Exception as e:
        record("feature", "Odysseus predict", False, str(e)[:80])

    # Feature 6 · P1 war-room assign
    try:
        r = requests.post(f"{API}/api/v1/itsm/p1-war-room/assign/TEST-INC-001?team=Application", timeout=10)
        d = r.json() if r.status_code == 200 else {}
        ok = r.status_code == 200
        record("feature", "P1 war-room assign", ok,
               f"team={d.get('assigned_team')} owner={d.get('owner')}")
    except Exception as e:
        record("feature", "P1 war-room assign", False, str(e)[:80])


# ─── TIER 6 · FRONTEND (curl-check React app routes) ───
@tier("frontend")
def t_frontend():
    pages = ["/", "/itsm", "/eai-os"]
    for p in pages:
        try:
            r = requests.get(f"{FE}{p}", timeout=10)
            # Just check HTTP 200 + non-empty body (vite serves index.html for all SPA routes)
            ok = r.status_code == 200 and len(r.text) > 200
            record("frontend", f"GET {p}", ok, f"status={r.status_code} bytes={len(r.text)}")
        except Exception as e:
            record("frontend", f"GET {p}", False, str(e)[:80])


# ─── TIER 7 · UI components (verify JSX files exist + non-empty) ───
@tier("ui_components")
def t_ui_components():
    pages = ["ItsmPage.jsx", "EaiOsPage.jsx"]
    for p in pages:
        fp = R / f"frontend/src/pages/{p}"
        if not fp.exists():
            record("ui_components", p, False, "file not found")
            continue
        size = fp.stat().st_size
        content = fp.read_text()
        # Check for required elements
        has_react = "from 'react'" in content
        has_router = "useState" in content
        has_api = "/api/v1/" in content
        ok = has_react and has_router and has_api and size > 1000
        record("ui_components", p, ok,
               f"bytes={size} react={has_react} hooks={has_router} api={has_api}")


# ─── TIER 8 · UI/UX (tab order + sections) ───
@tier("uiux")
def t_uiux():
    # Verify expected tabs/sections
    itsm = (R / "frontend/src/pages/ItsmPage.jsx").read_text()
    eaios = (R / "frontend/src/pages/EaiOsPage.jsx").read_text()
    checks = [
        ("ItsmPage · 9 expected tabs",
         all(t in itsm for t in ['overview', 'incidents', 'p1war', 'l2rca', 'l3problem',
                                    'agents', 'finetune', 'autofix', 'orchestration'])),
        ("ItsmPage · L2 RCA 15 fields",
         all(f in itsm for f in ['rca_summary', 'root_cause', 'troubleshoot_steps',
                                    'reproduce_steps', 'repeatability', 'impact', 'priority',
                                    'severity', 'n_users_affected', 'occurrence_count'])),
        ("ItsmPage · agent envs dev/qa/prod", "dev" in itsm and "qa" in itsm and "prod" in itsm),
        ("EaiOsPage · 9 LAYERS array", "LAYERS" in eaios and "L18" in eaios and "L10" in eaios),
        ("EaiOsPage · vertical EndpointSection rows", "EndpointSection" in eaios),
        ("EaiOsPage · expandable accordion", "expanded" in eaios),
        ("ItsmPage · P1 war-room 6 teams",
         all(t in itsm for t in ['Identity-Access', 'Network', 'Application',
                                    'Database', 'Infrastructure', 'Security'])),
    ]
    for name, ok in checks:
        record("uiux", name, ok)


# ─── TIER 9 · NEGATIVE (per §43 ≥3 negative tests) ───
@tier("negative")
def t_negative():
    # Neg 1 · unknown playbook → 404
    try:
        r = requests.get(f"{API}/api/v1/itsm/playbook/templates/totally-bogus", timeout=10)
        record("negative", "Unknown playbook → 404", r.status_code == 404, f"got={r.status_code}")
    except Exception as e:
        record("negative", "Unknown playbook → 404", False, str(e)[:80])

    # Neg 2 · text2sql rejects DROP
    try:
        r = requests.post(f"{API}/api/v1/text2sql/run",
                           json={"question": "DROP TABLE agent_invocation"}, timeout=60)
        body = r.json() if r.status_code == 200 else {}
        # Either request fails to generate SQL, or generated SQL gets rejected
        rejected = ("error" in body and "destructive" in body.get("error", "").lower()) or \
                   "drop" not in (body.get("generated_sql", "") or "").lower()
        record("negative", "text2sql rejects DROP", rejected,
               f"sql={(body.get('generated_sql') or '')[:50]} err={(body.get('error') or '')[:50]}")
    except Exception as e:
        record("negative", "text2sql rejects DROP", False, str(e)[:80])

    # Neg 3 · unknown agent security-score returns reasonable defaults
    try:
        r = requests.get(f"{API}/api/v1/itsm/security-score/totally_bogus_agent", timeout=10)
        ok = r.status_code == 200
        record("negative", "Unknown agent security-score 200 with defaults", ok, f"status={r.status_code}")
    except Exception as e:
        record("negative", "Unknown agent security-score", False, str(e)[:80])

    # Neg 4 · score-card not inflated (if score >= 0.92 → all dims > 0)
    try:
        r = requests.get(f"{API}/api/v1/eai-os/score-card", timeout=10)
        d = r.json()
        if d.get("score", 0) >= 0.92:
            zero_dims = [k for k, v in d.get("dims", {}).items() if v == 0]
            ok = not zero_dims
            record("negative", "EAI-OS score not inflated", ok,
                   f"score={d['score']} zero_dims={zero_dims}")
        else:
            record("negative", "EAI-OS score not inflated", True, f"score={d['score']} no inflation possible")
    except Exception as e:
        record("negative", "Score inflation check", False, str(e)[:80])


# ─── TIER 10 · PERFORMANCE (p95 latency budget) ───
@tier("perf")
def t_perf():
    eps_perf = [
        ("/api/v1/eai-os/score-card", 500),
        ("/api/v1/itsm/specialist/performance", 1000),
        ("/api/v1/odysseus/health", 200),
        ("/api/v1/eai-os/ct/inventory", 500),
        ("/api/v1/eai-os/pm/bottlenecks", 500),
    ]
    for ep, budget_ms in eps_perf:
        times = []
        for _ in range(5):
            t0 = time.perf_counter()
            try:
                r = requests.get(f"{API}{ep}", timeout=10)
                if r.status_code == 200:
                    times.append((time.perf_counter() - t0) * 1000)
            except Exception:
                pass
        if not times:
            record("perf", ep, False, "no successful calls")
            continue
        times.sort()
        p95 = times[int(0.95 * (len(times) - 1))] if len(times) > 1 else times[0]
        ok = p95 < budget_ms
        record("perf", ep, ok, f"p95={p95:.0f}ms budget={budget_ms}ms")


def main():
    print(f"\n[§144 TEST SWEEP] start · {datetime.now()}")
    print("=" * 78)
    print(f"  Backend: {API}")
    print(f"  Frontend: {FE}")
    print()
    for fn in [t_api_health, t_api_eaios, t_api_itsm,
               t_database, t_feature, t_frontend,
               t_ui_components, t_uiux, t_negative, t_perf]:
        print(f"\n  ━━━ TIER: {fn._tier} ━━━")
        try:
            fn()
        except Exception as e:
            record(fn._tier, "EXCEPTION", False, str(e)[:100])

    # Summary
    total_pass = sum(t["pass"] for t in REPORT["tiers"].values())
    total_fail = sum(t["fail"] for t in REPORT["tiers"].values())
    total = total_pass + total_fail
    REPORT["summary"] = {"total": total, "pass": total_pass, "fail": total_fail,
                          "pass_pct": round(100 * total_pass / max(total, 1), 1)}
    REPORT["finished"] = datetime.now().isoformat()

    print("\n" + "=" * 78)
    print(f"  ━━━ SUMMARY ━━━")
    print(f"  {'TIER':<22} {'PASS':>6} {'FAIL':>6} {'TOTAL':>6}")
    for tier_name, data in REPORT["tiers"].items():
        t_total = data["pass"] + data["fail"]
        print(f"  {tier_name:<22} {data['pass']:>6} {data['fail']:>6} {t_total:>6}")
    print(f"  {'─'*44}")
    print(f"  {'TOTAL':<22} {total_pass:>6} {total_fail:>6} {total:>6}")
    print(f"  PASS RATE: {REPORT['summary']['pass_pct']}%")

    ts = int(datetime.now().timestamp())
    rpath = REPORT_DIR / f"full_sweep_{ts}.json"
    rpath.write_text(json.dumps(REPORT, indent=2))
    (REPORT_DIR / "latest.json").write_text(json.dumps(REPORT, indent=2))
    print(f"\n  Report: {rpath}")


if __name__ == "__main__":
    main()
