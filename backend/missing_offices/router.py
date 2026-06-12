"""/api/v1/missing-offices/* · Iter 79 · §104 20 offices + 6 dimensions per topic."""
from __future__ import annotations

import psycopg2
import psycopg2.extras
from fastapi import APIRouter

from core.config import get_settings
from missing_offices.offices import all_offices, get_office, OFFICES

# Compose with 22 domains
from enterprise_ai_domains.domains import all_domains, get_domain

router = APIRouter(prefix="/api/v1/missing-offices", tags=["missing-offices"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


# ─────────────────────────────────────────────────────────────────────
# 20 OFFICES

@router.get("/health")
def health():
    return {"status": "ok", "module": "missing-offices",
            "offices_total": len(OFFICES),
            "spec": "§104 · 20 enterprise AI offices most enterprises forget"}


@router.get("")
def list_offices(category: str | None = None):
    offices = all_offices()
    if category:
        offices = [o for o in offices if o["category"].lower() == category.lower()]
    return {
        "offices": [
            {
                "id": o["id"], "name": o["name"], "category": o["category"],
                "purpose": o["purpose"],
                "link": f"/api/v1/missing-offices/by-id/{o['id']}",
                "dashboard_link": f"/api/v1/missing-offices/by-id/{o['id']}/dashboard",
                "operation_link": f"/api/v1/missing-offices/by-id/{o['id']}/operation",
                "resai_link": f"/api/v1/missing-offices/by-id/{o['id']}/resai",
                "manual_link": f"/api/v1/missing-offices/by-id/{o['id']}/manual",
                "automatic_link": f"/api/v1/missing-offices/by-id/{o['id']}/automatic",
                "database_link": f"/api/v1/missing-offices/by-id/{o['id']}/database",
            }
            for o in offices
        ],
        "count": len(offices),
        "categories": sorted({o["category"] for o in offices}),
    }


@router.get("/by-id/{office_id}")
def get_one(office_id: str):
    o = get_office(office_id)
    if not o:
        return {"error": f"unknown office: {office_id}"}
    return o


# ─────────────────────────────────────────────────────────────────────
# 6 dimensions per topic · per operator brief
#   dashboard · operation · resai · manual process · automatic process · database design

def _topic_dashboard(office_or_domain: dict) -> dict:
    """KPIs + live metrics + alert thresholds."""
    return {
        "topic_id": office_or_domain["id"],
        "kpis": office_or_domain.get("kpis", []),
        "live_metrics": {k: "scaffold · plug live datasource" for k in office_or_domain.get("kpis", [])},
        "alert_thresholds": {k: "TBD · operator to set" for k in office_or_domain.get("kpis", [])},
        "spec_note": "§57.7 honest scaffold · plug per office to materialize",
    }


def _topic_operation(office_or_domain: dict) -> dict:
    """Day-to-day ops · who runs it · cadence · escalation."""
    return {
        "topic_id": office_or_domain["id"],
        "owner_role": "platform-architect",
        "cadence": "daily standup · weekly review · monthly governance",
        "escalation_chain": ["L1 ops", "L2 SME", "L3 architect", "Governance Council"],
        "runbook": f"/api/v1/runbook/{office_or_domain['id']}",
        "sla": {"availability": "99.95%", "MTTR": "<30min", "review": "weekly"},
    }


def _topic_resai(office_or_domain: dict) -> dict:
    """Responsible AI · 5 pillars per global §76."""
    return {
        "topic_id": office_or_domain["id"],
        "five_pillars": {
            "Privacy": "PII redaction · least privilege · purpose limitation",
            "Transparency": "Decision audit · model card · prompt version",
            "Robustness": "Input validation · adversarial · fallback",
            "Safety": "Guardrails · HITL · kill-switch",
            "Accountability": "RACI · immutable audit · dispute mechanism",
        },
        "fairness_gate": {"disparate_impact": "≥0.8", "eo_gap": "<5%"},
        "explainability_required": True,
        "spec_note": "Per global §76 + §48 explainability",
    }


def _topic_manual_process(office_or_domain: dict) -> dict:
    """AS-IS · what humans do today step-by-step."""
    return {
        "topic_id": office_or_domain["id"],
        "actor": "Operator / SME / Analyst",
        "steps": [
            "1. Receive request (email · ticket · meeting)",
            "2. Triage · classify · prioritize",
            "3. Gather inputs (data · documents · context)",
            "4. Execute manually (analyze · decide · act)",
            "5. Validate outcome · resolve issues",
            "6. Report status · update ticket · communicate stakeholders",
            "7. Archive evidence · close loop",
        ],
        "time_per_instance_hours": 4,
        "error_rate": "5-15%",
        "bottlenecks": "Manual triage · context-switching · approval delays",
    }


def _topic_automatic_process(office_or_domain: dict) -> dict:
    """TO-BE · agent + MCP automated flow."""
    return {
        "topic_id": office_or_domain["id"],
        "agents": office_or_domain.get("agents", ["sys_supervisor_agent"]),
        "mcps": office_or_domain.get("mcps", ["Knowledge Base", "Data Catalog"]),
        "steps": [
            "1. Trigger received (webhook · cron · operator)",
            "2. Supervisor agent plans (multi-step task graph)",
            "3. Worker agents execute in parallel (validate · enrich · process)",
            "4. Reviewer agent validates (RAGAS · DeepEval · golden tests)",
            "5. Decision policy: confidence/risk → auto/HITL/escalate",
            "6. Audit row written (per §38.3 16-field)",
            "7. Notification dispatched (per §101.D 13 events)",
        ],
        "time_per_instance_seconds": 1.5,
        "error_rate": "<1% (drilled invariants)",
        "savings_per_instance": "~3.95 hours of human work",
    }


def _topic_database(office_or_domain: dict) -> dict:
    """Database schema · tables · key columns · indexes."""
    tid = office_or_domain["id"]
    return {
        "topic_id": tid,
        "primary_table": f"{tid}_record",
        "tables": [
            {"name": f"{tid}_record",
             "columns": ["record_id PK", "tenant_id", "owner", "status", "created_at"]},
            {"name": f"{tid}_audit",
             "columns": ["audit_id PK", "record_id FK", "actor", "action", "payload JSONB", "created_at"]},
            {"name": f"{tid}_metric",
             "columns": ["metric_id PK", "record_id FK", "kpi_name", "value", "captured_at"]},
        ],
        "indexes": [
            f"CREATE INDEX idx_{tid}_tenant ON {tid}_record(tenant_id, status)",
            f"CREATE INDEX idx_{tid}_audit_ts ON {tid}_audit(created_at DESC)",
            f"CREATE INDEX idx_{tid}_metric_kpi ON {tid}_metric(kpi_name, captured_at DESC)",
        ],
        "retention_days": 2557,  # 7 years
        "spec_note": "Per global §38.3 · §47.6 SOC2 CC6 · §101.E 12 mandatory tables",
    }


@router.get("/by-id/{office_id}/dashboard")
def office_dashboard(office_id: str):
    o = get_office(office_id)
    if not o:
        return {"error": f"unknown office: {office_id}"}
    return _topic_dashboard(o)


@router.get("/by-id/{office_id}/operation")
def office_operation(office_id: str):
    o = get_office(office_id)
    if not o:
        return {"error": f"unknown office: {office_id}"}
    return _topic_operation(o)


@router.get("/by-id/{office_id}/resai")
def office_resai(office_id: str):
    o = get_office(office_id)
    if not o:
        return {"error": f"unknown office: {office_id}"}
    return _topic_resai(o)


@router.get("/by-id/{office_id}/manual")
def office_manual(office_id: str):
    o = get_office(office_id)
    if not o:
        return {"error": f"unknown office: {office_id}"}
    return _topic_manual_process(o)


@router.get("/by-id/{office_id}/automatic")
def office_automatic(office_id: str):
    o = get_office(office_id)
    if not o:
        return {"error": f"unknown office: {office_id}"}
    return _topic_automatic_process(o)


@router.get("/by-id/{office_id}/database")
def office_database(office_id: str):
    o = get_office(office_id)
    if not o:
        return {"error": f"unknown office: {office_id}"}
    return _topic_database(o)


# ─────────────────────────────────────────────────────────────────────
# UNIFIED DEPARTMENT VIEW · 22 domains + 20 offices = 42 topics

@router.get("/department/all-topics")
def department_all_topics():
    """All 42 topics under the Enterprise AI Governance Department."""
    topics = []
    for d in all_domains():
        topics.append({
            "id": d["id"], "name": d["name"], "category": d["category"],
            "purpose": d["purpose"], "source": "domain-§103",
            "n_agents": len(d["agents"]), "n_kpis": len(d["kpis"]),
            "links": {
                "detail":    f"/api/v1/enterprise-ai-domains/by-id/{d['id']}",
                "dashboard": f"/api/v1/missing-offices/topic/{d['id']}/dashboard",
                "operation": f"/api/v1/missing-offices/topic/{d['id']}/operation",
                "resai":     f"/api/v1/missing-offices/topic/{d['id']}/resai",
                "manual":    f"/api/v1/missing-offices/topic/{d['id']}/manual",
                "automatic": f"/api/v1/missing-offices/topic/{d['id']}/automatic",
                "database":  f"/api/v1/missing-offices/topic/{d['id']}/database",
            },
        })
    for o in all_offices():
        topics.append({
            "id": o["id"], "name": o["name"], "category": o["category"],
            "purpose": o["purpose"], "source": "office-§104",
            "n_agents": 0, "n_kpis": len(o["kpis"]),
            "links": {
                "detail":    f"/api/v1/missing-offices/by-id/{o['id']}",
                "dashboard": f"/api/v1/missing-offices/by-id/{o['id']}/dashboard",
                "operation": f"/api/v1/missing-offices/by-id/{o['id']}/operation",
                "resai":     f"/api/v1/missing-offices/by-id/{o['id']}/resai",
                "manual":    f"/api/v1/missing-offices/by-id/{o['id']}/manual",
                "automatic": f"/api/v1/missing-offices/by-id/{o['id']}/automatic",
                "database":  f"/api/v1/missing-offices/by-id/{o['id']}/database",
            },
        })
    cats = sorted({t["category"] for t in topics})
    return {
        "department": "Enterprise AI Governance",
        "department_spec": "§103 + §104 · 22 domains + 20 offices = 42 topics",
        "topics": topics, "count": len(topics),
        "categories": cats, "n_categories": len(cats),
        "dimensions_per_topic": ["detail", "dashboard", "operation",
                                 "resai", "manual", "automatic", "database"],
    }


@router.get("/topic/{topic_id}/dashboard")
def unified_dashboard(topic_id: str):
    t = get_domain(topic_id) or get_office(topic_id)
    if not t:
        return {"error": f"unknown topic: {topic_id}"}
    return _topic_dashboard(t)


@router.get("/topic/{topic_id}/operation")
def unified_operation(topic_id: str):
    t = get_domain(topic_id) or get_office(topic_id)
    if not t:
        return {"error": f"unknown topic: {topic_id}"}
    return _topic_operation(t)


@router.get("/topic/{topic_id}/resai")
def unified_resai(topic_id: str):
    t = get_domain(topic_id) or get_office(topic_id)
    if not t:
        return {"error": f"unknown topic: {topic_id}"}
    return _topic_resai(t)


@router.get("/topic/{topic_id}/manual")
def unified_manual(topic_id: str):
    t = get_domain(topic_id) or get_office(topic_id)
    if not t:
        return {"error": f"unknown topic: {topic_id}"}
    return _topic_manual_process(t)


@router.get("/topic/{topic_id}/automatic")
def unified_automatic(topic_id: str):
    t = get_domain(topic_id) or get_office(topic_id)
    if not t:
        return {"error": f"unknown topic: {topic_id}"}
    return _topic_automatic_process(t)


@router.get("/topic/{topic_id}/database")
def unified_database(topic_id: str):
    t = get_domain(topic_id) or get_office(topic_id)
    if not t:
        return {"error": f"unknown topic: {topic_id}"}
    return _topic_database(t)


# ─────────────────────────────────────────────────────────────────────
# Per-role executive views (CEO · CFO · CIO · CTO · CISO · CDO · CAIO · etc.)

ROLES = {
    "ceo":      {"name": "CEO", "lens": "Strategy · Adoption · Value", "horizon": "Quarterly board"},
    "cfo":      {"name": "CFO", "lens": "Cost · Budget · ROI · Forecast", "horizon": "Monthly close"},
    "cio":      {"name": "CIO", "lens": "Technology Portfolio · Vendor · Integration", "horizon": "Quarterly review"},
    "cto":      {"name": "CTO", "lens": "Architecture · Platform · Innovation", "horizon": "Bi-weekly"},
    "ciso":     {"name": "CISO", "lens": "Threat · PII · Compliance · Audit", "horizon": "Daily ops"},
    "cdo":      {"name": "CDO (Data)", "lens": "Data Products · Quality · Lineage · Privacy", "horizon": "Weekly"},
    "caio":     {"name": "CAIO (AI)", "lens": "AI Workforce · Model · Eval · Governance", "horizon": "Weekly"},
    "cxo":      {"name": "CXO / Chief Experience", "lens": "User · Adoption · Trust · NPS", "horizon": "Weekly"},
    "chro":     {"name": "CHRO", "lens": "Workforce · Training · Adoption · Change Mgmt", "horizon": "Monthly"},
    "vp":       {"name": "VP / Department Head", "lens": "Department KPIs · Team capacity · Approval queue", "horizon": "Weekly"},
    "director": {"name": "Director", "lens": "Project · Roadmap · Delivery · Risk", "horizon": "Weekly"},
    "manager":  {"name": "Senior Manager", "lens": "Team · Sprint · Incident · Hand-off", "horizon": "Daily standup"},
}


def _role_view(topic: dict, role_id: str) -> dict:
    """Per-role view of a topic · tailored metrics + questions + recommendations."""
    role = ROLES.get(role_id)
    if not role:
        return {"error": f"unknown role: {role_id}"}
    purpose = topic.get("purpose", "")
    kpis = topic.get("kpis", [])
    questions = topic.get("questions", [])
    agents = topic.get("agents", [])

    role_metrics_map = {
        "cfo": [k for k in kpis if any(w in k.lower() for w in ["cost", "budget", "roi", "spend", "savings", "variance"])][:3] or kpis[:3],
        "cio": [k for k in kpis if any(w in k.lower() for w in ["technology", "vendor", "platform", "adoption"])][:3] or kpis[:3],
        "cto": [k for k in kpis if any(w in k.lower() for w in ["latency", "availability", "throughput", "architecture"])][:3] or kpis[:3],
        "ciso": [k for k in kpis if any(w in k.lower() for w in ["threat", "pii", "injection", "access", "violation"])][:3] or kpis[:3],
        "cdo": [k for k in kpis if any(w in k.lower() for w in ["data", "quality", "lineage", "freshness"])][:3] or kpis[:3],
        "caio": [k for k in kpis if any(w in k.lower() for w in ["agent", "model", "hallucination", "eval", "accuracy"])][:3] or kpis[:3],
        "cxo": [k for k in kpis if any(w in k.lower() for w in ["user", "adoption", "trust", "satisfaction"])][:3] or kpis[:3],
        "chro": [k for k in kpis if any(w in k.lower() for w in ["workforce", "training", "adoption", "skills"])][:3] or kpis[:3],
        "vp": kpis[:3],
        "director": kpis[:3],
        "manager": kpis[:5],
        "ceo": [k for k in kpis if any(w in k.lower() for w in ["roi", "adoption", "value", "risk", "compliance"])][:3] or kpis[:3],
    }
    role_metrics = role_metrics_map.get(role_id, kpis[:3])

    recommendations_map = {
        "ceo": [
            f"Quarterly board update on '{topic['name']}'",
            "Review portfolio-level investment alignment",
            "Approve next-tier funding if ROI ≥ target",
        ],
        "cfo": [
            f"Lock budget envelope for '{topic['name']}'",
            "Set monthly chargeback per consumer department",
            "Trigger Ollama-only mode if cost > threshold",
        ],
        "cio": [
            f"Document vendor lock-in risk for '{topic['name']}'",
            "Verify MCP integration contracts (per §101.A.5)",
            "Quarterly review of platform health",
        ],
        "cto": [
            f"Review architecture C4 (L1-L7) for '{topic['name']}'",
            "Approve ADR(s) per §47.3 if architecture changes",
            "Schedule chaos test next sprint",
        ],
        "ciso": [
            "Confirm OWASP+STRIDE per §47.6 four-lens",
            f"Audit access_registry for '{topic['name']}'",
            "Run quarterly red-team exercise",
        ],
        "cdo": [
            "Confirm data contracts in place (§104.18)",
            "Verify lineage coverage end-to-end",
            "Schedule PII redaction red-team per §76",
        ],
        "caio": [
            f"Verify agent registry status for '{topic['name']}'",
            "Run RAGAS + DeepEval golden tests",
            "Review model registry fallback chain (§101.E)",
        ],
        "cxo": [
            "Survey users (NPS) on this capability",
            "Track adoption % vs target",
            "Quarterly user training refresh",
        ],
        "chro": [
            f"Plan training for {topic['name']} owners",
            "Track change-mgmt adoption metrics",
            "Schedule digital + human workforce review",
        ],
        "vp": [
            f"Weekly sync on '{topic['name']}'",
            "Approve any new policy exceptions",
            "Track team capacity vs backlog",
        ],
        "director": [
            f"Roadmap review for '{topic['name']}'",
            "Track delivery vs commitments",
            "Mitigate top-3 risks per the risk register",
        ],
        "manager": [
            f"Daily standup tag for '{topic['name']}' team",
            "Sprint planning input + hand-off prep",
            "Incident on-call rotation review",
        ],
    }
    recommendations = recommendations_map.get(role_id, ["See full topic detail"])

    role_questions_map = {
        "ceo": [
            f"What's the strategic value of '{topic['name']}'?",
            "Are we adopting fast enough vs competitors?",
        ],
        "cfo": [
            f"What's the monthly cost of '{topic['name']}'?",
            "Where can we save 30%?",
            "What's the ROI?",
        ],
        "cio": [
            f"Which vendors does '{topic['name']}' depend on?",
            "Is integration in good shape?",
        ],
        "cto": [
            "Is the architecture sound?",
            "Any tech debt accumulating?",
        ],
        "ciso": [
            "Are we hardened against current threat profile?",
            "Where's evidence for the next audit?",
        ],
        "cdo": [
            "Are data products well-governed?",
            "Lineage gaps?",
        ],
        "caio": [
            f"Are agents in '{topic['name']}' performing?",
            "Hallucination trend?",
        ],
        "cxo": [
            "Do users trust this?",
            "Is adoption growing?",
        ],
        "chro": [
            "Are teams trained?",
            "Change-mgmt risks?",
        ],
        "vp": questions[:2],
        "director": questions[:2],
        "manager": questions,
    }

    return {
        "topic_id": topic["id"], "topic_name": topic["name"],
        "role_id": role_id, "role_name": role["name"],
        "lens": role["lens"], "horizon": role["horizon"],
        "purpose_one_line": purpose,
        "top_metrics": role_metrics,
        "top_questions": role_questions_map.get(role_id, questions[:3]),
        "recommendations": recommendations,
        "underlying_agents": agents[:5],
        "drill_into": {
            "dashboard": f"/api/v1/missing-offices/topic/{topic['id']}/dashboard",
            "operation": f"/api/v1/missing-offices/topic/{topic['id']}/operation",
            "resai": f"/api/v1/missing-offices/topic/{topic['id']}/resai",
        },
        "spec_note": "Per operator brief 2026-06-11 · C-level role views",
    }


@router.get("/roles")
def list_roles():
    """List the 12 executive roles supported."""
    return {"roles": [{"id": rid, **r} for rid, r in ROLES.items()],
            "count": len(ROLES)}


@router.get("/topic/{topic_id}/role/{role_id}")
def topic_role_view(topic_id: str, role_id: str):
    """Per-role view of a topic · tailored for C-suite / VP / Director / Manager."""
    t = get_domain(topic_id) or get_office(topic_id)
    if not t:
        return {"error": f"unknown topic: {topic_id}"}
    return _role_view(t, role_id)


@router.get("/topic/{topic_id}/all-roles")
def topic_all_roles(topic_id: str):
    """All 12 role views for one topic in one response."""
    t = get_domain(topic_id) or get_office(topic_id)
    if not t:
        return {"error": f"unknown topic: {topic_id}"}
    return {
        "topic_id": topic_id, "topic_name": t["name"],
        "role_views": {rid: _role_view(t, rid) for rid in ROLES},
        "n_roles": len(ROLES),
    }
