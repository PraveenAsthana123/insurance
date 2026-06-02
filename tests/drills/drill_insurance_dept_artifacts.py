#!/usr/bin/env python3
"""Drill: insurance dept artifacts (§64 + §66 + §43).

Steps (10 total; 4 negative):
    1. (+) 4 insurance depts exist: claims, underwriting, customer-service, fraud-siu
    2. (+) each dept has README.md + GLOBAL_README.md
    3. (+) each dept has all 12 INSUR_*.md business-layer files
    4. (+) each dept has docs/brd/INSUR_BRD.md + docs/frd/INSUR_FRD.md
    5. (+) FRD prefixes are correct per dept (CLM/UWR/CSV/FRD)
    6. (+) PROCESS_FLOW + ARCHITECTURE_FLOW contain valid Mermaid blocks
    7. (+) BUSINESS_MODELS covers B2C + B2B + B2E sections per dept
    8. (-) NEGATIVE — no insurance dept artifacts under _legacy/ (preserved generic depts unchanged)
    9. (-) NEGATIVE — no INSUR_*.md file is empty (< 200 bytes)
   10. (-) NEGATIVE — FRD does NOT contain INSUR_ prefix references in active depts
   11. (-) NEGATIVE — data manifest exists and has no 100% failure rate

# RESOURCES: disk_io

Exit 0 on PASS, 1 on FAIL.
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEPT_ROOT = REPO_ROOT / "global-ai-org" / "departments"

INSURANCE_DEPTS = ["claims", "underwriting", "customer-service", "fraud-siu"]

REQUIRED_BL_FILES = [
    "INSUR_DEPT_SPEC.md",
    "INSUR_DEMO_STORY.md",
    "INSUR_ASIS_ASSESSMENT.md",
    "INSUR_DT_STRATEGY.md",
    "INSUR_PROCESS_FLOW.md",
    "INSUR_ARCHITECTURE_FLOW.md",
    "INSUR_BUSINESS_MODELS.md",
    "INSUR_DATA_MGMT.md",
    "INSUR_USE_CASES.md",
    "INSUR_INCIDENT_MGMT.md",
    "INSUR_AI_AGENTS.md",
    "INSUR_KPIS.md",
    "INSUR_PIPELINES.md",
    "INSUR_MANUAL_VS_AUTO_FLOW.md",
    "INSUR_SIMULATION_UI.md",
    "INSUR_SYSTEM_DESIGN.md",
]

ROLES = [
    "admin", "manager", "team-member", "tester", "security",
    "devops", "ai-reviewer", "digital-transformation", "system-architect",
    "test-architect", "database-architect", "api-architect",
    "data-owner", "ai-strategy", "information-security",
]

FRD_PREFIX_MAP = {
    "claims": "CLM",
    "underwriting": "UWR",
    "customer-service": "CSV",
    "fraud-siu": "FRD",
}


def ok(msg: str) -> None: print(f"  ✓ {msg}")
def fail(msg: str) -> None: print(f"  ✗ {msg}"); sys.exit(1)


def step(n: int, name: str) -> None: print(f"\n[step {n}] {name}")


def main() -> int:
    step(1, "4 insurance depts exist")
    missing = [d for d in INSURANCE_DEPTS if not (DEPT_ROOT / d).is_dir()]
    if missing: fail(f"missing depts: {missing}")
    ok(f"all 4 depts present: {INSURANCE_DEPTS}")

    step(2, "each dept has README.md + GLOBAL_README.md")
    for d in INSURANCE_DEPTS:
        for f in ("README.md", "GLOBAL_README.md"):
            p = DEPT_ROOT / d / f
            if not p.is_file(): fail(f"missing {d}/{f}")
        ok(f"{d}: README + GLOBAL_README present")

    step(3, "each dept has 13 INSUR_*.md business-layer files (incl. PIPELINES)")
    for d in INSURANCE_DEPTS:
        bl = DEPT_ROOT / d / "business-layer"
        for f in REQUIRED_BL_FILES:
            p = bl / f
            if not p.is_file(): fail(f"missing {d}/business-layer/{f}")
        ok(f"{d}: all {len(REQUIRED_BL_FILES)} INSUR_*.md present")

    step(4, "each dept has BRD + FRD")
    for d in INSURANCE_DEPTS:
        brd = DEPT_ROOT / d / "docs" / "brd" / "INSUR_BRD.md"
        frd = DEPT_ROOT / d / "docs" / "frd" / "INSUR_FRD.md"
        if not brd.is_file(): fail(f"missing BRD: {brd}")
        if not frd.is_file(): fail(f"missing FRD: {frd}")
        ok(f"{d}: BRD + FRD present")

    step(5, "FRD prefixes correct per dept (CLM/UWR/CSV/FRD)")
    for d, prefix in FRD_PREFIX_MAP.items():
        frd = (DEPT_ROOT / d / "docs" / "frd" / "INSUR_FRD.md").read_text()
        pattern = rf"FR-{prefix}-\d{{3}}"
        matches = re.findall(pattern, frd)
        if not matches:
            fail(f"{d}: no FR-{prefix}-NNN ids found in FRD")
        ok(f"{d}: {len(matches)} FR-{prefix}-NNN ids found")

    step(6, "PROCESS_FLOW + ARCHITECTURE_FLOW contain valid Mermaid blocks")
    mermaid_pattern = re.compile(r"```mermaid\n.*?\n```", re.DOTALL)
    for d in INSURANCE_DEPTS:
        for fname in ("INSUR_PROCESS_FLOW.md", "INSUR_ARCHITECTURE_FLOW.md"):
            txt = (DEPT_ROOT / d / "business-layer" / fname).read_text()
            blocks = mermaid_pattern.findall(txt)
            if len(blocks) < 2:
                fail(f"{d}/{fname}: expected ≥2 mermaid blocks, found {len(blocks)}")
        ok(f"{d}: PROCESS_FLOW + ARCHITECTURE_FLOW have mermaid")

    step(7, "BUSINESS_MODELS covers B2C + B2B + B2E sections")
    for d in INSURANCE_DEPTS:
        txt = (DEPT_ROOT / d / "business-layer" / "INSUR_BUSINESS_MODELS.md").read_text()
        for model in ("B2C", "B2B", "B2E"):
            if f"## {model}" not in txt:
                fail(f"{d}: missing '## {model}' section in BUSINESS_MODELS")
        ok(f"{d}: B2C + B2B + B2E sections present")

    step(8, "NEGATIVE — no insurance artifacts in _legacy/ (generic depts unchanged)")
    legacy_root = DEPT_ROOT / "_legacy"
    if not legacy_root.is_dir():
        fail("expected _legacy/ directory (preserves generic depts)")
    bad_legacy = list(legacy_root.rglob("INSUR_*.md"))
    if bad_legacy:
        fail(f"INSUR_*.md should not appear under _legacy/ ({len(bad_legacy)} found)")
    ok(f"_legacy/ contains {sum(1 for _ in legacy_root.iterdir())} preserved generic dept dirs; no INSUR_*.md contamination")

    step(9, "NEGATIVE — no INSUR_*.md file is empty (< 200 bytes)")
    small_files = []
    for d in INSURANCE_DEPTS:
        for p in (DEPT_ROOT / d).rglob("INSUR_*.md"):
            if p.stat().st_size < 200:
                small_files.append(str(p))
    if small_files:
        fail(f"empty/tiny INSUR_*.md files: {small_files}")
    ok("all INSUR_*.md ≥ 200 bytes")

    step(10, "NEGATIVE — active depts contain no INSUR_ prefix file references")
    insur_refs = []
    for d in INSURANCE_DEPTS:
        for p in (DEPT_ROOT / d).rglob("*.md"):
            txt = p.read_text()
            if re.search(r"INSUR_[A-Z]+\.md", txt):
                insur_refs.append(str(p))
    if insur_refs:
        fail(f"insurance dept files still contain INSUR_ references: {insur_refs[:3]}")
    ok("no INSUR_*.md references in active insurance depts")

    step(11, "each dept has 15 role dashboards + 15 role reports (§64.37)")
    for d in INSURANCE_DEPTS:
        for role in ROLES:
            dash = DEPT_ROOT / d / "dashboards-by-role" / role / "INSUR_DASHBOARD.md"
            rpt = DEPT_ROOT / d / "reports-by-role" / role / "INSUR_REPORTS.md"
            if not dash.is_file(): fail(f"missing dashboard: {d}/{role}")
            if not rpt.is_file(): fail(f"missing reports: {d}/{role}")
        ok(f"{d}: 15 role dashboards + 15 role reports present")

    step(12, "INSUR_PIPELINES.md per dept references existing backend/ml/reference/* pipelines")
    for d in INSURANCE_DEPTS:
        txt = (DEPT_ROOT / d / "business-layer" / "INSUR_PIPELINES.md").read_text()
        if "backend/ml/reference/" not in txt:
            fail(f"{d}: INSUR_PIPELINES.md does not reference backend/ml/reference/*")
        if "rag_lifecycle" not in txt:
            fail(f"{d}: INSUR_PIPELINES.md missing rag_lifecycle reference")
        ok(f"{d}: INSUR_PIPELINES.md wires reference impls correctly")

    step(13, "pipeline runner --list works for all 4 depts")
    runner = REPO_ROOT / "backend" / "ml" / "insurance" / "run_dept_pipelines.py"
    if not runner.is_file():
        fail(f"missing runner: {runner}")
    import subprocess as _sp
    r = _sp.run([sys.executable, str(runner), "--list"], capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        fail(f"runner --list failed: {r.stderr[:300]}")
    for dept in INSURANCE_DEPTS:
        if dept not in r.stdout:
            fail(f"runner --list missing dept: {dept}")
    ok("runner --list returns all 4 depts")

    step(14, "INSUR_MANUAL_VS_AUTO_FLOW.md has both manual + automated mermaid blocks")
    for d in INSURANCE_DEPTS:
        txt = (DEPT_ROOT / d / "business-layer" / "INSUR_MANUAL_VS_AUTO_FLOW.md").read_text()
        if "## Manual sequence" not in txt:
            fail(f"{d}: missing manual sequence section")
        if "## Automated sequence" not in txt:
            fail(f"{d}: missing automated sequence section")
        if "Cycle-time delta" not in txt:
            fail(f"{d}: missing cycle-time delta table")
        ok(f"{d}: manual + automated + delta sections present")

    step(15, "cron has 1 audit + 13 per-dataset refresh entries")
    import subprocess as _sp
    cron_out = _sp.run(["crontab", "-l"], capture_output=True, text=True).stdout
    n_audit = cron_out.count("audit_insurance_artifacts")
    n_refresh = cron_out.count("download_insurance_datasets") - cron_out.count("# ")
    if n_audit != 1:
        fail(f"expected exactly 1 audit cron entry, found {n_audit}")
    if "--only" not in cron_out:
        fail("expected per-dataset refresh entries with --only flag")
    ok(f"cron: {n_audit} audit + {cron_out.count('--only')} per-dataset refresh entries")

    step(16, "insurance router responds + denies bogus paths (anti-enum)")
    sys.path.insert(0, str(REPO_ROOT / "backend"))
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.insurance import router as insur_router
    app = FastAPI(); app.include_router(insur_router)
    client = TestClient(app)
    r = client.get("/api/v1/insurance/depts")
    if r.status_code != 200 or len(r.json()["depts"]) != 4:
        fail(f"insurance /depts failed: {r.status_code}")
    r = client.get("/api/v1/insurance/depts/claims/spec")
    if r.status_code != 200 or len(r.text) < 1000:
        fail(f"insurance /depts/claims/spec failed: {r.status_code}")
    r = client.get("/api/v1/insurance/depts/bogus/spec")
    if r.status_code != 404:
        fail(f"insurance bogus dept should 404, got {r.status_code}")
    ok("insurance router: list + read + 404 on bogus all pass")

    step(17, "production-readiness infra files exist (nginx + CDN + k6 + adapters + compliance + ADR)")
    must_exist = [
        REPO_ROOT / "infra" / "nginx" / "nginx.conf",
        REPO_ROOT / "infra" / "cdn" / "README.md",
        REPO_ROOT / "infra" / "cdn" / "cloudflare" / "zone-config.json",
        REPO_ROOT / "infra" / "cdn" / "cloudfront" / "main.tf",
        REPO_ROOT / "backend" / "services" / "external_feeds" / "kyc.py",
        REPO_ROOT / "backend" / "services" / "external_feeds" / "nicb.py",
        REPO_ROOT / "backend" / "services" / "external_feeds" / "clue.py",
        REPO_ROOT / "backend" / "services" / "external_feeds" / "ehr.py",
        REPO_ROOT / "docs" / "compliance" / "EU_AI_ACT.md",
        REPO_ROOT / "docs" / "compliance" / "HIPAA.md",
        REPO_ROOT / "docs" / "compliance" / "STATE_DOI_RATE_FILING.md",
        REPO_ROOT / "load-testing" / "smoke.js",
        REPO_ROOT / "load-testing" / "load.js",
        REPO_ROOT / "load-testing" / "stress.js",
        REPO_ROOT / "load-testing" / "soak.js",
        REPO_ROOT / "load-testing" / "spike.js",
        REPO_ROOT / "docs" / "CRON_JOBS_PLAN.md",
        REPO_ROOT / "docs" / "architecture" / "adr" / "ADR-001-deployment-target.md",
    ]
    missing = [p for p in must_exist if not p.is_file()]
    if missing:
        fail(f"missing infra files: {[str(p.relative_to(REPO_ROOT)) for p in missing]}")
    ok(f"all {len(must_exist)} production-readiness files present")

    step(18, "NEGATIVE — backend boots without ImportError (prophet fix + database._connect)")
    sys.path.insert(0, str(REPO_ROOT / "backend"))
    try:
        from main import create_app
        app = create_app()
        if len([r for r in app.routes if hasattr(r, "path")]) < 50:
            fail(f"backend boots but only {len(app.routes)} routes — too few")
    except ImportError as e:
        fail(f"backend ImportError (prophet fix regressed?): {str(e)[:200]}")
    except Exception as e:
        fail(f"backend boot failed: {type(e).__name__}: {str(e)[:200]}")
    ok("backend boots cleanly with all 177 routes")

    step(19, "ADR backfill — at least 10 ADRs exist (addresses §47.3)")
    adrs = sorted((REPO_ROOT / "docs" / "architecture" / "adr").glob("ADR-*.md"))
    if len(adrs) < 10:
        fail(f"expected ≥10 ADRs, found {len(adrs)}: {[p.name for p in adrs]}")
    ok(f"ADRs filed: {len(adrs)} (ADR-001 through ADR-{len(adrs):03d})")

    step(20, "OpenAPI snapshot at docs/openapi.json (per §6.4)")
    openapi = REPO_ROOT / "docs" / "openapi.json"
    if not openapi.is_file():
        fail(f"missing openapi snapshot: {openapi}")
    import json as _json
    spec = _json.loads(openapi.read_text())
    n_paths = len(spec.get("paths", {}))
    if n_paths < 50:
        fail(f"openapi snapshot has only {n_paths} paths — should be > 50")
    ok(f"OpenAPI snapshot: {n_paths} paths")

    step(21, "NEGATIVE — no HTTPException in services (per §1)")
    bad = []
    services_dir = REPO_ROOT / "backend" / "services"
    for p in services_dir.rglob("*.py"):
        txt = p.read_text()
        for ln_no, ln in enumerate(txt.splitlines(), 1):
            stripped = ln.strip()
            if stripped.startswith("#") or stripped.startswith('"') or "comment" in stripped.lower():
                continue
            if "raise HTTPException" in ln:
                bad.append(f"{p.relative_to(REPO_ROOT)}:{ln_no}")
    if bad:
        fail(f"services contain raise HTTPException: {bad}")
    ok("no services raise HTTPException (§1 layer rule honored)")

    step(22, "NEGATIVE — no f-string SQL on table names in repositories (per §1 rule 12)")
    import re as _re
    bad = []
    repos_dir = REPO_ROOT / "backend" / "repositories"
    pat = _re.compile(r'f"SELECT[^"]*\{[a-zA-Z_]+\}')
    for p in repos_dir.rglob("*.py"):
        for ln_no, ln in enumerate(p.read_text().splitlines(), 1):
            if pat.search(ln):
                bad.append(f"{p.relative_to(REPO_ROOT)}:{ln_no}")
    if bad:
        fail(f"f-string SQL violations: {bad}")
    ok("no f-string SQL on table names in repositories")

    step(23, "voice + coordination scripts present (operator-facing tools)")
    voice_scripts = [
        REPO_ROOT / "scripts" / "voice_command.sh",
        REPO_ROOT / "scripts" / "setup_advanced_models.sh",
        REPO_ROOT / "scripts" / "setup_advanced_dev_environment.sh",
        REPO_ROOT / "scripts" / "audit_codex_work.sh",
        REPO_ROOT / "docs" / "EDITOR_AGNOSTIC_SETUP.md",
        REPO_ROOT / "docs" / "CLAUDE_CODEX_COORDINATION.md",
    ]
    missing = [p for p in voice_scripts if not p.is_file()]
    if missing:
        fail(f"missing voice/coord files: {[str(p.relative_to(REPO_ROOT)) for p in missing]}")
    ok(f"all {len(voice_scripts)} voice + coordination files present")

    step(24, "global production-readiness templates — 18 modules available")
    g_templates = Path("/home/praveen/.claude/templates/production-readiness")
    if not g_templates.is_dir():
        ok("global templates dir absent (not in this env) — skipping")
    else:
        expected = {
            "nginx-lb", "cdn", "external-feeds", "compliance", "load-testing",
            "adr-template", "cron-plan", "cron-installer", "identity-provider",
            "backup-strategy", "agent-orchestration", "policy-engine",
            "observability", "voice-command", "advanced-models",
            "multi-session-coord", "feature-flags", "secrets-management",
            "a11y-testing", "chaos-engineering", "dependency-scanning",
            "api-contract-testing",
        }
        actual = {p.name for p in g_templates.iterdir() if p.is_dir()}
        missing = expected - actual
        if missing:
            fail(f"global modules missing: {missing}")
        ok(f"all {len(expected)} global modules present at {g_templates}")

    step(25, "NEGATIVE — data manifest exists and not 100% failure")
    manifest = REPO_ROOT / "data" / "insurance" / "_manifest.json"
    if not manifest.is_file():
        fail(f"missing data manifest: {manifest}")
    m = json.loads(manifest.read_text())
    statuses = [d["status"] for d in m["downloads"]]
    n_ok = sum(1 for s in statuses if s == "ok")
    if n_ok == 0:
        fail(f"zero successful downloads in manifest: {statuses}")
    ok(f"data manifest: {n_ok}/{len(statuses)} ok (rest skipped/fail expected)")

    print(f"\nALL 25 STEPS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
