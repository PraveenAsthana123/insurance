# HOLY Beverage — E-Commerce — Agentic Stack

> Per global CLAUDE.md §64.40 + §64.40.8 + §67 — every department MUST have
> this artifact. It names the Layer-10 enterprise apps this dept may take
> actions against and the required scope for each. The E-Commerce manager owns
> reviews; AI-Strategy owns scope grants.

## Owner

**Manager (E-Commerce)** + **AI-Strategy** + **Information Security**.

## 10-layer execution flow (§64.40)

Every E-Commerce agent action MUST traverse layers 1 → 10 in order. Skipping any
layer is a release blocker.

```
1.  User Goal                 — chat / form / API
2.  Council of Agents         — author + reviewer + chair triage
3.  Planner Agent             — task DAG with dependencies
4.  Task Decomposition        — atomic actions; each tagged with scope_required
5.  Policy / Governance       — RBAC / cost / safety gates (§47.6 + §40)
6.  Computer-Using Agent      — executes against the chosen interface
7.  Stagehand / Browser-Use   — semantic browser primitives
8.  Playwright                — low-level browser automation
9.  Browser / Desktop / API   — runtime target
10. Enterprise Application    — persistent side-effect (see below)
```

## 5-OS layering (§67)

| OS | What it gives E-Commerce agents |
|---|---|
| **MCP** | Standardised tool calls — credit-check, address-verify, vendor-lookup, etc. |
| **Paperclip** | Long-running business workflows (multi-week deal cycles, audits) |
| **OpenClaw** | Execution-level orchestration — retry, reflection, state machines |
| **Harness Agent** | Cross-agent sync between E-Commerce and adjacent depts (handoffs) |
| **PoliAI** | Runtime policy enforcement — every action passes a policy gate first |

## Allowed Layer-10 enterprise applications

| Application | Allowed action | Required scope |
|---|---|---|
| Shopify | update product, inventory | `shopify.write.product` |
| BigCommerce | update product, inventory (alt) | `bc.write.product` |
| Algolia | reindex catalog | `algolia.write.index` |
| Klaviyo | trigger transactional email | `klaviyo.write.email` |

## Scope grant model

Scopes are **not blanket** — they're granted per `(user, agent_role, app, action)`
tuple with an expiry. New scope grants require an InfoSec + AI-Strategy
co-approval. The grant lives in [config/scopes/e-commerce.yaml](../../../../config/scopes/e-commerce.yaml)
(create the file on first non-trivial grant).

Default scope ceiling for this dept: **READ-ONLY** until explicit write grant.

## Decision audit row (§38.3)

Every action this dept's agents take writes one audit row to the global
decision-audit table. The row's `tool` field is the Layer-10 app name; the
`actor` is the agent (or HITL approver if escalated).

Required fields specific to this dept:
- `request_id` — propagated from layer 1 (per §57.6)
- `tenant_id`, `actor`, `tool`, `latency_ms`, `outcome` — canonical (§57.6)
- `scope_granted` — which scope this action used; missing = denial
- `goal_text` — natural-language description (PII-redacted per §47.6)
- `external_record_id` — the system-of-record ID returned by Layer-10
- `human_override` — true if HITL was required and granted

## HITL escalation path

| Condition | Route to |
|---|---|
| `scope_required` not in `scope_granted` | InfoSec + AI-Strategy co-approval |
| Action cost > daily budget | Finance approval |
| Action irreversible (deletion, signing) | Manager (E-Commerce) approval |
| Confidence < 0.6 | Manager (E-Commerce) review queue |
| Fairness flag triggered | AI-Strategy + Legal review |

Approval surface: `/api/v1/agent-platform/cua/execute` body sets
`require_human_approval=true`; frontend renders the queue at
`/holy/e-commerce/agentic` (per §64.40.5).

## Rollback plan

Every Layer-10 write action MUST have a tested rollback before scope grant.
Per-app rollback specs live in
[ops/runbook/e-commerce-agentic-rollback.md](../../../../ops/runbook/).

## Drill

`tests/drills/drill_per_dept_artifacts.py` enforces this file's existence
(release blocker). A future drill `tests/drills/drill_agentic_scope_grants.py`
will enforce every grant in `config/scopes/e-commerce.yaml` has a matching audit
row + a rollback runbook entry.

## Composes with

- §38 (governance) — every action writes an audit row
- §40 (decision system) — confidence + rule gating before Layer-6 fires
- §47.6 (security) — RBAC enforced at the gateway per SOC2 CC6.2
- §48 (explainability) — chain-of-thought + reasoning trace per row
- §57.6 (canonical fields) — `request_id` propagated 1 → 10
- §64.34 (simulation) — every action above runnable in simulation mode first
- §64.43 (patterns) — this dept defaults to Hub-and-Spoke (§64.43 #1) for
  background fan-out and Hierarchical (§64.43 #4) for multi-step user goals

<!-- AUTO-GENERATED-MARKER — operator edits below this line are preserved on re-scaffold -->
