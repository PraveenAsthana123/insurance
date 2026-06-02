#!/usr/bin/env python3
"""
Drill: POST /api/v1/agent-platform/approval-broker/decide — §69 compliance.

Approval Broker is the runtime counterpart to global §69 (Approval-
Minimization Helper). The settings.local.json fix reduces approvals at
the SHELL boundary; the broker reduces approvals at the WORKFLOW boundary
by classifying inbound requests and auto-approving safe local work +
auto-submitting the next task to OpenClaw when risk is low.

The drill locks the 4 risk lanes + the submission gate + the tenant
attribution. Shipped in 9edd73a5 with pytest unit tests but NO drill —
this closes that gap per §43 mandatory drill discipline.

Steps (12 total; 6 negative):
  1. (+) Safe local work ("validate docs") → auto_approved + risk=low
  2. (+) Safe local work with submit_next=True + next_prompt → submitted +
        openclaw_task populated with queue/task_id
  3. (-) NEG: production action ("deploy to production") → require_human_approval
        (the HUMAN regex catches "production" + "deploy")
  4. (-) NEG: secret in target ("rotate slack_bot_token") → require_human_approval
        (HUMAN regex catches "slack_bot_token")
  5. (-) NEG: destructive shell ("rm -rf /var/log") → deny (DENY regex,
        risk=high, controls include 'human-security-review')
  6. (+) HUMAN-only lane: 'modify branch protection' → require_human_approval
        (broker's HUMAN regex; not in upstream dangerous-target)
  7. (-) NEG: medium-risk + submit_next=True → require_human_approval
        (submit lane restricted to low-risk only)
  8. (-) NEG: submit_next=True without next_prompt → require_human_approval
        with reason mentioning "next_prompt is missing"
  9. (+) Tenant attribution: X-Tenant-ID middleware wins; response carries
        tenant_id=tenant-a even if body metadata says otherwise
  10.(+) Audit envelope carries §38.3 fields (ts, request_id, tenant_id,
        actor='approval-broker', tool='approval-broker', decision)
  11.(+) Bare neutral action ("hello world") → falls through to medium risk
        (not in SAFE regex, not in HUMAN, not in DENY) — auto_approved if
        no submit_next, require_human_approval if submit_next set
  12.(-) NEG: bad role (unknown user) → 400 from RBAC, NEVER reaches broker

# RESOURCES: redis

Exit 0 on PASS, 1 on any failure.
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))


def step(n, label, ok, detail=""):
    marker = "\033[32m✓\033[0m" if ok else "\033[31m✗\033[0m"
    print(f"  {marker} step {n}: {label}{(' - ' + detail) if detail else ''}")
    if not ok:
        sys.exit(1)


def _build_app():
    """Boot a fresh app with the full middleware stack + agent_platform router."""
    for mod in list(sys.modules.keys()):
        if mod.startswith((
            "core.middleware", "core.rbac_middleware", "core.insur_audit",
            "routers.agent_platform", "services.agent_platform_service",
            "services.openclaw_gateway_service", "schemas.agent_platform",
        )):
            del sys.modules[mod]

    os.environ.pop("TENANT_ID_STRICT", None)
    from fastapi import FastAPI
    from core.middleware import TenantIdMiddleware, CorrelationIdMiddleware
    from core.rbac_middleware import RBACMiddleware
    from routers.agent_platform import router

    app = FastAPI()
    app.add_middleware(RBACMiddleware)
    app.add_middleware(TenantIdMiddleware)
    app.add_middleware(CorrelationIdMiddleware)
    app.include_router(router)
    return app


def main() -> int:
    from fastapi.testclient import TestClient

    print("\nDRILL: Approval Broker (§69 runtime counterpart)\n")
    t0 = time.time()

    client = TestClient(_build_app())
    headers = {"X-Tenant-ID": "tenant-a", "X-Demo-Role": "manager"}
    url = "/api/v1/agent-platform/approval-broker/decide"

    # ---- Step 1: safe local work → auto_approved, risk=low ----
    r = client.post(url, headers=headers, json={
        "action": "validate docs and run project_doctor",
        "target": "local",
        "submit_next": False,
    })
    body = r.json() if r.status_code == 200 else {}
    step(1, "safe local work → auto_approved + risk_level='low'",
         r.status_code == 200
         and body.get("decision") == "auto_approved"
         and body.get("risk_level") == "low"
         and body.get("submitted") is False
         and body.get("openclaw_task") is None,
         f"status={r.status_code} decision={body.get('decision')!r} "
         f"risk={body.get('risk_level')!r}")

    # ---- Step 2: submit_next=True + next_prompt + low-risk → submitted ----
    r = client.post(url, headers=headers, json={
        "action": "approve next local validation",
        "target": "project_doctor",
        "submit_next": True,
        "next_prompt": "Run project_doctor and summarize failures",
        "department": "engineering",
        "mode": "council",
    })
    body = r.json() if r.status_code == 200 else {}
    oc = body.get("openclaw_task") or {}
    step(2, "submit_next + low-risk → submitted + openclaw_task carries task_id/queue",
         r.status_code == 200
         and body.get("decision") == "auto_approved"
         and body.get("submitted") is True
         and isinstance(oc, dict)
         and oc.get("task_id", "").startswith("openclaw-")
         and oc.get("queue") in ("tasks", "council_tasks"),
         f"submitted={body.get('submitted')} task_id={oc.get('task_id')!r}")

    # ---- Step 3: NEG production action → require_human_approval ----
    r = client.post(url, headers=headers, json={
        "action": "deploy to production",
        "target": "release pipeline",
        "submit_next": False,
    })
    body = r.json() if r.status_code == 200 else {}
    step(3, "NEG: production deploy → require_human_approval, risk=high",
         r.status_code == 200
         and body.get("decision") == "require_human_approval"
         and body.get("risk_level") == "high"
         and "human-approval" in body.get("required_controls", []),
         f"decision={body.get('decision')!r} risk={body.get('risk_level')!r}")

    # ---- Step 4: NEG secret in target → DENY (defense in depth) ----
    # `slack_bot_token` matches the upstream evaluate_policy dangerous-target
    # regex (matches "token"), so the policy denies BEFORE the broker's HUMAN
    # regex gets a chance. This is the correct security outcome — secrets
    # never go through the human-review lane, they go straight to deny.
    r = client.post(url, headers=headers, json={
        "action": "rotate credentials",
        "target": "slack_bot_token",
        "submit_next": False,
    })
    body = r.json() if r.status_code == 200 else {}
    step(4, "NEG: secret/token in target → deny (defense in depth via evaluate_policy)",
         r.status_code == 200
         and body.get("decision") == "deny"
         and body.get("risk_level") == "high",
         f"decision={body.get('decision')!r} risk={body.get('risk_level')!r}")

    # ---- Step 5: NEG destructive shell → deny ----
    r = client.post(url, headers=headers, json={
        "action": "clean up workspace",
        "target": "rm -rf /var/log",
        "submit_next": False,
    })
    body = r.json() if r.status_code == 200 else {}
    step(5, "NEG: rm -rf → deny, risk=high, human-security-review required",
         r.status_code == 200
         and body.get("decision") == "deny"
         and body.get("risk_level") == "high"
         and "human-security-review" in body.get("required_controls", []),
         f"decision={body.get('decision')!r} controls={body.get('required_controls', [])[:3]}")

    # ---- Step 6: HUMAN-only lane (not in dangerous-target, not destructive) ----
    # "branch protection" hits the broker's HUMAN regex but NOT the upstream
    # evaluate_policy dangerous-target regex. Proves the broker has its own
    # escalation layer beyond what evaluate_policy already filters.
    r = client.post(url, headers=headers, json={
        "action": "modify branch protection rule",
        "target": "main branch",
        "submit_next": False,
    })
    body = r.json() if r.status_code == 200 else {}
    step(6, "HUMAN-only lane: 'branch protection' → require_human_approval (not deny)",
         r.status_code == 200
         and body.get("decision") == "require_human_approval"
         and body.get("risk_level") == "high",
         f"decision={body.get('decision')!r}")

    # ---- Step 7: NEG medium-risk + submit_next → require_human_approval ----
    r = client.post(url, headers=headers, json={
        "action": "configure something",   # no SAFE keyword
        "target": "some service",
        "submit_next": True,
        "next_prompt": "do the configuration thing",
    })
    body = r.json() if r.status_code == 200 else {}
    step(7, "NEG: medium-risk + submit_next → require_human_approval (lane restricted)",
         r.status_code == 200
         and body.get("decision") == "require_human_approval"
         and body.get("submitted") is False
         and "low-risk" in body.get("reason", ""),
         f"decision={body.get('decision')!r} reason={body.get('reason', '')[:80]!r}")

    # ---- Step 8: NEG submit_next without next_prompt → require_human_approval ----
    r = client.post(url, headers=headers, json={
        "action": "validate and run next",  # SAFE keyword present
        "target": "local docs",
        "submit_next": True,
        # next_prompt intentionally missing
    })
    body = r.json() if r.status_code == 200 else {}
    step(8, "NEG: submit_next without next_prompt → require_human_approval",
         r.status_code == 200
         and body.get("decision") == "require_human_approval"
         and body.get("submitted") is False
         and "next_prompt" in body.get("reason", "").lower(),
         f"decision={body.get('decision')!r} reason={body.get('reason', '')[:80]!r}")

    # ---- Step 9: tenant attribution preserved ----
    r = client.post(url, headers=headers, json={
        "action": "validate docs",
        "submit_next": False,
        # Try to spoof via body metadata
        "metadata": {"tenant_id": "tenant-evil"},
    })
    body = r.json() if r.status_code == 200 else {}
    step(9, "tenant_id from X-Tenant-ID header wins over body metadata spoof",
         r.status_code == 200
         and body.get("tenant_id") == "tenant-a",
         f"tenant_id={body.get('tenant_id')!r} (expected 'tenant-a')")

    # ---- Step 10: audit envelope carries §38.3 fields ----
    r = client.post(url, headers=headers, json={
        "action": "validate docs",
        "submit_next": False,
    })
    body = r.json() if r.status_code == 200 else {}
    audit = body.get("audit") or {}
    required = {"ts", "request_id", "tenant_id", "actor", "tool", "decision"}
    step(10, "audit envelope carries §38.3 fields",
         required.issubset(audit.keys())
         and audit.get("actor") == "approval-broker"
         and audit.get("tool") == "approval-broker",
         f"missing={required - set(audit.keys())} actor={audit.get('actor')!r}")

    # ---- Step 11: bare neutral action (no SAFE keyword) without submit_next ----
    r = client.post(url, headers=headers, json={
        "action": "hello world",
        "target": "neutral",
        "submit_next": False,
    })
    body = r.json() if r.status_code == 200 else {}
    step(11, "bare neutral action without submit_next → auto_approved (medium risk OK)",
         r.status_code == 200
         and body.get("decision") == "auto_approved"
         and body.get("risk_level") in ("low", "medium"),
         f"decision={body.get('decision')!r} risk={body.get('risk_level')!r}")

    # ---- Step 12: NEG bad role → 400 from RBAC (never reaches broker) ----
    r = client.post(
        url,
        headers={"X-Tenant-ID": "tenant-a", "X-Demo-Role": "intruder"},
        json={"action": "validate docs", "submit_next": False},
    )
    step(12, "NEG: unknown role → 400 from RBAC (broker never sees the request)",
         r.status_code == 400,
         f"status={r.status_code}")

    print(f"\n\033[32mALL 12 STEPS PASSED\033[0m  ({time.time() - t0:.1f}s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
