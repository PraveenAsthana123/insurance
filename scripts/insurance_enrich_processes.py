#!/usr/bin/env python3
"""Enrich every process in data/insurance/blueprint.json with 7 new fields:

  - manual_process      — current AS-IS (humans + tools)
  - automatic_process   — TO-BE (AI workflow)
  - data_process        — data lineage (input → transform → output)
  - explainable_ai      — ExpAI methods (per global §48)
  - responsible_ai      — ResAI fairness/bias gates (per global §38)
  - governance_ai       — decision audit + HITL + scope (per global §40)
  - smart_kpi           — Specific / Measurable / Achievable / Relevant / Time-bound

Each field is marked `derived: true` so the operator can distinguish auto-filled
skeletons from operator-edited specifics. Idempotent: re-running NEVER overwrites
operator edits (existing fields are preserved unchanged).

Run:
    python scripts/insurance_enrich_processes.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLUEPRINT = ROOT / "data" / "insurance" / "blueprint.json"

# Generic actor archetypes per dept-ID range (derived from operator's depts)
ACTOR_ARCHETYPES = {
    7:  ["Claim Adjuster", "Customer", "Supervisor"],
    8:  ["SIU Investigator", "Fraud Analyst", "Law Enforcement Liaison"],
    9:  ["Contact Center Agent", "Customer", "Supervisor"],
    10: ["Actuary", "Senior Actuary", "Chief Actuary"],
    11: ["Reinsurance Manager", "Broker", "Catastrophe Modeler"],
    12: ["Compliance Officer", "Auditor", "Regulator"],
    13: ["Lawyer", "Paralegal", "General Counsel"],
    14: ["Accountant", "Controller", "CFO"],
    15: ["Risk Officer", "Risk Analyst", "CRO"],
    16: ["HR Manager", "Recruiter", "Employee"],
    17: ["Procurement Officer", "Vendor Manager", "CPO"],
    18: ["Data Engineer", "Data Steward", "CDO"],
    19: ["IT Operator", "SRE", "CIO"],
    20: ["SOC Analyst", "Security Engineer", "CISO"],
    21: ["Sales Representative", "Broker", "Sales Manager"],
    22: ["Product Manager", "Designer", "Chief Product Officer"],
    1:  ["Product Manager", "Designer", "Chief Product Officer"],
    3:  ["Sales Rep", "Broker", "VP Sales"],
    4:  ["Underwriter", "Senior Underwriter", "Chief Underwriter"],
    5:  ["Policy Administrator", "Operations Manager", "Compliance Officer"],
    6:  ["Billing Specialist", "Collections Agent", "Finance Manager"],
}


def _ensure(obj: dict, key: str, default):
    """Set obj[key] = default only if key absent. Preserves operator edits."""
    if key not in obj:
        obj[key] = default
        return True
    return False


def enrich_process(proc: dict, dept: dict) -> int:
    """Add the 7 derived fields to a process if absent. Returns count added."""
    added = 0
    dept_id = dept.get("id")
    dept_systems = dept.get("systems", []) or []
    dept_data_sources = dept.get("data_sources", []) or []
    dept_kpis = dept.get("kpi_improvements", []) or []
    dept_mission = (dept.get("mission") or "")[:120]

    process_issues = [i.get("issue", "") for i in (proc.get("issues") or []) if isinstance(i, dict)]
    process_ai_types = [a.get("ai_type", "") for a in (proc.get("ai") or []) if isinstance(a, dict)]

    actors = ACTOR_ARCHETYPES.get(dept_id, ["Operator"])

    # 0. Issues — seed a derived skeleton so the Problem tab renders for every
    # process. Operator paste replaces the array (idempotent guard preserves it).
    if not proc.get("issues"):
        proc_name = proc.get("name") or "this process"
        proc["issues"] = [
            {
                "derived": True,
                "issue": f"{proc_name} runs as a mostly-manual workflow today",
                "impact": "Cycle time, error rate, and reviewer cognitive load all above target",
            },
            {
                "derived": True,
                "issue": "Decisions lack consistent audit trail + explainability",
                "impact": "Hard to defend in regulator review; replays during incidents are slow",
            },
        ]
        added += 1

    # 1. Manual process — derived from issues + actors
    if _ensure(proc, "manual_process", {
        "derived": True,
        "summary": "Today: humans manually execute this process; pain points captured in `issues` above.",
        "actor_archetypes": actors,
        "tools": dept_systems[:3] if dept_systems else ["Email", "Spreadsheet", "Domain system"],
        "current_pain": process_issues or ["[operator: list current pain points]"],
        "_note": "Replace `derived: true` with specifics when operator content lands.",
    }): added += 1

    # 2. Automatic process — derived from ai field
    if _ensure(proc, "automatic_process", {
        "derived": True,
        "summary": "TO-BE: AI orchestrates the workflow via the `ai` capabilities above.",
        "ai_workflow": process_ai_types or ["[operator: list AI agent chain]"],
        "human_in_the_loop": "Escalation when confidence < 0.7 (per global §40 decision system).",
        "scope_grants": "Each agent runs under tenant-scoped policy with audit-row per action (per global §38).",
        "_note": "Replace `derived: true` with specifics when operator content lands.",
    }): added += 1

    # 3. Data process — input → transform → output
    if _ensure(proc, "data_process", {
        "derived": True,
        "summary": "Data lineage for this process.",
        "input": dept_data_sources[:5] if dept_data_sources else ["[operator: list inputs]"],
        "transform": dept_systems[:5] if dept_systems else ["[operator: list systems]"],
        "output": ["Decision audit row", "Downstream event", "Customer/internal notification"],
        "_note": "Replace `derived: true` with specifics when operator content lands.",
    }): added += 1

    # 4. Explainable AI (ExpAI)
    if _ensure(proc, "explainable_ai", {
        "derived": True,
        "global_policy": "§48",
        "methods": [
            "SHAP global feature importance per model",
            "Per-prediction local SHAP / Integrated Gradients (deep models)",
            "Counterfactual ('if X had been Y, decision would have flipped')",
            "Retrieval trail + citation mapping for RAG outputs",
        ],
        "surface": "/api/v1/explain?prediction_id=<id>",
        "decision_audit_field": "explanation.top_features[]",
        "_note": "Replace `derived: true` with process-specific ExpAI methods when operator confirms.",
    }): added += 1

    # 5. Responsible AI (ResAI)
    if _ensure(proc, "responsible_ai", {
        "derived": True,
        "global_policy": "§38 + §48.8",
        "fairness_gate": "Disparate impact ≥ 0.8 across protected groups",
        "equal_opportunity_gap": "< 5% across protected groups",
        "bias_audit": "Weekly drift check on group performance gaps",
        "privacy": "PII redaction in logs; consent traceability per global §47.6 SOC2 CC6.2",
        "audit_row_fields": ["fairness_flag", "human_override", "explanation"],
        "_note": "Replace `derived: true` with process-specific ResAI thresholds when operator confirms.",
    }): added += 1

    # 6. Governance AI
    if _ensure(proc, "governance_ai", {
        "derived": True,
        "global_policy": "§40 + §47.6 + §64.40",
        "decision_layer": "Rule → Confidence → Human-in-Loop routing",
        "confidence_tiers": {
            "auto_decision": "> 0.8",
            "human_review": "0.5 - 0.8",
            "reject_or_fallback": "< 0.5",
        },
        "scope_grants": "Per-agent scope_required vs scope_granted enforced at policy engine layer",
        "rollback": "Reversible actions support rollback; irreversible actions require human approval",
        "_note": "Replace `derived: true` with process-specific governance thresholds when operator confirms.",
    }): added += 1

    # 7. SMART KPI
    primary_kpi = dept_kpis[0] if dept_kpis else {"kpi": "Process cycle time", "improvement": "tbd"}
    if _ensure(proc, "smart_kpi", {
        "derived": True,
        "specific": f"{proc.get('name', 'this process')} — automate the AI workflow listed above",
        "measurable": f"{primary_kpi.get('kpi', 'tbd')} target {primary_kpi.get('improvement', 'tbd')}",
        "achievable": primary_kpi.get("improvement", "tbd"),
        "relevant": f"Supports dept mission: {dept_mission}{'…' if len(dept.get('mission', '')) > 120 else ''}",
        "time_bound": "12-month target; quarterly progress review",
        "_note": "Replace `derived: true` with a process-specific SMART KPI when operator confirms.",
    }): added += 1

    return added


def enrich_remaining_tabs(proc: dict, dept: dict) -> int:
    """Seed the other 9 tab fields per process (per global §73.10):
    readme (10 sub-sections) · tech_stack · demo_story · as_is_to_be ·
    flow_diagram · output · visualization · tests · security.
    All marked `derived: true`. Idempotent.
    """
    added = 0
    dept_id = dept.get("id")
    dept_systems = dept.get("systems", []) or []
    dept_data = dept.get("data_sources", []) or []
    dept_agents = dept.get("agents", []) or []
    dept_kpis = dept.get("kpi_improvements", []) or []
    proc_name = proc.get("name", "this process")
    actors = ACTOR_ARCHETYPES.get(dept_id, ["Operator"])
    ai_workflow = [a.get("ai_type") for a in (proc.get("ai") or []) if isinstance(a, dict)]

    # 1. README (10 architecture sub-sections per §73.12a)
    if _ensure(proc, "readme", {
        "derived": True,
        "brd": {
            "derived": True,
            "title": f"BRD — {proc_name}",
            "goal": f"[operator: business goal for {proc_name}]",
            "success_criteria": "[operator: measurable success criteria]",
            "stakeholders": actors,
            "scope": "[operator: in-scope / out-of-scope]",
            "constraints": "[operator: regulatory / time / cost constraints]",
        },
        "frd": {
            "derived": True,
            "title": f"FRD — {proc_name}",
            "use_cases": [f"UC-1: {proc_name} happy path", "UC-2: edge case", "UC-3: error handling"],
            "acceptance_criteria": "[operator: AC per UC]",
            "non_goals": "[operator: explicitly out of scope]",
        },
        "hld": {
            "derived": True,
            "title": f"HLD — {proc_name}",
            "system_context": f"Part of dept {dept_id} ({dept.get('name', '')[:40]})",
            "major_components": dept_agents[:5] if dept_agents else ["[operator: list components]"],
            "data_flow": "Input → Validation → AI workflow → Decision → Audit row → Output",
            "nfrs": ["Latency p95 < SLA", "Availability ≥ 99.5%", "Auditability 100%"],
            "risks": "[operator: list HLD risks]",
        },
        "lld": {
            "derived": True,
            "title": f"LLD — {proc_name}",
            "class_diagrams": "[operator: per-component class diagram (mermaid)]",
            "sequence_per_use_case": "[operator: per-UC sequence diagram]",
            "api_contracts": "[operator: per-endpoint contract]",
            "state_machines": "[operator: per stateful component]",
        },
        "sad": {
            "derived": True,
            "title": f"SAD — {proc_name}",
            "executive_summary": f"System architecture for {proc_name} per dept {dept_id} mission",
            "c4_views": "See C4 sub-section",
            "cross_cutting": ["Auth", "Audit", "Observability", "Rate limiting"],
            "adrs": "[operator: link to ADRs governing this process]",
        },
        "c4": {
            "derived": True,
            "format": "mermaid",
            "l1_context": f"graph TB\n  user[User] --> system[{proc_name}]\n  system --> downstream[Downstream consumers]",
            "l2_containers": "[operator: container diagram in mermaid]",
            "l3_components": "[operator: component diagram in mermaid]",
            "l4_code": "[operator: per-component class diagram in mermaid]",
        },
        "sequence": {
            "derived": True,
            "format": "mermaid",
            "happy_path": f"sequenceDiagram\n  User->>API: request\n  API->>{(ai_workflow[0] if ai_workflow else 'AI')}: process\n  {(ai_workflow[0] if ai_workflow else 'AI')}-->>API: decision\n  API-->>User: response + audit_row",
            "error_path": "[operator: error sequence diagram]",
        },
        "network": {
            "derived": True,
            "topology": "[operator: topology diagram (draw.io / SVG)]",
            "subnets": ["public-DMZ", "private-app", "private-data"],
            "ingress": "API gateway (HTTPS-only, rate-limited)",
            "egress": "External services via NAT + allowlist",
            "firewalls": "[operator: per-tier firewall rules]",
        },
        "api": {
            "derived": True,
            "format": "OpenAPI 3.0",
            "endpoints": [f"GET /api/v1/{(proc_name or 'process').lower().replace(' ', '-')}", "POST /api/v1/...", "PATCH /api/v1/..."],
            "auth": "Bearer token (OAuth2) + tenant header per global §41.3",
            "rate_limit": "100 req/min/tenant (default)",
            "examples": "[operator: request/response samples]",
        },
        "db_schema": {
            "derived": True,
            "primary_table": (proc_name or "process").lower().replace(' ', '_'),
            "columns_sketch": ["id (uuid)", "tenant_id (uuid)", "created_at (ts)", "updated_at (ts)", "status (enum)", "audit_row_id (uuid)"],
            "indexes": ["tenant_id + created_at (queries)", "status (filtering)"],
            "fks": "[operator: list FK relationships]",
            "migrations": "[operator: link migration files]",
        },
        # 8 banking-style operational/strategy sub-sections (added 2026-06-03 per §73.3c v2)
        "adr": {
            "derived": True,
            "title": f"ADR-001 — {proc_name}",
            "status": "Proposed",
            "context": f"Why {proc_name} needs an architectural decision recorded.",
            "decision": "[operator: the decision in one sentence]",
            "consequences_positive": ["Auditability + reversibility per §47.3"],
            "consequences_negative": ["[operator: trade-offs accepted]"],
            "alternatives_considered": ["[operator: list alternatives evaluated]"],
            "references": ["§38 governance", "§40 decision system", "§47 architecture"],
        },
        "runbook": {
            "derived": True,
            "title": f"Runbook — {proc_name}",
            "incident_severity_matrix": {"P1": "service down", "P2": "degraded", "P3": "transient"},
            "on_call_rotation": "[operator: PagerDuty / Opsgenie rotation]",
            "common_failures": [f"{proc_name} timeout", "Upstream dep unavailable", "Audit-row write fail"],
            "rollback_procedure": "Per global §47.7 4-layer rollback (app · DB · AI · infra)",
            "smoke_check": "curl /api/health · drill_insurance_alignment.py",
        },
        "roadmap": {
            "derived": True,
            "title": f"Roadmap — {proc_name}",
            "q1": ["Ship AS-IS baseline"],
            "q2": ["Wire Automatic process pilot"],
            "q3": ["Operator-confirmed content for 17 tabs"],
            "q4": ["GA + monitor + drift detection"],
            "blockers": "[operator: list cross-team dependencies]",
        },
        "stakeholders": {
            "derived": True,
            "title": f"Stakeholders — {proc_name}",
            "owner": actors[0] if actors else "Operator",
            "sponsor": "[operator: exec sponsor]",
            "consumer": "[operator: downstream consumers]",
            "raci": {
                "responsible": actors[0] if actors else "Operator",
                "accountable": actors[-1] if actors else "Operator",
                "consulted": "[operator: SMEs]",
                "informed": "[operator: distribution list]",
            },
            "escalation_chain": "[operator: L1 → L2 → L3 escalation path]",
        },
        "executive_summary": {
            "derived": True,
            "title": f"Executive summary — {proc_name}",
            "headline": f"{proc_name}: AS-IS manual workflow being transformed to TO-BE AI orchestration.",
            "value_today": "[operator: dollar value AS-IS]",
            "value_target": "[operator: dollar value TO-BE]",
            "ask": "[operator: budget / headcount / time ask]",
            "risk_summary": "Per §47.6 4-lens security review attached.",
        },
        "capacity": {
            "derived": True,
            "title": f"Capacity planning — {proc_name}",
            "peak_qps_today": "[operator: peak QPS observed]",
            "peak_qps_target": "[operator: 12-month target]",
            "data_volume_today": "[operator: rows/day or GB/day]",
            "growth_assumption": "[operator: CAGR]",
            "scaling_plan": "Horizontal via §47.8 K8s 3-probe + §47.10 5-phase load test pre-validated.",
        },
        "ai_strategy": {
            "derived": True,
            "title": f"AI strategy — {proc_name} (4P)",
            "people": "[operator: org-chart impact + training plan]",
            "process": "[operator: TO-BE process maps + automation %]",
            "profit": "[operator: cost-out + revenue-up + ROI horizon]",
            "technology": "[operator: stack shift + build-vs-buy + lock-in risk]",
            "global_policy": "Per §64.4 (4P) + §53 maturity stack",
        },
        "cost_analysis": {
            "derived": True,
            "title": f"Cost analysis — {proc_name}",
            "build_cost_one_time": "[operator: build $$$]",
            "run_cost_monthly": "[operator: monthly run $$$]",
            "savings_monthly": "[operator: monthly savings $$$]",
            "break_even_months": "[operator: months]",
            "roi_3yr": "[operator: 3-year ROI %]",
            "global_policy": "Per §41.1 FinOps + §53 enterprise maturity",
        },
    }): added += 1

    # 1b. README — back-fill 8 banking-style sub-sections on processes that
    # already have `readme` from earlier enrich runs (idempotent: never overwrites).
    readme = proc.get("readme") or {}
    if readme:
        backfill_subs = {
            "adr": {
                "derived": True, "title": f"ADR-001 — {proc_name}", "status": "Proposed",
                "context": f"Why {proc_name} needs an architectural decision recorded.",
                "decision": "[operator: the decision in one sentence]",
                "consequences_positive": ["Auditability + reversibility per §47.3"],
                "consequences_negative": ["[operator: trade-offs accepted]"],
                "alternatives_considered": ["[operator: list alternatives evaluated]"],
                "references": ["§38 governance", "§40 decision system", "§47 architecture"],
            },
            "runbook": {
                "derived": True, "title": f"Runbook — {proc_name}",
                "incident_severity_matrix": {"P1": "service down", "P2": "degraded", "P3": "transient"},
                "on_call_rotation": "[operator: PagerDuty / Opsgenie rotation]",
                "common_failures": [f"{proc_name} timeout", "Upstream dep unavailable", "Audit-row write fail"],
                "rollback_procedure": "Per global §47.7 4-layer rollback (app · DB · AI · infra)",
                "smoke_check": "curl /api/health · drill_insurance_alignment.py",
            },
            "roadmap": {
                "derived": True, "title": f"Roadmap — {proc_name}",
                "q1": ["Ship AS-IS baseline"], "q2": ["Wire Automatic process pilot"],
                "q3": ["Operator-confirmed content for 17 tabs"], "q4": ["GA + monitor + drift detection"],
                "blockers": "[operator: list cross-team dependencies]",
            },
            "stakeholders": {
                "derived": True, "title": f"Stakeholders — {proc_name}",
                "owner": actors[0] if actors else "Operator",
                "sponsor": "[operator: exec sponsor]",
                "consumer": "[operator: downstream consumers]",
                "raci": {
                    "responsible": actors[0] if actors else "Operator",
                    "accountable": actors[-1] if actors else "Operator",
                    "consulted": "[operator: SMEs]",
                    "informed": "[operator: distribution list]",
                },
                "escalation_chain": "[operator: L1 → L2 → L3 escalation path]",
            },
            "executive_summary": {
                "derived": True, "title": f"Executive summary — {proc_name}",
                "headline": f"{proc_name}: AS-IS manual workflow being transformed to TO-BE AI orchestration.",
                "value_today": "[operator: dollar value AS-IS]",
                "value_target": "[operator: dollar value TO-BE]",
                "ask": "[operator: budget / headcount / time ask]",
                "risk_summary": "Per §47.6 4-lens security review attached.",
            },
            "capacity": {
                "derived": True, "title": f"Capacity planning — {proc_name}",
                "peak_qps_today": "[operator: peak QPS observed]",
                "peak_qps_target": "[operator: 12-month target]",
                "data_volume_today": "[operator: rows/day or GB/day]",
                "growth_assumption": "[operator: CAGR]",
                "scaling_plan": "Horizontal via §47.8 K8s 3-probe + §47.10 5-phase load test pre-validated.",
            },
            "ai_strategy": {
                "derived": True, "title": f"AI strategy — {proc_name} (4P)",
                "people": "[operator: org-chart impact + training plan]",
                "process": "[operator: TO-BE process maps + automation %]",
                "profit": "[operator: cost-out + revenue-up + ROI horizon]",
                "technology": "[operator: stack shift + build-vs-buy + lock-in risk]",
                "global_policy": "Per §64.4 (4P) + §53 maturity stack",
            },
            "cost_analysis": {
                "derived": True, "title": f"Cost analysis — {proc_name}",
                "build_cost_one_time": "[operator: build $$$]",
                "run_cost_monthly": "[operator: monthly run $$$]",
                "savings_monthly": "[operator: monthly savings $$$]",
                "break_even_months": "[operator: months]",
                "roi_3yr": "[operator: 3-year ROI %]",
                "global_policy": "Per §41.1 FinOps + §53 enterprise maturity",
            },
        }
        for sub_key, sub_val in backfill_subs.items():
            if sub_key not in readme:
                readme[sub_key] = sub_val
                added += 1

    # 2. Tech stack
    if _ensure(proc, "tech_stack", {
        "derived": True,
        "frontend": ["React 18", "Vite", "vanilla CSS (per global §14.1)"],
        "backend": ["FastAPI", "Python 3.11+", "Pydantic v2"],
        "data": ["PostgreSQL", "Redis (cache)", "Snowflake (warehouse)"],
        "ai_runtime": ["Ollama (local LLM)", "vLLM (inference)", "LangChain (orchestration)"],
        "observability": ["OpenTelemetry", "Prometheus", "Grafana", "Loki (logs)"],
        "process_specific_systems": dept_systems[:5] if dept_systems else ["[operator: list per-process systems]"],
        "_note": "Replace `derived: true` with operator-confirmed stack.",
    }): added += 1

    # 3. Demo story
    if _ensure(proc, "demo_story", {
        "derived": True,
        "persona": f"{actors[0] if actors else 'Operator'} (primary actor)",
        "scenario": f"[operator: 1-paragraph demo scenario for {proc_name}]",
        "walkthrough": [
            f"Step 1: Persona opens {proc_name} workflow",
            f"Step 2: System orchestrates AI ({', '.join(ai_workflow[:3])})",
            "Step 3: Decision rendered + audit row written",
            "Step 4: Persona accepts / overrides / escalates",
        ],
        "pitch": f"[operator: 30-second exec pitch for {proc_name}]",
        "demo_url": f"/insurance/{dept_id}/B2C/[process-id]?tab=demo-story",
    }): added += 1

    # 4. AS-IS → TO-BE
    if _ensure(proc, "as_is_to_be", {
        "derived": True,
        "as_is_summary": "Manual workflow — see Manual process tab",
        "to_be_summary": "AI-orchestrated workflow — see Automatic process tab",
        "deltas": {
            "actors_freed": "[operator: which actor archetypes spend less time]",
            "ai_capabilities_added": ai_workflow,
            "kpi_targets": [k.get("kpi") for k in dept_kpis[:3]] if dept_kpis else ["[operator: list KPIs]"],
        },
        "roi_estimate": "[operator: $-value or % improvement vs AS-IS baseline]",
        "_note": "Replace `derived: true` with operator-confirmed delta + ROI.",
    }): added += 1

    # 5. Flow diagram
    if _ensure(proc, "flow_diagram", {
        "derived": True,
        "format": "mermaid",
        "diagram": (
            f"flowchart TD\n"
            f"  start([Input]) --> validate[Validate]\n"
            f"  validate --> ai_chain[{' → '.join(ai_workflow[:3]) if ai_workflow else 'AI workflow'}]\n"
            f"  ai_chain --> decide{{Confidence ≥ 0.8?}}\n"
            f"  decide -->|yes| auto[Auto-decide + audit row]\n"
            f"  decide -->|no| human[Human review]\n"
            f"  auto --> output([Output])\n"
            f"  human --> output"
        ),
        "_note": "Replace with operator-confirmed per-process flow.",
    }): added += 1

    # 6. Output
    if _ensure(proc, "output", {
        "derived": True,
        "artifacts": (proc.get("data_process") or {}).get("output", ["Decision audit row", "Downstream event"]),
        "downstream_consumers": ["Audit", "Reporting", "Downstream dept"],
        "audit_row_fields": ["request_id", "decision", "confidence", "fairness_flag", "explanation"],
    }): added += 1

    # 7. Visualization
    if _ensure(proc, "visualization", {
        "derived": True,
        "primary_chart": "Time-series of decision volume + confidence distribution",
        "library": "Recharts (per global §64.39.2)",
        "axes": {"x": "time (hourly)", "y": "decision count + avg confidence"},
        "drill_down": "Click any time bar → list of decisions in that window",
        "additional_charts": ["Sankey: input source → decision outcome", "Heatmap: fairness across protected groups"],
    }): added += 1

    # 8. Tests (API · Frontend · Backend)
    if _ensure(proc, "tests", {
        "derived": True,
        "api": {
            "endpoints_under_test": "[operator: list endpoints]",
            "test_count": 0,
            "passing": 0,
            "test_framework": "pytest + httpx",
        },
        "frontend": {
            "component_tests": 0,
            "e2e_tests": 0,
            "a11y_checks": 0,
            "test_framework": "Vitest + React Testing Library + Playwright",
        },
        "backend": {
            "unit_tests": 0,
            "integration_tests": 0,
            "drills": ["[operator: list drill IDs covering this process]"],
            "coverage_pct": 0,
            "test_framework": "pytest + drill discipline per global §43",
        },
        "_note": "Replace 0s with actual test counts as tests are written.",
    }): added += 1

    # 9. Security (Authorization · RBAC · Threat model)
    if _ensure(proc, "security", {
        "derived": True,
        "authorization": {
            "required_scopes": [f"{(proc_name or 'process').lower().replace(' ', '_')}:read", f"{(proc_name or 'process').lower().replace(' ', '_')}:write"],
            "auth_protocol": "OAuth2 + OIDC per global §72 identity-provider module",
            "token_validation": "JWT validated at every API request; per-tenant claim required",
        },
        "rbac": {
            "roles_permitted": ["admin", "manager", actors[0].lower().replace(' ', '_') if actors else "user"],
            "role_action_matrix": "[operator: per-role allowed actions]",
            "least_privilege_check": "Quarterly review per SOC2 CC6.2",
        },
        "threat_model": {
            "stride_categories": ["Spoofing", "Tampering", "Repudiation", "Information disclosure", "Denial of service", "Elevation of privilege"],
            "global_policy": "§47.6 + §64.32",
            "key_risks": ["[operator: list per-process STRIDE risks]"],
        },
        "auth_audit": {
            "events_logged": ["login", "scope_grant", "scope_denied", "role_change", "permission_revoke"],
            "retention": "7 years per SOC2 CC7.2",
        },
        "_note": "Replace `derived: true` with operator-confirmed security posture.",
    }): added += 1

    return added


def enrich_ai_catalog_entry(ai_row: dict) -> int:
    """Add the 5 per-AI fields (Data/Model/Accuracy/Benchmark/Stakeholder) to
    each ai_opportunities row. Per global §73.14 + §73.15. Idempotent."""
    added = 0
    ai_type = ai_row.get("ai_type", "AI")
    scenario = ai_row.get("scenario", "")

    if _ensure(ai_row, "data", {
        "derived": True,
        "training_data": f"Historical {ai_type} decisions + outcomes (5yr window)",
        "inference_inputs": ["[operator: list inference inputs]"],
        "features": ["[operator: list feature names]"],
        "freshness_sla": "[operator: e.g., daily / hourly / real-time]",
        "lineage": "Source → cleaned → feature store → model → audit row",
        "_note": "Replace `derived: true` with operator-confirmed data spec.",
    }): added += 1

    if _ensure(ai_row, "model", {
        "derived": True,
        "architecture": f"[operator: choose for {ai_type} — e.g., XGBoost / Transformer / LLM]",
        "framework": "[operator: e.g., scikit-learn · xgboost · pytorch · langchain]",
        "version": "v0.1 (initial)",
        "runtime": "[operator: e.g., FastAPI service + Redis cache]",
        "prompt_registry": "[operator: required for LLM-backed AI]",
        "_note": "Replace `derived: true` with operator-confirmed model spec.",
    }): added += 1

    if _ensure(ai_row, "accuracy", {
        "derived": True,
        "headline_metric": "[operator: e.g., F1 = 0.84 hold-out (last 90d)]",
        "per_segment": "[operator: breakdown by region / product / customer cohort]",
        "per_group": "[operator: disparate impact, equal opportunity gap by protected attr]",
        "drift_status": "[operator: e.g., stable; weekly check]",
        "_note": "Replace `derived: true` with measured accuracy numbers.",
    }): added += 1

    if _ensure(ai_row, "benchmark", {
        "derived": True,
        "vs_prior_version": "[operator: e.g., +4% F1 vs v0.0]",
        "vs_baseline": "[operator: e.g., +18% F1 vs rule-only baseline]",
        "vs_industry": "[operator: e.g., on par with industry benchmark]",
        "vs_human": "[operator: e.g., on par with senior expert; faster]",
        "_note": "Replace `derived: true` with measured benchmark numbers.",
    }): added += 1

    if _ensure(ai_row, "stakeholder", {
        "derived": True,
        "owner": f"[operator: technical owner team for {ai_type}]",
        "sponsor": "[operator: business sponsor — usually a C-suite or dept head]",
        "consumer": "[operator: downstream consumer dept(s)]",
        "escalation_chain": "[operator: who to page when this AI degrades]",
        "on_call": "[operator: pager rotation email/channel]",
        "scenario_anchor": scenario,
        "_note": "Replace `derived: true` with operator-confirmed stakeholders.",
    }): added += 1

    return added


def main() -> int:
    bp = json.loads(BLUEPRINT.read_text())
    catalog = bp.get("department_catalog") or []
    ai_catalog = bp.get("ai_opportunities") or []
    total_added = 0
    total_procs = 0
    by_dept = {}

    for dept in catalog:
        if not isinstance(dept, dict):
            continue
        dept_id = dept.get("id")
        added_this_dept = 0
        for proc in (dept.get("processes") or []):
            if not isinstance(proc, dict):
                continue
            total_procs += 1
            added_this_dept += enrich_process(proc, dept)
            added_this_dept += enrich_remaining_tabs(proc, dept)
        by_dept[dept_id] = added_this_dept
        total_added += added_this_dept

    ai_added = 0
    for ai_row in ai_catalog:
        if isinstance(ai_row, dict):
            ai_added += enrich_ai_catalog_entry(ai_row)

    BLUEPRINT.write_text(json.dumps(bp, indent=2) + "\n")
    print(f"Enriched {total_procs} processes across {len(catalog)} depts.")
    print(f"Process-level derived fields added: {total_added}.")
    print(f"Enriched {len(ai_catalog)} AI catalog rows with {ai_added} new derived sub-fields.")
    if total_added:
        for did in sorted(by_dept):
            if by_dept[did]:
                print(f"  dept {did:>2}: +{by_dept[did]} fields")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
