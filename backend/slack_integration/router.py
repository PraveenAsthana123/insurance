"""/api/v1/slack/* · Iter 49 · Slack ↔ LLM integration.

Three surfaces:
  · POST /slack/dispatch       · server-side · push notice to a webhook URL
  · POST /slack/command        · receive Slack slash command · run agent · reply
  · POST /slack/ask-agent      · model-backed Q&A · uses Ollama/OpenAI/Anthropic
  · GET  /slack/health         · probe webhook config

Per global §96 + §50 · LLM resolution Ollama → OpenAI → Anthropic → stub.
"""
from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/slack", tags=["slack"])


def _webhook_url() -> str | None:
    return os.environ.get("SLACK_WEBHOOK_URL")


class SlackDispatch(BaseModel):
    text: str
    channel: str | None = None
    severity: str = "info"     # info / warning / critical
    invocation_id: str | None = None
    agent_id: str | None = None


class SlackCommand(BaseModel):
    """Mirrors Slack slash command POST body subset."""
    command: str          # e.g. /ask
    text: str             # user input
    user_id: str | None = None
    channel_id: str | None = None
    team_id: str | None = None


class AskAgent(BaseModel):
    question: str
    agent_id: str = "incident_triage"
    user: str | None = None
    notify_slack: bool = True


# ──────────────────────────────────────────────────────────────────────
# Endpoints

@router.get("/health")
def health():
    url = _webhook_url()
    return {
        "status": "ok",
        "module": "slack-integration",
        "webhook_configured": bool(url),
        "webhook_hint": "Set SLACK_WEBHOOK_URL env var to enable real sends",
        "scaffold_when_no_webhook": True,
    }


@router.post("/dispatch")
def dispatch(body: SlackDispatch):
    """Send a Slack notification · honest scaffold if webhook unset."""
    url = _webhook_url()
    if not url:
        return {
            "status": "scaffold",
            "reason": "SLACK_WEBHOOK_URL not set · would-send recorded",
            "would_send": {
                "text": f"[{body.severity.upper()}] {body.text}",
                "channel": body.channel,
                "agent_id": body.agent_id,
                "invocation_id": body.invocation_id,
            },
        }

    color_map = {"info": "#3b82f6", "warning": "#f59e0b", "critical": "#ef4444"}
    attachment = {
        "color": color_map.get(body.severity, "#94a3b8"),
        "text": body.text,
        "fields": [],
    }
    if body.agent_id:
        attachment["fields"].append({"title": "Agent", "value": body.agent_id, "short": True})
    if body.invocation_id:
        attachment["fields"].append({"title": "Invocation", "value": body.invocation_id, "short": True})
    attachment["ts"] = int(time.time())
    payload = {"attachments": [attachment]}
    if body.channel:
        payload["channel"] = body.channel

    try:
        r = httpx.post(url, json=payload, timeout=10)
        return {
            "status": "delivered" if r.status_code < 400 else "error",
            "http_status": r.status_code,
            "delivered_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        return {"status": "error", "error": f"{type(e).__name__}: {e}"}


@router.post("/command")
def slash_command(body: SlackCommand):
    """Receive Slack slash command · invoke matching agent · reply in-thread.

    Slack contract: response must be sent within 3 seconds OR async (response_url).
    For now we run sync against the in-process runtime · returns plan + status.
    """
    cmd = body.command.lstrip("/").lower()
    # Map slash command → agent
    AGENT_MAP = {
        "ask":          "incident_triage",
        "fraud":        "fraud_scorer",
        "claim":        "claim_intake",
        "ops":          "incident_triage",
        "triage":       "incident_triage",
        "rca":          "rca_generator",
        "agent":        None,   # operator picks via text prefix "agent_id: question"
    }
    agent_id = AGENT_MAP.get(cmd)
    text = body.text or ""

    if agent_id is None and ":" in text:
        agent_id, _, text = text.partition(":")
        agent_id = agent_id.strip()

    if not agent_id:
        return {
            "response_type": "ephemeral",
            "text": f"Unknown command `/{cmd}`. Try `/ask <question>` or `/agent agent_id: question`.",
        }

    # Invoke via in-process runtime
    try:
        from agentic_core.runtime import invoke
        result = invoke(
            agent_id=agent_id,
            input_text=text or f"slack:{body.user_id or 'anon'}",
            trigger_kind="slack-cmd",
            correlation_id=f"SLACK-{body.user_id or 'anon'}-{int(time.time())}",
        )
    except Exception as e:
        return {
            "response_type": "ephemeral",
            "text": f":x: Agent {agent_id} not found or errored: {e}",
        }

    plan_steps = result.get("plan", {}).get("steps", [])
    scaffold = result.get("scaffold")
    summary = (
        f"*Agent:* `{agent_id}` ({result.get('plan_provider', 'unknown')}/"
        f"{result.get('plan_model', 'unknown')})\n"
        f"*Status:* {result.get('status')} · {result.get('duration_ms', 0)}ms · "
        f"${result.get('cost_usd', 0):.4f}\n"
        f"*Plan:* {len(plan_steps)} step(s): "
        f"{', '.join(s.get('skill_id', '?') for s in plan_steps[:5])}\n"
        f"*Trace:* `{result.get('trace_id', '')[:24]}...`"
    )
    if scaffold:
        summary += "\n_:warning: scaffold mode · " + (result.get("scaffold_reason", "") or "stub") + "_"

    return {
        "response_type": "in_channel",
        "text": summary,
        "invocation_id": result.get("invocation_id"),
    }


@router.post("/ask-agent")
def ask_agent(body: AskAgent):
    """Direct LLM Q&A via Slack with optional Slack-side notification.

    Uses the same llm_client fallback as /invoke · per global §96 + §50.
    Posts result to Slack if notify_slack=True and SLACK_WEBHOOK_URL is set.
    """
    from agentic_core.llm_client import plan as llm_plan

    # Use a minimal skill set
    plan_result = llm_plan(
        agent_id=body.agent_id,
        agent_model="",       # let backend choose default
        input_text=body.question,
        skills=["answer_faq", "draft_communication", "audit_decision"],
    )

    answer_steps = plan_result["plan"].get("steps", [])
    answer_text = (
        f"Plan from {plan_result['provider']}/{plan_result['model']}: "
        + " → ".join(s.get("skill_id", "?") for s in answer_steps)
        + f" ({plan_result['tokens_in']} in / {plan_result['tokens_out']} out tokens)"
    )

    notified = False
    if body.notify_slack and _webhook_url():
        try:
            httpx.post(_webhook_url(), json={
                "attachments": [{
                    "color": "#10b981" if not plan_result["scaffold"] else "#94a3b8",
                    "text": f"*Q from {body.user or 'anon'}:* {body.question}\n*A:* {answer_text}",
                    "fields": [
                        {"title": "Provider", "value": plan_result["provider"], "short": True},
                        {"title": "Cost", "value": f"${plan_result['cost_usd']:.4f}", "short": True},
                    ],
                }],
            }, timeout=10)
            notified = True
        except Exception:
            notified = False

    return {
        "question": body.question,
        "answer_plan": answer_text,
        "provider": plan_result["provider"],
        "model": plan_result["model"],
        "tokens_in": plan_result["tokens_in"],
        "tokens_out": plan_result["tokens_out"],
        "cost_usd": plan_result["cost_usd"],
        "scaffold": plan_result["scaffold"],
        "slack_notified": notified,
    }
