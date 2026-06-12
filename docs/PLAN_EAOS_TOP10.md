# PLAN — EAOS Top-10 Practical Components · 2026-06-12 17:30 MDT

> Operator brief 2026-06-12 dropped the full 23-level Enterprise AI Operating
> System (EAOS) topic map. Operator listed the **10 most important practical
> components to build first**. This plan maps each to current state per §57.7
> honest scaffold (no fabricated progress) and registers a closer per gap.

## Honest snapshot · BEFORE this batch

| # | Component | State | Evidence |
|---|---|---|---|
| 1 | Enterprise Agent Operating System (EAOS) | 🟡 partial | §144 EAI-OS at `/eai-os` · 9 layers · agent_kernel · L15 Control Tower ✅ but 6 engines (Identity/Policy/Trust/Memory/Cost/Eval) only partly wired |
| 2 | AI Control Tower | ✅ done | `/control-tower` · 12/12 dashboards live · `live_ratio=1.0` |
| 3 | AI Governance Operating Model | 🟡 partial | governance, governance-registries, governance-tables, mandatory-governance modules exist · no single OPS-model UI |
| 4 | Agent Registry | ✅ done | `agent_registry` table · 454 rows · `/api/v1/agentic/agents` · UI in `/agentic` |
| 5 | Agent Lifecycle Management | 🟡 partial | status field Draft/Active/Retired · no promotion/certification UI flow |
| 6 | PromptOps | 🟡 partial | `prompt_version` table + `/api/v1/prompts` exist · **no dedicated UI** |
| 7 | EvaluationOps | 🟡 partial | `/api/v1/insur/evals` + §B5 verification (9 gates) · **no consolidated UI** |
| 8 | AI Observability | ✅ mostly | `agent_trace_event` 24,895 rows · Jaeger/Tempo/Langfuse/Langsmith adapters · `/api/v1/heartbeat` |
| 9 | AI Service Management (AISM) | 🟡 partial | `/itsm` Incident only · Problem/Change/Request missing |
| 10 | Enterprise AI Command Center | ❌ missing | no executive-layer dual-surface yet |

**Score before**: 2 ✅ + 6 🟡 + 1 ❌ + 1 partial-✅ = 5/10 (50%) honestly closed.

## Closures shipped in this batch

| # | Closure | Result |
|---|---|---|
| C1 | `GET /api/v1/eaos/scoreboard` | Live presence + score % per component |
| C2 | `/eaos` UI · 10-card dashboard | Drill-link per component |
| C3 | `/command-center` UI (Executive + Operational dual layer) | Closes #10 |
| C4 | `/promptops` UI (registry / version / test / approve / rollback) | Closes #6 UI gap |
| C5 | `/evalops` consolidated UI | Closes #7 UI gap |
| C6 | `scripts/eaos_top10_audit.py` | Per-tick honest presence check |
| C7 | Cron `0 */6 * * * INSUR-EAOS-AUDIT` | 6-hourly health snapshot |

## Target state · AFTER this batch

Expected `eaos.scoreboard.overall_score >= 0.78` (8/10 fully ✅).

The 2 items still ≤ 🟡 after this batch:
- #3 Governance Operating Model · needs RACI matrix + approval-chain visualization (next iteration)
- #5 Agent Lifecycle · needs promotion/certification workflow UI (next iteration)
- #9 AISM · needs Problem/Change/Request modules (next iteration)

## Verification

```bash
curl -s http://localhost:8001/api/v1/eaos/scoreboard -H "X-Demo-Role: manager" | \
  jq '.overall_score, .components[] | "\(.id): \(.status)"'

curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3210/eaos
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3210/command-center
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3210/promptops
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3210/evalops

crontab -l | grep INSUR-EAOS-AUDIT
```

**Effective**: 2026-06-12 17:30 MDT. Composes with §44 · §55 · §57.7 · §96 · §144 · §149.2 · §150.
