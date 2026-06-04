#!/usr/bin/env python3
"""Insurance alignment audit.

Deterministic coverage check for the department / channel / data / AI / bot
alignment surface that the /insurance UI route renders. Writes timestamped
and `*_latest` Markdown + JSON reports under jobs/reports/insurance/ for
hourly governance review (see scripts/install_insurance_alignment_cron.sh).

Exit 0 = all checks pass.
Exit 1 = at least one check failed (cron job surfaces this in the log).
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT_DIR = ROOT / "jobs" / "reports" / "insurance"
BLUEPRINT_PATH = ROOT / "data" / "insurance" / "blueprint.json"
CAPS_STATE_PATH = ROOT / "data" / "insurance" / "capability_status.json"
MATURITY_STATE_PATH = ROOT / "data" / "insurance" / "maturity_state.json"
IMPL_STATE_PATH = ROOT / "data" / "insurance" / "implementation_state.json"
VALID_STATUS_VOCAB = {"planned", "in-progress", "live", "deferred"}
VALID_MATURITY_VOCAB = {"L0", "L1", "L2", "L3", "L4", "L5", "L6"}

REQUIRED_BUSINESS_MODELS = {"B2C", "B2B", "B2E"}
REQUIRED_MATURITY_LEVELS = {"L0", "L1", "L2", "L3", "L4", "L5", "L6"}
REQUIRED_PHASE_COUNT = 5
REQUIRED_MISSING_CAPS = 20
REQUIRED_AUTONOMOUS_ROLES = 15
REQUIRED_CLOSED_LOOP_STEPS = 10
REQUIRED_AI_MATRIX_ROWS = 17
RATING_VOCAB = {"High", "Medium", "Low"}
PROCESS_ENRICHED_FIELDS = (
    "manual_process", "automatic_process", "data_process",
    "explainable_ai", "responsible_ai", "governance_ai", "smart_kpi",
    "readme", "tech_stack", "demo_story", "as_is_to_be",
    "flow_diagram", "output", "visualization", "tests", "security",
)
AI_ENRICHED_FIELDS = ("data", "model", "accuracy", "benchmark", "stakeholder")
MIN_AI_OPPORTUNITIES = 140
REQUIRED_TOP20_RANKS = set(range(1, 21))
REQUIRED_ARCH_LAYERS = 13
REQUIRED_TOP50 = 50
REQUIRED_ENTERPRISE_MISSING = 20
REQUIRED_CATALOG_DEPTS = {1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22}
PARTIAL_DEPT_REQUIRED_FIELDS = ("mission", "processes")
FULL_DEPT_REQUIRED_FIELDS = (
    "mission", "processes", "channel_scenarios", "systems",
    "data_sources", "agents", "human_less_workflow",
    "kpi_improvements", "top_missing_capabilities",
)

DEPARTMENTS = {
    "Sales and Distribution": {
        "channels": ["B2C", "B2B", "B2E"],
        "data": ["master", "product", "transactional", "conditional"],
        "ai": ["Conversational AI", "Comparison AI", "Generative AI", "Decision AI"],
        "stakeholders": ["customer", "agent", "broker", "employer_hr", "sales_manager"],
    },
    "Underwriting": {
        "channels": ["B2C", "B2B", "B2E"],
        "data": ["conditional", "evidence", "master", "organization"],
        "ai": ["Decision AI", "Verification AI", "Explainable AI", "Ethical AI"],
        "stakeholders": ["applicant", "underwriter", "medical_reviewer", "reinsurer"],
    },
    "Policy Servicing": {
        "channels": ["B2C", "B2B", "B2E"],
        "data": ["master", "transactional", "product", "organization"],
        "ai": ["Transactional AI", "Performance AI", "Governance AI", "Secure AI"],
        "stakeholders": ["policyholder", "service_user", "agent", "employer_admin"],
    },
    "Claims": {
        "channels": ["B2C", "B2B", "B2E"],
        "data": ["transactional", "evidence", "conditional", "master"],
        "ai": ["Decision AI", "Analytical AI", "Verification AI", "Explainable AI"],
        "stakeholders": ["claimant", "adjuster", "provider", "surveyor", "fraud_analyst"],
    },
    "Finance and Billing": {
        "channels": ["B2C", "B2B", "B2E"],
        "data": ["transactional", "organization", "product", "master"],
        "ai": ["Transactional AI", "Analytical AI", "Performance AI", "Verification AI"],
        "stakeholders": ["customer", "finance", "bank", "agent", "payroll"],
    },
    "Risk, Compliance and Audit": {
        "channels": ["B2B", "B2E"],
        "data": ["organization", "evidence", "transactional", "conditional"],
        "ai": ["Governance AI", "Ethical AI", "Secure AI", "Responsible AI", "Verification AI"],
        "stakeholders": ["compliance", "auditor", "regulator", "dpo", "model_committee"],
    },
}

REQUIRED_CHANNELS = {"B2C", "B2B", "B2E"}
REQUIRED_DATA = {
    "master", "conditional", "organization", "product", "transactional", "evidence",
}
REQUIRED_AI = {
    "Transactional AI", "Decision AI", "Analytical AI", "Explainable AI",
    "Responsible AI", "Ethical AI", "Secure AI", "Governance AI",
    "Performance AI", "Comparison AI", "Verification AI", "Generative AI",
    "Conversational AI",
}


def _audit_blueprint(checks: list[dict]) -> None:
    """Verify the autonomous-insurance blueprint (B2C/B2B/B2E + maturity +
    implementation phases + missing AI capabilities + autonomous org +
    closed-loop sequence) is structurally complete. Appends rows to `checks`.
    """
    if not BLUEPRINT_PATH.exists():
        checks.append({
            "scope": "blueprint", "check": "file_present", "status": "fail",
            "detail": f"missing {BLUEPRINT_PATH.relative_to(ROOT)}",
        })
        return

    try:
        bp = json.loads(BLUEPRINT_PATH.read_text())
    except json.JSONDecodeError as e:
        checks.append({
            "scope": "blueprint", "check": "file_parses", "status": "fail",
            "detail": f"JSON parse error: {e}",
        })
        return

    checks.append({"scope": "blueprint", "check": "file_parses", "status": "pass", "detail": "ok"})

    business_models = bp.get("business_models") or {}
    have_models = set(business_models.keys())
    checks.append({
        "scope": "blueprint", "check": "business_models_present",
        "status": "pass" if REQUIRED_BUSINESS_MODELS <= have_models else "fail",
        "detail": ", ".join(sorted(have_models)),
    })

    for model_key in REQUIRED_BUSINESS_MODELS:
        spec = business_models.get(model_key) or {}
        for field in ("objective", "departments", "agents", "data_sources", "human_less_flow"):
            value = spec.get(field)
            checks.append({
                "scope": f"blueprint:{model_key}",
                "check": f"{field}_present",
                "status": "pass" if value else "fail",
                "detail": f"{len(value) if isinstance(value, (list, dict)) else (1 if value else 0)} item(s)",
            })

    maturity = bp.get("maturity") or []
    have_levels = {row.get("level") for row in maturity if isinstance(row, dict)}
    checks.append({
        "scope": "blueprint", "check": "maturity_ladder_complete",
        "status": "pass" if REQUIRED_MATURITY_LEVELS <= have_levels else "fail",
        "detail": ", ".join(sorted(have_levels)),
    })

    phases = bp.get("implementation_phases") or []
    checks.append({
        "scope": "blueprint", "check": "implementation_phases_5",
        "status": "pass" if len(phases) == REQUIRED_PHASE_COUNT else "fail",
        "detail": f"{len(phases)} of {REQUIRED_PHASE_COUNT}",
    })

    missing_caps = bp.get("missing_capabilities") or []
    checks.append({
        "scope": "blueprint", "check": "missing_capabilities_20",
        "status": "pass" if len(missing_caps) == REQUIRED_MISSING_CAPS else "fail",
        "detail": f"{len(missing_caps)} of {REQUIRED_MISSING_CAPS}",
    })

    org = bp.get("autonomous_org") or []
    checks.append({
        "scope": "blueprint", "check": "autonomous_org_15",
        "status": "pass" if len(org) == REQUIRED_AUTONOMOUS_ROLES else "fail",
        "detail": f"{len(org)} of {REQUIRED_AUTONOMOUS_ROLES}",
    })

    loop = bp.get("closed_loop") or []
    checks.append({
        "scope": "blueprint", "check": "closed_loop_10_steps",
        "status": "pass" if len(loop) == REQUIRED_CLOSED_LOOP_STEPS else "fail",
        "detail": f"{len(loop)} of {REQUIRED_CLOSED_LOOP_STEPS}",
    })

    ai_matrix = bp.get("ai_matrix") or []
    matrix_ok = (
        len(ai_matrix) == REQUIRED_AI_MATRIX_ROWS
        and all(
            isinstance(r, dict)
            and REQUIRED_BUSINESS_MODELS <= set(r.keys())
            and all(r.get(m) in RATING_VOCAB for m in REQUIRED_BUSINESS_MODELS)
            for r in ai_matrix
        )
    )
    checks.append({
        "scope": "blueprint", "check": "ai_matrix_complete",
        "status": "pass" if matrix_ok else "fail",
        "detail": f"{len(ai_matrix)} rows × 3 models, ratings in {sorted(RATING_VOCAB)}",
    })

    # Agentic AI reference architecture (operator-provided)
    aar = bp.get("agentic_ai_reference") or {}
    arch_layers = (aar.get("reference_architecture") or {}).get("layers") or []
    checks.append({
        "scope": "blueprint", "check": "agentic_ai_reference_15_layers",
        "status": "pass" if len(arch_layers) == 15 else "fail",
        "detail": f"{len(arch_layers)} of 15",
    })
    agents = (aar.get("enterprise_agent_stack") or {}).get("agents") or []
    checks.append({
        "scope": "blueprint", "check": "agentic_ai_reference_11_agents",
        "status": "pass" if len(agents) == 11 else "fail",
        "detail": f"{len(agents)} of 11",
    })
    backend_layers = [l for l in arch_layers if l.get("scope") in ("backend", "both")]
    checks.append({
        "scope": "blueprint", "check": "agentic_ai_reference_backend_majority",
        "status": "pass" if len(backend_layers) >= 12 else "fail",
        "detail": f"{len(backend_layers)} of {len(arch_layers)} layers are backend-scope",
    })

    opportunities = bp.get("ai_opportunities") or []
    opps_complete = all(
        isinstance(r, dict) and r.get("ai_type") and r.get("scenario")
        for r in opportunities
    )
    checks.append({
        "scope": "blueprint", "check": "ai_opportunities_present",
        "status": "pass" if len(opportunities) >= MIN_AI_OPPORTUNITIES else "fail",
        "detail": f"{len(opportunities)} of >= {MIN_AI_OPPORTUNITIES}",
    })
    checks.append({
        "scope": "blueprint", "check": "ai_opportunities_complete",
        "status": "pass" if opps_complete else "fail",
        "detail": "every row has ai_type + scenario" if opps_complete else "row missing ai_type or scenario",
    })

    # §73.14 — every AI catalog row has 5 enriched fields (Data/Model/Accuracy/Benchmark/Stakeholder)
    ai_enriched_ok = all(
        all(r.get(f) for f in AI_ENRICHED_FIELDS)
        for r in opportunities
        if isinstance(r, dict)
    )
    checks.append({
        "scope": "blueprint", "check": "ai_opportunities_enriched",
        "status": "pass" if ai_enriched_ok else "fail",
        "detail": (
            f"all {len(AI_ENRICHED_FIELDS)} fields per row (per §73.14)"
            if ai_enriched_ok
            else "row missing one of data/model/accuracy/benchmark/stakeholder (run scripts/insurance_enrich_processes.py)"
        ),
    })

    unique_types = {r.get("ai_type") for r in opportunities if isinstance(r, dict)}
    checks.append({
        "scope": "blueprint", "check": "ai_opportunities_unique_types",
        "status": "pass" if len(unique_types) == len(opportunities) else "fail",
        "detail": f"{len(unique_types)} unique of {len(opportunities)}",
    })

    # Per §73.3a referential integrity — every AI in
    # process.automatic_process.ai_workflow + process.ai[].ai_type + top20_roi[].ai_opportunity
    # must resolve to a catalog entry. Mirrors drill BP44.
    catalog_types = {r.get("ai_type") for r in opportunities if isinstance(r, dict) and r.get("ai_type")}
    orphan_count = 0
    first_orphan = None
    for d in bp.get("department_catalog", []):
        for p in d.get("processes", []):
            for a in (p.get("ai") or []):
                if isinstance(a, dict):
                    t = a.get("ai_type")
                    if t and t not in catalog_types:
                        orphan_count += 1
                        if not first_orphan:
                            first_orphan = f"{t} in dept{d.get('id')}:{p.get('name')}"
            for t in ((p.get("automatic_process") or {}).get("ai_workflow") or []):
                if t and t not in catalog_types:
                    orphan_count += 1
                    if not first_orphan:
                        first_orphan = f"{t} (ai_workflow) in dept{d.get('id')}:{p.get('name')}"
    for r in (bp.get("top20_roi") or []):
        if isinstance(r, dict):
            t = r.get("ai_opportunity")
            if t and t not in catalog_types:
                orphan_count += 1
                if not first_orphan:
                    first_orphan = f"{t} in top20_roi[rank {r.get('rank')}]"
    checks.append({
        "scope": "blueprint", "check": "ai_referential_integrity_73_3a",
        "status": "pass" if orphan_count == 0 else "fail",
        "detail": (
            f"all AI refs resolve to ai_opportunities[]"
            if orphan_count == 0
            else f"{orphan_count} orphan refs (first: {first_orphan}) — run scripts/insurance_backfill_orphan_ai.py"
        ),
    })

    top20 = bp.get("top20_roi") or []
    top20_ranks = {r.get("rank") for r in top20 if isinstance(r, dict)}
    top20_fields_ok = all(
        isinstance(r, dict) and r.get("ai_opportunity") and r.get("department")
        for r in top20
    )
    checks.append({
        "scope": "blueprint", "check": "top20_roi_count",
        "status": "pass" if len(top20) == 20 else "fail",
        "detail": f"{len(top20)} of 20",
    })
    checks.append({
        "scope": "blueprint", "check": "top20_roi_unique_ranks",
        "status": "pass" if top20_ranks == REQUIRED_TOP20_RANKS else "fail",
        "detail": f"ranks={sorted(r for r in top20_ranks if r is not None)}",
    })
    checks.append({
        "scope": "blueprint", "check": "top20_roi_fields_present",
        "status": "pass" if top20_fields_ok else "fail",
        "detail": "every row has ai_opportunity + department" if top20_fields_ok else "row missing field",
    })

    arch = bp.get("enterprise_architecture") or {}
    layers = arch.get("layers") or []
    checks.append({
        "scope": "blueprint", "check": "enterprise_arch_13_layers",
        "status": "pass" if len(layers) == REQUIRED_ARCH_LAYERS else "fail",
        "detail": f"{len(layers)} of {REQUIRED_ARCH_LAYERS}",
    })
    arch_rows_ok = all(
        isinstance(layer, dict)
        and layer.get("name")
        and layer.get("mission")
        and isinstance(layer.get("inputs"), list) and layer["inputs"]
        and isinstance(layer.get("outputs"), list) and layer["outputs"]
        and isinstance(layer.get("missing_ai"), list) and layer["missing_ai"]
        for layer in layers
    )
    checks.append({
        "scope": "blueprint", "check": "enterprise_arch_rows_complete",
        "status": "pass" if arch_rows_ok else "fail",
        "detail": "every layer has name + mission + inputs + outputs + missing_ai" if arch_rows_ok else "layer missing field",
    })

    top50 = bp.get("top50_missing_ai") or []
    checks.append({
        "scope": "blueprint", "check": "top50_missing_ai_count",
        "status": "pass" if len(top50) == REQUIRED_TOP50 else "fail",
        "detail": f"{len(top50)} of {REQUIRED_TOP50}",
    })
    checks.append({
        "scope": "blueprint", "check": "top50_missing_ai_unique",
        "status": "pass" if len(set(top50)) == len(top50) else "fail",
        "detail": f"{len(set(top50))} unique of {len(top50)}",
    })

    enterprise_missing = bp.get("enterprise_missing_layers") or []
    em_ok = all(
        isinstance(r, dict) and r.get("layer") and r.get("purpose") for r in enterprise_missing
    )
    checks.append({
        "scope": "blueprint", "check": "enterprise_missing_layers_count",
        "status": "pass" if len(enterprise_missing) == REQUIRED_ENTERPRISE_MISSING else "fail",
        "detail": f"{len(enterprise_missing)} of {REQUIRED_ENTERPRISE_MISSING}",
    })
    checks.append({
        "scope": "blueprint", "check": "enterprise_missing_layers_complete",
        "status": "pass" if em_ok else "fail",
        "detail": "every row has layer + purpose" if em_ok else "row missing field",
    })

    catalog = bp.get("department_catalog") or []
    catalog_ids = {d.get("id") for d in catalog if isinstance(d, dict)}
    checks.append({
        "scope": "blueprint", "check": "dept_catalog_has_20_21_22",
        "status": "pass" if REQUIRED_CATALOG_DEPTS <= catalog_ids else "fail",
        "detail": f"depts present={sorted(catalog_ids)}",
    })

    for dept in catalog:
        if not isinstance(dept, dict):
            continue
        dept_id = dept.get("id")
        scope = f"blueprint:dept{dept_id}"
        is_partial = bool(dept.get("partial"))
        required_fields = PARTIAL_DEPT_REQUIRED_FIELDS if is_partial else FULL_DEPT_REQUIRED_FIELDS
        for field in required_fields:
            value = dept.get(field)
            checks.append({
                "scope": scope, "check": f"{field}_present",
                "status": "pass" if value else "fail",
                "detail": f"{len(value) if isinstance(value, (list, dict)) else (1 if value else 0)} item(s)",
            })
        # For partial depts, also record an informational row marking the partial status
        if is_partial:
            checks.append({
                "scope": scope, "check": "marked_partial",
                "status": "pass",
                "detail": "partial dept — strict per-field check skipped per partial_note",
            })

        processes_ok = all(
            isinstance(p, dict) and p.get("name") and isinstance(p.get("ai"), list) and p["ai"]
            for p in (dept.get("processes") or [])
        )
        checks.append({
            "scope": scope, "check": "processes_complete",
            "status": "pass" if processes_ok else "fail",
            "detail": "every process has name + ai opportunities" if processes_ok else "process row incomplete",
        })

        # Per global §59 MDD + per-process enrichment (manual/auto/data/ExpAI/ResAI/Gov/SMART):
        # every process must have all 7 enriched fields populated (derived or operator-edited).
        processes_enriched = True
        first_missing_field = None
        for p in (dept.get("processes") or []):
            if not isinstance(p, dict):
                continue
            for field in PROCESS_ENRICHED_FIELDS:
                if not p.get(field):
                    processes_enriched = False
                    first_missing_field = f"{p.get('name', '?')}:{field}"
                    break
            if not processes_enriched:
                break
        checks.append({
            "scope": scope, "check": "processes_enriched",
            "status": "pass" if processes_enriched else "fail",
            "detail": (
                f"all {len(PROCESS_ENRICHED_FIELDS)} fields present per process"
                if processes_enriched
                else f"missing {first_missing_field} (run scripts/insurance_enrich_processes.py)"
            ),
        })

        # Per §73.3c v2 — Architecture hub must have all 18 sub-sections per process.
        # Mirrors drill BP43; surfaces as audit failure if a process is missing any sub.
        ARCH_SUBS = (
            "brd", "frd", "hld", "lld", "sad", "c4", "sequence", "network", "api", "db_schema",
            "adr", "runbook", "roadmap", "stakeholders", "executive_summary",
            "capacity", "ai_strategy", "cost_analysis",
        )
        arch_complete = True
        first_arch_miss = None
        for p in (dept.get("processes") or []):
            if not isinstance(p, dict):
                continue
            readme = p.get("readme") or {}
            absent = [k for k in ARCH_SUBS if k not in readme]
            if absent:
                arch_complete = False
                first_arch_miss = f"{p.get('name', '?')}:readme.{absent[0]} (+ {len(absent) - 1} more)"
                break
        checks.append({
            "scope": scope, "check": "architecture_hub_18_subs",
            "status": "pass" if arch_complete else "fail",
            "detail": (
                f"all 18 Architecture sub-sections present per process (§73.3c v2)"
                if arch_complete
                else f"missing {first_arch_miss} (run scripts/insurance_enrich_processes.py)"
            ),
        })

        # Channel scenarios: enforce strict on full depts; on partial, allow
        # missing keys (e.g. B2E not pasted yet) with an informational note.
        scenarios = dept.get("channel_scenarios") or {}
        if is_partial:
            checks.append({
                "scope": scope, "check": "channel_scenarios_B2C_B2B_B2E",
                "status": "pass",
                "detail": (
                    "[partial] " + ", ".join(sorted(scenarios.keys()))
                    if scenarios else "skipped (partial dept; no channel_scenarios yet)"
                ),
            })
        else:
            scenarios_ok = REQUIRED_BUSINESS_MODELS <= set(scenarios.keys())
            checks.append({
                "scope": scope, "check": "channel_scenarios_B2C_B2B_B2E",
                "status": "pass" if scenarios_ok else "fail",
                "detail": ", ".join(sorted(scenarios.keys())),
            })


def _audit_state_files(checks: list[dict]) -> None:
    """Validate the three operator-editable state files: capability_status,
    maturity_state, implementation_state. Each must exist, parse, and use
    a valid status / maturity vocabulary. Defaults are seeded by
    scripts/insurance_init_state.py.
    """
    for path, scope in [
        (CAPS_STATE_PATH, "capability_status"),
        (MATURITY_STATE_PATH, "maturity_state"),
        (IMPL_STATE_PATH, "implementation_state"),
    ]:
        if not path.exists():
            checks.append({
                "scope": f"state:{scope}", "check": "file_present", "status": "fail",
                "detail": f"missing {path.relative_to(ROOT)} (run scripts/insurance_init_state.py)",
            })
            continue
        try:
            json.loads(path.read_text())
            checks.append({
                "scope": f"state:{scope}", "check": "file_parses",
                "status": "pass", "detail": "ok",
            })
        except json.JSONDecodeError as e:
            checks.append({
                "scope": f"state:{scope}", "check": "file_parses",
                "status": "fail", "detail": f"JSON parse error: {e}",
            })

    # Capability vocab
    if CAPS_STATE_PATH.exists():
        caps = json.loads(CAPS_STATE_PATH.read_text())
        statuses = caps.get("statuses", {})
        bad = [(name, entry.get("status")) for name, entry in statuses.items()
               if entry.get("status") not in VALID_STATUS_VOCAB]
        checks.append({
            "scope": "state:capability_status", "check": "vocab_valid",
            "status": "pass" if not bad else "fail",
            "detail": f"{len(statuses)} entries, {len(bad)} invalid",
        })

    # Maturity vocab
    if MATURITY_STATE_PATH.exists():
        mat = json.loads(MATURITY_STATE_PATH.read_text())
        depts = mat.get("depts", {})
        bad = [(did, entry.get("current_level")) for did, entry in depts.items()
               if entry.get("current_level") not in VALID_MATURITY_VOCAB]
        checks.append({
            "scope": "state:maturity_state", "check": "vocab_valid",
            "status": "pass" if not bad else "fail",
            "detail": f"{len(depts)} depts, {len(bad)} invalid",
        })

    # Implementation index range
    if IMPL_STATE_PATH.exists():
        impl = json.loads(IMPL_STATE_PATH.read_text())
        idx = impl.get("current_step_index", -1)
        total = impl.get("total_steps", 0)
        in_range = isinstance(idx, int) and 0 <= idx <= total
        checks.append({
            "scope": "state:implementation_state", "check": "current_step_in_range",
            "status": "pass" if in_range else "fail",
            "detail": f"current_step_index={idx} (0..{total})",
        })
        step_status = impl.get("step_status", {})
        bad_step = [(name, entry.get("status")) for name, entry in step_status.items()
                    if entry.get("status") not in VALID_STATUS_VOCAB]
        checks.append({
            "scope": "state:implementation_state", "check": "step_vocab_valid",
            "status": "pass" if not bad_step else "fail",
            "detail": f"{len(step_status)} steps, {len(bad_step)} invalid",
        })


def main() -> int:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc)
    checks: list[dict] = []

    covered_channels: set[str] = set()
    covered_data: set[str] = set()
    covered_ai: set[str] = set()

    for dept, spec in DEPARTMENTS.items():
        channels = set(spec["channels"])
        data = set(spec["data"])
        ai = set(spec["ai"])
        stakeholders = list(spec["stakeholders"])
        covered_channels |= channels
        covered_data |= data
        covered_ai |= ai

        checks.append({
            "scope": dept, "check": "channel_coverage",
            "status": "pass" if channels else "fail",
            "detail": ", ".join(sorted(channels)),
        })
        checks.append({
            "scope": dept, "check": "stakeholder_mapping",
            "status": "pass" if stakeholders else "fail",
            "detail": f"{len(stakeholders)} stakeholder(s)",
        })
        checks.append({
            "scope": dept, "check": "data_mapping",
            "status": "pass" if data else "fail",
            "detail": ", ".join(sorted(data)),
        })
        checks.append({
            "scope": dept, "check": "ai_mapping",
            "status": "pass" if ai else "fail",
            "detail": ", ".join(sorted(ai)),
        })

    _audit_blueprint(checks)
    _audit_state_files(checks)

    missing_channels = sorted(REQUIRED_CHANNELS - covered_channels)
    missing_data = sorted(REQUIRED_DATA - covered_data)
    missing_ai = sorted(REQUIRED_AI - covered_ai)

    checks.append({
        "scope": "enterprise", "check": "all_channels_covered",
        "status": "pass" if not missing_channels else "fail",
        "detail": ", ".join(missing_channels) or "all covered",
    })
    checks.append({
        "scope": "enterprise", "check": "all_data_classes_covered",
        "status": "pass" if not missing_data else "fail",
        "detail": ", ".join(missing_data) or "all covered",
    })
    checks.append({
        "scope": "enterprise", "check": "all_ai_types_covered",
        "status": "pass" if not missing_ai else "fail",
        "detail": ", ".join(missing_ai) or "all covered",
    })

    failed = [c for c in checks if c["status"] != "pass"]
    payload = {
        "generated_at": now.isoformat(),
        "checks": checks,
        "summary": {"total": len(checks), "failed": len(failed)},
    }

    stamp = now.strftime("%Y%m%d_%H%M")
    json_path = REPORT_DIR / f"insurance_alignment_{stamp}.json"
    md_path = REPORT_DIR / f"insurance_alignment_{stamp}.md"
    latest_json = REPORT_DIR / "insurance_alignment_latest.json"
    latest_md = REPORT_DIR / "insurance_alignment_latest.md"

    json_blob = json.dumps(payload, indent=2) + "\n"
    json_path.write_text(json_blob)
    latest_json.write_text(json_blob)

    lines = [
        "# Insurance Alignment Audit",
        "",
        f"Generated: {payload['generated_at']}",
        "",
        f"Total checks: {len(checks)}",
        f"Failed checks: {len(failed)}",
        "",
        "| Scope | Check | Status | Detail |",
        "|---|---|---|---|",
    ]
    for c in checks:
        lines.append(f"| {c['scope']} | {c['check']} | {c['status']} | {c['detail']} |")
    md = "\n".join(lines) + "\n"
    md_path.write_text(md)
    latest_md.write_text(md)

    print(f"Insurance alignment audit: {len(checks)} checks, {len(failed)} failed")
    print(f"MD:   {md_path}")
    print(f"JSON: {json_path}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
