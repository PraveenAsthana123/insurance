#!/usr/bin/env python3
"""Generate AGENT_CATALOG.md + SKILL_CATALOG.md from live DB."""
import os, sys
from pathlib import Path
from datetime import datetime, timezone
REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO)); sys.path.insert(0, str(REPO / "backend"))
os.environ.setdefault("INSUR_SKIP_MIGRATIONS", "1")
import psycopg2, psycopg2.extras
from core.config import get_settings

cx = psycopg2.connect(get_settings().database_url)
ts = datetime.now(timezone.utc)

# AGENT_CATALOG.md
with cx, cx.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
    cur.execute("""
        SELECT a.agent_id, a.agent_name, a.department_id, a.business_domain,
               a.risk_level, a.autonomy_level, a.status, a.model_name,
               COUNT(m.skill_id) AS n_skills
        FROM agent_registry a
        LEFT JOIN agent_skill_mapping m ON m.agent_id = a.agent_id AND m.status='Active'
        WHERE a.status='Active'
        GROUP BY a.agent_id
        ORDER BY a.agent_id LIKE 'sys_%', a.department_id, a.agent_id
    """)
    agents = [dict(r) for r in cur.fetchall()]

biz = [a for a in agents if not a["agent_id"].startswith("sys_")]
sys_agents = [a for a in agents if a["agent_id"].startswith("sys_")]
md = [
    f"# AGENT_CATALOG · {ts:%Y-%m-%d %H:%M} UTC · {len(agents)} agents",
    "",
    f"- Business agents (Iter 37 seeded): **{len(biz)}**",
    f"- System agents (Iter 45 auto-registered): **{len(sys_agents)}**",
    "",
    "## Business agents (100) · per department",
    "",
    "| Agent ID | Name | Dept | Risk | Autonomy | Model | Skills |",
    "|---|---|---|---|---|---|---|",
]
for a in biz:
    md.append(f"| `{a['agent_id']}` | {a['agent_name']} | {a['department_id']} | {a['risk_level']} | {a['autonomy_level']} | {a['model_name'] or '—'} | {a['n_skills']} |")
md.append("")
md.append("## System agents (auto-registered by Iter 45 cron · every 6h)")
md.append("")
md.append("| Agent ID | Name | Category | Endpoints |")
md.append("|---|---|---|---|")
for a in sys_agents:
    md.append(f"| `{a['agent_id']}` | {a['agent_name']} | {a['business_domain']} | {a['n_skills']} |")
(REPO / "docs").mkdir(exist_ok=True)
(REPO / "docs/AGENT_CATALOG.md").write_text("\n".join(md))
print(f"  ✓ docs/AGENT_CATALOG.md · {len(agents)} agents")

# SKILL_CATALOG.md
with cx, cx.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
    cur.execute("""
        SELECT skill_id, skill_name, skill_category, risk_level, execution_mode,
               description, status,
               (SELECT COUNT(*) FROM agent_skill_mapping WHERE skill_id=s.skill_id AND status='Active') AS n_agents
        FROM skill_registry s
        WHERE status='Active'
        ORDER BY skill_id LIKE 'sys_%', skill_category, skill_id
    """)
    skills = [dict(r) for r in cur.fetchall()]
biz_s = [s for s in skills if not s["skill_id"].startswith("sys_")]
sys_s = [s for s in skills if s["skill_id"].startswith("sys_")]
md = [
    f"# SKILL_CATALOG · {ts:%Y-%m-%d %H:%M} UTC · {len(skills)} skills",
    "",
    f"- Business skills (Iter 37 seeded): **{len(biz_s)}**",
    f"- System skills (one per endpoint · Iter 45): **{len(sys_s)}**",
    "",
    "## Business skills (25) · reusable across agents",
    "",
    "| Skill ID | Name | Category | Risk | Mode | Agents Using | Description |",
    "|---|---|---|---|---|---|---|",
]
for s in biz_s:
    desc = (s["description"] or "")[:80]
    md.append(f"| `{s['skill_id']}` | {s['skill_name']} | {s['skill_category']} | {s['risk_level']} | {s['execution_mode']} | {s['n_agents']} | {desc} |")
md.append("")
md.append(f"## System skills ({len(sys_s)}) · one per (method, path) endpoint")
md.append("")
md.append("| Skill ID | Endpoint | Risk |")
md.append("|---|---|---|")
for s in sys_s[:80]:
    md.append(f"| `{s['skill_id']}` | {s['skill_name']} | {s['risk_level']} |")
if len(sys_s) > 80:
    md.append(f"| ... | (+{len(sys_s) - 80} more in DB) | |")
(REPO / "docs/SKILL_CATALOG.md").write_text("\n".join(md))
print(f"  ✓ docs/SKILL_CATALOG.md · {len(skills)} skills")
cx.close()
