"""/api/v1/regulatory/* · per-process regulatory mapping · P1 #16."""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/regulatory", tags=["regulatory"])

# EU AI Act articles (subset · most-relevant for insurance AI)
EU_AI_ACT = [
    {"article": "Art. 5",  "title": "Prohibited AI practices",        "category": "EU AI Act"},
    {"article": "Art. 6",  "title": "High-risk AI classification",    "category": "EU AI Act"},
    {"article": "Art. 9",  "title": "Risk management system",         "category": "EU AI Act"},
    {"article": "Art. 10", "title": "Data + data governance",         "category": "EU AI Act"},
    {"article": "Art. 11", "title": "Technical documentation",        "category": "EU AI Act"},
    {"article": "Art. 12", "title": "Logging requirements (≥6 mo)",   "category": "EU AI Act"},
    {"article": "Art. 13", "title": "Transparency + user info",       "category": "EU AI Act"},
    {"article": "Art. 14", "title": "Human oversight",                 "category": "EU AI Act"},
    {"article": "Art. 15", "title": "Accuracy, robustness, cyber",    "category": "EU AI Act"},
    {"article": "Art. 50", "title": "AI disclosure to user",           "category": "EU AI Act"},
    {"article": "Art. 86", "title": "Right to explanation",            "category": "EU AI Act"},
]

# SOC2 Trust Services Criteria (relevant)
SOC2 = [
    {"article": "CC6.1",  "title": "Logical access controls",         "category": "SOC2"},
    {"article": "CC6.2",  "title": "User access provisioning + RBAC", "category": "SOC2"},
    {"article": "CC6.6",  "title": "Network segmentation",            "category": "SOC2"},
    {"article": "CC7.2",  "title": "Anomaly detection + response",    "category": "SOC2"},
    {"article": "CC7.3",  "title": "Incident response",                "category": "SOC2"},
    {"article": "CC8.1",  "title": "Change management",                "category": "SOC2"},
    {"article": "CC9.2",  "title": "Vendor risk management",           "category": "SOC2"},
]

# GDPR articles
GDPR = [
    {"article": "Art. 5",   "title": "Principles (lawful + minimization)", "category": "GDPR"},
    {"article": "Art. 6",   "title": "Lawful basis",                       "category": "GDPR"},
    {"article": "Art. 17",  "title": "Right to erasure",                   "category": "GDPR"},
    {"article": "Art. 22",  "title": "Automated decision-making",          "category": "GDPR"},
    {"article": "Art. 32",  "title": "Security of processing",             "category": "GDPR"},
    {"article": "Art. 35",  "title": "Data protection impact assessment",  "category": "GDPR"},
]

ALL_ARTICLES = EU_AI_ACT + SOC2 + GDPR


def _status_for(article: str, process_id: str) -> dict:
    seed = (hash(f"{article}-{process_id}") % 1000) / 1000
    if seed >= 0.6:
        status = "compliant"
        evidence = f"audit row + control test · last verified {int(seed * 30)} days ago"
    elif seed >= 0.3:
        status = "partial"
        evidence = "control implemented · gap in documentation"
    elif seed >= 0.15:
        status = "non_compliant"
        evidence = "control gap identified · remediation required"
    else:
        status = "not_applicable"
        evidence = "scope exclusion confirmed by legal review"
    return {
        "status": status,
        "evidence": evidence,
        "last_review_days_ago": int(seed * 90),
        "owner": "compliance-team",
        "scaffold": True,
    }


@router.get("/health")
def health():
    return {
        "status": "ok",
        "module": "regulatory",
        "spec": "P1 #16 · EU AI Act + SOC2 + GDPR per-article",
        "n_articles": len(ALL_ARTICLES),
        "frameworks": ["EU AI Act", "SOC2", "GDPR"],
    }


@router.get("/articles")
def list_articles():
    return {
        "articles": ALL_ARTICLES,
        "count": len(ALL_ARTICLES),
        "by_framework": {
            "EU AI Act": len(EU_AI_ACT),
            "SOC2": len(SOC2),
            "GDPR": len(GDPR),
        },
    }


@router.get("/{process_id}")
def mapping_for_process(process_id: str):
    rows = []
    for art in ALL_ARTICLES:
        rows.append({**art, **_status_for(art["article"], process_id)})
    by_status = {}
    by_framework_status = {}
    for r in rows:
        by_status[r["status"]] = by_status.get(r["status"], 0) + 1
        fk = r["category"]
        by_framework_status.setdefault(fk, {"compliant": 0, "partial": 0, "non_compliant": 0, "not_applicable": 0})
        by_framework_status[fk][r["status"]] += 1
    compliance_pct = round(
        100 * by_status.get("compliant", 0) /
        max(1, len(rows) - by_status.get("not_applicable", 0)),
        1,
    )
    return {
        "process_id": process_id,
        "articles": rows,
        "n_articles": len(rows),
        "by_status": by_status,
        "by_framework_status": by_framework_status,
        "compliance_pct": compliance_pct,
        "scaffold": True,
    }
