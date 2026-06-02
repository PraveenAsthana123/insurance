"""OPA policy client — consult the policy engine before taking action.

Per Codex 2026-06-01 recommendation. Replaces Python regex / hardcoded
allow-deny with policy-as-code (Rego) that can be tested + audited.

Usage:
    from backend.core.opa_client import check_approval

    decision = check_approval(
        action="git_push",
        actor="claude",
        environment="staging",
        data_class="public",
        risk_score=0.3,
    )
    if decision.allow:
        do_thing()
    elif decision.require_human:
        escalate_to_operator()
    else:
        raise PermissionError(decision.reasons)
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Literal

import httpx

logger = logging.getLogger(__name__)

OPA_URL = os.getenv("INSUR_OPA_URL", "http://opa:8181")
POLICY_PACKAGE = os.getenv("INSUR_OPA_PACKAGE", "insur/approval")
TIMEOUT = int(os.getenv("INSUR_OPA_TIMEOUT", "5"))


@dataclass
class PolicyDecision:
    decision: Literal["allow", "deny", "require_human"]
    reasons: list[str]
    raw: dict

    @property
    def allow(self) -> bool: return self.decision == "allow"

    @property
    def deny(self) -> bool: return self.decision == "deny"

    @property
    def require_human(self) -> bool: return self.decision == "require_human"


def check_approval(
    action: str,
    actor: str,
    environment: str = "dev",
    data_class: str = "public",
    risk_score: float = 0.0,
    target: str | None = None,
    extra: dict | None = None,
) -> PolicyDecision:
    """Consult OPA. Fail-closed (deny) if OPA unreachable.

    Per global §57.7 production-grade — when policy engine is down, default
    to most-restrictive choice (deny) rather than permissive default.
    """
    payload = {
        "input": {
            "action": action,
            "actor": actor,
            "environment": environment,
            "data_class": data_class,
            "risk_score": risk_score,
            "target": target,
            **(extra or {}),
        }
    }
    url = f"{OPA_URL}/v1/data/{POLICY_PACKAGE.replace('.', '/')}"
    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            r = client.post(url, json=payload)
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError as e:
        logger.error("OPA unreachable (%s); fail-closed to deny", e)
        return PolicyDecision(
            decision="deny",
            reasons=[f"OPA unreachable: {type(e).__name__}"],
            raw={},
        )

    result = data.get("result", {})
    decision_val = result.get("decision", "deny")
    if decision_val not in ("allow", "deny", "require_human"):
        decision_val = "deny"
    reasons = result.get("reasons", []) or []

    return PolicyDecision(decision=decision_val, reasons=reasons, raw=result)
