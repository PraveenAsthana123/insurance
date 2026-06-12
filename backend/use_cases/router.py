"""/api/v1/use-cases/* — Process Use Case · §94 (17-section structure)."""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/use-cases", tags=["use-cases"])

# In-memory store (operator dev convenience · DB-backed in prod)
_USE_CASES: dict[str, dict[str, Any]] = {}

# Section catalog · per §94
SECTION_GROUPS = {
    "A": ["as_is_statement", "sub_problems", "impact"],
    "B": ["to_be_narrative", "ai_options", "flowchart_mermaid", "journey_flow"],
    "C": ["swot", "first_principles", "ai_capabilities", "end_to_end_steps"],
    "D": ["data_types", "goal_achievement"],
    "E": ["four_p", "six_sigma_bpm", "stakeholders", "kpi_roi_value"],
}
TOTAL_SECTIONS = sum(len(v) for v in SECTION_GROUPS.values())  # 17


def _empty_use_case(process_id: str) -> dict[str, Any]:
    """Return the canonical 17-section shape · all sections null per §57.7."""
    return {
        "process_id": process_id,
        "problem": {
            "as_is_statement": None,
            "sub_problems": None,
            "impact": None,            # {time_hrs_per_week, cost_per_year_usd, productivity_pct_loss, dollar_value_at_risk_usd}
        },
        "solution": {
            "to_be_narrative": None,
            "ai_options": None,        # list of {name, relevance, cost, time, risk, total_score}
            "flowchart_mermaid": None,
            "journey_flow": None,      # {as_is_swimlane, to_be_swimlane}
        },
        "analysis": {
            "swot": None,              # {strengths, weaknesses, opportunities, threats}
            "first_principles": None,  # list of why-chain
            "ai_capabilities": None,   # list
            "end_to_end_steps": None,  # list
        },
        "data": {
            "data_types": None,        # list of {type, where}
            "goal_achievement": None,
        },
        "transformation": {
            "four_p": None,            # {people, process, profit, technology}
            "six_sigma_bpm": None,     # {dmaic_phase, waste_eliminated}
            "stakeholders": None,      # list of {role, raci, owner_of}
            "kpi_roi_value": None,     # {kpis, roi, value_realization}
        },
        "completeness_score": 0,
    }


def _count_populated(use_case: dict) -> int:
    n = 0
    for part_key in ["problem", "solution", "analysis", "data", "transformation"]:
        part = use_case.get(part_key) or {}
        for section_key, section_val in part.items():
            if section_val is not None and section_val != []:
                n += 1
    return n


# ─── Demo use case · fraud-ring-detection · per §57.7: clearly labeled demo ─

def _demo_fraud_ring_detection() -> dict[str, Any]:
    """Demo use case for fraud-ring-detection process · operator can replace."""
    uc = _empty_use_case("fraud-ring-detection")
    uc["problem"] = {
        "as_is_statement": (
            "Today, fraud rings are detected only after $2.5M+ of claims are paid out. "
            "Investigators rely on manual graph drawing and tribal knowledge."
        ),
        "sub_problems": [
            "Manual claim-to-claim correlation takes 2+ days",
            "No automated multi-hop relationship traversal",
            "Investigators miss rings spanning multiple regions",
            "Reactive only (post-payment) · no predictive scoring",
            "Audit trail incomplete for regulator review",
        ],
        "impact": {
            "time_hrs_per_week": 80,
            "cost_per_year_usd": 2500000,
            "productivity_pct_loss": 32,
            "dollar_value_at_risk_usd": 12000000,
        },
    }
    uc["solution"] = {
        "to_be_narrative": (
            "GNN-based fraud ring detector runs on every new FNOL within 60s · "
            "surfaces high-confidence rings before first payment · investigators "
            "validate via interactive graph viewer · regulator gets full audit trail."
        ),
        "ai_options": [
            {"name": "GNN (GraphSAGE)", "relevance": 10, "cost": 7, "time": 6, "risk": 5, "total_score": 28},
            {"name": "Rule-based + similarity", "relevance": 6, "cost": 9, "time": 9, "risk": 8, "total_score": 32},
            {"name": "Isolation Forest", "relevance": 7, "cost": 8, "time": 8, "risk": 7, "total_score": 30},
            {"name": "LLM + RAG (claims narrative)", "relevance": 8, "cost": 5, "time": 6, "risk": 6, "total_score": 25},
        ],
        "flowchart_mermaid": (
            "flowchart TD\n"
            "  A[FNOL received] --> B[Extract entities]\n"
            "  B --> C[Build claim graph]\n"
            "  C --> D{Ring score > 0.85?}\n"
            "  D -->|yes| E[Alert investigator]\n"
            "  D -->|no| F[Auto-approve]\n"
            "  E --> G[Investigator review]\n"
            "  G --> H[Decision: pay/hold/deny]"
        ),
        "journey_flow": {
            "as_is_swimlane": [
                {"actor": "Adjuster", "step": "Receive claim · 5 min"},
                {"actor": "Adjuster", "step": "Search past claims by name · 30 min"},
                {"actor": "Adjuster", "step": "Draw graph manually · 90 min"},
                {"actor": "Investigator", "step": "Validate · 4-8 hr"},
                {"actor": "Decision", "step": "Pay · ring discovered 30 days later"},
            ],
            "to_be_swimlane": [
                {"actor": "FNOL system", "step": "Auto-extract entities · <5s"},
                {"actor": "GNN scorer", "step": "Score ring · <60s"},
                {"actor": "Alert engine", "step": "Surface high-confidence · instant"},
                {"actor": "Investigator", "step": "Review graph in UI · 15 min"},
                {"actor": "Decision", "step": "Hold pre-payment · ring caught"},
            ],
        },
    }
    uc["analysis"] = {
        "swot": {
            "strengths": ["Existing claims graph data", "Strong investigator team", "Regulator support"],
            "weaknesses": ["No real-time scoring infra", "Limited GNN expertise", "Stale rules"],
            "opportunities": ["EU AI Act compliance positioning", "Industry-leading detection rate", "Cross-insurer ring sharing"],
            "threats": ["Sophisticated rings adapt", "Privacy litigation risk", "Data quality decay"],
        },
        "first_principles": [
            "Why are rings missed? · No multi-hop traversal · because no graph engine",
            "Why no graph engine? · Built when fraud was solo · because rings were rare",
            "Why rare? · Pre-digital claims · because friction prevented coordination",
            "Why no friction now? · Digital claims · because adversaries coordinate cheaply",
            "Root: detection must keep pace with adversary coordination cost",
        ],
        "ai_capabilities": ["Graph AI / GNN", "NLP for narrative", "RAG for similar past rings", "Anomaly detection"],
        "end_to_end_steps": [
            "1. FNOL received via portal/voice/email",
            "2. Entity extraction (claimants · providers · locations)",
            "3. Graph construction (live claims + historical)",
            "4. GNN ring-score (0-1)",
            "5. Threshold check + investigator alert",
            "6. Interactive graph review",
            "7. Decision audit row written",
            "8. Outcome feedback → model retrain",
        ],
    }
    uc["data"] = {
        "data_types": [
            {"type": "tabular", "where": "Claims + policies tables"},
            {"type": "graph", "where": "Entity-relationship graph (live + historical)"},
            {"type": "text", "where": "Claim narratives + SIU notes (NLP)"},
            {"type": "image", "where": "Damage photos (CV match across claims)"},
            {"type": "time-series", "where": "Filing frequency per region"},
            {"type": "vector", "where": "Narrative embeddings for RAG"},
        ],
        "goal_achievement": (
            "Detect ring BEFORE first payment · save 90% of $2.5M annual ring losses · "
            "investigator cycle 4-8 hr → 15 min · regulator audit complete in 1 click."
        ),
    }
    uc["transformation"] = {
        "four_p": {
            "people": "Investigators upskilled to graph review · 2 SIU staff → 1 (re-deploy to active investigation)",
            "process": "Pre-payment ring check + post-decision audit row · SLAs reduced 4hr → 15min",
            "profit": "$2.25M/yr direct savings + $5M risk reduction · 14-month payback",
            "technology": "GNN model registry · graph DB · real-time scoring API · investigator UI",
        },
        "six_sigma_bpm": {
            "dmaic_phase": "Improve",
            "waste_eliminated": ["Manual graph drawing", "Searching past claims", "Multi-day investigation delays"],
            "bpmn_swimlane": ["FNOL", "Auto-score", "Investigator", "Decision", "Audit"],
        },
        "stakeholders": [
            {"role": "Underwriter VP", "raci": "A (Accountable · sponsor)", "owner_of": "Business case"},
            {"role": "Data Scientist", "raci": "R (Responsible)", "owner_of": "GNN model"},
            {"role": "SIU Investigator", "raci": "C (Consulted)", "owner_of": "Domain knowledge"},
            {"role": "Compliance Officer", "raci": "I (Informed)", "owner_of": "Regulator interface"},
            {"role": "Claims Manager", "raci": "C (Consulted)", "owner_of": "SLA targets"},
            {"role": "Data Engineer", "raci": "R (Responsible)", "owner_of": "Graph DB"},
        ],
        "kpi_roi_value": {
            "kpis": [
                {"name": "fraud_detection_rate", "baseline": 0.65, "target": 0.92, "unit": "ratio"},
                {"name": "pre_payment_catch_rate", "baseline": 0.20, "target": 0.85, "unit": "ratio"},
                {"name": "investigator_cycle_time_hr", "baseline": 6, "target": 0.25, "unit": "hours"},
                {"name": "ring_losses_per_year_usd", "baseline": 2500000, "target": 250000, "unit": "USD"},
            ],
            "roi": {
                "investment_usd": 2000000,
                "return_usd": 8500000,
                "payback_months": 14,
                "irr_pct": 92,
            },
            "value_realization": {
                "q1": "Pilot in 1 region · 100 claims/wk scored",
                "q2": "Roll to 3 regions · investigator alerts live",
                "q3": "Full national rollout · audit trail integrated",
                "q4": "Cross-insurer ring sharing · network effect",
            },
        },
    }
    uc["completeness_score"] = _count_populated(uc)
    uc["demo"] = True  # operator-visible · per §57.7
    return uc


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "use-cases",
        "spec": "§94 process-use-case-mandatory-structure",
        "total_sections": TOTAL_SECTIONS,
        "section_groups": SECTION_GROUPS,
        "n_use_cases": len(_USE_CASES) + 1,  # +1 for demo
    }


@router.get("")
def list_use_cases():
    """List all known use cases."""
    demo = _demo_fraud_ring_detection()
    items = [{"process_id": demo["process_id"],
              "completeness_score": demo["completeness_score"],
              "demo": True}]
    for pid, uc in _USE_CASES.items():
        items.append({
            "process_id": pid,
            "completeness_score": uc.get("completeness_score", 0),
            "demo": uc.get("demo", False),
        })
    return {"use_cases": items, "count": len(items)}


@router.get("/{process_id}")
def get_use_case(process_id: str):
    """Return the 17-section structure for one process.

    Per §57.7 honest: returns 17-section skeleton with `null` per section
    when not yet populated by operator · NEVER fabricated.
    """
    if process_id in _USE_CASES:
        return _USE_CASES[process_id]
    if process_id == "fraud-ring-detection":
        return _demo_fraud_ring_detection()
    # Honest empty per §57.7
    return _empty_use_case(process_id)


class UseCaseUpdate(BaseModel):
    sections: dict[str, Any]  # any subset of the 17 sections


@router.post("/{process_id}")
def update_use_case(process_id: str, body: UseCaseUpdate):
    """Operator-set/override sections · merges into existing."""
    uc = _USE_CASES.get(process_id, _empty_use_case(process_id))
    # Merge in updates · walk part keys (problem · solution · analysis · data · transformation)
    for part_key in ["problem", "solution", "analysis", "data", "transformation"]:
        if part_key in body.sections:
            uc[part_key].update(body.sections[part_key])
    uc["completeness_score"] = _count_populated(uc)
    _USE_CASES[process_id] = uc
    return uc


@router.get("/{process_id}/score")
def score_use_case(process_id: str):
    """Completeness score · 0-17."""
    uc = get_use_case(process_id)
    score = uc.get("completeness_score", 0)
    return {
        "process_id": process_id,
        "completeness_score": score,
        "max_score": TOTAL_SECTIONS,
        "completeness_pct": round(100 * score / TOTAL_SECTIONS, 1),
        "missing_sections": _list_missing(uc),
    }


def _list_missing(uc: dict) -> list[str]:
    missing = []
    for part_key in ["problem", "solution", "analysis", "data", "transformation"]:
        part = uc.get(part_key) or {}
        for section_key, section_val in part.items():
            if section_val is None:
                missing.append(f"{part_key}.{section_key}")
    return missing
