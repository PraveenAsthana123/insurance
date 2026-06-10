"""/api/v1/ril/* · Iter 40 · 8 tables · risk/incident/learning."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import psycopg2
import psycopg2.extras
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from core.config import get_settings

router = APIRouter(prefix="/api/v1/ril", tags=["risk-incident-learning"])

TABLES = [
    "risk_alert_rule", "risk_escalation", "incident_management",
    "incident_timeline", "incident_rca", "incident_postmortem",
    "lessons_learned", "knowledge_base",
]


def _conn():
    return psycopg2.connect(get_settings().database_url)


# ──────────────────────────────────────────────────────────────────────
# Pydantic shells

class AlertRule(BaseModel):
    rule_name: str
    rule_category: str | None = None
    risk_id: str | None = None
    kri_id: str | None = None
    trigger_condition: str | None = None
    warning_threshold: float | None = None
    critical_threshold: float | None = None
    notification_channel: str | None = None
    escalation_level: str = "L1"
    enabled: bool = True
    tenant_id: str = "default"


class Escalation(BaseModel):
    alert_id: str | None = None
    risk_id: str | None = None
    escalation_level: str = "L1"
    escalation_reason: str | None = None
    assigned_team: str | None = None
    assigned_role: str | None = None
    escalation_owner: str | None = None
    response_sla_minutes: int = 60
    executive_notification: bool = False
    regulatory_notification: bool = False
    tenant_id: str = "default"


class Incident(BaseModel):
    incident_title: str
    incident_category: str | None = None
    incident_severity: str = "Sev-3"
    business_impact: str | None = None
    affected_systems: str | None = None
    reported_by: str | None = None
    incident_owner: str | None = None
    response_team: str | None = None
    root_cause_summary: str | None = None
    regulatory_reporting_required: bool = False
    executive_notification_required: bool = False
    tenant_id: str = "default"


class TimelineEvent(BaseModel):
    incident_id: str
    event_timestamp: datetime
    event_type: str
    event_category: str | None = None
    event_description: str | None = None
    actor_type: str | None = None
    actor_id: str | None = None
    related_object_type: str | None = None
    related_object_id: str | None = None
    severity: str | None = None
    evidence_reference: str | None = None
    tenant_id: str = "default"


class RCA(BaseModel):
    incident_id: str
    rca_title: str | None = None
    investigation_owner: str | None = None
    primary_root_cause: str | None = None
    contributing_factors: str | None = None
    failed_controls: str | None = None
    impacted_processes: str | None = None
    corrective_actions: str | None = None
    preventive_actions: str | None = None
    recurrence_probability: str | None = None
    executive_summary: str | None = None
    tenant_id: str = "default"


class Postmortem(BaseModel):
    incident_id: str
    postmortem_title: str | None = None
    executive_summary: str | None = None
    business_impact: str | None = None
    timeline_summary: str | None = None
    root_cause_summary: str | None = None
    what_went_well: str | None = None
    what_went_poorly: str | None = None
    lessons_learned: str | None = None
    process_improvements: str | None = None
    governance_improvements: str | None = None
    approved_by: str | None = None
    tenant_id: str = "default"


class Lesson(BaseModel):
    lesson_title: str
    lesson_category: str | None = None
    source_type: str | None = None
    source_id: str | None = None
    lesson_description: str | None = None
    root_cause_summary: str | None = None
    recommendation: str | None = None
    reusable_control: str | None = None
    best_practice: str | None = None
    anti_pattern: str | None = None
    owner: str | None = None
    tenant_id: str = "default"


class Knowledge(BaseModel):
    knowledge_title: str
    knowledge_category: str | None = None
    knowledge_type: str | None = None
    source_type: str | None = None
    source_id: str | None = None
    content: str | None = None
    tags: str | None = None
    owner: str | None = None
    version: str = "v1.0"
    tenant_id: str = "default"


# ──────────────────────────────────────────────────────────────────────
# Helpers

def _insert(table: str, body: dict, id_col: str, id_prefix: str) -> str:
    body = {k: v for k, v in body.items() if v is not None}
    body[id_col] = body.get(id_col) or f"{id_prefix}-{uuid.uuid4().hex[:12]}"
    cols = ", ".join(body.keys())
    vals = ", ".join(f"%({k})s" for k in body.keys())
    sql = f"INSERT INTO {table} ({cols}) VALUES ({vals}) RETURNING {id_col}"
    with _conn() as c, c.cursor() as cur:
        cur.execute(sql, body)
        return cur.fetchone()[0]


def _list(table: str, filters: dict, limit: int = 50, order_by: str = "created_at DESC") -> list[dict]:
    where_parts, params = [], []
    for k, v in filters.items():
        if v is not None:
            where_parts.append(f"{k} = %s")
            params.append(v)
    where = " WHERE " + " AND ".join(where_parts) if where_parts else ""
    sql = f"SELECT * FROM {table}{where} ORDER BY {order_by} LIMIT %s"
    params.append(limit)
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


# ──────────────────────────────────────────────────────────────────────
# Health

@router.get("/health")
def health():
    counts = {}
    try:
        with _conn() as c, c.cursor() as cur:
            for t in TABLES:
                cur.execute(f"SELECT COUNT(*) FROM {t}")
                counts[t] = cur.fetchone()[0]
        return {"status": "ok", "module": "risk-incident-learning", "counts": counts}
    except Exception as e:
        return {"status": "scaffold", "module": "risk-incident-learning",
                "error": f"{type(e).__name__}: {e}",
                "note": "Run migration 066_risk_incident_learning.sql"}


# ──────────────────────────────────────────────────────────────────────
# 93. risk_alert_rule

@router.post("/alert-rules")
def create_alert_rule(body: AlertRule):
    return {"rule_id": _insert("risk_alert_rule", body.model_dump(), "rule_id", "ARL")}


@router.get("/alert-rules")
def list_alert_rules(enabled: bool | None = None, tenant_id: str = "default", limit: int = 100):
    rows = _list("risk_alert_rule", {"enabled": enabled, "tenant_id": tenant_id}, limit=limit)
    return {"rules": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# 94. risk_escalation

@router.post("/escalations")
def create_escalation(body: Escalation):
    return {"escalation_id": _insert("risk_escalation", body.model_dump(),
                                      "escalation_id", "ESC")}


@router.get("/escalations")
def list_escalations(escalation_level: str | None = None,
                     escalation_status: str | None = None,
                     tenant_id: str = "default", limit: int = 100):
    rows = _list("risk_escalation",
                 {"escalation_level": escalation_level,
                  "escalation_status": escalation_status,
                  "tenant_id": tenant_id},
                 limit=limit, order_by="escalated_at DESC")
    return {"escalations": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# 95. incident_management

@router.post("/incidents")
def create_incident(body: Incident):
    d = body.model_dump()
    d["start_time"] = datetime.now(timezone.utc)
    d["detected_time"] = datetime.now(timezone.utc)
    return {"incident_id": _insert("incident_management", d, "incident_id", "INC")}


@router.get("/incidents")
def list_incidents(incident_severity: str | None = None,
                   incident_status: str | None = None,
                   tenant_id: str = "default", limit: int = 100):
    rows = _list("incident_management",
                 {"incident_severity": incident_severity,
                  "incident_status": incident_status,
                  "tenant_id": tenant_id},
                 limit=limit, order_by="start_time DESC NULLS LAST, created_at DESC")
    return {"incidents": rows, "count": len(rows)}


@router.get("/incidents/{incident_id}/full")
def incident_full(incident_id: str):
    """Single fetch · incident + timeline + RCA + postmortem · for forensics."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM incident_management WHERE incident_id = %s", (incident_id,))
        inc = cur.fetchone()
        if not inc:
            return {"error": "incident not found", "incident_id": incident_id}
        cur.execute("SELECT * FROM incident_timeline WHERE incident_id = %s ORDER BY event_timestamp",
                    (incident_id,))
        timeline = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT * FROM incident_rca WHERE incident_id = %s ORDER BY created_at DESC",
                    (incident_id,))
        rcas = [dict(r) for r in cur.fetchall()]
        cur.execute("SELECT * FROM incident_postmortem WHERE incident_id = %s ORDER BY created_at DESC",
                    (incident_id,))
        postmortems = [dict(r) for r in cur.fetchall()]
        return {
            "incident": dict(inc),
            "timeline": timeline,
            "rca": rcas[0] if rcas else None,
            "postmortem": postmortems[0] if postmortems else None,
        }


# ──────────────────────────────────────────────────────────────────────
# 96. incident_timeline

@router.post("/timeline")
def create_timeline(body: TimelineEvent):
    return {"timeline_id": _insert("incident_timeline", body.model_dump(),
                                    "timeline_id", "TL")}


@router.get("/timeline")
def list_timeline(incident_id: str | None = None, tenant_id: str = "default", limit: int = 200):
    rows = _list("incident_timeline",
                 {"incident_id": incident_id, "tenant_id": tenant_id},
                 limit=limit, order_by="event_timestamp ASC")
    return {"timeline": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# 97. incident_rca

@router.post("/rcas")
def create_rca(body: RCA):
    return {"rca_id": _insert("incident_rca", body.model_dump(), "rca_id", "RCA")}


@router.get("/rcas")
def list_rcas(incident_id: str | None = None, approval_status: str | None = None,
              tenant_id: str = "default", limit: int = 50):
    rows = _list("incident_rca",
                 {"incident_id": incident_id, "approval_status": approval_status,
                  "tenant_id": tenant_id},
                 limit=limit)
    return {"rcas": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# 98. incident_postmortem

@router.post("/postmortems")
def create_postmortem(body: Postmortem):
    return {"postmortem_id": _insert("incident_postmortem", body.model_dump(),
                                      "postmortem_id", "PM")}


@router.get("/postmortems")
def list_postmortems(incident_id: str | None = None, tenant_id: str = "default", limit: int = 50):
    rows = _list("incident_postmortem",
                 {"incident_id": incident_id, "tenant_id": tenant_id},
                 limit=limit)
    return {"postmortems": rows, "count": len(rows)}


# ──────────────────────────────────────────────────────────────────────
# 99. lessons_learned

@router.post("/lessons")
def create_lesson(body: Lesson):
    return {"lesson_id": _insert("lessons_learned", body.model_dump(),
                                  "lesson_id", "LL")}


@router.get("/lessons")
def list_lessons(category: str | None = None, status: str | None = None,
                 tenant_id: str = "default", limit: int = 100):
    rows = _list("lessons_learned",
                 {"lesson_category": category, "lesson_status": status,
                  "tenant_id": tenant_id},
                 limit=limit)
    return {"lessons": rows, "count": len(rows)}


@router.get("/lessons/search")
def search_lessons(q: str, tenant_id: str = "default", limit: int = 50):
    """Substring search across title + description + recommendation."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM lessons_learned
            WHERE tenant_id = %s
              AND (lesson_title ILIKE %s OR lesson_description ILIKE %s
                   OR recommendation ILIKE %s OR best_practice ILIKE %s
                   OR anti_pattern ILIKE %s)
            ORDER BY created_at DESC
            LIMIT %s
        """, (tenant_id, f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%", limit))
        rows = [dict(r) for r in cur.fetchall()]
    return {"lessons": rows, "count": len(rows), "query": q}


# ──────────────────────────────────────────────────────────────────────
# 100. knowledge_base

@router.post("/knowledge")
def create_knowledge(body: Knowledge):
    return {"knowledge_id": _insert("knowledge_base", body.model_dump(),
                                     "knowledge_id", "KB")}


@router.get("/knowledge")
def list_knowledge(category: str | None = None, knowledge_type: str | None = None,
                   tenant_id: str = "default", limit: int = 100):
    rows = _list("knowledge_base",
                 {"knowledge_category": category, "knowledge_type": knowledge_type,
                  "tenant_id": tenant_id},
                 limit=limit)
    return {"knowledge": rows, "count": len(rows)}


@router.get("/knowledge/search")
def search_knowledge(q: str, tenant_id: str = "default", limit: int = 50,
                     mode: str = "auto"):
    """Iter 43 · Tier-1 #3 · similarity search.

    mode=auto · sklearn TF-IDF when installed · falls back to ILIKE substring.
    mode=ilike · force substring (legacy)
    mode=tfidf · force TF-IDF (errors when sklearn unavailable)
    """
    # Load all candidate rows for the tenant
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM knowledge_base
            WHERE tenant_id = %s
            ORDER BY created_at DESC
        """, (tenant_id,))
        all_rows = [dict(r) for r in cur.fetchall()]

    # Try TF-IDF cosine similarity
    use_tfidf = mode in ("auto", "tfidf")
    sklearn_ok = False
    if use_tfidf and all_rows:
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity
            corpus = [
                (r.get("knowledge_title") or "") + " " +
                (r.get("content") or "") + " " +
                (r.get("tags") or "")
                for r in all_rows
            ]
            corpus.append(q)
            vec = TfidfVectorizer(stop_words="english", max_features=5000)
            X = vec.fit_transform(corpus)
            sims = cosine_similarity(X[-1], X[:-1])[0]
            scored = sorted(
                zip(all_rows, sims), key=lambda x: x[1], reverse=True
            )[:limit]
            # Filter zero-similarity
            scored = [(r, s) for r, s in scored if s > 0]
            rows = [{**r, "_score": float(round(s, 4))} for r, s in scored]
            sklearn_ok = True
            return {
                "knowledge": rows,
                "count": len(rows),
                "query": q,
                "engine": "sklearn-tfidf",
                "scaffold": False,
            }
        except ImportError:
            sklearn_ok = False
        except Exception:
            sklearn_ok = False

    # Fallback · ILIKE substring (Iter 40 behavior)
    if mode == "tfidf" and not sklearn_ok:
        raise HTTPException(503, {"detail": "sklearn not installed",
                                   "error_code": "TFIDF_UNAVAILABLE"})
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT * FROM knowledge_base
            WHERE tenant_id = %s
              AND (knowledge_title ILIKE %s OR content ILIKE %s OR tags ILIKE %s)
            ORDER BY created_at DESC
            LIMIT %s
        """, (tenant_id, f"%{q}%", f"%{q}%", f"%{q}%", limit))
        rows = [dict(r) for r in cur.fetchall()]
    return {
        "knowledge": rows, "count": len(rows), "query": q,
        "engine": "ilike-fallback",
        "scaffold": True,
        "scaffold_reason": "sklearn not installed · TF-IDF unavailable",
    }


# ──────────────────────────────────────────────────────────────────────
# Dashboard rollup

@router.get("/dashboard")
def dashboard(tenant_id: str = "default"):
    """Executive · incident + lesson + knowledge rollup."""
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("""
            SELECT incident_severity, incident_status, COUNT(*) AS n
            FROM incident_management
            WHERE tenant_id = %s
            GROUP BY incident_severity, incident_status
        """, (tenant_id,))
        rows = [dict(r) for r in cur.fetchall()]
        by_severity: dict[str, int] = {}
        by_status: dict[str, int] = {}
        for r in rows:
            by_severity[r["incident_severity"]] = by_severity.get(r["incident_severity"], 0) + r["n"]
            by_status[r["incident_status"]] = by_status.get(r["incident_status"], 0) + r["n"]

        cur.execute("SELECT COUNT(*) FROM lessons_learned WHERE tenant_id = %s", (tenant_id,))
        n_lessons = cur.fetchone()["count"]
        cur.execute("SELECT COUNT(*) FROM knowledge_base WHERE tenant_id = %s", (tenant_id,))
        n_knowledge = cur.fetchone()["count"]
        cur.execute("""
            SELECT COUNT(*) FROM risk_escalation
            WHERE tenant_id = %s AND escalation_status = 'Open'
        """, (tenant_id,))
        n_open_escalations = cur.fetchone()["count"]
    return {
        "incidents_by_severity": by_severity,
        "incidents_by_status": by_status,
        "n_lessons": n_lessons,
        "n_knowledge_articles": n_knowledge,
        "n_open_escalations": n_open_escalations,
    }
