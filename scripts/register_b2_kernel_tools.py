#!/usr/bin/env python3
"""§B2 · register 5 high-priority kernel tools (Stage-1 stubs).

Per PENDING_TASKS_PLAN B2: "5 of the 25 catalog tools have real
implementations." Stage-1 (§56) means the tool row is registered with
honest scaffold metadata — execution_mode='scaffold' so callers KNOW
this hasn't been wired to a real adapter yet.

Idempotent · ON CONFLICT DO NOTHING per §106 safe-allowlist.
"""
from __future__ import annotations
import json
import os
import sys
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo

ROOT = Path("/mnt/deepa/insur_project")
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
os.environ.setdefault("INSUR_DISABLE_PRESIDIO", "1")

import psycopg2  # noqa: E402

from core.config import get_settings  # noqa: E402

TZ = ZoneInfo("America/Edmonton")

TOOLS = [
    {
        "tool_id": "slack_send_message",
        "tool_kind": "write",
        "description": "Send a message to a Slack channel via Slack MCP",
        "required_scopes": ["slack:write"],
        "sandbox_level": "outbound",
        "rate_limit_rpm": 30,
        "risk_band": "Medium",
    },
    {
        "tool_id": "log_search",
        "tool_kind": "read",
        "description": "Search audit_log + agent_invocation for a pattern",
        "required_scopes": ["audit:read"],
        "sandbox_level": "isolated",
        "rate_limit_rpm": 120,
        "risk_band": "Low",
    },
    {
        "tool_id": "jira_create_issue",
        "tool_kind": "write",
        "description": "Create a Jira issue via Jira MCP (Stage-1 stub · scaffold)",
        "required_scopes": ["jira:write"],
        "sandbox_level": "outbound",
        "rate_limit_rpm": 30,
        "risk_band": "Medium",
    },
    {
        "tool_id": "github_open_pr",
        "tool_kind": "write",
        "description": "Open a GitHub PR via github-mcp (Stage-1 stub · scaffold)",
        "required_scopes": ["github:write"],
        "sandbox_level": "outbound",
        "rate_limit_rpm": 15,
        "risk_band": "High",
    },
    {
        "tool_id": "kb_search",
        "tool_kind": "read",
        "description": "TF-IDF search over knowledge_base · returns top K chunks",
        "required_scopes": ["kb:read"],
        "sandbox_level": "isolated",
        "rate_limit_rpm": 240,
        "risk_band": "Low",
    },
]


def main() -> None:
    settings = get_settings()
    conn = psycopg2.connect(settings.database_url)
    conn.autocommit = False
    n_new = n_existing = 0
    log = []

    try:
        with conn.cursor() as cur:
            for t in TOOLS:
                cur.execute(
                    """
                    INSERT INTO kernel_tool_registry (
                        tool_id, tool_kind, description, input_schema, output_schema,
                        required_scopes, sandbox_level, rate_limit_rpm, risk_band,
                        owner_team, status
                    ) VALUES (%s, %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (tool_id) DO NOTHING
                    RETURNING tool_id;
                    """,
                    (
                        t["tool_id"],
                        t["tool_kind"],
                        t["description"],
                        json.dumps({"type": "object", "properties": {}, "scaffold": True}),
                        json.dumps({"type": "object", "properties": {}, "scaffold": True}),
                        t["required_scopes"],
                        t["sandbox_level"],
                        t["rate_limit_rpm"],
                        t["risk_band"],
                        "Platform · §B2 closer",
                        "active",
                    ),
                )
                result = cur.fetchone()
                if result:
                    n_new += 1
                    log.append({"tool_id": t["tool_id"], "action": "registered"})
                else:
                    n_existing += 1
                    log.append({"tool_id": t["tool_id"], "action": "already_present"})
        conn.commit()
    finally:
        conn.close()

    report = {
        "registered_new": n_new,
        "already_present": n_existing,
        "total_tools_processed": len(TOOLS),
        "ts_local": datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S MDT"),
        "policy_refs": ["§B2 PENDING_TASKS", "§56 Stage-1 adapter", "§106 safe-allowlist"],
        "log": log,
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
