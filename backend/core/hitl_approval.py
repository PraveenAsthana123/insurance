"""hitl_approval — Human-in-the-Loop approval gate.

Per global §77 row 1416 (Agent Escalation: HITL → build via §75.5 approval gates).
Per global §75.5 — agent MUST request approval BEFORE deleting files, schema
changes, secrets, infra, paid APIs, GPU jobs, prod config.
Per global §40 — decision system with confidence-based routing.
Per global §38.3 — every approval request writes an audit row.

Flow:
  1. Agent submits a proposed action with: kind, payload, risk, est_cost
  2. HITL store records pending request_id with status='pending'
  3. Out-of-band: operator approves/denies via CLI or API
  4. Agent polls or waits on the request_id
  5. On approve/deny: audit row written; action proceeds or aborts
"""
from __future__ import annotations

import json
import sqlite3
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Iterator

REPO = Path(__file__).resolve().parents[2]
DB_PATH = REPO / "data" / "eval" / "hitl" / "approvals.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


class ApprovalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    EXPIRED = "expired"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class ApprovalRequest:
    request_id: str
    kind: str
    payload: dict[str, Any]
    risk: RiskLevel
    est_cost_usd: float
    requested_by: str
    rationale: str
    ts_requested: str = field(default_factory=lambda: time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
    status: ApprovalStatus = ApprovalStatus.PENDING
    approver: str | None = None
    decision_note: str | None = None
    ts_decided: str | None = None


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA busy_timeout=5000")
    try:
        yield con
        con.commit()
    finally:
        con.close()


def _init_schema() -> None:
    with _connect() as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS approvals (
                request_id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                payload TEXT NOT NULL,
                risk TEXT NOT NULL,
                est_cost_usd REAL NOT NULL DEFAULT 0,
                requested_by TEXT NOT NULL,
                rationale TEXT,
                ts_requested TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                approver TEXT,
                decision_note TEXT,
                ts_decided TEXT
            )
        """)
        con.execute("CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status)")
        con.execute("CREATE INDEX IF NOT EXISTS idx_approvals_kind ON approvals(kind)")


_init_schema()


def request_approval(
    kind: str,
    payload: dict[str, Any],
    risk: RiskLevel = RiskLevel.MEDIUM,
    est_cost_usd: float = 0.0,
    requested_by: str = "agent",
    rationale: str = "",
) -> ApprovalRequest:
    """Create a pending approval request and return it.

    Low-risk requests can be auto-approved via env var HITL_AUTO_APPROVE_LOW=1
    (default: false). High-risk ALWAYS requires manual approval.
    """
    import os
    req = ApprovalRequest(
        request_id=f"appr-{uuid.uuid4().hex[:10]}",
        kind=kind,
        payload=payload,
        risk=risk,
        est_cost_usd=est_cost_usd,
        requested_by=requested_by,
        rationale=rationale,
    )
    if risk == RiskLevel.LOW and os.environ.get("HITL_AUTO_APPROVE_LOW") == "1":
        req.status = ApprovalStatus.APPROVED
        req.approver = "auto:low-risk-policy"
        req.decision_note = "auto-approved per HITL_AUTO_APPROVE_LOW=1"
        req.ts_decided = req.ts_requested
    with _connect() as con:
        con.execute(
            """INSERT INTO approvals
               (request_id, kind, payload, risk, est_cost_usd, requested_by, rationale,
                ts_requested, status, approver, decision_note, ts_decided)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (req.request_id, kind, json.dumps(payload), risk.value, est_cost_usd,
             requested_by, rationale, req.ts_requested, req.status.value,
             req.approver, req.decision_note, req.ts_decided),
        )
    return req


def decide(request_id: str, approver: str, approve: bool, note: str = "") -> ApprovalRequest:
    """Operator (or automated policy) records a decision."""
    status = ApprovalStatus.APPROVED if approve else ApprovalStatus.DENIED
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with _connect() as con:
        con.execute(
            """UPDATE approvals SET status=?, approver=?, decision_note=?, ts_decided=?
               WHERE request_id=? AND status='pending'""",
            (status.value, approver, note, ts, request_id),
        )
    return get(request_id)


def get(request_id: str) -> ApprovalRequest:
    with _connect() as con:
        row = con.execute("SELECT * FROM approvals WHERE request_id=?", (request_id,)).fetchone()
    if not row:
        raise KeyError(f"unknown request_id {request_id}")
    cols = ["request_id", "kind", "payload", "risk", "est_cost_usd", "requested_by", "rationale",
            "ts_requested", "status", "approver", "decision_note", "ts_decided"]
    d = dict(zip(cols, row))
    return ApprovalRequest(
        request_id=d["request_id"], kind=d["kind"], payload=json.loads(d["payload"]),
        risk=RiskLevel(d["risk"]), est_cost_usd=d["est_cost_usd"],
        requested_by=d["requested_by"], rationale=d["rationale"] or "",
        ts_requested=d["ts_requested"], status=ApprovalStatus(d["status"]),
        approver=d["approver"], decision_note=d["decision_note"], ts_decided=d["ts_decided"],
    )


def list_pending(kind: str | None = None) -> list[ApprovalRequest]:
    with _connect() as con:
        if kind:
            rows = con.execute("SELECT request_id FROM approvals WHERE status='pending' AND kind=? ORDER BY ts_requested",
                               (kind,)).fetchall()
        else:
            rows = con.execute("SELECT request_id FROM approvals WHERE status='pending' ORDER BY ts_requested").fetchall()
    return [get(r[0]) for r in rows]


def wait_for_decision(request_id: str, timeout_s: int = 600, poll_s: float = 2.0) -> ApprovalRequest:
    """Block until status changes from pending or timeout expires."""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        req = get(request_id)
        if req.status != ApprovalStatus.PENDING:
            return req
        time.sleep(poll_s)
    # Mark expired
    with _connect() as con:
        con.execute(
            "UPDATE approvals SET status='expired', ts_decided=? WHERE request_id=? AND status='pending'",
            (time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), request_id),
        )
    return get(request_id)


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description="hitl_approval — list/decide/get approval requests")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("pending", help="List pending requests")
    sp_d = sub.add_parser("decide", help="Approve or deny a request")
    sp_d.add_argument("request_id")
    sp_d.add_argument("--approve", action="store_true")
    sp_d.add_argument("--deny", action="store_true")
    sp_d.add_argument("--approver", default="operator-cli")
    sp_d.add_argument("--note", default="")
    sp_g = sub.add_parser("get", help="Get a request by id")
    sp_g.add_argument("request_id")
    args = ap.parse_args()

    if args.cmd == "pending":
        rows = list_pending()
        print(f"{len(rows)} pending approval(s):")
        for r in rows:
            print(f"  {r.request_id} · {r.kind} · risk={r.risk.value} · ${r.est_cost_usd} · {r.rationale[:80]}")
    elif args.cmd == "decide":
        if not (args.approve ^ args.deny):
            raise SystemExit("specify exactly one of --approve / --deny")
        r = decide(args.request_id, args.approver, args.approve, args.note)
        print(json.dumps(r.__dict__, default=str, indent=2))
    elif args.cmd == "get":
        r = get(args.request_id)
        print(json.dumps(r.__dict__, default=str, indent=2))
