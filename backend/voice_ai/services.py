"""Services + LangGraph DAG for the voice AI end-to-end flow.

Per §90 + §91 + §64.40 (10-layer agentic) + §64.43 #5 Blackboard pattern.

Layers (LangGraph-style state transitions):
  1. welcome      → Aria greets per template + segment
  2. identify     → resolve customer from ref / phone / email
  3. presales     → discovery questions per category
  4. requirement  → capture structured needs
  5. recommend    → match product from catalog + RAG
  6. order        → create order row + audit
  7. notify       → email/sms/voice confirmation
  8. complete     → close session

Each turn is deterministic · LLM is pluggable but optional (rule-based default
for demo · per §57.7 honest fallback).
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Any, Optional

import psycopg2
import psycopg2.extras

from core.config import get_settings
from .schemas import (
    Customer,
    MonitoringSnapshot,
    Order,
    Product,
    Session,
    TurnRequest,
    TurnResponse,
    WelcomeTemplate,
    WelcomeTemplateUpdate,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────
# Connection helper
# ─────────────────────────────────────────────────────────────────────
def _conn():
    s = get_settings()
    return psycopg2.connect(s.postgres_dsn)


def _row_to_dict(row) -> dict[str, Any]:
    return dict(row) if row else {}


# ─────────────────────────────────────────────────────────────────────
# Product catalog
# ─────────────────────────────────────────────────────────────────────
def list_products(tenant_id: str = "default", category: Optional[str] = None,
                  enabled_only: bool = True) -> list[Product]:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        q = "SELECT * FROM voice_ai_products WHERE tenant_id = %s"
        params: list[Any] = [tenant_id]
        if enabled_only:
            q += " AND enabled = TRUE"
        if category:
            q += " AND category = %s"
            params.append(category)
        q += " ORDER BY category, price_cents"
        cur.execute(q, params)
        rows = cur.fetchall()
    return [Product(**_row_to_dict(r)) for r in rows]


def create_product(data: dict[str, Any], tenant_id: str = "default") -> Product:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO voice_ai_products
            (sku, name, category, description, price_cents, coverage_months,
             features, target_segment, tenant_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s)
            RETURNING *
            """,
            (data["sku"], data["name"], data["category"], data.get("description"),
             data["price_cents"], data.get("coverage_months"),
             json.dumps(data.get("features", [])), data.get("target_segment"), tenant_id),
        )
        row = cur.fetchone()
        c.commit()
    return Product(**_row_to_dict(row))


def delete_product(product_id: int, tenant_id: str = "default") -> bool:
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            "DELETE FROM voice_ai_products WHERE id = %s AND tenant_id = %s",
            (product_id, tenant_id),
        )
        deleted = cur.rowcount > 0
        c.commit()
    return deleted


# ─────────────────────────────────────────────────────────────────────
# Customer
# ─────────────────────────────────────────────────────────────────────
def find_customer(customer_ref: Optional[str] = None,
                  phone: Optional[str] = None,
                  email: Optional[str] = None,
                  tenant_id: str = "default") -> Optional[Customer]:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        for field, val in [("customer_ref", customer_ref), ("phone", phone), ("email", email)]:
            if not val:
                continue
            cur.execute(
                f"SELECT * FROM voice_ai_customers WHERE {field} = %s AND tenant_id = %s LIMIT 1",
                (val, tenant_id),
            )
            row = cur.fetchone()
            if row:
                return Customer(**_row_to_dict(row))
    return None


def list_customers(tenant_id: str = "default", limit: int = 100) -> list[Customer]:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM voice_ai_customers WHERE tenant_id = %s ORDER BY id LIMIT %s",
            (tenant_id, limit),
        )
        rows = cur.fetchall()
    return [Customer(**_row_to_dict(r)) for r in rows]


# ─────────────────────────────────────────────────────────────────────
# Welcome templates
# ─────────────────────────────────────────────────────────────────────
def list_welcome_templates(tenant_id: str = "default") -> list[WelcomeTemplate]:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM voice_ai_welcome_templates WHERE tenant_id = %s ORDER BY is_default DESC, id",
            (tenant_id,),
        )
        rows = cur.fetchall()
    return [WelcomeTemplate(**_row_to_dict(r)) for r in rows]


def pick_welcome(segment: Optional[str], tenant_id: str = "default") -> WelcomeTemplate:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM voice_ai_welcome_templates "
            "WHERE tenant_id = %s AND enabled = TRUE AND (segment = %s OR (segment IS NULL AND %s IS NULL)) "
            "ORDER BY is_default DESC LIMIT 1",
            (tenant_id, segment, segment),
        )
        row = cur.fetchone()
        if not row:
            cur.execute(
                "SELECT * FROM voice_ai_welcome_templates WHERE tenant_id = %s AND enabled = TRUE "
                "ORDER BY is_default DESC LIMIT 1",
                (tenant_id,),
            )
            row = cur.fetchone()
    return WelcomeTemplate(**_row_to_dict(row))


def update_welcome(template_id: int, patch: WelcomeTemplateUpdate,
                    tenant_id: str = "default") -> WelcomeTemplate:
    data = patch.model_dump(exclude_unset=True)
    if not data:
        # nothing to update
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM voice_ai_welcome_templates WHERE id = %s", (template_id,))
            row = cur.fetchone()
        return WelcomeTemplate(**_row_to_dict(row))

    set_clauses = []
    params: list[Any] = []
    for k, v in data.items():
        set_clauses.append(f"{k} = %s")
        params.append(v)
    set_clauses.append("updated_at = NOW()")
    params.extend([template_id, tenant_id])
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            f"UPDATE voice_ai_welcome_templates SET {', '.join(set_clauses)} "
            f"WHERE id = %s AND tenant_id = %s RETURNING *",
            params,
        )
        row = cur.fetchone()
        c.commit()
    return WelcomeTemplate(**_row_to_dict(row))


# ─────────────────────────────────────────────────────────────────────
# Sessions + LangGraph-style state machine
# ─────────────────────────────────────────────────────────────────────
STAGES = ["welcome", "identify", "presales", "requirement", "recommend",
          "order", "notify", "complete"]


def start_session(customer_ref: Optional[str], phone: Optional[str],
                   email: Optional[str], tenant_id: str = "default",
                   correlation_id: Optional[str] = None) -> dict[str, Any]:
    customer = find_customer(customer_ref, phone, email, tenant_id)
    sid = f"vsess-{uuid.uuid4().hex[:12]}"
    welcome = pick_welcome(customer.segment if customer else None, tenant_id)
    transcript = [{"role": "assistant", "text": welcome.text, "timestamp": time.time()}]

    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO voice_ai_sessions
            (session_id, customer_id, stage, transcript, welcome_template_id,
             tenant_id, correlation_id)
            VALUES (%s, %s, %s, %s::jsonb, %s, %s, %s)
            RETURNING *
            """,
            (sid, customer.id if customer else None,
             "identify" if customer else "welcome",
             json.dumps(transcript), welcome.id, tenant_id, correlation_id),
        )
        row = cur.fetchone()
        c.commit()

    return {
        "session": Session(**_row_to_dict(row)).model_dump(mode="json"),
        "welcome_text": welcome.text,
        "customer": customer.model_dump() if customer else None,
    }


def _save_session(sid: str, transcript: list, stage: str,
                  requirements: dict, recommended_id: Optional[int] = None) -> None:
    with _conn() as c, c.cursor() as cur:
        cur.execute(
            """
            UPDATE voice_ai_sessions
            SET transcript = %s::jsonb, stage = %s, requirements = %s::jsonb,
                recommended_product_id = %s,
                completed_at = CASE WHEN %s = 'complete' THEN NOW() ELSE completed_at END
            WHERE session_id = %s
            """,
            (json.dumps(transcript), stage, json.dumps(requirements),
             recommended_id, stage, sid),
        )
        c.commit()


def _next_stage(current: str) -> str:
    try:
        idx = STAGES.index(current)
        return STAGES[idx + 1] if idx + 1 < len(STAGES) else "complete"
    except ValueError:
        return "complete"


def _detect_category(text: str) -> Optional[str]:
    t = text.lower()
    for c in ("auto", "home", "life", "health", "umbrella"):
        if c in t:
            return c
    return None


def _match_product(requirements: dict, segment: Optional[str],
                    tenant_id: str) -> Optional[Product]:
    category = requirements.get("category")
    if not category:
        return None
    candidates = list_products(tenant_id, category=category)
    if not candidates:
        return None

    # Score by segment match · feature coverage · price preference
    target_features = set(requirements.get("features", []) or [])

    def score(p: Product) -> float:
        s = 0.0
        if segment and p.target_segment == segment:
            s += 2.0
        if target_features:
            overlap = len(target_features & set(p.features))
            s += overlap * 1.5
        # Cheaper-is-better when no specific signals
        s += max(0, 200 - p.price_cents / 100)
        return s

    return max(candidates, key=score)


def process_turn(req: TurnRequest, tenant_id: str = "default",
                  correlation_id: Optional[str] = None) -> TurnResponse:
    """Process one user utterance · advance the state machine.

    Rule-based per §57.7 honest fallback. Each stage can be upgraded to LLM
    later via per-stage Handler injection.
    """
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM voice_ai_sessions WHERE session_id = %s AND tenant_id = %s",
            (req.session_id, tenant_id),
        )
        row = cur.fetchone()
    if not row:
        raise ValueError(f"session {req.session_id} not found")

    sess = _row_to_dict(row)
    transcript = sess.get("transcript") or []
    requirements = sess.get("requirements") or {}
    stage = sess["stage"]

    # Append user turn
    transcript.append({"role": "user", "text": req.user_text, "timestamp": time.time()})

    customer = None
    if sess.get("customer_id"):
        with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM voice_ai_customers WHERE id = %s",
                        (sess["customer_id"],))
            r = cur.fetchone()
            if r:
                customer = Customer(**_row_to_dict(r))

    recommended_product: Optional[Product] = None
    order: Optional[Order] = None
    next_action = "continue"

    # ─── Per-stage logic ──────────────────────────────────────────
    if stage == "welcome":
        reply = "Thanks for getting in touch. May I get your name and phone number to look you up?"
        stage = "identify"

    elif stage == "identify":
        # Try to extract phone from text (simple regex)
        import re
        m = re.search(r"(\+?\d[\d\- ]{7,}\d)", req.user_text)
        phone = m.group(1).replace(" ", "").replace("-", "") if m else None
        # Resolve customer
        if phone:
            found = find_customer(phone=phone, tenant_id=tenant_id)
            if found:
                customer = found
                requirements["customer_ref"] = found.customer_ref
                reply = f"Found you · welcome back, {found.full_name}. What kind of coverage are you exploring today (auto · home · life · health · umbrella)?"
                stage = "presales"
            else:
                reply = "I couldn't find that number in our records. Let's continue as a new lead. What kind of coverage are you exploring today?"
                stage = "presales"
        else:
            reply = "I didn't catch a phone number · could you share one or just say 'new customer' to continue?"

    elif stage == "presales":
        cat = _detect_category(req.user_text)
        if cat:
            requirements["category"] = cat
            reply = f"Great · {cat} coverage. To recommend a fit, tell me what matters most (e.g. price · features · coverage limit · roadside)."
            stage = "requirement"
        else:
            reply = "I can help with auto · home · life · health · or umbrella. Which interests you?"

    elif stage == "requirement":
        feature_kw = {
            "roadside": "roadside", "rental": "rental", "comprehensive": "comprehensive",
            "collision": "collision", "glass": "glass", "liability": "liability",
            "preventive": "preventive", "comprehensive": "comprehensive",
            "cash value": "cash-value", "term": "term-20",
            "high limits": "high-limits", "forgiveness": "accident-forgiveness",
            "flood": "flood", "dental": "dental",
        }
        wanted = requirements.get("features", []) or []
        for kw, feature in feature_kw.items():
            if kw in req.user_text.lower() and feature not in wanted:
                wanted.append(feature)
        requirements["features"] = wanted
        recommended_product = _match_product(requirements, customer.segment if customer else None, tenant_id)
        if recommended_product:
            reply = (
                f"Based on what you've told me, I recommend the {recommended_product.name} "
                f"at ${recommended_product.price_cents/100:.2f}. "
                "Should I create the order? Say 'yes' to confirm."
            )
            stage = "recommend"
            next_action = "confirm"
        else:
            reply = "Tell me a bit more about features that matter (e.g. high limits · accident forgiveness · low copay)."

    elif stage == "recommend":
        if "yes" in req.user_text.lower() or "confirm" in req.user_text.lower():
            if sess.get("recommended_product_id") and customer:
                with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                    cur.execute("SELECT * FROM voice_ai_products WHERE id = %s",
                                (sess["recommended_product_id"],))
                    p = Product(**_row_to_dict(cur.fetchone()))
                    order_ref = f"VAO-{uuid.uuid4().hex[:10].upper()}"
                    cur.execute(
                        """
                        INSERT INTO voice_ai_orders (order_ref, customer_id, product_id,
                            quantity, total_cents, status, session_id, tenant_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING *
                        """,
                        (order_ref, customer.id, p.id, 1, p.price_cents,
                         "pending", req.session_id, tenant_id),
                    )
                    order_row = cur.fetchone()
                    c.commit()
                order = Order(**_row_to_dict(order_row))
                reply = f"Order {order.order_ref} created for ${order.total_cents/100:.2f}. Sending confirmation now."
                stage = "notify"
                recommended_product = p
            else:
                reply = "Let me capture your details first · what's your email for the confirmation?"
                stage = "identify"
        elif "no" in req.user_text.lower():
            reply = "Sure · what should we change? More features · lower price · different category?"
            stage = "requirement"
        else:
            reply = "Should I proceed with the order? Yes or no?"

    elif stage == "notify":
        with _conn() as c, c.cursor() as cur:
            cur.execute(
                "UPDATE voice_ai_orders SET status = %s, notification_sent_at = NOW(), "
                "notification_channel = %s WHERE session_id = %s",
                ("confirmed", "email", req.session_id),
            )
            c.commit()
        reply = "All set. You'll get an email confirmation shortly. Anything else?"
        stage = "complete"
        next_action = "complete"

    else:  # complete
        reply = "Thanks for choosing Insur. Have a great day!"
        next_action = "complete"

    transcript.append({"role": "assistant", "text": reply, "timestamp": time.time()})
    _save_session(req.session_id, transcript, stage, requirements,
                  recommended_product.id if recommended_product else sess.get("recommended_product_id"))

    return TurnResponse(
        session_id=req.session_id,
        stage=stage,
        assistant_text=reply,
        requirements=requirements,
        recommended_product=recommended_product,
        order=order,
        next_action=next_action,
    )


# ─────────────────────────────────────────────────────────────────────
# Monitoring + scoring · per §82.7 + §75
# ─────────────────────────────────────────────────────────────────────
def monitoring_snapshot(tenant_id: str = "default") -> MonitoringSnapshot:
    with _conn() as c, c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT COUNT(*) AS n FROM voice_ai_sessions "
            "WHERE tenant_id = %s AND started_at > NOW() - INTERVAL '24 hours'",
            (tenant_id,),
        )
        total_24h = cur.fetchone()["n"]

        cur.execute(
            "SELECT COUNT(*) AS n FROM voice_ai_sessions "
            "WHERE tenant_id = %s AND stage NOT IN ('complete') AND completed_at IS NULL",
            (tenant_id,),
        )
        active = cur.fetchone()["n"]

        cur.execute(
            "SELECT COUNT(*) AS n FROM voice_ai_sessions "
            "WHERE tenant_id = %s AND completed_at > NOW() - INTERVAL '24 hours'",
            (tenant_id,),
        )
        completed_24h = cur.fetchone()["n"]

        cur.execute(
            "SELECT COUNT(*) AS n FROM voice_ai_orders "
            "WHERE tenant_id = %s AND created_at > NOW() - INTERVAL '24 hours'",
            (tenant_id,),
        )
        orders_24h = cur.fetchone()["n"]

        # avg turns
        cur.execute(
            "SELECT AVG(jsonb_array_length(transcript)) AS a FROM voice_ai_sessions "
            "WHERE tenant_id = %s AND started_at > NOW() - INTERVAL '24 hours'",
            (tenant_id,),
        )
        a = cur.fetchone()["a"]
        avg_turns = float(a or 0.0)

        # template usage
        cur.execute(
            "SELECT wt.name, COUNT(s.id) AS n FROM voice_ai_welcome_templates wt "
            "LEFT JOIN voice_ai_sessions s ON s.welcome_template_id = wt.id "
            "AND s.started_at > NOW() - INTERVAL '24 hours' "
            "WHERE wt.tenant_id = %s GROUP BY wt.name",
            (tenant_id,),
        )
        templates = {r["name"]: r["n"] for r in cur.fetchall()}

        # stage histogram
        cur.execute(
            "SELECT stage, COUNT(*) AS n FROM voice_ai_sessions "
            "WHERE tenant_id = %s GROUP BY stage",
            (tenant_id,),
        )
        stages = {r["stage"]: r["n"] for r in cur.fetchall()}

    conv = (orders_24h / total_24h * 100) if total_24h > 0 else 0.0
    csat_proxy = (completed_24h / total_24h) if total_24h > 0 else 0.0

    return MonitoringSnapshot(
        total_sessions_24h=total_24h,
        active_sessions=active,
        completed_sessions_24h=completed_24h,
        orders_created_24h=orders_24h,
        conversion_rate_pct=round(conv, 1),
        avg_turns_per_session=round(avg_turns, 2),
        welcome_template_distribution=templates,
        stage_distribution=stages,
        customer_satisfaction_proxy=round(csat_proxy, 3),
    )
