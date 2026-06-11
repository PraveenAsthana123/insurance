"""/api/v1/master-plan/* · §134 · execution plan to drive 200 AI types → 10/10."""
from __future__ import annotations
from fastapi import APIRouter
from _adapter_helpers import stamp

router = APIRouter(prefix="/api/v1/master-plan", tags=["master-plan"])


# ════════════════════ 7 PHASES ════════════════════
PHASES = [
    {"phase": 0, "name": "Foundation Hardening",
     "weeks": "1-2", "wall_hr": 80,
     "goal": "All 67 partial types climb to ≥6/10 by closing infrastructure gaps",
     "deliverables": [
        "Backend stays alive (systemd unit · health probe · respawn cron)",
        "All 67 partial impls get DB-backed metrics (drop hard-coded)",
        "PNG visualization pipeline generates real plots to /reports/{type}/",
        "Per-AI-type URL routing (200 URLs) under /ai-type/{slug}",
        "Real GradientBoost trained on claims_record · saved .pkl · /predict endpoint",
        "Real TreeSHAP for fraud_detection (replace simulated)",
        "MLflow live runs (not just integration)",
        "Qdrant + Fuseki + Memgraph docker-compose UP",
        "Ollama qwen2.5vl + llava pulled",
        "Backend health probe + circuit breaker",
     ],
     "gate": "Backend uptime ≥99% · 1 type at 8/10 LIVE"},

    {"phase": 1, "name": "TOP-50 Prioritization + Build",
     "weeks": "3-12", "wall_hr": 500,
     "goal": "Top 50 AI types reach 8/10 (functional · production-near)",
     "selection_criteria": "$ value × insurance domain fit × data availability",
     "top_50_includes": [
        "Fraud Detection AI", "Claims OCR AI", "Document AI", "NLP Claims Triage",
        "Customer Sentiment AI", "Anomaly Detection AI", "Risk Scoring AI",
        "Recommendation AI (repair shop)", "Decision Intelligence", "Generative AI",
        "Conversational AI (chatbot)", "Summarization AI", "Entity Extraction AI",
        "Knowledge Graph AI", "GraphRAG", "Semantic Search AI", "Vector Search AI",
        "Hybrid Search AI", "Self-RAG", "Adaptive RAG", "Reasoning AI (ReAct)",
        "Planning AI", "Memory AI", "RLHF", "Active Learning", "Online Learning",
        "Predictive AI", "Forecasting AI", "Time-Series AI", "Causal AI",
        "Explainable AI", "Responsible AI", "Bias Detection AI", "Fairness AI",
        "Privacy AI", "PII Detection AI", "Compliance AI", "Audit AI",
        "Governance AI", "AI Control Tower", "Evaluation AI", "Observability AI",
        "Monitoring AI", "Drift Detection AI", "MLOps", "LLMOps", "AgentOps",
        "RAGOps", "DataOps AI", "FinOps AI",
     ],
     "per_type_effort_hr": 10,
     "deliverables_per_type": [
        "Trained model (.pkl or HF checkpoint) saved to /models/{type}/",
        "/api/v1/ai-types/{type}/predict endpoint",
        "Real SHAP per prediction via /xai/{type}/{id}",
        "8-section data prep pipeline OUTPUT (PNG files generated)",
        "Per-AI-type UI rendered at /ai-type/{type}",
        "ResAI fairness from real cohorts (live)",
        "Dashboard widget (Cytoscape · Recharts)",
        "Stakeholder approval workflow (HITL queue)",
     ],
     "gate": "All 50 types at ≥8/10 · §132 depth-audit summary ≥80%"},

    {"phase": 2, "name": "Department Rollout",
     "weeks": "13-20", "wall_hr": 400,
     "goal": "Apply §126 dept demo template to 12 remaining depts",
     "depts": ["Underwriting", "Policy Admin", "Billing", "Contact Center",
               "Sales", "Actuarial", "Risk Mgmt", "Legal & Compliance",
               "Finance", "HR", "Procurement", "SIU"],
     "per_dept_effort_hr": 30,
     "deliverables_per_dept": [
        "18 endpoints per §126 contract",
        "Reuse top-50 AI types from Phase 1",
        "Per-dept value-impact $ math",
        "User story + demo story + 7 scenarios",
        "ResAI + ExpAI per dept",
        "Dashboard + KPIs",
     ],
     "gate": "13 depts at ≥70% §132 depth · ~$120M aggregated value impact"},

    {"phase": 3, "name": "Scale via Codegen + Parallel Agents",
     "weeks": "21-30", "wall_hr": 200,
     "goal": "Remaining 150 AI types reach 6/10 (functional spec) via auto-codegen",
     "strategy": [
        "Use §97 council pattern · 3 LLM agents generate §133 14-field stubs in parallel",
        "Auto-train smallest viable baseline per type (e.g., LogisticRegression · TF-IDF)",
        "Use template + LLM-fill · validate via §122 brutal-feedback ≥80%",
        "Reuse §131 taxonomy for type metadata · §133 template for impl",
        "Parallelize: 50 types per wave × 3 waves = 150 types in 10 weeks",
     ],
     "deliverables_per_type": [
        "§133 14-field document (LLM-generated · operator-reviewed)",
        "Baseline model (cheap · fast)",
        "/predict endpoint (may return scaffold for niche types)",
        "Honest scaffold flag where data unavailable (per §57.7)",
     ],
     "gate": "200 of 200 at ≥6/10 · 0 pure labels remaining"},

    {"phase": 4, "name": "Production Hardening",
     "weeks": "31-38", "wall_hr": 320,
     "goal": "Top 50 reach 10/10 (TOP-1% production-grade)",
     "deliverables": [
        "Drift detection · Evidently AI cron per type (200 cron jobs)",
        "Adversarial testing (Garak for LLMs · custom for ML)",
        "Calibration · ECE/Brier for every classifier",
        "Per-cohort fairness audit · monthly",
        "Runbook per type at /runbooks/{type}-incident.md",
        "Chaos engineering · LitmusChaos drills",
        "Load testing · k6 5-phase per §47.10",
        "Pen testing · OWASP ZAP per §47.6",
        "SOC2 + EU AI Act + NIST RMF compliance evidence",
        "MLflow model registry · staged deployment (staging → canary → prod)",
     ],
     "gate": "Top 50 at 10/10 · regulator-defensible · §122 brutal ≥92% TOP_1_PCT"},

    {"phase": 5, "name": "Autonomous Operations",
     "weeks": "39-44", "wall_hr": 240,
     "goal": "Self-healing · self-improving · §103.8 8-self-* loop fully wired",
     "deliverables": [
        "Auto-retrain triggered by drift threshold",
        "Self-test loop per type (§115 goal-loop)",
        "Self-monitoring per type (§103.8 maturity L8)",
        "Self-deployment via §103.5 governance gate",
        "Cost optimization auto-routing (§108 LLM gateway)",
        "Continuous learning · RLHF loop per type",
        "Daily §132 depth-audit + alert on regression",
        "Weekly §122 brutal-feedback regression test",
     ],
     "gate": "Operator intervenes < 1×/week · platform reaches §103 L10"},

    {"phase": 6, "name": "Multi-Vertical Replication",
     "weeks": "45-52", "wall_hr": 200,
     "goal": "Banking · Healthcare verticals using §133.D shared folder",
     "deliverables": [
        "Banking demo (KYC · AML · Credit Scoring · Fraud)",
        "Healthcare demo (EEG · Clinical · Genomics)",
        "Each vertical uses ~/.claude/templates/ai-type-implementation/",
        "Cross-vertical AI types (fraud · governance · audit) shared",
     ],
     "gate": "3 verticals live · ~600 total AI types deployed"},
]


# ════════════════════ TOTAL EFFORT ════════════════════
TOTAL_EFFORT = {
    "phase_0_foundation":       80,
    "phase_1_top_50":           500,
    "phase_2_dept_rollout":     400,
    "phase_3_scale_codegen":    200,
    "phase_4_prod_hardening":   320,
    "phase_5_autonomous":       240,
    "phase_6_multi_vertical":   200,
    "TOTAL_HOURS":              1_940,
    "TOTAL_WEEKS_SOLO":         "~52 weeks (1 year)",
    "TOTAL_WEEKS_10_PERSON":    "~10 weeks (3 months · with 10 FTE)",
    "TOTAL_WEEKS_LLM_ASSISTED": "~6 weeks (with parallel LLM agents · §97 council pattern)",
}


# ════════════════════ RESOURCE OPTIONS ════════════════════
RESOURCE_OPTIONS = [
    {"option": "Solo operator",       "fte": 1,
     "duration_weeks": 52, "$ cost": 150_000, "risk": "burnout · timeline slippage"},
    {"option": "Small team",         "fte": 3,
     "duration_weeks": 20, "$ cost": 360_000, "risk": "managing 3 streams · coord overhead"},
    {"option": "Full team",          "fte": 10,
     "duration_weeks": 10, "$ cost": 700_000, "risk": "onboarding lag · context dilution"},
    {"option": "LLM-assisted (§97 council + autocodegen)", "fte": 2,
     "duration_weeks": 8,  "$ cost": 120_000, "risk": "LLM hallucination · operator review burden",
     "savings": "92% cheaper than full team · 80% faster than solo"},
]


# ════════════════════ MILESTONES ════════════════════
MILESTONES = [
    {"M": 1, "wk": 2,  "milestone": "Phase 0 done · backend stable · 1 type at 8/10"},
    {"M": 2, "wk": 12, "milestone": "Phase 1 done · 50 types at 8/10 · §132 ≥80%"},
    {"M": 3, "wk": 20, "milestone": "Phase 2 done · 13 depts live · $120M value"},
    {"M": 4, "wk": 30, "milestone": "Phase 3 done · 200 types at ≥6/10 · 0 pure labels"},
    {"M": 5, "wk": 38, "milestone": "Phase 4 done · top 50 at 10/10 · regulator-ready"},
    {"M": 6, "wk": 44, "milestone": "Phase 5 done · self-healing · §103 L10"},
    {"M": 7, "wk": 52, "milestone": "Phase 6 done · 3 verticals live · 600 capabilities"},
]


# ════════════════════ HONEST CAVEATS ════════════════════
CAVEATS = [
    "Numbers assume average effort per type · niche types (Quantum ML · ASI) may need 100+hr or remain stubs",
    "Some types may never reach 10/10 (AGI · ASI · Theory of Mind) · capped at 6/10 spec",
    "Real models require labeled data · operator must source or synthetic per §63.21",
    "Regulator compliance varies by jurisdiction · EU AI Act vs SOC2 vs HIPAA differ",
    "Phase 4 hardening is ITERATIVE · top 50 production never 'done' · always drift+retrain",
    "Phase 6 multi-vertical requires domain SME per vertical · operator must contract",
    "Effort estimates ±30% (industry norm) · plan for 30% buffer",
    "Backend stability is BLOCKING · Phase 0 cannot skip",
]


# ════════════════════ ENDPOINTS ════════════════════
@router.get("/phases")
def phases():
    return {**stamp(), "n_phases": len(PHASES), "phases": PHASES, "spec": "§134"}


@router.get("/effort")
def effort():
    return {**stamp(), "total_effort": TOTAL_EFFORT,
            "resource_options": RESOURCE_OPTIONS, "spec": "§134"}


@router.get("/milestones")
def milestones():
    return {**stamp(), "n_milestones": len(MILESTONES),
            "milestones": MILESTONES, "spec": "§134"}


@router.get("/caveats")
def caveats():
    return {**stamp(), "caveats": CAVEATS, "spec": "§134 honest"}


@router.get("/health")
def health():
    return {**stamp(), "module": "master-plan",
            "n_phases": len(PHASES),
            "total_hours": TOTAL_EFFORT["TOTAL_HOURS"], "spec": "§134"}


@router.get("/overview")
def overview():
    return {**stamp(),
            "title": "Master Plan · 200 AI types → 10/10",
            "current_state": "10% avg score · 67 partial · 133 pure labels · 0 prod",
            "target": "Top 50 at 10/10 · 200 at ≥6/10 · 13 depts live",
            "phases": [{"phase": p["phase"], "name": p["name"], "weeks": p["weeks"],
                         "wall_hr": p["wall_hr"]} for p in PHASES],
            "total_effort_hr": TOTAL_EFFORT["TOTAL_HOURS"],
            "fastest_path": "LLM-assisted (§97 council + autocodegen) · 8 weeks · $120K · 2 FTE",
            "endpoints": ["/phases · /effort · /milestones · /caveats · /overview · /health"],
            "spec": "§134"}
