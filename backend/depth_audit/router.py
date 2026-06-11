"""/api/v1/depth-audit/* · §132 · brutal depth audit · per dimension · per dept."""
from __future__ import annotations
from fastapi import APIRouter
from _adapter_helpers import stamp

router = APIRouter(prefix="/api/v1/depth-audit", tags=["depth-audit"])


# ════════════════════ 15 DIMENSIONS ════════════════════
DIMENSIONS = [
    "1. Analysis depth",
    "2. Data analysis",
    "3. Manual process",
    "4. Automatic process",
    "5. Input definition",
    "6. Process flow",
    "7. Output",
    "8. Reports",
    "9. Dashboards",
    "10. ResAI (Responsible AI)",
    "11. ExpAI (Explainable AI)",
    "12. Pain points",
    "13. AS-IS state",
    "14. TO-BE state",
    "15. Problem statement",
]


# ════════════════════ DEPTH SCORING RUBRIC ════════════════════
DEPTH_LEVELS = [
    {"score": 0,  "label": "Missing",    "criteria": "no surface · no endpoint · no data"},
    {"score": 2,  "label": "Stub",       "criteria": "endpoint exists · returns hard-coded skeleton"},
    {"score": 4,  "label": "Spec",       "criteria": "structured catalog · multiple sub-fields · no real data"},
    {"score": 6,  "label": "Functional", "criteria": "real data from DB · calculated · per-record"},
    {"score": 8,  "label": "Production", "criteria": "+ tests · drift detection · audit · KPIs · linked to other dims"},
    {"score": 10, "label": "TOP-1%",     "criteria": "+ adversarial verified · regulator-defensible · runbook"},
]


# ════════════════════ HONEST PER-DIMENSION ASSESSMENT (Claims dept) ════════════════════
CLAIMS_DEPTH = [
    {
        "dim": "1. Analysis depth",
        "endpoint": "/api/v1/dept/claims/overview",
        "score": 4, "level": "Spec",
        "what_exists": "18 endpoints · catalog of dimensions · no calculated metric across them",
        "what_missing": "No analytical narrative that ties dimensions to each other · no SHAP-style importance per dim · no scenario stress test",
        "to_climb": "Build /analysis endpoint that runs each dim against real claims · returns cross-dim correlations · ANOVA across cohorts",
    },
    {
        "dim": "2. Data analysis",
        "endpoint": "/api/v1/dept/claims/data-inventory + /dashboard",
        "score": 6, "level": "Functional",
        "what_exists": "7 sources cataloged · live aggregates from claims_record · by-status by-type breakdowns",
        "what_missing": "No drift detection · no PSI/CSI · no per-feature histogram · no missing-value scan",
        "to_climb": "Add /data-quality · /drift · /distributions endpoints sourced from claims_record",
    },
    {
        "dim": "3. Manual process",
        "endpoint": "/api/v1/dept/claims/manual",
        "score": 5, "level": "Spec",
        "what_exists": "7 steps · actor · time per step · action description · total ~7 hours",
        "what_missing": "No actor handoff diagram · no SLA per step · no escalation path · no cost per step · no real claim walked through",
        "to_climb": "Add /walk-through/{claim_id} that animates a real CL-XXX through all 7 steps",
    },
    {
        "dim": "4. Automatic process",
        "endpoint": "/api/v1/dept/claims/automatic",
        "score": 5, "level": "Spec",
        "what_exists": "7 steps · agent per step · time per step (~14 sec total) · action",
        "what_missing": "Agents NOT actually wired to LLMs · no actual auto-decision happens · no per-tenant config · no fallback to manual",
        "to_climb": "Wire each sys_claims_*_agent to actual function · run end-to-end on CL-001",
    },
    {
        "dim": "5. Input definition",
        "endpoint": "/api/v1/dept/claims/kg/ontology",
        "score": 4, "level": "Spec",
        "what_exists": "5 classes · 5 obj-props · sample turtle · 10 seed claims",
        "what_missing": "No data contract · no schema versioning · no ingestion validation · no API for new claims",
        "to_climb": "Add POST /claims/submit with JSON schema validation + idempotency key",
    },
    {
        "dim": "6. Process flow",
        "endpoint": "/api/v1/dept/claims/as-is-to-be + /process-ai",
        "score": 6, "level": "Functional",
        "what_exists": "Per-step AI mapping · model · tier · AS-IS vs TO-BE delta",
        "what_missing": "No actual flow diagram (BPMN) · no DAG visualization · no retry/circuit-breaker behavior",
        "to_climb": "Generate BPMN XML at /flow/bpmn + Mermaid at /flow/mermaid",
    },
    {
        "dim": "7. Output",
        "endpoint": "/api/v1/dept/claims/value-impact",
        "score": 7, "level": "Functional",
        "what_exists": "$16M/yr math · processing + fraud + capacity savings · payback 1mo · ROI 1300%",
        "what_missing": "No sensitivity analysis · no monte-carlo · no per-segment breakdown · no actual claim payout output",
        "to_climb": "Add /output/sample/{claim_id} that shows decision + payout + letter + audit row",
    },
    {
        "dim": "8. Reports",
        "endpoint": "(missing)",
        "score": 0, "level": "Missing",
        "what_exists": "Nothing",
        "what_missing": "No /reports endpoint at all · no PDF export · no scheduled reports · no email distribution",
        "to_climb": "Add /reports/daily · /reports/weekly · /reports/monthly with PDF export",
    },
    {
        "dim": "9. Dashboards",
        "endpoint": "/api/v1/dept/claims/dashboard",
        "score": 6, "level": "Functional",
        "what_exists": "KPI tiles · by-status · by-type · live aggregates",
        "what_missing": "No time-series · no per-adjuster · no per-region · no graph viz (Cytoscape.js)",
        "to_climb": "Add /dashboard/timeline · /dashboard/by-adjuster · /dashboard/graph-viz",
    },
    {
        "dim": "10. ResAI (Responsible AI)",
        "endpoint": "/api/v1/dept/claims/rai",
        "score": 6, "level": "Functional",
        "what_exists": "5 pillars per §76 · fairness metrics (DI 0.91 · EO-gap 3%) · controls per pillar",
        "what_missing": "Hard-coded scores · no live computation · no per-cohort fairness · no calibration check",
        "to_climb": "Recompute fairness live from claims_record by sampling cohorts · add reliability diagram",
    },
    {
        "dim": "11. ExpAI (Explainable AI)",
        "endpoint": "/api/v1/dept/claims/xai/{claim_id}",
        "score": 6, "level": "Functional",
        "what_exists": "SHAP-style per claim · 6 features · counterfactual · base rate · decision basis",
        "what_missing": "Hard-coded SHAP values (not from real model) · no global SHAP summary · no PDP/ALE · no LIME alternative",
        "to_climb": "Wire to actual GradientBoost model on claims_record · run real SHAP",
    },
    {
        "dim": "12. Pain points",
        "endpoint": "/api/v1/dept/claims/as-is-to-be",
        "score": 7, "level": "Functional",
        "what_exists": "4 pain points named (5-day wait · fraud after payout · adjuster overload · 3wk audit)",
        "what_missing": "No quantification per pain (lost $/yr per item) · no customer complaints data · no NPS data",
        "to_climb": "Add /pain/quantified with $ per pain · customer complaints · NPS drag",
    },
    {
        "dim": "13. AS-IS state",
        "endpoint": "/api/v1/dept/claims/as-is-to-be",
        "score": 7, "level": "Functional",
        "what_exists": "8 metrics (MTTR · auto-rate · fraud recall · cost · NPS · adjuster overload · data silos · pain list)",
        "what_missing": "No source for AS-IS numbers (claim or assumption?) · no historical trend",
        "to_climb": "Cite AS-IS numbers from actual systems · add 12-mo trend",
    },
    {
        "dim": "14. TO-BE state",
        "endpoint": "/api/v1/dept/claims/as-is-to-be",
        "score": 5, "level": "Spec",
        "what_exists": "8 target metrics · benefits list · delta calculation",
        "what_missing": "No phased rollout (3mo → 6mo → 12mo targets) · no realistic floor (TO-BE is best-case)",
        "to_climb": "Add /to-be/phased with 3-tier targets + confidence intervals",
    },
    {
        "dim": "15. Problem statement",
        "endpoint": "(implicit in /user-story + /demo-story)",
        "score": 5, "level": "Spec",
        "what_exists": "Sarah Chen persona · clear 'I want · so that' · 5 AC",
        "what_missing": "No formal problem statement (5W1H) · no root cause analysis · no upstream/downstream impact",
        "to_climb": "Add /problem/formal endpoint with 5W1H · ishikawa diagram · stakeholder impact map",
    },
]


def _summary(items):
    total = sum(i["score"] for i in items)
    max_s = len(items) * 10
    pct = round(100 * total / max_s, 1)
    band = ("TOP_1_PCT"  if pct >= 92 else
            "TOP_5_PCT"  if pct >= 82 else
            "TOP_25_PCT" if pct >= 70 else
            "MID"        if pct >= 50 else
            "BOTTOM")
    weakest = sorted(items, key=lambda x: x["score"])[:3]
    strongest = sorted(items, key=lambda x: -x["score"])[:3]
    by_level = {}
    for i in items:
        by_level[i["level"]] = by_level.get(i["level"], 0) + 1
    return {"total": total, "max": max_s, "pct": pct, "band": band,
            "by_level": by_level,
            "weakest_3": [{"dim": x["dim"], "score": x["score"]} for x in weakest],
            "strongest_3": [{"dim": x["dim"], "score": x["score"]} for x in strongest]}


@router.get("/depth-rubric")
def rubric():
    return {**stamp(), "dimensions": DIMENSIONS,
            "depth_levels": DEPTH_LEVELS, "spec": "§132 rubric"}


@router.get("/claims")
def claims_depth():
    return {**stamp(), "department": "claims",
            "n_dimensions": len(CLAIMS_DEPTH),
            "summary": _summary(CLAIMS_DEPTH),
            "dimensions": CLAIMS_DEPTH,
            "spec": "§132 brutal honest per-dim depth"}


@router.get("/all-depts")
def all_depts():
    """For now only Claims has a real demo · others are spec only."""
    # Pre-built scores for other depts based on operator's §126 mandate
    OTHER_DEPTS = [
        {"dept": "Claims",      "score_pct": _summary(CLAIMS_DEPTH)["pct"],
         "band": _summary(CLAIMS_DEPTH)["band"],
         "endpoints_built": 18},
        {"dept": "Underwriting",  "score_pct": 0.0, "band": "MISSING",
         "endpoints_built": 0,
         "next": "Run §126 dept template · ~30min build"},
        {"dept": "Policy Admin",  "score_pct": 0.0, "band": "MISSING",
         "endpoints_built": 0,
         "next": "Run §126 dept template · ~30min build"},
        {"dept": "Billing",       "score_pct": 0.0, "band": "MISSING",
         "endpoints_built": 0,
         "next": "Run §126 dept template · ~30min build"},
        {"dept": "Contact Center","score_pct": 0.0, "band": "MISSING",
         "endpoints_built": 0,
         "next": "Compose with §128 video intel (call center transcripts)"},
        {"dept": "Sales",         "score_pct": 0.0, "band": "MISSING",
         "endpoints_built": 0,
         "next": "Run §126 dept template"},
        {"dept": "Actuarial",     "score_pct": 0.0, "band": "MISSING",
         "endpoints_built": 0,
         "next": "Run §126 dept template"},
        {"dept": "Risk Mgmt",     "score_pct": 0.0, "band": "MISSING",
         "endpoints_built": 0,
         "next": "Compose with §131 Risk AI categories"},
        {"dept": "Legal & Compliance","score_pct": 0.0, "band": "MISSING",
         "endpoints_built": 0,
         "next": "Compose with §131 Legal AI + Compliance AI"},
        {"dept": "Finance",       "score_pct": 0.0, "band": "MISSING",
         "endpoints_built": 0,
         "next": "Run §126 dept template"},
        {"dept": "HR",            "score_pct": 0.0, "band": "MISSING",
         "endpoints_built": 0,
         "next": "Run §126 dept template"},
        {"dept": "Procurement",   "score_pct": 0.0, "band": "MISSING",
         "endpoints_built": 0,
         "next": "Run §126 dept template"},
        {"dept": "SIU (fraud)",   "score_pct": 0.0, "band": "MISSING",
         "endpoints_built": 0,
         "next": "Compose with Claims fraud agent"},
    ]
    return {**stamp(), "n_depts": len(OTHER_DEPTS),
            "depts": OTHER_DEPTS,
            "brutal": "Only 1 of 13 depts has any demo (Claims). 12 depts at 0%.",
            "spec": "§132 all-dept depth"}


@router.get("/health")
def health():
    return {**stamp(), "module": "depth-audit",
            "dimensions": len(DIMENSIONS),
            "spec": "§132"}


@router.get("/overview")
def overview():
    s = _summary(CLAIMS_DEPTH)
    return {**stamp(),
            "title": "Depth Audit · brutal honest scorecard",
            "claims_dept_score": f"{s['pct']}% · {s['band']}",
            "weakest_3_claims": s["weakest_3"],
            "strongest_3_claims": s["strongest_3"],
            "n_depts_with_demo": 1,
            "n_depts_total": 13,
            "endpoints": [
                "/depth-rubric        · 15 dims + 6 depth levels",
                "/claims              · per-dim score for Claims (live)",
                "/all-depts           · enterprise rollup",
                "/health · /overview",
            ],
            "next_priority": "Climb Claims weakest 3 dims: Reports (0) · Manual process (5) · Automatic process (5)",
            "spec": "§132"}
