#!/usr/bin/env python3
"""drill_council_and_hitl — lock §77 rows 1415 + 1416 deliveries.

Per global §43: ≥3 negative assertions. Per §73.1 #3: this drill runs
every time the council or HITL code changes.

Positive steps lock the contract; negative steps prove the system
rejects what it must reject.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.core.hitl_approval import (  # noqa: E402
    ApprovalStatus,
    RiskLevel,
    decide,
    get,
    list_pending,
    request_approval,
)

PASS_MARK = "✓"
FAIL_MARK = "✗"
n_pos = 0
n_neg = 0


def check(label: str, cond: bool, negative: bool = False) -> None:
    global n_pos, n_neg
    mark = PASS_MARK if cond else FAIL_MARK
    cat = "[neg]" if negative else "[pos]"
    print(f"  {mark} {cat} {label}")
    if not cond:
        sys.exit(1)
    if negative:
        n_neg += 1
    else:
        n_pos += 1


def main() -> None:
    print("=== drill_council_and_hitl ===")

    # ---- HITL approval gate (row 1416) ----
    print("\n[1] HITL: create + approve + list flow")
    r = request_approval(
        kind="drill-test",
        payload={"cmd": "echo hello", "files": ["/tmp/x"]},
        risk=RiskLevel.MEDIUM,
        est_cost_usd=0.05,
        requested_by="drill",
        rationale="positive flow test",
    )
    check("request_id assigned", bool(r.request_id))
    check("starts pending", r.status == ApprovalStatus.PENDING)
    check("payload preserved", r.payload.get("cmd") == "echo hello")

    pending_before = len(list_pending(kind="drill-test"))
    check("appears in list_pending", pending_before >= 1)

    d = decide(r.request_id, "drill-operator", approve=True, note="all good")
    check("decision status approved", d.status == ApprovalStatus.APPROVED)
    check("approver recorded", d.approver == "drill-operator")
    check("decision timestamp set", bool(d.ts_decided))

    pending_after = len(list_pending(kind="drill-test"))
    check(
        "removed from pending after decision (NEG: should not still show pending)",
        pending_after == pending_before - 1,
        negative=True,
    )

    # ---- HITL negative: deny path ----
    print("\n[2] HITL: deny path")
    r2 = request_approval(
        kind="drill-test", payload={"cmd": "rm -rf /"}, risk=RiskLevel.HIGH,
        est_cost_usd=0.0, requested_by="drill", rationale="should be denied",
    )
    d2 = decide(r2.request_id, "drill-operator", approve=False, note="dangerous")
    check("deny → status denied (NEG: agent must not proceed)", d2.status == ApprovalStatus.DENIED, negative=True)
    check("deny note preserved", d2.decision_note == "dangerous")

    # ---- HITL negative: double-decide is no-op ----
    print("\n[3] HITL: double-decide does not re-flip")
    d_re = decide(r2.request_id, "drill-operator", approve=True, note="oops")
    check(
        "re-deciding a denied request leaves it denied (NEG: idempotency)",
        d_re.status == ApprovalStatus.DENIED,
        negative=True,
    )

    # ---- HITL: unknown id raises KeyError ----
    print("\n[4] HITL: unknown request_id rejected")
    try:
        get("appr-doesnotexist")
        check("unknown id should raise (NEG)", False, negative=True)
    except KeyError:
        check("unknown id raises KeyError (NEG: no silent default)", True, negative=True)

    # ---- Council module import (row 1415) ----
    print("\n[5] Council: module + contract")
    from backend.core import council_v77
    check("CouncilDecision dataclass exposed", hasattr(council_v77, "CouncilDecision"))
    check("deliberate function exposed", callable(getattr(council_v77, "deliberate", None)))
    check("audit dir created", council_v77.AUDIT_DIR.exists())

    # Construct a CouncilDecision without invoking Ollama (so this drill is offline-safe)
    cd = council_v77.CouncilDecision(
        request_id="drill-c1", question="Q?", author_draft="draft",
        reviewer_critique="critique", chair_final="final",
        models={"author": "qwen2.5:latest", "reviewer": "gemma3:1b", "chair": "qwen2.5:latest"},
        latencies_ms={"author": 1, "reviewer": 1, "chair": 1, "total": 3},
    )
    d_dict = cd.to_dict()
    check("to_dict has 3-role models", set(d_dict["models"]) == {"author", "reviewer", "chair"})
    check("to_dict has 4 latency keys", set(d_dict["latencies_ms"]) == {"author", "reviewer", "chair", "total"})

    # ---- ragas import (the §75.10 fix verification) ----
    print("\n[6] ragas shim — vertexai compat verified")
    try:
        import ragas  # noqa: F401
        from langchain_community.chat_models.vertexai import ChatVertexAI  # noqa: F401
        check("ragas imports after shim", True)
    except Exception as e:
        check(f"ragas still broken: {type(e).__name__}", False)

    # ---- Audit row written for council ----
    audit_log = council_v77.AUDIT_DIR / "audit.jsonl"
    with audit_log.open("a") as f:
        f.write(json.dumps(d_dict) + "\n")
    check("council audit row writable", audit_log.exists() and audit_log.stat().st_size > 0)

    print(f"\nALL {n_pos + n_neg} STEPS PASSED ({n_pos} positive · {n_neg} negative)")


if __name__ == "__main__":
    main()
