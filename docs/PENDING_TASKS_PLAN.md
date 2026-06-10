# PENDING TASKS · the actual plan

Last updated: 2026-06-10 · Iter 48

This is the **brutal honest** list of every pending task across the
project. Each task has:

- **Tier** (A=demo-breaking · B=runtime · C=test · D=integration · E=deploy · F=security · G=scope)
- **Status** (✅ done · 🔄 in-progress · ⏳ pending · 🚫 blocked)
- **Owner** (agent or human · which agent runs this when wired)
- **Mechanism** (cron · manual · CI · operator action)
- **ETA cost** (hours to close)

---

## Tier A · UI lies (demo-breaking)

| # | Task | Status | Owner | Mechanism | ETA |
|---|---|---|---|---|---|
| A1 | Intervention Approve/Reject buttons don't POST | ⏳ | `sys_hitl` | manual fix | 1h |
| A2 | Status tab shows 0/0/0 on fresh install | ⏳ | `test_inference_runner` | manual seed 5 demo invocations | 30m |
| A3 | AgenticHubPage never opened in browser by operator | ⏳ | human | operator loads `/agentic` · I fix what breaks | 15m |
| A4 | AllAgentsNetworkPanel partial render on blueprint API error | ⏳ | `test_frontend_playwright` | manual fix | 30m |
| A5 | Skill MD catalog not linked from UI | ⏳ | manual | add link in hub | 15m |

**Sub-total: ~3 hours**

---

## Tier B · Runtime lies (scaffold without real wire)

| # | Task | Status | Owner | Mechanism | ETA |
|---|---|---|---|---|---|
| B1 | No real LLM call by default | ✅ | `llm_client.py` | Iter 48 wired Ollama · auto-detect | 0h (Ollama LIVE · 25 models) |
| B2 | No real tool registered via `register_tool()` | ⏳ | per-skill operator | manual wire per skill | 2-4h × N skills |
| B3 | Knowledge base has 0 real content | ⏳ | manual seed | operator dumps real runbooks · I embed | 4h |
| B4 | MCP servers in blueprints don't actually exist | ⏳ | per-MCP operator | wire real auth + endpoint | 1-2d × N MCPs |
| B5 | Verification gates document 9 checks · 0 execute | ⏳ | `test_model_fairness` | build gate engine | 1-2d |

**Sub-total: ~5-10 days (one MCP/tool at a time)**

---

## Tier C · Test lies (passes don't test what matters)

| # | Task | Status | Owner | Mechanism | ETA |
|---|---|---|---|---|---|
| C1 | Most audits are file-existence checks · not behavior | 🔄 | all `test_*` agents | replace structural with behavior assertions | 1d |
| C2 | 0 integration tests Pydantic ↔ Zod in CI | ⏳ | `test_backend_pytest` | wire into `.github/workflows/` | 4h |
| C3 | 0 Playwright tests on AgenticHubPage | ⏳ | `test_frontend_playwright` | write e2e specs | 1d |
| C4 | No load test against agentic endpoints | ⏳ | `test_backend_load_k6` | extend k6 smoke to /invoke | 4h |
| C5 | Mutation tests only cover 2 modules | ⏳ | `test_backend_pytest` | extend `setup_mutmut.cfg` | 4h |

**Sub-total: ~2 days**

---

## Tier D · Integration / external systems

| # | Task | Status | Owner | Mechanism | ETA |
|---|---|---|---|---|---|
| D1 | No `mcp_server_registry` table | ⏳ | migration 069 | add schema + endpoint | 4h |
| D2 | No `agent_tool_mapping` table | ⏳ | migration 069 | add schema + endpoint | 4h |
| D3 | No vector DB wired (TF-IDF stub from Iter 43) | ⏳ | `sys_metrics` | pgvector + embedding model | 1d |
| D4 | Webhook receiver doesn't dispatch to agent | ⏳ | `sys_webhooks` | manual wire | 2h |
| D5 | No real cron-driven agent invoker | ✅ | top1pct_testing_pipeline.py | Iter 47 cron daily 04:00 | DONE |

**Sub-total: ~3 days**

---

## Tier E · Deployment + operations

| # | Task | Status | Owner | Mechanism | ETA |
|---|---|---|---|---|---|
| E1 | No Dockerfile for backend | ⏳ | manual | write + verify build | 4h |
| E2 | No docker-compose | ⏳ | manual | write + boot test | 2h |
| E3 | No Kubernetes manifests | ⏳ | manual | adapt healthz probes (Iter 32) | 1d |
| E4 | No CI/CD running on PRs | ⏳ | manual | add `.github/workflows/audits.yml` | 4h |
| E5 | No real backup rotation tested | ⏳ | `sys_audit_chain` | extend backup_restore_drill | 4h |
| E6 | No secrets manager (env vars only) | ⏳ | manual | Vault or KMS | 1d |
| E7 | No observability stack running | ⏳ | manual | Prometheus + Grafana docker | 4h |
| E8 | No alert pipeline (alert rules in DB · nothing fires) | ⏳ | `sys_audit_search` | webhook bridge to PagerDuty/Slack | 4h |

**Sub-total: ~5-10 days for prod-grade deploy**

---

## Tier F · Security gaps

| # | Task | Status | Owner | Mechanism | ETA |
|---|---|---|---|---|---|
| F1 | JWT secret is dev fallback | ⏳ | manual | rotate `INSUR_JWT_SECRET` · gen 256-bit | 30m |
| F2 | No OAuth2/OIDC (Keycloak unwired) | ⏳ | manual | adopt §72 identity-provider module | 1d |
| F3 | No Postgres RLS policies | ⏳ | migration 070 | add `CREATE POLICY` per table | 4h |
| F4 | PII redactor not auto-applied to responses | ⏳ | `sys_pii` middleware | wire response interceptor | 4h |
| F5 | No real pentest ever run | ⏳ | `test_model_robustness` | scheduled ZAP run | 4h |
| F6 | API keys could log in plaintext | ⏳ | manual | logging filter scrub | 2h |

**Sub-total: ~3-5 days**

---

## Tier G · Scope honesty (what we said vs built)

| # | Gap | Reality | Fix path |
|---|---|---|---|
| G1 | Audit row reproducibility | Wrote rows · cannot replay | Add `agent invoke --replay INV-xxx` |
| G2 | RAG | TF-IDF · not real embeddings | pgvector + Iter 43+ |
| G3 | Multi-agent orchestration | Single invoke only | LangGraph wire |
| G4 | §40 decision system | Schema only · rule engine inert | Build rule executor |
| G5 | §48 explainability | UI shows 9 gates · 0 enforce | Gate engine (D2 above) |
| G6 | §76 fairness | Policy in DB · no check runs | Fairlearn wire to invoke |
| G7 | §43 drills | 11 files committed · 4 ever ran | Extend cron to drill matrix |
| G8 | §64.30 12-tier testing | 0 wired | Iter 47 covers 6 phases |

---

## Self-healing cron coverage (Iter 48)

The `INSUR-FIX-PENDING-TASKS` cron (every 4h) AUTO-FIXES these:

| Issue | Fixed by | Frequency |
|---|---|---|
| Ollama check | `check_ollama()` | every run |
| Coverage <95% | `fix_coverage_below_95()` · triggers `agentic_coverage_loop` | every run |
| Stale HITL >24h | `auto_close_stale_hitl(24)` · marks Cancelled | every run |
| Stale catalogs >7d | `regenerate_stale_catalogs(7)` | every run |
| Stale contracts >30d | `regenerate_stale_contracts(30)` | every run |

**Everything ELSE in this doc needs human action** · cron can't write a Dockerfile or wire OAuth.

---

## Priority order for the next 48 hours

If we had 2 days and one human:

1. **Tier A (3h)** · all 5 UI lies closed · `/agentic` becomes demo-real
2. **Tier B2/B3 (8h)** · wire 2 real tools + 50 real KB docs · `/invoke` produces non-stub data
3. **Tier C1 (4h)** · convert 5 audits from structural to behavioral
4. **Tier F1+F3 (5h)** · rotate JWT · enable RLS
5. **Tier E1+E2 (6h)** · Dockerfile + compose · `docker compose up` works

**Total: ~26 hours · grade jumps from C (0.636) to B (~0.85)**

---

## Status tracking via cron

The Iter 48 fix-pending cron writes to:

```
jobs/reports/pending-tasks/fix-YYYYMMDD_HHMM.json
```

Every 4h · operator can `tail` this dir to see what auto-fixed.

The Iter 48 quality scorecard at `/api/v1/test-catalog/top-1pct-report`
shows live grade · every dimension that gets a real pipeline runner
moves from scaffold (0.5) to measured (live).

---

## How to read this plan

- ✅ done · already shipped
- 🔄 in-progress · partial
- ⏳ pending · needs operator decision or cycles
- 🚫 blocked · waiting on something external

When a row goes ✅ · update this file + rerun `./scripts/insur audit` to confirm.

When a row moves up a tier (Tier C item becomes Tier A blocker) · re-prioritize.

---

## The brutal rule

> A pending task without a plan is debt.
> A plan without an owner is a wish.
> A plan with an owner and no cron + no ETA is a hope.
>
> Every row above has owner + mechanism + ETA. That's why it's a plan.
