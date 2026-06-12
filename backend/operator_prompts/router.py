"""/api/v1/prompts/* · §21 mandatory operator prompt tracking."""
from __future__ import annotations
import json
import os
import psycopg2
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/v1/prompts", tags=["operator-prompts"])
R = Path("/mnt/deepa/insur_project")


def stamp() -> dict:
    return {"ts_utc": datetime.utcnow().isoformat() + "Z",
            "ts_local": datetime.now().isoformat(),
            "tz": os.environ.get("TZ", "America/Edmonton"), "spec": "§21"}


def db():
    return psycopg2.connect(host='localhost', port=5434, user='insur_user',
                             password='insur_secret_password', dbname='insur_analytics')


@router.get("/health")
def health():
    try:
        conn = db()
        c = conn.cursor()
        c.execute("SELECT COUNT(*), MIN(ts), MAX(ts) FROM operator_prompt")
        n, mn, mx = c.fetchone()
        c.execute("SELECT COUNT(*) FROM operator_prompt WHERE ts > NOW() - INTERVAL '24 hours'")
        n_24h = c.fetchone()[0]
        conn.close()
        return {**stamp(), "total_prompts": n, "last_24h": n_24h,
                "earliest": str(mn), "latest": str(mx),
                "md_file": str(R / "data/prompts/operator-prompts-last-7d.md"),
                "md_exists": (R / "data/prompts/operator-prompts-last-7d.md").exists()}
    except Exception as e:
        return {**stamp(), "error": str(e)[:120]}


@router.get("/recent")
def recent(limit: int = Query(50, ge=1, le=500),
            hours: int = Query(168, ge=1, le=720)):
    conn = db()
    c = conn.cursor()
    c.execute("""SELECT ts, prompt_text, session_id, n_chars
                  FROM operator_prompt WHERE ts > NOW() - (%s * INTERVAL '1 hour')
                  ORDER BY ts DESC LIMIT %s""", (hours, limit))
    items = [{"ts": str(r[0]), "text": r[1], "session_id": r[2], "n_chars": r[3]}
             for r in c.fetchall()]
    conn.close()
    return {**stamp(), "n": len(items), "items": items}


@router.get("/by-day")
def by_day():
    conn = db()
    c = conn.cursor()
    c.execute("""SELECT DATE(ts AT TIME ZONE 'America/Edmonton') AS d, COUNT(*)
                  FROM operator_prompt WHERE ts > NOW() - INTERVAL '7 days'
                  GROUP BY 1 ORDER BY 1""")
    items = [{"date": str(r[0]), "count": r[1]} for r in c.fetchall()]
    conn.close()
    return {**stamp(), "items": items}


@router.get("/search")
def search(q: str, limit: int = 50):
    conn = db()
    c = conn.cursor()
    c.execute("""SELECT ts, prompt_text, session_id FROM operator_prompt
                  WHERE prompt_text ILIKE %s
                  ORDER BY ts DESC LIMIT %s""", (f"%{q}%", limit))
    items = [{"ts": str(r[0]), "text": r[1], "session_id": r[2]}
             for r in c.fetchall()]
    conn.close()
    return {**stamp(), "query": q, "n": len(items), "items": items}


@router.get("/stats")
def stats():
    conn = db()
    c = conn.cursor()
    c.execute("SELECT COUNT(*), AVG(n_chars), MAX(n_chars) FROM operator_prompt")
    n, avg_chars, max_chars = c.fetchone()
    c.execute("SELECT COUNT(DISTINCT session_id) FROM operator_prompt")
    n_sessions = c.fetchone()[0]
    c.execute("""SELECT DATE(ts AT TIME ZONE 'America/Edmonton') AS d, COUNT(*)
                  FROM operator_prompt
                  GROUP BY 1 ORDER BY 2 DESC LIMIT 5""")
    top_days = [{"date": str(r[0]), "count": r[1]} for r in c.fetchall()]
    conn.close()
    return {**stamp(), "total": n,
            "avg_chars": round(float(avg_chars or 0), 1),
            "max_chars": max_chars or 0,
            "distinct_sessions": n_sessions,
            "top_days": top_days}


@router.post("/ingest")
def ingest_run():
    """Re-run the ingester to capture any new prompts (idempotent)."""
    import subprocess
    try:
        r = subprocess.run([
            "/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python",
            str(R / "scripts/ingest_operator_prompts.py")],
            capture_output=True, text=True, timeout=120)
        return {**stamp(), "ok": r.returncode == 0,
                "stdout_tail": (r.stdout or "")[-1000:],
                "stderr_tail": (r.stderr or "")[-500:]}
    except Exception as e:
        return {**stamp(), "ok": False, "error": str(e)[:200]}


# ═══════════════════════════════════════════════════════════════
# Full conversation (both sides) · §145 mandatory
# ═══════════════════════════════════════════════════════════════
@router.get("/conversation/recent")
def conv_recent(limit: int = Query(100, ge=1, le=1000),
                 hours: int = Query(48, ge=1, le=720)):
    conn = db()
    c = conn.cursor()
    c.execute("""SELECT ts, role, text_content, session_id
                  FROM conversation_turn
                  WHERE ts > NOW() - (%s * INTERVAL '1 hour')
                  ORDER BY ts DESC LIMIT %s""", (hours, limit))
    items = [{"ts": str(r[0]), "role": r[1], "text": r[2], "session_id": r[3]}
             for r in c.fetchall()]
    conn.close()
    return {**stamp(), "n": len(items), "items": items}


@router.get("/conversation/health")
def conv_health():
    conn = db()
    c = conn.cursor()
    c.execute("""SELECT COUNT(*),
                          COUNT(*) FILTER (WHERE role='user'),
                          COUNT(*) FILTER (WHERE role='assistant'),
                          MIN(ts), MAX(ts)
                  FROM conversation_turn""")
    n, n_u, n_a, mn, mx = c.fetchone()
    c.execute("SELECT COUNT(*) FROM conversation_turn WHERE ts > NOW() - INTERVAL '24 hours'")
    n_24 = c.fetchone()[0]
    conn.close()
    return {**stamp(), "total": n, "user_turns": n_u, "assistant_turns": n_a,
            "last_24h": n_24, "earliest": str(mn), "latest": str(mx),
            "md_path": "data/prompts/conversation-last-7d.md"}


@router.get("/conversation/by-day")
def conv_by_day():
    conn = db()
    c = conn.cursor()
    c.execute("""SELECT DATE(ts AT TIME ZONE 'America/Edmonton') AS d,
                          COUNT(*) FILTER (WHERE role='user') AS user_n,
                          COUNT(*) FILTER (WHERE role='assistant') AS asst_n
                  FROM conversation_turn
                  WHERE ts > NOW() - INTERVAL '7 days'
                  GROUP BY 1 ORDER BY 1""")
    items = [{"date": str(r[0]), "user": r[1], "assistant": r[2]} for r in c.fetchall()]
    conn.close()
    return {**stamp(), "items": items}


@router.get("/decisions/recent")
def decisions_recent(hours: int = 168, limit: int = 200):
    """All decisions captured in audit_log over the last N hours (default 7 days)."""
    conn = db()
    c = conn.cursor()
    c.execute("""SELECT created_at, actor, action, resource, payload
                  FROM audit_log
                  WHERE created_at > NOW() - (%s * INTERVAL '1 hour')
                  ORDER BY created_at DESC LIMIT %s""", (hours, limit))
    items = []
    for r in c.fetchall():
        pl = r[4] if isinstance(r[4], dict) else (json.loads(r[4]) if r[4] else {})
        items.append({"ts": str(r[0]), "actor": r[1], "action": r[2],
                      "resource": r[3], "payload_excerpt": json.dumps(pl)[:300]})
    conn.close()
    return {**stamp(), "n": len(items), "hours": hours, "items": items}


@router.get("/timeline/full")
def timeline_full(hours: int = 168, limit: int = 1000):
    """Unified timeline · prompts + responses + decisions · last N hours."""
    conn = db()
    c = conn.cursor()
    # Conversation turns
    c.execute("""SELECT ts, role, LEFT(text_content, 4000) AS text, session_id
                  FROM conversation_turn
                  WHERE ts > NOW() - (%s * INTERVAL '1 hour')""", (hours,))
    turns = [{"ts": str(r[0]), "kind": "conversation", "role": r[1],
              "text": r[2], "session_id": r[3]} for r in c.fetchall()]
    # Decisions
    c.execute("""SELECT created_at, actor, action, resource, payload
                  FROM audit_log
                  WHERE created_at > NOW() - (%s * INTERVAL '1 hour')""", (hours,))
    decisions = []
    for r in c.fetchall():
        pl = r[4] if isinstance(r[4], dict) else (json.loads(r[4]) if r[4] else {})
        decisions.append({"ts": str(r[0]), "kind": "decision", "actor": r[1],
                          "action": r[2], "resource": r[3],
                          "payload_excerpt": json.dumps(pl)[:300]})
    conn.close()
    combined = sorted(turns + decisions, key=lambda x: x["ts"], reverse=True)[:limit]
    return {**stamp(), "n_turns": len(turns), "n_decisions": len(decisions),
            "n_total": len(combined), "items": combined}


@router.get("/conversation/search")
def conv_search(q: str, limit: int = 50, role: str = ""):
    conn = db()
    c = conn.cursor()
    where = "WHERE text_content ILIKE %s"
    params = [f"%{q}%"]
    if role in ("user", "assistant"):
        where += " AND role=%s"
        params.append(role)
    params.append(limit)
    c.execute(f"""SELECT ts, role, text_content, session_id FROM conversation_turn
                   {where} ORDER BY ts DESC LIMIT %s""", params)
    items = [{"ts": str(r[0]), "role": r[1], "text": r[2], "session_id": r[3]}
             for r in c.fetchall()]
    conn.close()
    return {**stamp(), "query": q, "role_filter": role, "n": len(items), "items": items}
