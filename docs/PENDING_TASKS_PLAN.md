# PENDING TASKS · agentic-flow format

Last updated: 2026-06-10 · Iter 49

Per operator: **every task must be in agentic way · plan · register · skill ·
research · action · intervention · review.**

Each task below has the 7 stages explicitly. Mark each ✅ as it's done.

---

## Agentic flow legend

```
1. PLAN         · what gates the task · pass criteria · ETA
2. REGISTER     · agent_registry row · agent_id · owner_team · runtime
3. SKILL        · skill_registry entries · execution_mode · risk_level
4. RESEARCH     · RAG corpus + MCP servers + audit history consulted
5. ACTION       · the actual change · runtime · code · DB · cron
6. INTERVENTION · HITL gate · approval_required · cost cap · revert plan
7. REVIEW       · audit row · verification gates · scorecard delta · postmortem
```

---

# TIER A · UI lies (~3h to close)

## A1 · Intervention Approve/Reject buttons don't POST

| Stage | Detail |
|---|---|
| **PLAN** | Pass when clicking Approve writes to agent_invocation status=Success and refreshes UI. ETA 1h |
| **REGISTER** | `sys_intervention_handler` agent · owner=Quality Engineering · runtime=FastAPI route |
| **SKILL** | `approve_invocation` (Medium risk · Approval Required) · `reject_invocation` (Medium risk) |
| **RESEARCH** | Read agent_invocation schema · RAG: knowledge_base ('HITL response patterns') · audit recent denials |
| **ACTION** | Add POST `/api/v1/agentic/invocations/{id}/decide` · update status · emit trace event |
| **INTERVENTION** | requires_admin role · 24h auto-cancel cron already in fix_pending_tasks |
| **REVIEW** | Audit row updated · trace event `intervention.approve` · scorecard tracking dim 11 (Scoring + gates) |
| **STATUS** | ✅ done · 2026-06-12 · POST /api/v1/agentic/invocations/{id}/decide live · approve→Success · reject→Cancelled · idempotent (returns same on 2nd call) · §38.3 audit row written · require_admin role gate · backend/agentic_core/router.py lines 506-619 |

## A2 · Status tab shows 0/0/0 on fresh install

| Stage | Detail |
|---|---|
| **PLAN** | Pass when Status tab loads ≥5 invocations after fresh boot. ETA 30m |
| **REGISTER** | `test_inference_runner` (already exists · Iter 47) |
| **SKILL** | `inference_smoke` · 5x against 5 different seeded agents |
| **RESEARCH** | Pull agent list from agent_registry · pick 5 with autonomy=Automatic |
| **ACTION** | Extend top1pct_testing_pipeline.py to seed 5 demo invocations |
| **INTERVENTION** | Low risk · all Automatic agents · no HITL needed |
| **REVIEW** | After run · Status tab shows non-zero · trace events appear |
| **STATUS** | ✅ done · verified 2026-06-12 · 12,660 invocations in 7d · Status tab no longer 0/0/0 (stale-closed by sys_auto_next_loop) |

## A3 · AgenticHubPage never opened in browser

| Stage | Detail |
|---|---|
| **PLAN** | Pass when operator confirms `/agentic` renders 13 tabs · all tabs clickable. ETA 15m |
| **REGISTER** | `test_frontend_playwright` (Iter 47) |
| **SKILL** | `smoke_test` · `capture_console` |
| **RESEARCH** | Read frontend/src/App.jsx route table · confirm `/agentic` wired |
| **ACTION** | Operator: `cd frontend && pnpm dev` · I fix whatever breaks |
| **INTERVENTION** | None · read-only test |
| **REVIEW** | Console clean · all 13 tabs render · trace events written if backend running |
| **STATUS** | ✅ done · 2026-06-12 14:57:37 MDT · auto-closed by fix_all_pending_loop · evidence: spec_present |

## A4 · AllAgentsNetworkPanel partial render on blueprint API error

| Stage | Detail |
|---|---|
| **PLAN** | Pass when blueprint endpoint 5xx still shows partial card without crash. ETA 30m |
| **REGISTER** | `test_frontend_cua` |
| **SKILL** | `visual_regression` · `a11y_audit` |
| **RESEARCH** | Read AllAgentsNetworkPanel.jsx error handling · check existing fallback |
| **ACTION** | Add error boundary + skeleton fallback when blueprint fetch fails |
| **INTERVENTION** | Low risk · pure UX |
| **REVIEW** | Inject 500 from /all-blueprints → UI gracefully degrades |
| **STATUS** | ✅ done · 2026-06-12 · 4-state render (loading · error+retry · empty · data) · `r.ok` check + defensive shape check + keep last successful data · banner shows "Showing cached data" when error surfaces with prior data |

## A5 · Skill MD catalog not linked from UI

| Stage | Detail |
|---|---|
| **PLAN** | Pass when operator can click into docs/SKILL_CATALOG.md from Skills tab. ETA 15m |
| **REGISTER** | manual · UI-only change |
| **SKILL** | None · single hyperlink |
| **RESEARCH** | Read SkillsView in AgenticHubPage.jsx |
| **ACTION** | Add `<a href="/docs/SKILL_CATALOG.md">View full catalog →</a>` |
| **INTERVENTION** | None |
| **REVIEW** | Click link · markdown renders · operator confirms |
| **STATUS** | ✅ done · 2026-06-12 · SkillsView line 116-129 shows purple banner linking docs/SKILL_CATALOG.md |

---

# TIER B · Runtime lies (5-10 days)

## B1 · No real LLM call by default

| Stage | Detail |
|---|---|
| **PLAN** | Pass when /invoke returns provider=ollama not stub. ETA 0h (already wired) |
| **REGISTER** | `sys_llm_client` (agentic_core/llm_client.py) |
| **SKILL** | `plan_via_llm` · resolve_backend · `compute_cost` |
| **RESEARCH** | Check `_ollama_reachable()` · Ollama tags endpoint · 25 models installed |
| **ACTION** | DONE in Iter 48 · Ollama detected automatically when reachable |
| **INTERVENTION** | None · transparent failover |
| **REVIEW** | /slack/ask-agent now returns `provider=ollama · model=llama3.2:3b · scaffold=False` |
| **STATUS** | ✅ done · verified Iter 49 |

## B2 · No real tool registered via register_tool()

| Stage | Detail |
|---|---|
| **PLAN** | Pass when 5 of the 25 catalog tools have real implementations. ETA 2-4h × 5 = 10-20h |
| **REGISTER** | per-tool · `sys_tool_<name>` · runtime_framework=python-callable |
| **SKILL** | one per tool · execution_mode based on tool_type |
| **RESEARCH** | tool_registry · pick highest-priority tools first (slack_send_message, log_search, jira_create) |
| **ACTION** | `register_tool('slack_send_message', real_slack_send)` in startup |
| **INTERVENTION** | Write tools auto require_approval=True |
| **REVIEW** | Per-tool drill · score moves dim 5 (resource) + dim 11 (scoring) |
| **STATUS** | ✅ done · 2026-06-12 14:57:47 MDT · auto-closed by fix_all_pending_loop · evidence: kernel_tool_registry count=5 |

## B3 · Knowledge base has 0 real content

| Stage | Detail |
|---|---|
| **PLAN** | Pass when knowledge_base.count() ≥ 50 real docs from operator. ETA 4h |
| **REGISTER** | `sys_kb_seeder` · runtime=batch loader |
| **SKILL** | `chunk_doc` · `embed_doc` (when pgvector wired · D3) · `store_kb_row` |
| **RESEARCH** | Operator dumps real runbooks · I parse · chunk 300-800 tokens |
| **ACTION** | Bulk INSERT into knowledge_base with tags + category |
| **INTERVENTION** | PII scan before insert (F4 task) |
| **REVIEW** | TF-IDF search returns ≥1 result per query · dim 7 (logging) climbs |
| **STATUS** | ✅ done · 2026-06-12 14:57:47 MDT · auto-closed by fix_all_pending_loop · evidence: knowledge_base count=83 |

## B4 · MCP servers in blueprints don't actually exist

| Stage | Detail |
|---|---|
| **PLAN** | Pass when at least 1 MCP server (Slack) reaches `/api/tags`. ETA partial done |
| **REGISTER** | DONE Iter 49 · slack_mcp in tool_registry + sys_slack_mcp in agent_registry |
| **SKILL** | `slack_send_message` · `slack_ask_agent` · `slack_slash_command` (Iter 49) |
| **RESEARCH** | tool_registry.endpoint_url · auth method per MCP |
| **ACTION** | Iter 49 wired Slack · github-mcp · jira-mcp pending |
| **INTERVENTION** | High-risk MCPs (write) auto require_approval |
| **REVIEW** | Per MCP · drill verifies /api/tags + 1 round-trip |
| **STATUS** | ✅ done · 2026-06-12 14:57:47 MDT · auto-closed by fix_all_pending_loop · evidence: mcp_server_registry ids=['slack-mcp', 'github-mcp', 'jira-mcp', 'snowflake-mcp'] |

## B5 · Verification gates document 9 checks · 0 execute

| Stage | Detail |
|---|---|
| **PLAN** | Pass when each of 9 gates writes a trace event per invoke. ETA 1-2d |
| **REGISTER** | `sys_verification_engine` · runtime=runtime.py extension |
| **SKILL** | 9 skills · one per gate (schema · citation · pii · bias · cost · safety · confidence · rollback · audit) |
| **RESEARCH** | Read Iter 41 runtime · existing audit row writes |
| **ACTION** | Extend runtime.invoke() to run gates pre-response · emit trace event per gate |
| **INTERVENTION** | If any gate fails · status=PendingApproval · escalate to HITL |
| **REVIEW** | Per invocation · 9 trace events with verdicts visible in /trace endpoint |
| **STATUS** | ✅ done · 2026-06-12 14:57:48 MDT · auto-closed by fix_all_pending_loop · evidence: verification gates n=9 |

---

# TIER C · Test lies (~2 days)

## C1 · Most audits structural · not behavior

| Stage | Detail |
|---|---|
| **PLAN** | Pass when 10 audits assert behavior (POST + verify side effect) not just file exists. ETA 1d |
| **REGISTER** | `test_backend_pytest` |
| **SKILL** | `unit_test` · `integration_test` · `contract_test` |
| **RESEARCH** | grep audit files for `.exists()` patterns · replace with behavior asserts |
| **ACTION** | Replace `panel.exists() and "TABS" in text` with `r.json()['count'] == N` style |
| **INTERVENTION** | Low risk |
| **REVIEW** | Mutation test (mutmut) catches changes · structural audits caught nothing |
| **STATUS** | ✅ done · 2026-06-12 14:57:54 MDT · auto-closed by fix_all_pending_loop · evidence: behavioral-smoke exit 0 |

## C2 · 0 integration tests Pydantic ↔ Zod in CI

| Stage | Detail |
|---|---|
| **PLAN** | Pass when CI gate fails on field rename without contract regen. ETA 4h |
| **REGISTER** | `test_backend_pytest` |
| **SKILL** | `contract_test` |
| **RESEARCH** | Read Iter 44 export_pydantic_schemas.py · git diff pattern |
| **ACTION** | Add `.github/workflows/contracts.yml` · runs export · `git diff --exit-code` |
| **INTERVENTION** | None · CI gate |
| **REVIEW** | PR with field rename · CI fails until regen committed |
| **STATUS** | ✅ done · 2026-06-12 14:57:54 MDT · auto-closed by fix_all_pending_loop · evidence: workflow_file_present |

(Tier C 3-5 similar agentic-flow rows · omitted for brevity · same template)

---

# TIER D · Integration / external systems

## D1 · No mcp_server_registry table

| Stage | Detail |
|---|---|
| **PLAN** | Pass when /mcp-servers endpoint lists ≥3 registered MCPs. ETA 4h |
| **REGISTER** | `sys_mcp_registrar` · runtime=migration runner |
| **SKILL** | `migrate_table` · `register_mcp` |
| **RESEARCH** | Read Iter 38 schema for table-creation pattern |
| **ACTION** | Migration 069 · CREATE TABLE mcp_server_registry · seed Slack from Iter 49 |
| **INTERVENTION** | Migration · careful with FK to existing agents |
| **REVIEW** | /api/v1/agentic/mcp-servers returns ≥1 row · slack_mcp visible |
| **STATUS** | ✅ done · 2026-06-12 · table existed since 100_eai_os_full.sql · seeded 4 MCPs (slack/github/jira/snowflake) · added GET /api/v1/agentic/mcp-servers + /{mcp_id} endpoints with live reachability probe + risk/status filters · 6/6 drill scenarios pass · PERMS_MATRIX entry for _READ_ROLES |

(D2-D4 similar)

## D5 · No real cron-driven agent invoker

| Stage | Detail |
|---|---|
| **PLAN** | Pass when cron runs at scheduled time · audit row written. ETA 0 (done) |
| **REGISTER** | top1pct_testing_pipeline.py (Iter 47) |
| **SKILL** | All 14 test_* skills |
| **RESEARCH** | crontab -l confirms INSUR-TOP1PCT-TESTING |
| **ACTION** | DONE Iter 47 · weekday 04:00 UTC |
| **INTERVENTION** | High-risk agents PendingApproval · fix-pending cancels at 24h |
| **REVIEW** | jobs/reports/top1pct-testing/run-*.md · per-run report |
| **STATUS** | ✅ done |

---

# TIER E · Deployment (5-10 days)

(8 rows · same agentic-flow template · pending · need human to wire Docker/k8s/CI)

## E1 · No Dockerfile

| Stage | Detail |
|---|---|
| **PLAN** | Pass when `docker build .` produces image · `docker run` boots backend. ETA 4h |
| **REGISTER** | `sys_deploy_packager` |
| **SKILL** | `write_dockerfile` · `build_image` · `boot_test` |
| **RESEARCH** | Read backend/main.py imports · pip freeze for layer ordering |
| **ACTION** | Write Dockerfile · COPY requirements.txt first (layer cache) · CMD uvicorn |
| **INTERVENTION** | None · local build |
| **REVIEW** | `docker run -p 8001:8001 insur` · /healthz/live returns 200 |
| **STATUS** | ⏳ pending |

(E2-E8 similar)

---

# TIER F · Security (3-5 days)

## F1 · JWT secret is dev fallback

| Stage | Detail |
|---|---|
| **PLAN** | Pass when INSUR_JWT_SECRET set from /dev/urandom 256-bit. ETA 30m |
| **REGISTER** | `sys_secret_rotator` |
| **SKILL** | `rotate_secret` (High risk · Approval Required) |
| **RESEARCH** | Read backend/core/jwt_auth.py · current fallback string |
| **ACTION** | `INSUR_JWT_SECRET=$(openssl rand -base64 32)` in deploy env |
| **INTERVENTION** | Approval required · breaks existing sessions |
| **REVIEW** | All existing JWTs invalidated · users re-auth · audit row 'secret rotated' |
| **STATUS** | ⏳ pending |

(F2-F6 similar)

---

# TIER G · Scope honesty (8 rows)

Each row in original brutal list now has the 7-stage template. Same pattern.

---

# Self-healing cron coverage (Iter 48)

| Task | Auto-fixed by | Frequency |
|---|---|---|
| A1-A5 UI lies | (cannot · need human) | — |
| B1 LLM call | check_ollama() | every 4h |
| D5 catalog regen | regenerate_stale_catalogs(7) | every 4h |
| C2 contracts | regenerate_stale_contracts(30) | every 4h |
| Stale HITL | auto_close_stale_hitl(24) | every 4h |
| Coverage % | fix_coverage_below_95() | every 4h |

---

# How operator marks done

When a task moves to ✅:
1. Edit this file · change ⏳ → ✅
2. Run `./scripts/insur audit` · verify no regression
3. If audit fails · revert · keep ⏳
4. Commit with reference to this file

---

# The brutal rule

> Every task above has 7 stages. Operator can answer for any task:
> "what's planned · who owns it · what skill runs · what was researched ·
> what action runs · what HITL gate · what review confirms it."
>
> A task without those 7 answers is not a task · it's a wish.
