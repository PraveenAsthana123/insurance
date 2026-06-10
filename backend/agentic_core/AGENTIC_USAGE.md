# Agentic Core · Business + Code Usage

Per operator brief: how does the business actually USE the agent registry in code?

## The Bookkeeping Model (3 + 2)

3 catalogs (what exists) + 2 audit surfaces (what happened):

| Layer | Table | Purpose |
|---|---|---|
| 1. Agents | `agent_registry` | Master list of registered AI agents |
| 2. Skills | `skill_registry` | Reusable capabilities (classify · diagnose · notify) |
| 3. Tools | `tool_registry` | APIs/MCP servers agents can call |
| 4. Mapping | `agent_skill_mapping` | Which agent may use which skill |
| 5. Audit | `agent_invocation` | Every agent run · Port-style _ai_invocation |

## Business Use Case · Incident Triage Flow

**Department**: Insurance IT Operations
**Goal**: "Payment API is down in production · diagnose + notify + audit"

```text
1. Monitor fires alert      → POST /agentic/invoke {agent_id: "incident_triage"}
2. Backend loads agent      → SELECT * FROM agent_registry
3. Backend loads skills     → JOIN agent_skill_mapping ↔ skill_registry
4. Planner picks skills     → ["classify_incident", "find_owner", "notify"]
5. Each skill runs          → calls tools/MCP per tool_registry
6. Audit row written        → INSERT INTO agent_invocation
7. UI receives result       → ✓ severity=P1 · owner=Platform Team · notified
```

## Code · register an agent + run it

```python
import httpx

API = "http://localhost:8001/api/v1/agentic"

# 1. Register agent
httpx.post(f"{API}/agents", json={
    "agent_id": "incident_triage",
    "agent_name": "Incident Triage Agent",
    "department_id": "IT Operations",
    "business_domain": "Production Reliability",
    "purpose": "Classify incident severity + route to owner",
    "autonomy_level": "Approval Required",
    "risk_level": "Medium",
    "status": "Active",
})

# 2. Register a skill
httpx.post(f"{API}/skills", json={
    "skill_id": "classify_incident",
    "skill_name": "Classify Incident",
    "risk_level": "Low",
    "status": "Active",
})

# 3. Map agent → skill
httpx.post(f"{API}/mappings/agent-skill", json={
    "agent_id": "incident_triage",
    "skill_id": "classify_incident",
    "execution_mode": "Automatic",
})

# 4. Invoke (creates audit row · scaffold execution today)
r = httpx.post(f"{API}/invoke", json={
    "agent_id": "incident_triage",
    "input_text": "Payment API down in production",
    "trigger_kind": "monitor",
    "incident_id": "INC-12345",
})
print(r.json())
# → {"invocation_id": "INV-...", "status": "Success",
#    "plan": "SCAFFOLD plan: agent=incident_triage would execute 3 skill(s)...",
#    "skills_considered": ["classify_incident"], "planned_skills": [...], "scaffold": True}

# 5. Read audit trail
audit = httpx.get(f"{API}/invocations?agent_id=incident_triage").json()
for inv in audit["invocations"]:
    print(inv["created_at"], inv["status"], inv["plan_text"])
```

## Department Customization

Each department uses the same schema but registers different agents:

```python
# Claims department
httpx.post(f"{API}/agents", json={
    "agent_id": "claims_routing",
    "agent_name": "Claims Routing Agent",
    "department_id": "Claims",
    "business_domain": "First Notice of Loss",
    ...
})

# AI SDLC department
httpx.post(f"{API}/agents", json={
    "agent_id": "pr_enricher",
    "agent_name": "PR Enricher Agent",
    "department_id": "AI SDLC",
    "business_domain": "Pull Request Automation",
    ...
})

# Customer Support
httpx.post(f"{API}/agents", json={
    "agent_id": "support_triage",
    "department_id": "Customer",
    ...
})
```

UI filters by `department_id` so each dept sees only its agents · admin sees all.

## What's SCAFFOLD vs LIVE today

Per §57.7 honest:

| Component | Status |
|---|---|
| 5 SQL tables + indexes | LIVE |
| CRUD endpoints (agents/skills/tools) | LIVE |
| Mapping endpoint | LIVE |
| Audit row written on invoke | LIVE |
| Skill enumeration during planning | LIVE |
| **LLM planner that picks skills** | SCAFFOLD (Iter 38) |
| **Tool execution** | SCAFFOLD (Iter 38) |
| **MCP gateway integration** | SCAFFOLD (Iter 38+) |
| **RAG corpus retrieval** | SCAFFOLD (Iter 38+) |
| **Supervisor agent** | SCAFFOLD (Iter 39) |
| **Cost tracking** | SCAFFOLD (Iter 39) |

Today's invoke records intent + audit row · execution is a planned next iteration with LangGraph.

## Operator UI · `/agentic-admin`

13 tabs per agent:
Profile · Operations · IPO · Skills · Tools · MCP+RAG · Tracking · Failures · Challenges · Supervisor · Delegation · Scorecard · Approvals

Per-tab purpose:
- **Profile** = configuration view (agent_registry row)
- **Operations** = invoke · pause · resume · disable · restart memory · force approval · lock read-only · export audit
- **IPO** = input/process/output diagram
- **Skills** = mapped skills with risk + priority
- **Tools** = available tools from registry
- **MCP+RAG** = external integrations (5 MCP servers · 4 RAG operations listed)
- **Tracking** = last 20 invocations
- **Failures** = failure list + retry buttons
- **Challenges** = 10 known production challenges + solutions
- **Supervisor** = autonomy/risk/cost gates this agent operates under
- **Delegation** = agent-to-agent linking
- **Scorecard** = success rate · run count · override rate
- **Approvals** = pending human gates
