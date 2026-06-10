# RUN · single terminal cheat sheet

Every command operator needs in one place.

All commands assume:

```bash
cd /mnt/deepa/insur_project
```

---

## 1 · The one-command CLI

Everything routes through `./scripts/insur`.

```bash
./scripts/insur help          # show all subcommands

./scripts/insur start         # boot backend on :8001
./scripts/insur status        # is backend up?
./scripts/insur stop          # kill backend

./scripts/insur audit         # ALL 20 iter audits · 200/200 baseline
./scripts/insur audit 37      # specific iter (37/38/39/40 = agentic spec)
./scripts/insur audit-weekly  # 26-audit weekly stack

./scripts/insur drill         # backup + retention + DQ runners
./scripts/insur smoke         # curl 18 documented endpoints
./scripts/insur agentic       # full /agentic + /ops + /governance + /ril view
./scripts/insur migrate       # apply agentic+enterprise migrations 063-066
./scripts/insur validate      # syntax + migration + audit counts
./scripts/insur stats         # codebase + OpenAPI snapshot
./scripts/insur top1pct       # daily top-1% loop
```

---

## 2 · First-time setup (boot from clean)

```bash
# 1. Apply all agentic+enterprise migrations
./scripts/insur migrate

# 2. Boot backend
./scripts/insur start

# 3. Confirm it's up
./scripts/insur status

# 4. Smoke 18 endpoints
./scripts/insur smoke
```

---

## 3 · Run all audits

```bash
# Single command · runs all 20 iter audits in 1 process · ~68s
INSUR_DISABLE_PRESIDIO=1 ./scripts/insur audit

# Specific iteration
./scripts/insur audit 37    # agentic core
./scripts/insur audit 38    # agentic ops
./scripts/insur audit 39    # enterprise governance
./scripts/insur audit 40    # risk + incident + learning

# JSON output for CI
INSUR_DISABLE_PRESIDIO=1 python3 scripts/run_all_top1pct_audits.py --json
```

---

## 4 · Backend API smoke (no curl memorization)

```bash
./scripts/insur smoke
```

Output: 18 endpoints × HTTP status code · `✓` or `✗` per path.

Manual curl examples · for when you want JSON output:

```bash
# Core surfaces
curl http://localhost:8001/healthz/live
curl http://localhost:8001/healthz/ready
curl http://localhost:8001/metrics | head -20

# Agentic (28 tables)
curl http://localhost:8001/api/v1/agentic/health
curl http://localhost:8001/api/v1/agentic-ops/health
curl http://localhost:8001/api/v1/governance/health
curl http://localhost:8001/api/v1/ril/health

# Big-picture views
curl http://localhost:8001/api/v1/openapi-export/stats     # endpoint inventory
curl http://localhost:8001/api/v1/governance/org-tree      # 4-level org nest
curl http://localhost:8001/api/v1/ril/dashboard            # exec rollup
curl http://localhost:8001/api/v1/cron-registry            # 51 INSUR jobs
curl http://localhost:8001/api/v1/heatmap?top=10           # top routes
curl http://localhost:8001/api/v1/metrics-latency          # p50/p95/p99
```

---

## 5 · Agentic admin · create + invoke

```bash
# Register an agent
curl -X POST http://localhost:8001/api/v1/agentic/agents \
  -H 'Content-Type: application/json' -d '{
    "agent_id": "incident_triage",
    "agent_name": "Incident Triage Agent",
    "department_id": "IT Operations",
    "purpose": "Classify incidents · route to owner",
    "autonomy_level": "Approval Required",
    "status": "Active"
  }'

# Register a skill + map
curl -X POST http://localhost:8001/api/v1/agentic/skills \
  -H 'Content-Type: application/json' -d '{"skill_id":"classify_incident","skill_name":"Classify","status":"Active"}'

curl -X POST http://localhost:8001/api/v1/agentic/mappings/agent-skill \
  -H 'Content-Type: application/json' -d '{"agent_id":"incident_triage","skill_id":"classify_incident"}'

# Invoke (writes audit row · scaffold execution)
curl -X POST http://localhost:8001/api/v1/agentic/invoke \
  -H 'Content-Type: application/json' -d '{
    "agent_id": "incident_triage",
    "input_text": "Payment API down",
    "incident_id": "INC-99"
  }'

# Read audit trail
curl 'http://localhost:8001/api/v1/agentic/invocations?agent_id=incident_triage'
```

---

## 6 · Enterprise governance · build the chain

```bash
# Value stream → department → team → role
curl -X POST http://localhost:8001/api/v1/governance/value-streams \
  -H 'Content-Type: application/json' -d '{"value_stream_name":"Claims","annual_business_value":35000000}'

curl -X POST http://localhost:8001/api/v1/governance/departments \
  -H 'Content-Type: application/json' -d '{"department_name":"Claims","primary_value_stream":"VS-xxx"}'

curl -X POST http://localhost:8001/api/v1/governance/teams \
  -H 'Content-Type: application/json' -d '{"team_name":"Claims AgentOps","department_id":"DEPT-xxx","support_level":"L3"}'

curl -X POST http://localhost:8001/api/v1/governance/roles \
  -H 'Content-Type: application/json' -d '{"role_name":"AgentOps Engineer","team_id":"TEAM-xxx","production_access":true}'

# RACI for any object
curl -X POST http://localhost:8001/api/v1/governance/raci \
  -H 'Content-Type: application/json' -d '{"object_type":"agent","object_id":"incident_triage","role_id":"ROLE-xxx","responsibility_type":"R"}'

# See the nested org tree
curl http://localhost:8001/api/v1/governance/org-tree | jq .
```

---

## 7 · Risk + incident + learning · the loop

```bash
# Open an incident
curl -X POST http://localhost:8001/api/v1/ril/incidents \
  -H 'Content-Type: application/json' -d '{
    "incident_title": "Hallucination spike",
    "incident_category": "AI",
    "incident_severity": "Sev-2"
  }'

# Add timeline event
curl -X POST http://localhost:8001/api/v1/ril/timeline \
  -H 'Content-Type: application/json' -d '{
    "incident_id": "INC-xxx",
    "event_timestamp": "2026-06-10T10:00:00Z",
    "event_type": "Detection",
    "event_description": "Alert triggered"
  }'

# Write RCA · postmortem · lesson
curl -X POST http://localhost:8001/api/v1/ril/rcas \
  -H 'Content-Type: application/json' -d '{"incident_id":"INC-xxx","primary_root_cause":"Retrieval quality failure","corrective_actions":"Add reranker"}'

curl -X POST http://localhost:8001/api/v1/ril/lessons \
  -H 'Content-Type: application/json' -d '{"lesson_title":"Use reranker for RAG","best_practice":"Hybrid + reranker","anti_pattern":"Vector-only"}'

# Single-fetch forensics view
curl http://localhost:8001/api/v1/ril/incidents/INC-xxx/full | jq .

# Search the organizational brain
curl 'http://localhost:8001/api/v1/ril/knowledge/search?q=reranking'
curl 'http://localhost:8001/api/v1/ril/lessons/search?q=injection'
```

---

## 8 · Database direct

```bash
PGPASSWORD=insur_secret_password psql -h localhost -p 5434 -U insur_user -d insur_analytics

# Useful queries inside psql
\dt                                                   -- list all tables
SELECT COUNT(*) FROM agent_registry;
SELECT COUNT(*) FROM incident_management;
SELECT COUNT(*) FROM knowledge_base;

-- Composite view · agentic + enterprise + ril table counts
SELECT 'agent_registry' AS t, COUNT(*) FROM agent_registry
UNION ALL SELECT 'skill_registry', COUNT(*) FROM skill_registry
UNION ALL SELECT 'tool_registry', COUNT(*) FROM tool_registry
UNION ALL SELECT 'agent_invocation', COUNT(*) FROM agent_invocation
UNION ALL SELECT 'agent_feedback', COUNT(*) FROM agent_feedback
UNION ALL SELECT 'agent_incident', COUNT(*) FROM agent_incident
UNION ALL SELECT 'agent_sla', COUNT(*) FROM agent_sla
UNION ALL SELECT 'agent_capacity', COUNT(*) FROM agent_capacity
UNION ALL SELECT 'business_value_stream', COUNT(*) FROM business_value_stream
UNION ALL SELECT 'department', COUNT(*) FROM department
UNION ALL SELECT 'team', COUNT(*) FROM team
UNION ALL SELECT 'role', COUNT(*) FROM role
UNION ALL SELECT 'responsibility_matrix', COUNT(*) FROM responsibility_matrix
UNION ALL SELECT 'stakeholder', COUNT(*) FROM stakeholder
UNION ALL SELECT 'ai_policy', COUNT(*) FROM ai_policy
UNION ALL SELECT 'ai_standard', COUNT(*) FROM ai_standard
UNION ALL SELECT 'incident_management', COUNT(*) FROM incident_management
UNION ALL SELECT 'incident_timeline', COUNT(*) FROM incident_timeline
UNION ALL SELECT 'incident_rca', COUNT(*) FROM incident_rca
UNION ALL SELECT 'incident_postmortem', COUNT(*) FROM incident_postmortem
UNION ALL SELECT 'lessons_learned', COUNT(*) FROM lessons_learned
UNION ALL SELECT 'knowledge_base', COUNT(*) FROM knowledge_base;
```

---

## 9 · Drills + maintenance

```bash
# Manual one-shot
python3 scripts/data_quality_runner.py             # writes jobs/reports/data-quality/
python3 scripts/backup_restore_drill.py            # writes jobs/reports/backup-drill/
python3 scripts/audit_retention_enforcer.py        # writes jobs/reports/retention/

# All drills via CLI
./scripts/insur drill
```

Cron jobs (already installed · 51 INSUR-tagged):

```bash
crontab -l | grep INSUR-                # see all scheduled
```

---

## 10 · Git + composite tracking

```bash
# Session commits
git log --oneline 6e490afc..HEAD | head -20
git log --oneline 6e490afc..HEAD | wc -l        # commit count

# Composite trajectory snapshot
./scripts/insur stats
```

Today's totals (commit `798b2a65` baseline):
- 60 commits
- 28 agentic+enterprise tables LIVE
- 78 agentic/governance endpoints + 460+ total
- 95+ OpenAPI tags
- 51 INSUR cron jobs
- 200/200 across 20 iter audits + 10/10 across 4 spec audits

---

## 11 · Frontend (optional)

```bash
cd frontend
pnpm install                              # or: npm install
pnpm dev                                  # vite dev server
pnpm run test                             # vitest snapshot tests
npx playwright test                       # E2E smoke (Iter 22)
```

UI mount points (operator wires to router):
- `/components/AgenticAdminPanel.jsx` · 20-tab agent admin
- `/components/EnterpriseGovernancePanel.jsx` · 9-tab governance
- `/pages/agentic/AgenticAdminPage.jsx` · ready page
- `/pages/governance/EnterpriseGovernancePage.jsx` · ready page

---

## 12 · Env vars (auto-set by `./scripts/insur`)

```bash
INSUR_PORT=8001
INSUR_HOST=0.0.0.0
INSUR_SKIP_MIGRATIONS=1
INSUR_DISABLE_PRESIDIO=1
BEV_POSTGRES_HOST=localhost
BEV_POSTGRES_PORT=5434
BEV_POSTGRES_USER=insur_user
BEV_POSTGRES_PASSWORD=insur_secret_password
BEV_POSTGRES_DB=insur_analytics
TF_CPP_MIN_LOG_LEVEL=3
```

Override any by exporting before running `./scripts/insur`.

---

## 13 · Quick reference · per-feature commands

| Task | Command |
|---|---|
| Daily smoke check | `./scripts/insur status && ./scripts/insur smoke` |
| Full audit before commit | `INSUR_DISABLE_PRESIDIO=1 ./scripts/insur audit` |
| See codebase health | `./scripts/insur stats` |
| Boot from scratch | `./scripts/insur migrate && ./scripts/insur start` |
| Inspect all agentic state | `./scripts/insur agentic` |
| Watch backend logs | `tail -f /tmp/insur-backend.log` |
| Kill + restart | `./scripts/insur stop && ./scripts/insur start` |
| What changed today | `git log --since=midnight --oneline` |
| Sanity sweep | `./scripts/insur validate` |
| Read this doc | `cat RUN.md` |
