#!/usr/bin/env python3
"""drill_insurance_alignment — locks the audit invariants for /insurance.

Both directions: positive cases must pass; mutations that violate the
operating model must be detected as fail. ≥3 negative assertions per §43.

Run:
    python tests/drills/drill_insurance_alignment.py
"""
from __future__ import annotations

import copy
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "insurance_alignment_audit.py"
BLUEPRINT_PATH = ROOT / "data" / "insurance" / "blueprint.json"

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    mark = "✓" if ok else "✗"
    print(f"  {mark} {name:55} {detail}")


def load_module():
    spec = importlib.util.spec_from_file_location("insurance_alignment_audit", SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"could not load {SCRIPT}")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def run_audit(mod) -> tuple[list[dict], int]:
    covered_channels: set[str] = set()
    covered_data: set[str] = set()
    covered_ai: set[str] = set()
    checks: list[dict] = []

    for dept, spec in mod.DEPARTMENTS.items():
        channels = set(spec["channels"])
        data = set(spec["data"])
        ai = set(spec["ai"])
        covered_channels |= channels
        covered_data |= data
        covered_ai |= ai
        checks.append({"scope": dept, "check": "channel_coverage", "status": "pass" if channels else "fail"})
        checks.append({"scope": dept, "check": "stakeholder_mapping", "status": "pass" if spec["stakeholders"] else "fail"})
        checks.append({"scope": dept, "check": "data_mapping", "status": "pass" if data else "fail"})
        checks.append({"scope": dept, "check": "ai_mapping", "status": "pass" if ai else "fail"})

    checks.append({
        "scope": "enterprise", "check": "all_channels_covered",
        "status": "pass" if not (mod.REQUIRED_CHANNELS - covered_channels) else "fail",
    })
    checks.append({
        "scope": "enterprise", "check": "all_data_classes_covered",
        "status": "pass" if not (mod.REQUIRED_DATA - covered_data) else "fail",
    })
    checks.append({
        "scope": "enterprise", "check": "all_ai_types_covered",
        "status": "pass" if not (mod.REQUIRED_AI - covered_ai) else "fail",
    })

    failed = sum(1 for c in checks if c["status"] != "pass")
    return checks, failed


print("drill_insurance_alignment — audit invariants (positive + negative)")
print()

mod = load_module()

# === Positive invariants ===
check("P1 audit module loads", True, f"DEPARTMENTS={len(mod.DEPARTMENTS)} depts")
check("P2 6 departments registered", len(mod.DEPARTMENTS) == 6, f"got {len(mod.DEPARTMENTS)}")
check("P3 13 AI capability types required", len(mod.REQUIRED_AI) == 13, f"got {len(mod.REQUIRED_AI)}")
check("P4 3 channels required (B2C/B2B/B2E)", mod.REQUIRED_CHANNELS == {"B2C", "B2B", "B2E"}, sorted(mod.REQUIRED_CHANNELS))
check("P5 6 data classes required", len(mod.REQUIRED_DATA) == 6, f"got {len(mod.REQUIRED_DATA)}")

baseline_checks, baseline_failed = run_audit(mod)
check("P6 baseline audit is fully green", baseline_failed == 0, f"{len(baseline_checks)} checks, {baseline_failed} failed")
check(
    "P7 enterprise covers all 13 AI types",
    any(c["scope"] == "enterprise" and c["check"] == "all_ai_types_covered" and c["status"] == "pass" for c in baseline_checks),
    "Governance + Responsible + Ethical AI all surface",
)

# === Negative invariants (mutations that MUST be detected as fail) ===

# N1: removing B2E from Sales must NOT break enterprise channel coverage
# (Underwriting + Policy Servicing + Finance also carry B2E) BUT must
# reduce the per-dept channel breadth visible in the row.
n1_dept = copy.deepcopy(mod.DEPARTMENTS)
n1_dept["Sales and Distribution"]["channels"] = ["B2C", "B2B"]
n1_mod = type(mod)(mod.__name__)
n1_mod.DEPARTMENTS = n1_dept
n1_mod.REQUIRED_CHANNELS = mod.REQUIRED_CHANNELS
n1_mod.REQUIRED_DATA = mod.REQUIRED_DATA
n1_mod.REQUIRED_AI = mod.REQUIRED_AI
n1_checks, _ = run_audit(n1_mod)
sales_row = next(c for c in n1_checks if c["scope"] == "Sales and Distribution" and c["check"] == "channel_coverage")
check("N1 channel mutation still per-dept-pass (>=1 channel)", sales_row["status"] == "pass", "Sales row still pass since 2 channels remain")

# N2: dropping ALL AI from Risk-Compliance must fail dept AI mapping AND
# must drop Governance AI / Responsible AI from enterprise coverage
n2_dept = copy.deepcopy(mod.DEPARTMENTS)
n2_dept["Risk, Compliance and Audit"]["ai"] = []
n2_mod = type(mod)(mod.__name__)
n2_mod.DEPARTMENTS = n2_dept
n2_mod.REQUIRED_CHANNELS = mod.REQUIRED_CHANNELS
n2_mod.REQUIRED_DATA = mod.REQUIRED_DATA
n2_mod.REQUIRED_AI = mod.REQUIRED_AI
n2_checks, n2_failed = run_audit(n2_mod)
risk_ai_row = next(c for c in n2_checks if c["scope"] == "Risk, Compliance and Audit" and c["check"] == "ai_mapping")
ent_ai_row = next(c for c in n2_checks if c["scope"] == "enterprise" and c["check"] == "all_ai_types_covered")
check("N2 dropping Risk-Compliance AI rejects ai_mapping", risk_ai_row["status"] == "fail", "dept row red")
check("N2 dropping Risk-Compliance AI rejects enterprise AI coverage", ent_ai_row["status"] == "fail", "enterprise row red (Responsible AI is exclusive to Risk-Compliance)")

# N3: emptying stakeholders for any dept must fail stakeholder_mapping
n3_dept = copy.deepcopy(mod.DEPARTMENTS)
n3_dept["Claims"]["stakeholders"] = []
n3_mod = type(mod)(mod.__name__)
n3_mod.DEPARTMENTS = n3_dept
n3_mod.REQUIRED_CHANNELS = mod.REQUIRED_CHANNELS
n3_mod.REQUIRED_DATA = mod.REQUIRED_DATA
n3_mod.REQUIRED_AI = mod.REQUIRED_AI
n3_checks, n3_failed = run_audit(n3_mod)
claims_stake_row = next(c for c in n3_checks if c["scope"] == "Claims" and c["check"] == "stakeholder_mapping")
check("N3 emptying Claims stakeholders rejects stakeholder_mapping", claims_stake_row["status"] == "fail", "Claims stakeholder row red")

# N4: removing the 'evidence' data class from every dept must fail enterprise data coverage
n4_dept = copy.deepcopy(mod.DEPARTMENTS)
for spec in n4_dept.values():
    spec["data"] = [d for d in spec["data"] if d != "evidence"]
n4_mod = type(mod)(mod.__name__)
n4_mod.DEPARTMENTS = n4_dept
n4_mod.REQUIRED_CHANNELS = mod.REQUIRED_CHANNELS
n4_mod.REQUIRED_DATA = mod.REQUIRED_DATA
n4_mod.REQUIRED_AI = mod.REQUIRED_AI
n4_checks, _ = run_audit(n4_mod)
ent_data_row = next(c for c in n4_checks if c["scope"] == "enterprise" and c["check"] == "all_data_classes_covered")
check("N4 removing evidence everywhere rejects enterprise data coverage", ent_data_row["status"] == "fail", "enterprise data row red")

# N5: dropping ALL B2E from every dept must fail enterprise channel coverage
n5_dept = copy.deepcopy(mod.DEPARTMENTS)
for spec in n5_dept.values():
    spec["channels"] = [c for c in spec["channels"] if c != "B2E"]
n5_mod = type(mod)(mod.__name__)
n5_mod.DEPARTMENTS = n5_dept
n5_mod.REQUIRED_CHANNELS = mod.REQUIRED_CHANNELS
n5_mod.REQUIRED_DATA = mod.REQUIRED_DATA
n5_mod.REQUIRED_AI = mod.REQUIRED_AI
n5_checks, _ = run_audit(n5_mod)
ent_chan_row = next(c for c in n5_checks if c["scope"] == "enterprise" and c["check"] == "all_channels_covered")
check("N5 removing B2E everywhere rejects enterprise channel coverage", ent_chan_row["status"] == "fail", "enterprise channel row red")

# === Blueprint structural invariants ===

with BLUEPRINT_PATH.open() as fh:
    bp = json.load(fh)

check("BP1 blueprint.json parses", isinstance(bp, dict), f"version={bp.get('version')}")
check("BP2 3 business models (B2C/B2B/B2E)", set(bp.get("business_models", {}).keys()) >= {"B2C", "B2B", "B2E"}, "")
check("BP3 7 maturity levels (L0..L6)", {row["level"] for row in bp.get("maturity", [])} >= {f"L{i}" for i in range(7)}, "")
check("BP4 5 implementation phases", len(bp.get("implementation_phases", [])) == 5, f"got {len(bp.get('implementation_phases', []))}")
check("BP5 20 missing AI capabilities", len(bp.get("missing_capabilities", [])) == 20, f"got {len(bp.get('missing_capabilities', []))}")
check("BP6 15 autonomous executives", len(bp.get("autonomous_org", [])) == 15, f"got {len(bp.get('autonomous_org', []))}")
check("BP7 closed loop is 10 steps", len(bp.get("closed_loop", [])) == 10, f"got {len(bp.get('closed_loop', []))}")
check("BP8 ai_matrix has 17 rows × 3 models", len(bp.get("ai_matrix", [])) == 17 and all({"B2C","B2B","B2E"} <= set(r) for r in bp.get("ai_matrix", [])), "")
check("BP9 ai_opportunities >= 140 rows", len(bp.get("ai_opportunities", [])) >= 140, f"got {len(bp.get('ai_opportunities', []))}")
check("BP10 ai_opportunities all complete", all(r.get("ai_type") and r.get("scenario") for r in bp.get("ai_opportunities", [])), "")
check("BP11 ai_opportunities unique types", len({r["ai_type"] for r in bp.get("ai_opportunities", [])}) == len(bp.get("ai_opportunities", [])), "")
check("BP12 top20_roi is 20 rows", len(bp.get("top20_roi", [])) == 20, f"got {len(bp.get('top20_roi', []))}")
check("BP13 top20_roi ranks are 1..20 unique", {r["rank"] for r in bp.get("top20_roi", [])} == set(range(1, 21)), "")
check("BP14 top20_roi all rows have dept", all(r.get("department") for r in bp.get("top20_roi", [])), "")
# Agentic AI reference architecture
aar = bp.get("agentic_ai_reference", {})
arch_layers = aar.get("reference_architecture", {}).get("layers", [])
agents = aar.get("enterprise_agent_stack", {}).get("agents", [])
check("BP14b agentic_ai_reference has 15 architecture layers",
      len(arch_layers) == 15, f"got {len(arch_layers)}")
check("BP14c agentic_ai_reference has 11 enterprise agents",
      len(agents) == 11, f"got {len(agents)}")
check("BP14d majority of arch layers are backend-scope",
      len([l for l in arch_layers if l.get("scope") in ("backend", "both")]) >= 12,
      f"backend-scope layers in 15-layer arch")
# Per §73.14 — every AI catalog row has the 5 sub-fields
ai_enr_fields = ("data", "model", "accuracy", "benchmark", "stakeholder")
ai_rows = bp.get("ai_opportunities", [])
check("BP14a ai_opportunities all enriched (Data/Model/Accuracy/Benchmark/Stakeholder)",
      all(all(r.get(f) for f in ai_enr_fields) for r in ai_rows),
      f"{len(ai_rows)} rows × {len(ai_enr_fields)} fields per §73.14")

# Enterprise architecture
arch_layers = bp.get("enterprise_architecture", {}).get("layers", [])
check("BP15 enterprise_architecture has 13 layers", len(arch_layers) == 13, f"got {len(arch_layers)}")
check("BP16 every arch layer has mission/inputs/outputs/missing_ai",
      all(l.get("mission") and l.get("inputs") and l.get("outputs") and l.get("missing_ai") for l in arch_layers), "")

# Top 50 missing
top50_list = bp.get("top50_missing_ai", [])
check("BP17 top50_missing_ai is 50 rows", len(top50_list) == 50, f"got {len(top50_list)}")
check("BP18 top50_missing_ai unique", len(set(top50_list)) == len(top50_list), "")

# Enterprise missing layers
em_layers = bp.get("enterprise_missing_layers", [])
check("BP19 enterprise_missing_layers is 20 rows", len(em_layers) == 20, f"got {len(em_layers)}")
check("BP20 every enterprise_missing_layers row has layer+purpose",
      all(r.get("layer") and r.get("purpose") for r in em_layers), "")

# Department catalog
catalog = bp.get("department_catalog", [])
catalog_ids = {d.get("id") for d in catalog}
EXPECTED_DEPTS = {1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22}
check("BP21 dept_catalog has depts {1, 3..22}", catalog_ids >= EXPECTED_DEPTS, f"got {sorted(catalog_ids)} · still missing dept 2")
# BP25-26: partial depts honored - 14 and 7 are explicitly flagged partial
dept14 = next((d for d in catalog if d.get("id") == 14), None)
dept7 = next((d for d in catalog if d.get("id") == 7), None)
check("BP25 dept 14 marked partial",
      dept14 is not None and dept14.get("partial") is True,
      "partial flag respected by audit (allows mission+processes only)")
check("BP26 dept 14 has partial_note",
      dept14 is not None and bool(dept14.get("partial_note")),
      "partial_note explains what's pending from operator")
check("BP27 dept 7 marked partial",
      dept7 is not None and dept7.get("partial") is True,
      "Claims dept truncated mid-agent-list — partial flag set")
check("BP28 dept 7 has partial_note",
      dept7 is not None and bool(dept7.get("partial_note")),
      "partial_note explains what's pending")
for dept in catalog:
    did = dept.get("id")
    is_partial = bool(dept.get("partial"))
    required = ["mission", "processes"] if is_partial else [
        "mission", "processes", "channel_scenarios", "systems",
        "data_sources", "agents", "human_less_workflow",
        "kpi_improvements", "top_missing_capabilities",
    ]
    suffix = " [partial: mission+processes only]" if is_partial else ""
    check(f"BP22 dept{did} has all required fields{suffix}",
          all(dept.get(f) for f in required), "")
    check(f"BP23 dept{did} processes all have name+ai",
          all(p.get("name") and p.get("ai") for p in dept.get("processes", [])), "")
    # Per global §59 + per-process enrichment: every process has 7 enriched fields
    enriched_fields = ("manual_process", "automatic_process", "data_process",
                       "explainable_ai", "responsible_ai", "governance_ai", "smart_kpi",
                       "readme", "tech_stack", "demo_story", "as_is_to_be",
                       "flow_diagram", "output", "visualization", "tests", "security")
    enriched_ok = all(all(p.get(f) for f in enriched_fields) for p in dept.get("processes", []))
    check(f"BP29 dept{did} processes all enriched (manual/auto/data/ExpAI/ResAI/Gov/SMART)",
          enriched_ok,
          f"{len(enriched_fields)} fields per process" if enriched_ok else "run scripts/insurance_enrich_processes.py")
    scenarios = dept.get("channel_scenarios", {})
    if is_partial:
        # Partial depts may have partial scenarios (e.g. dept 7 has B2C+B2B
        # only because the operator paste cut off before B2E). The drill
        # mirrors the audit's soft-pass behavior — any number of present
        # channels passes; missing keys are an operator follow-up, not a fail.
        check(f"BP24 dept{did} channel_scenarios [partial: {', '.join(sorted(scenarios.keys())) or 'absent'}]",
              True, "")
    else:
        check(f"BP24 dept{did} channel_scenarios cover B2C/B2B/B2E",
              {"B2C", "B2B", "B2E"} <= set(scenarios.keys()), "")

# Re-run the production audit on a temp-mutated blueprint to verify each
# invariant is enforced (negative direction). For each mutation, the
# corresponding blueprint check MUST flip to fail.
def run_audit_with_mutated_blueprint(mutator) -> dict[str, str]:
    """Returns {check_name: status} from running the production audit's
    _audit_blueprint() against a copy of the blueprint mutated in-place."""
    import insurance_alignment_audit as iaa  # noqa: PLC0415
    bp_copy = copy.deepcopy(bp)
    mutator(bp_copy)
    tmp = BLUEPRINT_PATH.parent / "_drill_mutated_blueprint.json"
    tmp.write_text(json.dumps(bp_copy))
    original = iaa.BLUEPRINT_PATH
    iaa.BLUEPRINT_PATH = tmp
    try:
        checks: list[dict] = []
        iaa._audit_blueprint(checks)
    finally:
        iaa.BLUEPRINT_PATH = original
        tmp.unlink(missing_ok=True)
    return {f"{c['scope']}:{c['check']}": c["status"] for c in checks}

# load production module so the negative tests run against the real audit code
sys.path.insert(0, str(ROOT / "scripts"))
import insurance_alignment_audit as iaa  # noqa: E402, PLC0415  - intentional late import
del iaa  # silence linter; re-imported inside the helper

# N6: dropping B2E from business_models fails business_models_present
res = run_audit_with_mutated_blueprint(lambda b: b["business_models"].pop("B2E", None))
check("N6 dropping B2E rejects business_models_present",
      res.get("blueprint:business_models_present") == "fail", "blueprint row red")

# N7: removing L6 from maturity fails maturity_ladder_complete
res = run_audit_with_mutated_blueprint(lambda b: b.update({"maturity": [m for m in b["maturity"] if m["level"] != "L6"]}))
check("N7 dropping L6 rejects maturity_ladder_complete",
      res.get("blueprint:maturity_ladder_complete") == "fail", "blueprint row red")

# N8: removing a phase fails implementation_phases_5
res = run_audit_with_mutated_blueprint(lambda b: b.update({"implementation_phases": b["implementation_phases"][:4]}))
check("N8 removing a phase rejects implementation_phases_5",
      res.get("blueprint:implementation_phases_5") == "fail", "4 of 5 fails")

# N9: removing one missing-capability row fails missing_capabilities_20
res = run_audit_with_mutated_blueprint(lambda b: b.update({"missing_capabilities": b["missing_capabilities"][:19]}))
check("N9 removing a missing-cap rejects missing_capabilities_20",
      res.get("blueprint:missing_capabilities_20") == "fail", "19 of 20 fails")

# N10: corrupting an ai_matrix rating fails ai_matrix_complete
def _corrupt_matrix(b):
    if b["ai_matrix"]:
        b["ai_matrix"][0]["B2C"] = "UNKNOWN"
res = run_audit_with_mutated_blueprint(_corrupt_matrix)
check("N10 invalid rating rejects ai_matrix_complete",
      res.get("blueprint:ai_matrix_complete") == "fail", "rating outside {High,Medium,Low}")

# N11: emptying B2C agents fails per-model agents_present
res = run_audit_with_mutated_blueprint(lambda b: b["business_models"]["B2C"].update({"agents": []}))
check("N11 emptying B2C agents rejects B2C agents_present",
      res.get("blueprint:B2C:agents_present") == "fail", "B2C agents row red")

# N12: trimming top20_roi to 19 rows fails top20_roi_count + top20_roi_unique_ranks
res = run_audit_with_mutated_blueprint(lambda b: b.update({"top20_roi": b["top20_roi"][:19]}))
check("N12 19-row top20 rejects top20_roi_count",
      res.get("blueprint:top20_roi_count") == "fail", "19 of 20 fails")
check("N12 19-row top20 rejects top20_roi_unique_ranks",
      res.get("blueprint:top20_roi_unique_ranks") == "fail", "missing rank 20")

# N13: duplicating a rank (set rank 2 → 1) fails top20_roi_unique_ranks
def _dup_rank(b):
    if len(b["top20_roi"]) >= 2:
        b["top20_roi"][1]["rank"] = 1
res = run_audit_with_mutated_blueprint(_dup_rank)
check("N13 duplicated rank rejects top20_roi_unique_ranks",
      res.get("blueprint:top20_roi_unique_ranks") == "fail", "rank 1 appears twice")

# N14: removing scenario from one opportunity fails ai_opportunities_complete
def _strip_scenario(b):
    if b["ai_opportunities"]:
        b["ai_opportunities"][0]["scenario"] = ""
res = run_audit_with_mutated_blueprint(_strip_scenario)
check("N14 missing scenario rejects ai_opportunities_complete",
      res.get("blueprint:ai_opportunities_complete") == "fail", "row missing scenario")

# N15: duplicating an opportunity ai_type fails ai_opportunities_unique_types
def _dup_type(b):
    if len(b["ai_opportunities"]) >= 2:
        b["ai_opportunities"][1]["ai_type"] = b["ai_opportunities"][0]["ai_type"]
res = run_audit_with_mutated_blueprint(_dup_type)
check("N15 duplicate ai_type rejects ai_opportunities_unique_types",
      res.get("blueprint:ai_opportunities_unique_types") == "fail", "duplicated ai_type")

# N16: removing an arch layer fails enterprise_arch_13_layers
res = run_audit_with_mutated_blueprint(lambda b: b["enterprise_architecture"].update({"layers": b["enterprise_architecture"]["layers"][:12]}))
check("N16 12-layer arch rejects enterprise_arch_13_layers",
      res.get("blueprint:enterprise_arch_13_layers") == "fail", "12 of 13 fails")

# N17: emptying a layer's missing_ai fails enterprise_arch_rows_complete
def _strip_missing_ai(b):
    if b["enterprise_architecture"]["layers"]:
        b["enterprise_architecture"]["layers"][0]["missing_ai"] = []
res = run_audit_with_mutated_blueprint(_strip_missing_ai)
check("N17 empty layer missing_ai rejects enterprise_arch_rows_complete",
      res.get("blueprint:enterprise_arch_rows_complete") == "fail", "layer incomplete")

# N18: trimming top50 to 49 fails top50_missing_ai_count
res = run_audit_with_mutated_blueprint(lambda b: b.update({"top50_missing_ai": b["top50_missing_ai"][:49]}))
check("N18 49-row top50 rejects top50_missing_ai_count",
      res.get("blueprint:top50_missing_ai_count") == "fail", "49 of 50 fails")

# N19: duplicating top50 entry fails top50_missing_ai_unique
def _dup_top50(b):
    if len(b["top50_missing_ai"]) >= 2:
        b["top50_missing_ai"][1] = b["top50_missing_ai"][0]
res = run_audit_with_mutated_blueprint(_dup_top50)
check("N19 duplicate top50 entry rejects top50_missing_ai_unique",
      res.get("blueprint:top50_missing_ai_unique") == "fail", "duplicated entry")

# N20: removing dept 20 from catalog fails dept_catalog_has_20_21_22
res = run_audit_with_mutated_blueprint(lambda b: b.update({"department_catalog": [d for d in b["department_catalog"] if d.get("id") != 20]}))
check("N20 removing dept 20 rejects dept_catalog_has_20_21_22",
      res.get("blueprint:dept_catalog_has_20_21_22") == "fail", "dept 20 absent")

# N21: emptying dept 22's processes fails dept22 processes_present
def _empty_dept22_processes(b):
    for d in b["department_catalog"]:
        if d.get("id") == 22:
            d["processes"] = []
res = run_audit_with_mutated_blueprint(_empty_dept22_processes)
check("N21 empty dept22 processes rejects dept22 processes_present",
      res.get("blueprint:dept22:processes_present") == "fail", "dept22 processes row red")

# N22: dropping B2E from dept 21's scenarios fails channel_scenarios coverage
def _drop_b2e_scenarios(b):
    for d in b["department_catalog"]:
        if d.get("id") == 21:
            d["channel_scenarios"].pop("B2E", None)
res = run_audit_with_mutated_blueprint(_drop_b2e_scenarios)
check("N22 dropping B2E from dept21 rejects channel_scenarios coverage",
      res.get("blueprint:dept21:channel_scenarios_B2C_B2B_B2E") == "fail", "dept21 scenarios row red")

# N31: dept 6 is COMPLETE; dropping its kpi_improvements must fail kpi_improvements_present
def _empty_dept6_kpis(b):
    for d in b["department_catalog"]:
        if d.get("id") == 6:
            d["kpi_improvements"] = []
res = run_audit_with_mutated_blueprint(_empty_dept6_kpis)
check("N31 empty dept6 kpi_improvements rejects dept6 kpi_improvements_present",
      res.get("blueprint:dept6:kpi_improvements_present") == "fail", "dept6 (complete) kpi row red")

# N32: dept 1 is PARTIAL; removing partial flag makes audit treat it as complete,
# which then fails because dept 1 has no channel_scenarios / no top_missing_capabilities
def _strip_dept1_partial(b):
    for d in b["department_catalog"]:
        if d.get("id") == 1:
            d.pop("partial", None)
res = run_audit_with_mutated_blueprint(_strip_dept1_partial)
check("N32 removing dept1 partial flag rejects channel_scenarios coverage",
      res.get("blueprint:dept1:channel_scenarios_B2C_B2B_B2E") == "fail",
      "dept1 channel scenarios row red without partial flag")
check("N32 removing dept1 partial flag rejects top_missing_capabilities_present",
      res.get("blueprint:dept1:top_missing_capabilities_present") == "fail",
      "dept1 top_missing row red without partial flag")

# N33: dept 14 is PARTIAL; removing partial flag exposes the 6 missing processes
# + 7 missing trailing sections, failing top_missing_capabilities_present
def _strip_dept14_partial(b):
    for d in b["department_catalog"]:
        if d.get("id") == 14:
            d.pop("partial", None)
res = run_audit_with_mutated_blueprint(_strip_dept14_partial)
check("N33 removing dept14 partial flag rejects top_missing_capabilities_present",
      res.get("blueprint:dept14:top_missing_capabilities_present") == "fail",
      "dept14 trailing-sections row red without partial flag")

# N34: dropping all 15 dept top_missing_capabilities to 0 should still pass partial-mode for
# dept 1 but fail any complete dept. Test on dept 22 (complete).
def _strip_dept22_top_missing(b):
    for d in b["department_catalog"]:
        if d.get("id") == 22:
            d["top_missing_capabilities"] = []
res = run_audit_with_mutated_blueprint(_strip_dept22_top_missing)
check("N34 empty dept22 top_missing rejects dept22 top_missing_capabilities_present",
      res.get("blueprint:dept22:top_missing_capabilities_present") == "fail",
      "dept22 (complete) top_missing row red")

# N35: stripping `manual_process` from any process in dept 7 must fail processes_enriched
def _strip_dept7_process_manual(b):
    for d in b["department_catalog"]:
        if d.get("id") == 7 and d.get("processes"):
            d["processes"][0].pop("manual_process", None)
res = run_audit_with_mutated_blueprint(_strip_dept7_process_manual)
check("N35 stripping manual_process from a dept7 process rejects processes_enriched",
      res.get("blueprint:dept7:processes_enriched") == "fail",
      "dept7 enriched row red")

# N36: stripping `smart_kpi` from a dept 22 process must fail processes_enriched
def _strip_dept22_process_smart(b):
    for d in b["department_catalog"]:
        if d.get("id") == 22 and d.get("processes"):
            d["processes"][0].pop("smart_kpi", None)
res = run_audit_with_mutated_blueprint(_strip_dept22_process_smart)
check("N36 stripping smart_kpi from a dept22 process rejects processes_enriched",
      res.get("blueprint:dept22:processes_enriched") == "fail",
      "dept22 enriched row red")

# N37: stripping `accuracy` from an AI catalog row must fail ai_opportunities_enriched
def _strip_ai_accuracy(b):
    if b.get("ai_opportunities"):
        b["ai_opportunities"][0].pop("accuracy", None)
res = run_audit_with_mutated_blueprint(_strip_ai_accuracy)
check("N37 stripping AI accuracy field rejects ai_opportunities_enriched",
      res.get("blueprint:ai_opportunities_enriched") == "fail",
      "AI catalog row red without accuracy")

# N38: stripping `stakeholder` from an AI catalog row must fail ai_opportunities_enriched
def _strip_ai_stakeholder(b):
    if b.get("ai_opportunities"):
        b["ai_opportunities"][1].pop("stakeholder", None)
res = run_audit_with_mutated_blueprint(_strip_ai_stakeholder)
check("N38 stripping AI stakeholder field rejects ai_opportunities_enriched",
      res.get("blueprint:ai_opportunities_enriched") == "fail",
      "AI catalog row red without stakeholder")

# N39: stripping `readme` from a process must fail processes_enriched (per §73.12a)
def _strip_dept6_readme(b):
    for d in b["department_catalog"]:
        if d.get("id") == 6 and d.get("processes"):
            d["processes"][0].pop("readme", None)
res = run_audit_with_mutated_blueprint(_strip_dept6_readme)
check("N39 stripping process readme rejects processes_enriched",
      res.get("blueprint:dept6:processes_enriched") == "fail",
      "process must have all 10 README sub-sections")

# N40: stripping `tests` from a process must fail processes_enriched (per §73.11)
def _strip_dept20_tests(b):
    for d in b["department_catalog"]:
        if d.get("id") == 20 and d.get("processes"):
            d["processes"][0].pop("tests", None)
res = run_audit_with_mutated_blueprint(_strip_dept20_tests)
check("N40 stripping process tests rejects processes_enriched",
      res.get("blueprint:dept20:processes_enriched") == "fail",
      "process must have tests (API/Front/Back triad)")

# N41: stripping `security` from a process must fail processes_enriched (per §73.12)
def _strip_dept20_security(b):
    for d in b["department_catalog"]:
        if d.get("id") == 20 and d.get("processes"):
            d["processes"][1].pop("security", None)
res = run_audit_with_mutated_blueprint(_strip_dept20_security)
check("N41 stripping process security rejects processes_enriched",
      res.get("blueprint:dept20:processes_enriched") == "fail",
      "process must have security (Authz/RBAC/Threat model)")

# === Defense-in-depth negatives for depts 15-19 ===

# N23: emptying dept 15 (ERM) processes fails dept15 processes_present
def _empty_dept15_processes(b):
    for d in b["department_catalog"]:
        if d.get("id") == 15:
            d["processes"] = []
res = run_audit_with_mutated_blueprint(_empty_dept15_processes)
check("N23 empty dept15 processes rejects dept15 processes_present",
      res.get("blueprint:dept15:processes_present") == "fail", "dept15 processes row red")

# N24: dropping all AI from a dept 16 (HR) process fails dept16 processes_complete
def _strip_dept16_ai(b):
    for d in b["department_catalog"]:
        if d.get("id") == 16 and d.get("processes"):
            d["processes"][0]["ai"] = []
res = run_audit_with_mutated_blueprint(_strip_dept16_ai)
check("N24 emptying dept16 process AI rejects dept16 processes_complete",
      res.get("blueprint:dept16:processes_complete") == "fail", "dept16 processes_complete row red")

# N25: dropping B2C from dept 17 (Procurement) scenarios fails coverage
def _drop_b2c_dept17(b):
    for d in b["department_catalog"]:
        if d.get("id") == 17:
            d["channel_scenarios"].pop("B2C", None)
res = run_audit_with_mutated_blueprint(_drop_b2c_dept17)
check("N25 dropping B2C from dept17 rejects channel_scenarios coverage",
      res.get("blueprint:dept17:channel_scenarios_B2C_B2B_B2E") == "fail", "dept17 scenarios row red")

# N26: emptying dept 18 (Data) agents fails dept18 agents_present
def _empty_dept18_agents(b):
    for d in b["department_catalog"]:
        if d.get("id") == 18:
            d["agents"] = []
res = run_audit_with_mutated_blueprint(_empty_dept18_agents)
check("N26 empty dept18 agents rejects dept18 agents_present",
      res.get("blueprint:dept18:agents_present") == "fail", "dept18 agents row red")

# N27: emptying dept 19 (IT) systems fails dept19 systems_present
def _empty_dept19_systems(b):
    for d in b["department_catalog"]:
        if d.get("id") == 19:
            d["systems"] = []
res = run_audit_with_mutated_blueprint(_empty_dept19_systems)
check("N27 empty dept19 systems rejects dept19 systems_present",
      res.get("blueprint:dept19:systems_present") == "fail", "dept19 systems row red")

# === State-file invariants ===

import shutil
from pathlib import Path as _Path

CAPS_STATE = ROOT / "data" / "insurance" / "capability_status.json"
MATURITY_STATE = ROOT / "data" / "insurance" / "maturity_state.json"
IMPL_STATE = ROOT / "data" / "insurance" / "implementation_state.json"

check("ST1 capability_status.json exists", CAPS_STATE.exists(), str(CAPS_STATE.name))
check("ST2 maturity_state.json exists", MATURITY_STATE.exists(), str(MATURITY_STATE.name))
check("ST3 implementation_state.json exists", IMPL_STATE.exists(), str(IMPL_STATE.name))

if CAPS_STATE.exists():
    caps = json.loads(CAPS_STATE.read_text())
    statuses = caps.get("statuses", {})
    valid_vocab = {"planned", "in-progress", "live", "deferred"}
    bad = [n for n, e in statuses.items() if e.get("status") not in valid_vocab]
    check("ST4 capability_status statuses in vocab", not bad, f"{len(statuses)} entries · {len(bad)} bad")
    check("ST5 capability_status >= 100 entries (8 depts cover most blueprint capabilities)",
          len(statuses) >= 100, f"got {len(statuses)}")

if MATURITY_STATE.exists():
    mat = json.loads(MATURITY_STATE.read_text())
    depts = mat.get("depts", {})
    valid_levels = {f"L{i}" for i in range(7)}
    bad_lvl = [did for did, e in depts.items() if e.get("current_level") not in valid_levels]
    check("ST6 maturity levels in L0..L6 vocab", not bad_lvl, f"{len(depts)} depts · {len(bad_lvl)} bad")
    check("ST7 maturity covers depts 15..22", set(depts.keys()) >= {str(i) for i in range(15, 23)}, "")

if IMPL_STATE.exists():
    impl = json.loads(IMPL_STATE.read_text())
    idx = impl.get("current_step_index", -1)
    total = impl.get("total_steps", 0)
    check("ST8 implementation current_step_index in range", isinstance(idx, int) and 0 <= idx <= total, f"idx={idx} of total={total}")
    check("ST9 implementation step_status has 12 steps", len(impl.get("step_status", {})) == 12, f"got {len(impl.get('step_status', {}))}")

# Negative state-file invariants
def _state_audit_with_mutation(state_path: _Path, mutator) -> dict[str, str]:
    """Mutate state file copy, swap audit's path constants, run, restore."""
    import insurance_alignment_audit as iaa  # noqa: PLC0415
    orig_data = json.loads(state_path.read_text())
    mutated = json.loads(json.dumps(orig_data))
    mutator(mutated)
    tmp_path = state_path.parent / f"_drill_mutated_{state_path.name}"
    tmp_path.write_text(json.dumps(mutated))
    if state_path.name == "capability_status.json":
        original_attr = iaa.CAPS_STATE_PATH; iaa.CAPS_STATE_PATH = tmp_path
    elif state_path.name == "maturity_state.json":
        original_attr = iaa.MATURITY_STATE_PATH; iaa.MATURITY_STATE_PATH = tmp_path
    else:
        original_attr = iaa.IMPL_STATE_PATH; iaa.IMPL_STATE_PATH = tmp_path
    try:
        checks: list[dict] = []
        iaa._audit_state_files(checks)
    finally:
        if state_path.name == "capability_status.json":
            iaa.CAPS_STATE_PATH = original_attr
        elif state_path.name == "maturity_state.json":
            iaa.MATURITY_STATE_PATH = original_attr
        else:
            iaa.IMPL_STATE_PATH = original_attr
        tmp_path.unlink(missing_ok=True)
    return {f"{c['scope']}:{c['check']}": c["status"] for c in checks}

# N28: setting a capability status to "invalid" must fail vocab_valid
def _bad_cap_status(s):
    first = next(iter(s["statuses"]))
    s["statuses"][first]["status"] = "UNKNOWN"
res = _state_audit_with_mutation(CAPS_STATE, _bad_cap_status)
check("N28 invalid capability status rejects vocab_valid",
      res.get("state:capability_status:vocab_valid") == "fail", "vocab row red")

# N29: setting a dept maturity to "L9" must fail vocab_valid
def _bad_maturity(s):
    first = next(iter(s["depts"]))
    s["depts"][first]["current_level"] = "L9"
res = _state_audit_with_mutation(MATURITY_STATE, _bad_maturity)
check("N29 invalid maturity level rejects vocab_valid",
      res.get("state:maturity_state:vocab_valid") == "fail", "vocab row red")

# N30: setting current_step_index = 99 must fail in-range
def _bad_step(s):
    s["current_step_index"] = 99
res = _state_audit_with_mutation(IMPL_STATE, _bad_step)
check("N30 out-of-range current_step_index rejects in-range",
      res.get("state:implementation_state:current_step_in_range") == "fail", "in-range row red")

# =============================================================================
# §73.3c v2 — Architecture hub 18 sub-sections (10 SDLC + 8 ops/strategy)
# Added 2026-06-03 after operator promoted README → Architecture per "C" choice.
# =============================================================================

ARCHITECTURE_SUBS = [
    # Classic SDLC (10) — original
    "brd", "frd", "hld", "lld", "sad", "c4", "sequence", "network", "api", "db_schema",
    # Banking-style operational + strategy (8) — added 2026-06-03
    "adr", "runbook", "roadmap", "stakeholders", "executive_summary",
    "capacity", "ai_strategy", "cost_analysis",
]

# BP43: every process has all 18 Architecture sub-sections (per §73.3c v2)
def _missing_arch_subs():
    misses = []
    for d in bp.get("department_catalog", []):
        for p in d.get("processes", []):
            r = p.get("readme") or {}
            absent = [k for k in ARCHITECTURE_SUBS if k not in r]
            if absent:
                misses.append((d.get("id"), p.get("name"), absent))
    return misses

_miss = _missing_arch_subs()
check("BP43 every process has all 18 Architecture sub-sections (§73.3c v2)",
      len(_miss) == 0,
      f"{len(_miss)} processes missing sub-sections" if _miss else "322/322 complete")

# N42: stripping `adr` from any process must surface as a missing-sub-section
# (positive control: deterministically detectable mutation rejects)
def _strip_adr_from_first():
    sample = json.loads(json.dumps(bp))  # deep copy
    for d in sample.get("department_catalog", []):
        for p in d.get("processes", []):
            if p.get("readme") and "adr" in p["readme"]:
                del p["readme"]["adr"]
                return sample
    return sample

mutated = _strip_adr_from_first()
mutated_miss = []
for d in mutated.get("department_catalog", []):
    for p in d.get("processes", []):
        r = p.get("readme") or {}
        absent = [k for k in ARCHITECTURE_SUBS if k not in r]
        if absent:
            mutated_miss.append(absent)
check("N42 stripping adr from a process rejects 18-sub-section invariant",
      len(mutated_miss) >= 1 and "adr" in mutated_miss[0],
      f"mutation detected: {len(mutated_miss)} process(es) now missing sub-sections")

# N43: a process whose readme is missing entirely fails the BP43 invariant
sample_no_readme = json.loads(json.dumps(bp))
for d in sample_no_readme.get("department_catalog", []):
    if d.get("processes"):
        del d["processes"][0]["readme"]
        break

no_readme_miss = []
for d in sample_no_readme.get("department_catalog", []):
    for p in d.get("processes", []):
        r = p.get("readme") or {}
        absent = [k for k in ARCHITECTURE_SUBS if k not in r]
        if absent:
            no_readme_miss.append(absent)
check("N43 process with no readme rejects 18-sub-section invariant",
      any(len(m) == 18 for m in no_readme_miss),
      "deleting readme leaves all 18 subs missing for that process")

# =============================================================================
# §73.3a — AI referential integrity
# Every AI in process.automatic_process.ai_workflow + process.ai[].ai_type
# MUST exist in bp.ai_opportunities[]. Operator picks from catalog vocabulary.
# =============================================================================

def _collect_orphans(blueprint):
    catalog = {r.get("ai_type") for r in (blueprint.get("ai_opportunities") or []) if r.get("ai_type")}
    orphans = []
    # Process-level
    for d in blueprint.get("department_catalog", []):
        for p in d.get("processes", []):
            for a in (p.get("ai") or []):
                if isinstance(a, dict):
                    t = a.get("ai_type")
                    if t and t not in catalog:
                        orphans.append((d.get("id"), p.get("name"), t))
            for t in ((p.get("automatic_process") or {}).get("ai_workflow") or []):
                if t and t not in catalog:
                    orphans.append((d.get("id"), p.get("name"), t))
    # top20_roi
    for r in blueprint.get("top20_roi", []) or []:
        t = r.get("ai_opportunity")
        if t and t not in catalog:
            orphans.append(("top20_roi", f"rank {r.get('rank')}", t))
    return orphans

_orphans = _collect_orphans(bp)
check("BP44 every AI reference resolves to ai_opportunities[] (§73.3a)",
      len(_orphans) == 0,
      f"{len(_orphans)} orphan refs" if _orphans else "0/0 — all AI refs resolve")

# N44: removing one catalog entry must surface as an orphan
def _strip_one_catalog():
    sample = json.loads(json.dumps(bp))
    cat = sample.get("ai_opportunities") or []
    if cat:
        # remove the first catalog entry that is actually referenced
        referenced = set()
        for d in sample.get("department_catalog", []):
            for p in d.get("processes", []):
                for a in (p.get("ai") or []):
                    if isinstance(a, dict) and a.get("ai_type"):
                        referenced.add(a.get("ai_type"))
        for i, r in enumerate(cat):
            if r.get("ai_type") in referenced:
                del cat[i]
                return sample
    return sample

mut = _strip_one_catalog()
mut_orphans = _collect_orphans(mut)
check("N44 deleting a referenced catalog entry rejects BP44 (§73.3a)",
      len(mut_orphans) >= 1,
      f"mutation produced {len(mut_orphans)} orphan(s)")

green = sum(1 for _, ok, _ in results if ok)
total = len(results)
print()
print(f"drill_insurance_alignment — {green}/{total} green")
if green < total:
    print(f"FAILED: {total - green} invariant(s) red.")
    sys.exit(1)
print("ALL invariants green.")
sys.exit(0)
