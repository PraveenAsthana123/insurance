"""/api/v1/enterprise-ai-domains/* · Iter 78 · 22-process governance department."""
from __future__ import annotations

import psycopg2
from fastapi import APIRouter

from core.config import get_settings
from enterprise_ai_domains.domains import (
    all_domains, get_domain, categories, DOMAINS,
)

router = APIRouter(prefix="/api/v1/enterprise-ai-domains", tags=["enterprise-ai-domains"])


def _conn():
    return psycopg2.connect(get_settings().database_url)


def _agent_active(agent_id: str) -> bool:
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM agent_registry WHERE agent_id=%s AND status='Active'",
            (agent_id,))
        return cur.fetchone() is not None


@router.get("/health")
def health():
    return {
        "status": "ok", "module": "enterprise-ai-domains",
        "domains_total": len(DOMAINS),
        "categories_total": len(categories()),
        "spec": "Operator master brief 2026-06-11 · 22 enterprise AI governance domains",
    }


@router.get("")
def list_domains(category: str | None = None):
    """List · optional category filter · each row carries link to detail."""
    domains = all_domains()
    if category:
        domains = [d for d in domains if d["category"].lower() == category.lower()]
    return {
        "domains": [
            {
                "id": d["id"], "name": d["name"], "category": d["category"],
                "purpose": d["purpose"],
                "n_agents": len(d["agents"]), "n_mcps": len(d["mcps"]),
                "n_kpis": len(d["kpis"]),
                "link": f"/api/v1/enterprise-ai-domains/by-id/{d['id']}",
            }
            for d in domains
        ],
        "count": len(domains),
        "categories": sorted({d["category"] for d in domains}),
    }


@router.get("/categories")
def list_categories():
    cats = categories()
    return {
        "categories": [
            {"name": k, "domain_ids": v, "count": len(v)}
            for k, v in sorted(cats.items())
        ],
        "count": len(cats),
    }


@router.get("/by-id/{domain_id}")
def get_one(domain_id: str):
    d = get_domain(domain_id)
    if not d:
        return {"error": f"unknown domain: {domain_id}"}
    # Verify which referenced agents are Active
    agents_status = []
    for aid in d["agents"]:
        agents_status.append({"agent_id": aid, "active": _agent_active(aid)})
    n_active = sum(1 for a in agents_status if a["active"])
    readiness_pct = round(100 * n_active / max(len(agents_status), 1), 1)
    return {
        **d,
        "agents_status": agents_status,
        "n_agents_active": n_active,
        "readiness_pct": readiness_pct,
        "ready": readiness_pct >= 50,
    }


@router.get("/readiness/all")
def readiness_all():
    """Per-domain agent-readiness rollup · what's wired vs scaffold."""
    out = []
    for d in DOMAINS:
        active = sum(1 for aid in d["agents"] if _agent_active(aid))
        pct = round(100 * active / max(len(d["agents"]), 1), 1)
        out.append({
            "id": d["id"], "name": d["name"], "category": d["category"],
            "n_agents_total": len(d["agents"]),
            "n_agents_active": active,
            "readiness_pct": pct,
            "ready": pct >= 50,
        })
    n_ready = sum(1 for r in out if r["ready"])
    avg = round(sum(r["readiness_pct"] for r in out) / len(out), 1)
    return {
        "domains": out,
        "summary": {"total": len(out), "n_ready": n_ready,
                    "average_readiness_pct": avg},
    }
