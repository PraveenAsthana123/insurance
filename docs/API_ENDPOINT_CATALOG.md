# API Endpoint Catalog
Generated from FastAPI OpenAPI metadata. This document is the current API contract baseline. Each endpoint should be expanded with domain-specific business rules as the code matures.

## §68 HOLY Observability Hub — iter 7: `/api/v1/holy/observability-hub/_overview` (aggregator)

Single endpoint that surfaces the health of all 7 §68 read surfaces
(dbviewer / pii / guardrails / security / evals_functional /
evals_cost / evals_safety) in one call. Mirrors the §56
`/api/v1/agent-platform/adapters` aggregator pattern.

Response per surface: `{key, policy, endpoint_prefix, write_status,
source: {kind, path, status, n_rows?, last_ts?, n_corrupt_lines?}}`.
Per §57.7 — a broken per-surface probe NEVER breaks the aggregator;
the bad row surfaces with `status='probe_error'` + `error_type`.

```bash
curl -s http://localhost:8001/api/v1/holy/observability-hub/_overview \
  -H "X-Tenant-ID: tenant-a" -H "X-Demo-Role: manager" | jq '.surfaces[] | {key, status: .source.status, n_rows: .source.n_rows}'
```

Drill: `tests/drills/drill_observability_hub.py` (10 steps, 4 negative
+ §38.3 schema invariant + monkeypatch-probe-survival invariant).

**§68 read-surface story complete**: all 7 surfaces shipped + drilled,
plus this aggregator for one-glance discoverability. Pending: §68.11
multi-model comparison, §68.12 Langfuse adapter, frontend hub page.

## §68 HOLY Observability Hub — iter 6: `/api/v1/holy/evals/safety/*` (eval triplet complete)

§68.10 Safety eval — 3 endpoints federated via `core.holy_audit`
(surface=`evals_safety`). Read-only aggregation over
`data/agent-supervisor/safety_eval_runs.jsonl` (`HOLY_EVAL_SAFETY_LOG`
env). Classifies each row into a verdict using §48 + §64.21 thresholds:

| Metric | Threshold | Source |
|---|---|---|
| hallucination_rate | ≤ 0.05 | §48 explainability |
| toxicity_score | ≤ 0.02 | Llama-Guard / Garak |
| bias_score | ≤ 0.10 | Fairness-bench |
| disparate_impact | ≥ 0.80 | §64.21 fairness gate |
| equal_opportunity_gap | ≤ 0.05 | §64.21 fairness gate |

Verdicts:
- `safe` — every defined check passed AND no metric missing
- `review` — no fails BUT at least one metric missing (gap in evidence)
- `unsafe` — at least one check explicitly failed
- `unknown` — no checks could be evaluated

Endpoints:
- `GET /api/v1/holy/evals/safety/_global` — cross-model scorecard,
  latest-per-model, sorted unsafe→review→unknown→safe (operator-
  attention order)
- `GET /api/v1/holy/evals/safety/incidents?since=&limit=` — recent
  safety violations (verdict=unsafe OR n_safety_incidents > 0)
- `GET /api/v1/holy/evals/safety/{model_id}?since=&limit=` — per-model
  history newest-first with per-row `verdict_summary` carrying the 5
  metric-pass flags + fairness_gate

This completes the §68.8/9/10 eval triplet — functional + cost +
safety on the same JSONL-aggregation pattern.

Drill: `tests/drills/drill_evals_safety.py` (12 steps, 5 negative +
§38.3 schema invariant).

## §68 HOLY Observability Hub — iter 5: `/api/v1/holy/evals/cost/*`

§68.9 Cost eval — 4 endpoints federated via `core.holy_audit`
(surface=`evals_cost`). Read-only aggregation over
`data/agent-supervisor/cost_runs.jsonl` (`HOLY_EVAL_COST_LOG` env):

- `GET /api/v1/holy/evals/cost/_global` — total cost across all
  tenants/models: `last_24h` / `last_7d` / `last_30d` + `all_time`
- `GET /api/v1/holy/evals/cost/by-model` — per-model cost ranking,
  highest-cost first
- `GET /api/v1/holy/evals/cost/by-request/{request_id}` — single-call
  cost detail (full row preserved)
- `GET /api/v1/holy/evals/cost/{tenant_id}` — per-tenant breakdown
  with nested per-model totals within the tenant

Schema (every row): `ts, request_id, tenant_id, model_id,
prompt_tokens, completion_tokens, total_tokens, cost_usd, dept,
surface, endpoint`. Costs round to 6 decimal places in responses.

The WRITE side is the natural §56.2 LLM-gateway hook — append a row
per completion. Composes with §41.1 (FinOps) + §41.3 (tenant
isolation — per-tenant is the primary slice).

Drill: `tests/drills/drill_evals_cost.py` (12 steps, 5 negative +
§38.3 schema invariant).

## §68 HOLY Observability Hub — iter 4: `/api/v1/holy/evals/functional/*`

§68.8 Functional eval — 3 endpoints federated via `core.holy_audit`
(surface=`evals_functional`). Read-only aggregation over
`data/agent-supervisor/functional_eval_runs.jsonl`
(`HOLY_EVAL_FUNCTIONAL_LOG` env):

- `GET /api/v1/holy/evals/functional/_global?since=` — cross-model
  leaderboard (latest-per-model, sorted by accuracy/f1/auc desc)
  + dataset coverage + dept coverage
- `GET /api/v1/holy/evals/functional/{model_id}?dataset=&since=&limit=` —
  per-model history newest-first with `drift_summary` between two
  latest runs on accuracy / f1 / auc / drift_score
- `GET /api/v1/holy/evals/functional/{model_id}/runs/{run_id}` —
  single eval run detail

The WRITE side (MLflow integration / scheduled eval job that appends
a row per run) is a separate iteration. This commit ships the READ
surface so operators can answer "which model wins on rag_qa_v1?" the
moment any eval job starts writing rows.

Sibling iters (§68.9 cost + §68.10 safety) follow the same pattern
under `/api/v1/holy/evals/{cost,safety}/*`.

Drill: `tests/drills/drill_evals_functional.py` (12 steps, 5 negative
+ §38.3 schema invariant).

## §68 HOLY Observability Hub — iter 3: `/api/v1/holy/security/*`

§68.7 Security posture — 3 endpoints federated via `core.holy_audit`
(surface=`security`) aggregating three signals:

- `GET /api/v1/holy/security/_global` — cross-dept summary:
  compliance gates (live-probed: federated_audit / rbac_matrix /
  tenant_id_middleware / pii_inventory / guardrails / drill_discipline)
  + CVE snapshot counts + 24h attack-attempts by type
- `GET /api/v1/holy/security/attacks?since=&limit=` — attack-attempt
  scan over the holy_reads audit log (rbac_denial / scope_denial /
  malformed_path patterns)
- `GET /api/v1/holy/security/{dept}` — per-dept slice with
  `spec_doc` pointer to `HOLY_SECURITY.md` (§64.32 WRITE-side spec)

Compliance gates are live-probed from the running process — no out-of-
band calls. Score = fraction of gates passing. A healthy build scores
1.0 (all 6 gates).

The CVE snapshot at `data/agent-supervisor/security_posture.json`
(env-overridable via `HOLY_SECURITY_POSTURE_PATH`) is populated by an
external pip-audit/bandit/trivy job — out-of-scope for this commit;
service degrades gracefully when missing per §57.7.

Drill: `tests/drills/drill_security_posture.py` (12 steps, 5 negative
+ §38.3 schema invariant).

## §68 HOLY Observability Hub — iter 2b: `/api/v1/holy/guardrails/*`

§68.5 Guardrails — 3 endpoints federated via `core.holy_audit`
(surface=`guardrails`). Read-only aggregation over
`data/agent-supervisor/guardrail_decisions.jsonl` (env-overridable via
`HOLY_GUARDRAIL_LOG`):
- `GET /api/v1/holy/guardrails/_global?since=` — cross-dept rollup
  (by_guardrail_type × by_decision matrix + per-dept + per-filter
  totals)
- `GET /api/v1/holy/guardrails/decision/{decision_id}` — single
  decision lookup by `decision_id` or `request_id`
- `GET /api/v1/holy/guardrails/{dept}?decision=&guardrail_type=&since=&limit=` —
  per-dept decisions, newest-first, with allow|deny|transform +
  guardrail_type filters

The WRITE side (middleware that appends a row when a guardrail fires —
prompt-injection filter, output toxicity, scope-denial, rate-limit,
cost-ceiling, hallucination, schema-validation, tool-authz) is a
separate §68.5 iteration. This commit ships the READ surface so
operators can answer "did the guardrails fire?" today.

Drill: `tests/drills/drill_guardrails.py` (12 steps, 5 negative +
§38.3 schema invariant + PII-never-in-row invariant).

## §68 HOLY Observability Hub — iter 2: `/api/v1/holy/pii/*`

§68.6 PII inventory — 3 endpoints federated via `core.holy_audit`
(surface=`pii`):
- `GET /api/v1/holy/pii/_global` — cross-dept PII inventory + entity-level fields
- `GET /api/v1/holy/pii/leaks?since=&limit=` — leak scan over audit log (NEVER returns raw PII; only redacted match metadata)
- `GET /api/v1/holy/pii/{dept}` — per-dept PII slice

Drill: `tests/drills/drill_pii_inventory.py` (12 steps, 4 negative +
§38.3 schema invariant + raw-PII-never-in-response invariant). Composes
with §47.6 SOC2 CC6.2 PII handling + §57.7 graceful degradation
(missing audit log → empty envelope, not crash).

## GET /api/health
- id: `health_check_unversioned_api_health_get`
- tags: `health`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Health Check Unversioned Api Health Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "health_check_unversioned_api_health_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/health",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Health Check Unversioned Api Health Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/admin/cua/audit
- id: `admin_list_cua_audit_api_v1_admin_cua_audit_get`
- tags: `admin`
- input: path/query params `3`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/AdminCuaAuditListResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "admin_list_cua_audit_api_v1_admin_cua_audit_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/admin/cua/audit",
  "input": {
    "params": [
      {
        "name": "tenant_id",
        "in": "query",
        "required": false,
        "schema": {
          "anyOf": [
            {
              "type": "string",
              "maxLength": 63
            },
            {
              "type": "null"
            }
          ],
          "description": "Optional filter \u2014 limit results to one tenant. Omit to scan all.",
          "title": "Tenant Id"
        },
        "description": "Optional filter \u2014 limit results to one tenant. Omit to scan all."
      },
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 500,
          "minimum": 1,
          "default": 50,
          "title": "Limit"
        }
      },
      {
        "name": "since_ts",
        "in": "query",
        "required": false,
        "schema": {
          "type": "number",
          "minimum": 0.0,
          "default": 0.0,
          "title": "Since Ts"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/AdminCuaAuditListResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/agent-platform/activity
- id: `get_tenant_activity_api_v1_agent_platform_activity_get`
- tags: `agent-platform`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/TenantActivityResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_tenant_activity_api_v1_agent_platform_activity_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/agent-platform/activity",
  "input": {
    "params": [
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 500,
          "minimum": 1,
          "default": 50,
          "title": "Limit"
        }
      },
      {
        "name": "since_ts",
        "in": "query",
        "required": false,
        "schema": {
          "type": "number",
          "minimum": 0.0,
          "default": 0.0,
          "title": "Since Ts"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/TenantActivityResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/agent-platform/adapters
- id: `get_adapters_status_api_v1_agent_platform_adapters_get`
- tags: `agent-platform`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Get Adapters Status Api V1 Agent Platform Adapters Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_adapters_status_api_v1_agent_platform_adapters_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/agent-platform/adapters",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Get Adapters Status Api V1 Agent Platform Adapters Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/agent-platform/approval-broker/decide
- id: `decide_approval_broker_api_v1_agent_platform_approval_broker_decide_post`
- tags: `agent-platform`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/ApprovalBrokerResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "decide_approval_broker_api_v1_agent_platform_approval_broker_decide_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/agent-platform/approval-broker/decide",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/ApprovalBrokerRequest"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/ApprovalBrokerResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/agent-platform/cua/audit
- id: `list_cua_audit_api_v1_agent_platform_cua_audit_get`
- tags: `agent-platform`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/CuaAuditListResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_cua_audit_api_v1_agent_platform_cua_audit_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/agent-platform/cua/audit",
  "input": {
    "params": [
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 500,
          "minimum": 1,
          "default": 50,
          "title": "Limit"
        }
      },
      {
        "name": "since_ts",
        "in": "query",
        "required": false,
        "schema": {
          "type": "number",
          "minimum": 0.0,
          "default": 0.0,
          "title": "Since Ts"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/CuaAuditListResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/agent-platform/cua/execute
- id: `execute_cua_api_v1_agent_platform_cua_execute_post`
- tags: `agent-platform`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/CuaExecutionResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "execute_cua_api_v1_agent_platform_cua_execute_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/agent-platform/cua/execute",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/CuaExecutionRequest"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/CuaExecutionResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/agent-platform/governance/evaluate
- id: `evaluate_governance_api_v1_agent_platform_governance_evaluate_post`
- tags: `agent-platform`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/AgentPolicyEvaluationResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "evaluate_governance_api_v1_agent_platform_governance_evaluate_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/agent-platform/governance/evaluate",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/AgentPolicyEvaluationRequest"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/AgentPolicyEvaluationResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/agent-platform/manifest
- id: `get_manifest_api_v1_agent_platform_manifest_get`
- tags: `agent-platform`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/AgentPlatformManifestResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_manifest_api_v1_agent_platform_manifest_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/agent-platform/manifest",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "$ref": "#/components/schemas/AgentPlatformManifestResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/agent-platform/status
- id: `get_status_api_v1_agent_platform_status_get`
- tags: `agent-platform`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/AgentPlatformStatusResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_status_api_v1_agent_platform_status_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/agent-platform/status",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "$ref": "#/components/schemas/AgentPlatformStatusResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/agent-platform/typed-council/run
- id: `run_typed_council_api_v1_agent_platform_typed_council_run_post`
- tags: `agent-platform`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/TypedCouncilRunResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "run_typed_council_api_v1_agent_platform_typed_council_run_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/agent-platform/typed-council/run",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/TypedCouncilRunRequest"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/TypedCouncilRunResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/ai/explain
- id: `explain_api_v1_ai_explain_post`
- tags: `ai`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/ExplainResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "explain_api_v1_ai_explain_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/ai/explain",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/ExplainRequest"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/ExplainResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/ai/feedback
- id: `feedback_api_v1_ai_feedback_post`
- tags: `ai`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `null`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "feedback_api_v1_ai_feedback_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/ai/feedback",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/FeedbackRequest"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "204",
      "422"
    ],
    "schema": null
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/customer/churn-metrics
- id: `churn_metrics_api_v1_customer_churn_metrics_get`
- tags: `customer`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/ChurnMetricsResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "churn_metrics_api_v1_customer_churn_metrics_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/customer/churn-metrics",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "$ref": "#/components/schemas/ChurnMetricsResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/customer/churn-predict
- id: `churn_predict_api_v1_customer_churn_predict_post`
- tags: `customer`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/ChurnPredictionResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "churn_predict_api_v1_customer_churn_predict_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/customer/churn-predict",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/ChurnPredictionRequest"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/ChurnPredictionResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/customer/churn-top
- id: `churn_top_api_v1_customer_churn_top_get`
- tags: `customer`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/ChurnTopNResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "churn_top_api_v1_customer_churn_top_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/customer/churn-top",
  "input": {
    "params": [
      {
        "name": "n",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 200,
          "minimum": 1,
          "default": 20,
          "title": "N"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/ChurnTopNResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/datasets
- id: `list_datasets_api_v1_datasets_get`
- tags: `datasets`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/PaginatedResponse_DatasetSummary_"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_datasets_api_v1_datasets_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/datasets",
  "input": {
    "params": [
      {
        "name": "offset",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 0,
          "default": 0,
          "title": "Offset"
        }
      },
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 200,
          "minimum": 1,
          "default": 50,
          "title": "Limit"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/PaginatedResponse_DatasetSummary_"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/datasets
- id: `create_dataset_api_v1_datasets_post`
- tags: `datasets`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/DatasetResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "create_dataset_api_v1_datasets_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/datasets",
  "input": {
    "params": [],
    "body": {
      "required": true,
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/DatasetCreate"
          }
        }
      }
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "201",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/DatasetResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/datasets/{dataset_id}
- id: `get_dataset_api_v1_datasets__dataset_id__get`
- tags: `datasets`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/DatasetResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_dataset_api_v1_datasets__dataset_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/datasets/{dataset_id}",
  "input": {
    "params": [
      {
        "name": "dataset_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Dataset Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/DatasetResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/datasets/{dataset_id}/preview
- id: `preview_dataset_api_v1_datasets__dataset_id__preview_get`
- tags: `datasets`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/DatasetPreview"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "preview_dataset_api_v1_datasets__dataset_id__preview_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/datasets/{dataset_id}/preview",
  "input": {
    "params": [
      {
        "name": "dataset_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Dataset Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/DatasetPreview"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/datasets/{dataset_id}/upload
- id: `upload_dataset_api_v1_datasets__dataset_id__upload_post`
- tags: `datasets`
- input: path/query params `1`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/DatasetResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "upload_dataset_api_v1_datasets__dataset_id__upload_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/datasets/{dataset_id}/upload",
  "input": {
    "params": [
      {
        "name": "dataset_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Dataset Id"
        }
      }
    ],
    "body": {
      "required": true,
      "content": {
        "multipart/form-data": {
          "schema": {
            "$ref": "#/components/schemas/Body_upload_dataset_api_v1_datasets__dataset_id__upload_post"
          }
        }
      }
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/DatasetResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/departments
- id: `list_departments_api_v1_departments_get`
- tags: `departments`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/PaginatedResponse_DepartmentSummary_"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_departments_api_v1_departments_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/departments",
  "input": {
    "params": [
      {
        "name": "offset",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 0,
          "description": "Pagination offset",
          "default": 0,
          "title": "Offset"
        },
        "description": "Pagination offset"
      },
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 200,
          "minimum": 1,
          "description": "Pagination limit",
          "default": 50,
          "title": "Limit"
        },
        "description": "Pagination limit"
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/PaginatedResponse_DepartmentSummary_"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/departments/{dept_id}
- id: `get_department_api_v1_departments__dept_id__get`
- tags: `departments`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/DepartmentResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_department_api_v1_departments__dept_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/departments/{dept_id}",
  "input": {
    "params": [
      {
        "name": "dept_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Dept Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/DepartmentResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/departments/{dept_id}/ai-stack
- id: `get_department_ai_stack_api_v1_departments__dept_id__ai_stack_get`
- tags: `departments`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "array", "items": {"$ref": "#/components/schemas/AIMappingResponse"}, "title": "Response Get Department Ai Stack Api V1 Departments  Dept Id  Ai Stack Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_department_ai_stack_api_v1_departments__dept_id__ai_stack_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/departments/{dept_id}/ai-stack",
  "input": {
    "params": [
      {
        "name": "dept_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Dept Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/AIMappingResponse"
      },
      "title": "Response Get Department Ai Stack Api V1 Departments  Dept Id  Ai Stack Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/departments/{dept_id}/processes
- id: `list_department_processes_api_v1_departments__dept_id__processes_get`
- tags: `departments`
- input: path/query params `3`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/PaginatedResponse_ProcessSummary_"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_department_processes_api_v1_departments__dept_id__processes_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/departments/{dept_id}/processes",
  "input": {
    "params": [
      {
        "name": "dept_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Dept Id"
        }
      },
      {
        "name": "offset",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 0,
          "default": 0,
          "title": "Offset"
        }
      },
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 200,
          "minimum": 1,
          "default": 50,
          "title": "Limit"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/PaginatedResponse_ProcessSummary_"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/departments/{dept_id}/roi
- id: `get_department_roi_api_v1_departments__dept_id__roi_get`
- tags: `departments`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "array", "items": {"type": "object", "additionalProperties": true}, "title": "Response Get Department Roi Api V1 Departments  Dept Id  Roi Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_department_roi_api_v1_departments__dept_id__roi_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/departments/{dept_id}/roi",
  "input": {
    "params": [
      {
        "name": "dept_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Dept Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": true
      },
      "title": "Response Get Department Roi Api V1 Departments  Dept Id  Roi Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/health
- id: `health_check_v1_api_v1_health_get`
- tags: `health`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Health Check V1 Api V1 Health Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "health_check_v1_api_v1_health_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/health",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Health Check V1 Api V1 Health Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/holy/agentic/execute
- id: `agentic_execute_api_v1_holy_agentic_execute_post`
- tags: `holy`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Agentic Execute Api V1 Holy Agentic Execute Post"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "agentic_execute_api_v1_holy_agentic_execute_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/holy/agentic/execute",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "additionalProperties": true,
            "type": "object",
            "title": "Payload"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Agentic Execute Api V1 Holy Agentic Execute Post"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/agentic/runs
- id: `list_agentic_runs_api_v1_holy_agentic_runs_get`
- tags: `holy`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response List Agentic Runs Api V1 Holy Agentic Runs Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_agentic_runs_api_v1_holy_agentic_runs_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/agentic/runs",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "query",
        "required": false,
        "schema": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "title": "Dept"
        }
      },
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "default": 20,
          "title": "Limit"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response List Agentic Runs Api V1 Holy Agentic Runs Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/agentic/runs/{request_id}
- id: `get_agentic_run_api_v1_holy_agentic_runs__request_id__get`
- tags: `holy`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Agentic Run Api V1 Holy Agentic Runs  Request Id  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_agentic_run_api_v1_holy_agentic_runs__request_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/agentic/runs/{request_id}",
  "input": {
    "params": [
      {
        "name": "request_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Request Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Agentic Run Api V1 Holy Agentic Runs  Request Id  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/holy/council/ask
- id: `council_ask_api_v1_holy_council_ask_post`
- tags: `holy`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Council Ask Api V1 Holy Council Ask Post"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "council_ask_api_v1_holy_council_ask_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/holy/council/ask",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "additionalProperties": true,
            "type": "object",
            "title": "Payload"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Council Ask Api V1 Holy Council Ask Post"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/council/result/{task_id}
- id: `council_result_api_v1_holy_council_result__task_id__get`
- tags: `holy`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Council Result Api V1 Holy Council Result  Task Id  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "council_result_api_v1_holy_council_result__task_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/council/result/{task_id}",
  "input": {
    "params": [
      {
        "name": "task_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Task Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Council Result Api V1 Holy Council Result  Task Id  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/dashboards/{dept}/{role}
- id: `get_role_dashboard_api_v1_holy_dashboards__dept___role__get`
- tags: `holy`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Role Dashboard Api V1 Holy Dashboards  Dept   Role  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_role_dashboard_api_v1_holy_dashboards__dept___role__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/dashboards/{dept}/{role}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "role",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Role"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Role Dashboard Api V1 Holy Dashboards  Dept   Role  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/dbviewer/_global
- id: `global_overview_api_v1_holy_dbviewer__global_get`
- tags: `holy, dbviewer`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Global Overview Api V1 Holy Dbviewer  Global Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "global_overview_api_v1_holy_dbviewer__global_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/dbviewer/_global",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Global Overview Api V1 Holy Dbviewer  Global Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/dbviewer/databases/{db_id}
- id: `database_info_api_v1_holy_dbviewer_databases__db_id__get`
- tags: `holy, dbviewer`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Database Info Api V1 Holy Dbviewer Databases  Db Id  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "database_info_api_v1_holy_dbviewer_databases__db_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/dbviewer/databases/{db_id}",
  "input": {
    "params": [
      {
        "name": "db_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Db Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Database Info Api V1 Holy Dbviewer Databases  Db Id  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/dbviewer/databases/{db_id}/schemas/{schema}
- id: `schema_tables_api_v1_holy_dbviewer_databases__db_id__schemas__schema__get`
- tags: `holy, dbviewer`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Schema Tables Api V1 Holy Dbviewer Databases  Db Id  Schemas  Schema  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "schema_tables_api_v1_holy_dbviewer_databases__db_id__schemas__schema__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/dbviewer/databases/{db_id}/schemas/{schema}",
  "input": {
    "params": [
      {
        "name": "db_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Db Id"
        }
      },
      {
        "name": "schema",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Schema"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Schema Tables Api V1 Holy Dbviewer Databases  Db Id  Schemas  Schema  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/dbviewer/databases/{db_id}/schemas/{schema}/tables/{table}
- id: `table_detail_api_v1_holy_dbviewer_databases__db_id__schemas__schema__tables__table__get`
- tags: `holy, dbviewer`
- input: path/query params `3`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Table Detail Api V1 Holy Dbviewer Databases  Db Id  Schemas  Schema  Tables  Table  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "table_detail_api_v1_holy_dbviewer_databases__db_id__schemas__schema__tables__table__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/dbviewer/databases/{db_id}/schemas/{schema}/tables/{table}",
  "input": {
    "params": [
      {
        "name": "db_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Db Id"
        }
      },
      {
        "name": "schema",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Schema"
        }
      },
      {
        "name": "table",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Table"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Table Detail Api V1 Holy Dbviewer Databases  Db Id  Schemas  Schema  Tables  Table  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/dbviewer/databases/{db_id}/schemas/{schema}/tables/{table}/sample
- id: `table_sample_api_v1_holy_dbviewer_databases__db_id__schemas__schema__tables__table__sample_get`
- tags: `holy, dbviewer`
- input: path/query params `5`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Table Sample Api V1 Holy Dbviewer Databases  Db Id  Schemas  Schema  Tables  Table  Sample Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "table_sample_api_v1_holy_dbviewer_databases__db_id__schemas__schema__tables__table__sample_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/dbviewer/databases/{db_id}/schemas/{schema}/tables/{table}/sample",
  "input": {
    "params": [
      {
        "name": "db_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Db Id"
        }
      },
      {
        "name": "schema",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Schema"
        }
      },
      {
        "name": "table",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Table"
        }
      },
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 100,
          "minimum": 1,
          "default": 20,
          "title": "Limit"
        }
      },
      {
        "name": "include_pii",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 1,
          "minimum": 0,
          "default": 0,
          "title": "Include Pii"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Table Sample Api V1 Holy Dbviewer Databases  Db Id  Schemas  Schema  Tables  Table  Sample Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/dbviewer/process-tables/_global
- id: `process_tables_global_api_v1_holy_dbviewer_process_tables__global_get`
- tags: `holy, dbviewer`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Process Tables Global Api V1 Holy Dbviewer Process Tables  Global Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "process_tables_global_api_v1_holy_dbviewer_process_tables__global_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/dbviewer/process-tables/_global",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Process Tables Global Api V1 Holy Dbviewer Process Tables  Global Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/dbviewer/process-tables/{dept}
- id: `process_tables_dept_api_v1_holy_dbviewer_process_tables__dept__get`
- tags: `holy, dbviewer`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Process Tables Dept Api V1 Holy Dbviewer Process Tables  Dept  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "process_tables_dept_api_v1_holy_dbviewer_process_tables__dept__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/dbviewer/process-tables/{dept}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Process Tables Dept Api V1 Holy Dbviewer Process Tables  Dept  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/dbviewer/process-tables/{dept}/{process_id}
- id: `process_tables_detail_api_v1_holy_dbviewer_process_tables__dept___process_id__get`
- tags: `holy, dbviewer`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Process Tables Detail Api V1 Holy Dbviewer Process Tables  Dept   Process Id  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "process_tables_detail_api_v1_holy_dbviewer_process_tables__dept___process_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/dbviewer/process-tables/{dept}/{process_id}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "process_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Process Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Process Tables Detail Api V1 Holy Dbviewer Process Tables  Dept   Process Id  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/demo-stories/_global
- id: `global_inventory_api_v1_holy_demo_stories__global_get`
- tags: `holy, demo-stories`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Global Inventory Api V1 Holy Demo Stories  Global Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "global_inventory_api_v1_holy_demo_stories__global_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/demo-stories/_global",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Global Inventory Api V1 Holy Demo Stories  Global Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/demo-stories/{dept}
- id: `dept_catalog_api_v1_holy_demo_stories__dept__get`
- tags: `holy, demo-stories`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Dept Catalog Api V1 Holy Demo Stories  Dept  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "dept_catalog_api_v1_holy_demo_stories__dept__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/demo-stories/{dept}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Dept Catalog Api V1 Holy Demo Stories  Dept  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/demo-stories/{dept}/{role}
- id: `role_demo_detail_api_v1_holy_demo_stories__dept___role__get`
- tags: `holy, demo-stories`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Role Demo Detail Api V1 Holy Demo Stories  Dept   Role  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "role_demo_detail_api_v1_holy_demo_stories__dept___role__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/demo-stories/{dept}/{role}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "role",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Role"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Role Demo Detail Api V1 Holy Demo Stories  Dept   Role  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/depts
- id: `list_depts_api_v1_holy_depts_get`
- tags: `holy`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response List Depts Api V1 Holy Depts Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_depts_api_v1_holy_depts_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/depts",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response List Depts Api V1 Holy Depts Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/downloads/_global
- id: `global_inventory_api_v1_holy_downloads__global_get`
- tags: `holy, downloads`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Global Inventory Api V1 Holy Downloads  Global Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "global_inventory_api_v1_holy_downloads__global_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/downloads/_global",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Global Inventory Api V1 Holy Downloads  Global Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/downloads/{dept}
- id: `dept_catalog_api_v1_holy_downloads__dept__get`
- tags: `holy, downloads`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Dept Catalog Api V1 Holy Downloads  Dept  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "dept_catalog_api_v1_holy_downloads__dept__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/downloads/{dept}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Dept Catalog Api V1 Holy Downloads  Dept  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/downloads/{dept}/{filename}
- id: `serve_file_api_v1_holy_downloads__dept___filename__get`
- tags: `holy, downloads`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "serve_file_api_v1_holy_downloads__dept___filename__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/downloads/{dept}/{filename}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "filename",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Filename"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {}
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/eval/{dept}/{pipeline}/runs
- id: `list_runs_api_v1_holy_eval__dept___pipeline__runs_get`
- tags: `holy`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response List Runs Api V1 Holy Eval  Dept   Pipeline  Runs Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_runs_api_v1_holy_eval__dept___pipeline__runs_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/eval/{dept}/{pipeline}/runs",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "pipeline",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Pipeline"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response List Runs Api V1 Holy Eval  Dept   Pipeline  Runs Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/eval/{dept}/{pipeline}/runs/{run_id}/latest
- id: `get_latest_api_v1_holy_eval__dept___pipeline__runs__run_id__latest_get`
- tags: `holy`
- input: path/query params `3`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Latest Api V1 Holy Eval  Dept   Pipeline  Runs  Run Id  Latest Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_latest_api_v1_holy_eval__dept___pipeline__runs__run_id__latest_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/eval/{dept}/{pipeline}/runs/{run_id}/latest",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "pipeline",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Pipeline"
        }
      },
      {
        "name": "run_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Run Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Latest Api V1 Holy Eval  Dept   Pipeline  Runs  Run Id  Latest Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/eval/{dept}/{pipeline}/runs/{run_id}/manifest
- id: `get_manifest_api_v1_holy_eval__dept___pipeline__runs__run_id__manifest_get`
- tags: `holy`
- input: path/query params `3`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Manifest Api V1 Holy Eval  Dept   Pipeline  Runs  Run Id  Manifest Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_manifest_api_v1_holy_eval__dept___pipeline__runs__run_id__manifest_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/eval/{dept}/{pipeline}/runs/{run_id}/manifest",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "pipeline",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Pipeline"
        }
      },
      {
        "name": "run_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Run Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Manifest Api V1 Holy Eval  Dept   Pipeline  Runs  Run Id  Manifest Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/eval/{dept}/{pipeline}/runs/{run_id}/plots/{plot_name}
- id: `get_plot_api_v1_holy_eval__dept___pipeline__runs__run_id__plots__plot_name__get`
- tags: `holy`
- input: path/query params `4`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_plot_api_v1_holy_eval__dept___pipeline__runs__run_id__plots__plot_name__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/eval/{dept}/{pipeline}/runs/{run_id}/plots/{plot_name}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "pipeline",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Pipeline"
        }
      },
      {
        "name": "run_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Run Id"
        }
      },
      {
        "name": "plot_name",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Plot Name"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {}
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/holy/fleet/fanout
- id: `fanout_tasks_api_v1_holy_fleet_fanout_post`
- tags: `holy`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Fanout Tasks Api V1 Holy Fleet Fanout Post"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "fanout_tasks_api_v1_holy_fleet_fanout_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/holy/fleet/fanout",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "anyOf": [
              {
                "additionalProperties": true,
                "type": "object"
              },
              {
                "type": "null"
              }
            ],
            "title": "Payload"
          }
        }
      }
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Fanout Tasks Api V1 Holy Fleet Fanout Post"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/fleet/recent-done
- id: `get_recent_done_api_v1_holy_fleet_recent_done_get`
- tags: `holy`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Recent Done Api V1 Holy Fleet Recent Done Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_recent_done_api_v1_holy_fleet_recent_done_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/fleet/recent-done",
  "input": {
    "params": [
      {
        "name": "fleet",
        "in": "query",
        "required": false,
        "schema": {
          "type": "string",
          "default": "simple",
          "title": "Fleet"
        }
      },
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "default": 20,
          "title": "Limit"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Recent Done Api V1 Holy Fleet Recent Done Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/fleet/stats
- id: `get_fleet_stats_api_v1_holy_fleet_stats_get`
- tags: `holy`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Get Fleet Stats Api V1 Holy Fleet Stats Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_fleet_stats_api_v1_holy_fleet_stats_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/fleet/stats",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Get Fleet Stats Api V1 Holy Fleet Stats Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/graph/_global
- id: `global_summary_api_v1_holy_graph__global_get`
- tags: `holy, graph`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Global Summary Api V1 Holy Graph  Global Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "global_summary_api_v1_holy_graph__global_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/graph/_global",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Global Summary Api V1 Holy Graph  Global Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/graph/{dept}
- id: `dept_graph_api_v1_holy_graph__dept__get`
- tags: `holy, graph`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Dept Graph Api V1 Holy Graph  Dept  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "dept_graph_api_v1_holy_graph__dept__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/graph/{dept}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Dept Graph Api V1 Holy Graph  Dept  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/graph/{dept}/neighbors/{node_id}
- id: `dept_neighbors_api_v1_holy_graph__dept__neighbors__node_id__get`
- tags: `holy, graph`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Dept Neighbors Api V1 Holy Graph  Dept  Neighbors  Node Id  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "dept_neighbors_api_v1_holy_graph__dept__neighbors__node_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/graph/{dept}/neighbors/{node_id}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "node_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Node Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Dept Neighbors Api V1 Holy Graph  Dept  Neighbors  Node Id  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/graph/{dept}/nodes
- id: `dept_nodes_filtered_api_v1_holy_graph__dept__nodes_get`
- tags: `holy, graph`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Dept Nodes Filtered Api V1 Holy Graph  Dept  Nodes Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "dept_nodes_filtered_api_v1_holy_graph__dept__nodes_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/graph/{dept}/nodes",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "type",
        "in": "query",
        "required": false,
        "schema": {
          "type": "string",
          "description": "Node type filter: all / master_entity / process / pipeline / role / report / demo / audit_event_type / dashboard",
          "default": "all",
          "title": "Type"
        },
        "description": "Node type filter: all / master_entity / process / pipeline / role / report / demo / audit_event_type / dashboard"
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Dept Nodes Filtered Api V1 Holy Graph  Dept  Nodes Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/master-data/_global
- id: `global_catalog_api_v1_holy_master_data__global_get`
- tags: `holy, master-data`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Global Catalog Api V1 Holy Master Data  Global Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "global_catalog_api_v1_holy_master_data__global_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/master-data/_global",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Global Catalog Api V1 Holy Master Data  Global Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/master-data/{dept}
- id: `dept_catalog_api_v1_holy_master_data__dept__get`
- tags: `holy, master-data`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Dept Catalog Api V1 Holy Master Data  Dept  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "dept_catalog_api_v1_holy_master_data__dept__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/master-data/{dept}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Dept Catalog Api V1 Holy Master Data  Dept  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/master-data/{dept}/{entity}
- id: `entity_sample_api_v1_holy_master_data__dept___entity__get`
- tags: `holy, master-data`
- input: path/query params `4`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Entity Sample Api V1 Holy Master Data  Dept   Entity  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "entity_sample_api_v1_holy_master_data__dept___entity__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/master-data/{dept}/{entity}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "entity",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Entity"
        }
      },
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 100,
          "minimum": 1,
          "default": 20,
          "title": "Limit"
        }
      },
      {
        "name": "include_pii",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 1,
          "minimum": 0,
          "default": 0,
          "title": "Include Pii"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Entity Sample Api V1 Holy Master Data  Dept   Entity  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/monitoring/_global
- id: `global_rollup_api_v1_holy_monitoring__global_get`
- tags: `holy, monitoring`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Global Rollup Api V1 Holy Monitoring  Global Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "global_rollup_api_v1_holy_monitoring__global_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/monitoring/_global",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Global Rollup Api V1 Holy Monitoring  Global Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/monitoring/{dept}
- id: `dept_monitoring_api_v1_holy_monitoring__dept__get`
- tags: `holy, monitoring`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Dept Monitoring Api V1 Holy Monitoring  Dept  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "dept_monitoring_api_v1_holy_monitoring__dept__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/monitoring/{dept}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Dept Monitoring Api V1 Holy Monitoring  Dept  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/monitoring/{dept}/jobs/{job}/runs
- id: `list_runs_api_v1_holy_monitoring__dept__jobs__job__runs_get`
- tags: `holy, monitoring`
- input: path/query params `3`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response List Runs Api V1 Holy Monitoring  Dept  Jobs  Job  Runs Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_runs_api_v1_holy_monitoring__dept__jobs__job__runs_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/monitoring/{dept}/jobs/{job}/runs",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "job",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Job"
        }
      },
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 200,
          "minimum": 1,
          "default": 20,
          "title": "Limit"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response List Runs Api V1 Holy Monitoring  Dept  Jobs  Job  Runs Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/monitoring/{dept}/jobs/{job}/runs/{run_id}
- id: `get_run_api_v1_holy_monitoring__dept__jobs__job__runs__run_id__get`
- tags: `holy, monitoring`
- input: path/query params `3`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Run Api V1 Holy Monitoring  Dept  Jobs  Job  Runs  Run Id  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_run_api_v1_holy_monitoring__dept__jobs__job__runs__run_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/monitoring/{dept}/jobs/{job}/runs/{run_id}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "job",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Job"
        }
      },
      {
        "name": "run_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Run Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Run Api V1 Holy Monitoring  Dept  Jobs  Job  Runs  Run Id  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/nav/{dept}
- id: `get_nav_api_v1_holy_nav__dept__get`
- tags: `holy`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Nav Api V1 Holy Nav  Dept  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_nav_api_v1_holy_nav__dept__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/nav/{dept}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Nav Api V1 Holy Nav  Dept  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/holy/orchestration/demo
- id: `orchestration_demo_api_v1_holy_orchestration_demo_post`
- tags: `holy`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Orchestration Demo Api V1 Holy Orchestration Demo Post"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "orchestration_demo_api_v1_holy_orchestration_demo_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/holy/orchestration/demo",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Orchestration Demo Api V1 Holy Orchestration Demo Post"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/pipelines/_global
- id: `global_inventory_api_v1_holy_pipelines__global_get`
- tags: `holy, pipelines`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Global Inventory Api V1 Holy Pipelines  Global Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "global_inventory_api_v1_holy_pipelines__global_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/pipelines/_global",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Global Inventory Api V1 Holy Pipelines  Global Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/pipelines/{dept}
- id: `dept_catalog_api_v1_holy_pipelines__dept__get`
- tags: `holy, pipelines`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Dept Catalog Api V1 Holy Pipelines  Dept  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "dept_catalog_api_v1_holy_pipelines__dept__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/pipelines/{dept}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Dept Catalog Api V1 Holy Pipelines  Dept  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/pipelines/{dept}/{process_id}
- id: `process_detail_api_v1_holy_pipelines__dept___process_id__get`
- tags: `holy, pipelines`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Process Detail Api V1 Holy Pipelines  Dept   Process Id  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "process_detail_api_v1_holy_pipelines__dept___process_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/pipelines/{dept}/{process_id}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "process_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Process Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Process Detail Api V1 Holy Pipelines  Dept   Process Id  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/reports/_global
- id: `global_inventory_api_v1_holy_reports__global_get`
- tags: `holy, reports`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Global Inventory Api V1 Holy Reports  Global Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "global_inventory_api_v1_holy_reports__global_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/reports/_global",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Global Inventory Api V1 Holy Reports  Global Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/reports/{dept}
- id: `dept_catalog_api_v1_holy_reports__dept__get`
- tags: `holy, reports`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Dept Catalog Api V1 Holy Reports  Dept  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "dept_catalog_api_v1_holy_reports__dept__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/reports/{dept}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Dept Catalog Api V1 Holy Reports  Dept  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/reports/{dept}/{report_id}
- id: `report_detail_api_v1_holy_reports__dept___report_id__get`
- tags: `holy, reports`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Report Detail Api V1 Holy Reports  Dept   Report Id  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "report_detail_api_v1_holy_reports__dept___report_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/reports/{dept}/{report_id}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "report_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Report Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Report Detail Api V1 Holy Reports  Dept   Report Id  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/reports/{dept}/{role}
- id: `get_role_reports_api_v1_holy_reports__dept___role__get`
- tags: `holy`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Role Reports Api V1 Holy Reports  Dept   Role  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_role_reports_api_v1_holy_reports__dept___role__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/reports/{dept}/{role}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "role",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Role"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Role Reports Api V1 Holy Reports  Dept   Role  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/holy/reports/{dept}/{role}/{report_id}/run
- id: `run_role_report_api_v1_holy_reports__dept___role___report_id__run_post`
- tags: `holy`
- input: path/query params `3`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Run Role Report Api V1 Holy Reports  Dept   Role   Report Id  Run Post"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "run_role_report_api_v1_holy_reports__dept___role___report_id__run_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/holy/reports/{dept}/{role}/{report_id}/run",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "role",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Role"
        }
      },
      {
        "name": "report_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Report Id"
        }
      }
    ],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "anyOf": [
              {
                "type": "object",
                "additionalProperties": true
              },
              {
                "type": "null"
              }
            ],
            "title": "Payload"
          }
        }
      }
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Run Role Report Api V1 Holy Reports  Dept   Role   Report Id  Run Post"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/roles
- id: `list_roles_api_v1_holy_roles_get`
- tags: `holy`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response List Roles Api V1 Holy Roles Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_roles_api_v1_holy_roles_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/roles",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response List Roles Api V1 Holy Roles Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/security/attack-classes
- id: `list_attack_classes_api_v1_holy_security_attack_classes_get`
- tags: `holy`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response List Attack Classes Api V1 Holy Security Attack Classes Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_attack_classes_api_v1_holy_security_attack_classes_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/security/attack-classes",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response List Attack Classes Api V1 Holy Security Attack Classes Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/security/{dept}/corpora
- id: `list_attack_corpora_api_v1_holy_security__dept__corpora_get`
- tags: `holy`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response List Attack Corpora Api V1 Holy Security  Dept  Corpora Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_attack_corpora_api_v1_holy_security__dept__corpora_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/security/{dept}/corpora",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "attack_class",
        "in": "query",
        "required": false,
        "schema": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "title": "Attack Class"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response List Attack Corpora Api V1 Holy Security  Dept  Corpora Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/security/{dept}/corpora/{attack_class}/{corpus_id}
- id: `get_attack_corpus_api_v1_holy_security__dept__corpora__attack_class___corpus_id__get`
- tags: `holy`
- input: path/query params `3`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Attack Corpus Api V1 Holy Security  Dept  Corpora  Attack Class   Corpus Id  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_attack_corpus_api_v1_holy_security__dept__corpora__attack_class___corpus_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/security/{dept}/corpora/{attack_class}/{corpus_id}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "attack_class",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Attack Class"
        }
      },
      {
        "name": "corpus_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Corpus Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Attack Corpus Api V1 Holy Security  Dept  Corpora  Attack Class   Corpus Id  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/holy/security/{dept}/generate-corpus
- id: `generate_attack_corpus_api_v1_holy_security__dept__generate_corpus_post`
- tags: `holy`
- input: path/query params `1`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Generate Attack Corpus Api V1 Holy Security  Dept  Generate Corpus Post"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "generate_attack_corpus_api_v1_holy_security__dept__generate_corpus_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/holy/security/{dept}/generate-corpus",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      }
    ],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "anyOf": [
              {
                "type": "object",
                "additionalProperties": true
              },
              {
                "type": "null"
              }
            ],
            "title": "Payload"
          }
        }
      }
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Generate Attack Corpus Api V1 Holy Security  Dept  Generate Corpus Post"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/sim/reference-processes
- id: `list_reference_processes_api_v1_holy_sim_reference_processes_get`
- tags: `holy`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response List Reference Processes Api V1 Holy Sim Reference Processes Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_reference_processes_api_v1_holy_sim_reference_processes_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/sim/reference-processes",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response List Reference Processes Api V1 Holy Sim Reference Processes Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/holy/sim/{dept}/{process}/run
- id: `run_simulation_api_v1_holy_sim__dept___process__run_post`
- tags: `holy`
- input: path/query params `2`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Run Simulation Api V1 Holy Sim  Dept   Process  Run Post"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "run_simulation_api_v1_holy_sim__dept___process__run_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/holy/sim/{dept}/{process}/run",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "process",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Process"
        }
      }
    ],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "anyOf": [
              {
                "type": "object",
                "additionalProperties": true
              },
              {
                "type": "null"
              }
            ],
            "title": "Payload"
          }
        }
      }
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Run Simulation Api V1 Holy Sim  Dept   Process  Run Post"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/sim/{dept}/{process}/runs
- id: `list_sim_runs_api_v1_holy_sim__dept___process__runs_get`
- tags: `holy`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response List Sim Runs Api V1 Holy Sim  Dept   Process  Runs Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_sim_runs_api_v1_holy_sim__dept___process__runs_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/sim/{dept}/{process}/runs",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "process",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Process"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response List Sim Runs Api V1 Holy Sim  Dept   Process  Runs Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/sim/{dept}/{process}/runs/{sim_id}/events
- id: `get_sim_events_api_v1_holy_sim__dept___process__runs__sim_id__events_get`
- tags: `holy`
- input: path/query params `4`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Sim Events Api V1 Holy Sim  Dept   Process  Runs  Sim Id  Events Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_sim_events_api_v1_holy_sim__dept___process__runs__sim_id__events_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/sim/{dept}/{process}/runs/{sim_id}/events",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "process",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Process"
        }
      },
      {
        "name": "sim_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Sim Id"
        }
      },
      {
        "name": "layer",
        "in": "query",
        "required": false,
        "schema": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "title": "Layer"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Sim Events Api V1 Holy Sim  Dept   Process  Runs  Sim Id  Events Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/sim/{dept}/{process}/runs/{sim_id}/manifest
- id: `get_sim_manifest_api_v1_holy_sim__dept___process__runs__sim_id__manifest_get`
- tags: `holy`
- input: path/query params `3`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Sim Manifest Api V1 Holy Sim  Dept   Process  Runs  Sim Id  Manifest Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_sim_manifest_api_v1_holy_sim__dept___process__runs__sim_id__manifest_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/sim/{dept}/{process}/runs/{sim_id}/manifest",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "process",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Process"
        }
      },
      {
        "name": "sim_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Sim Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Sim Manifest Api V1 Holy Sim  Dept   Process  Runs  Sim Id  Manifest Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/spec/{dept}
- id: `get_spec_api_v1_holy_spec__dept__get`
- tags: `holy`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Spec Api V1 Holy Spec  Dept  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_spec_api_v1_holy_spec__dept__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/spec/{dept}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Spec Api V1 Holy Spec  Dept  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/holy/testing/dispatch
- id: `dispatch_test_api_v1_holy_testing_dispatch_post`
- tags: `holy`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Dispatch Test Api V1 Holy Testing Dispatch Post"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "dispatch_test_api_v1_holy_testing_dispatch_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/holy/testing/dispatch",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "additionalProperties": true,
            "type": "object",
            "title": "Payload"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Dispatch Test Api V1 Holy Testing Dispatch Post"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/testing/result/{task_id}
- id: `get_test_result_api_v1_holy_testing_result__task_id__get`
- tags: `holy`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Test Result Api V1 Holy Testing Result  Task Id  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_test_result_api_v1_holy_testing_result__task_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/testing/result/{task_id}",
  "input": {
    "params": [
      {
        "name": "task_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Task Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Test Result Api V1 Holy Testing Result  Task Id  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/testing/results
- id: `get_test_results_api_v1_holy_testing_results_get`
- tags: `holy`
- input: path/query params `3`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Test Results Api V1 Holy Testing Results Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_test_results_api_v1_holy_testing_results_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/testing/results",
  "input": {
    "params": [
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "default": 50,
          "title": "Limit"
        }
      },
      {
        "name": "tier",
        "in": "query",
        "required": false,
        "schema": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "title": "Tier"
        }
      },
      {
        "name": "dept",
        "in": "query",
        "required": false,
        "schema": {
          "anyOf": [
            {
              "type": "string"
            },
            {
              "type": "null"
            }
          ],
          "title": "Dept"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Test Results Api V1 Holy Testing Results Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/testing/tiers
- id: `list_test_tiers_api_v1_holy_testing_tiers_get`
- tags: `holy`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response List Test Tiers Api V1 Holy Testing Tiers Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_test_tiers_api_v1_holy_testing_tiers_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/testing/tiers",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response List Test Tiers Api V1 Holy Testing Tiers Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/transactions/_global
- id: `global_summary_api_v1_holy_transactions__global_get`
- tags: `holy, transactions`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"additionalProperties": true, "type": "object", "title": "Response Global Summary Api V1 Holy Transactions  Global Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "global_summary_api_v1_holy_transactions__global_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/transactions/_global",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "additionalProperties": true,
      "type": "object",
      "title": "Response Global Summary Api V1 Holy Transactions  Global Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/transactions/{dept}
- id: `list_transactions_api_v1_holy_transactions__dept__get`
- tags: `holy, transactions`
- input: path/query params `6`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response List Transactions Api V1 Holy Transactions  Dept  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_transactions_api_v1_holy_transactions__dept__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/transactions/{dept}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "source",
        "in": "query",
        "required": false,
        "schema": {
          "type": "string",
          "pattern": "^(all|cron|ml|sim)$",
          "default": "all",
          "title": "Source"
        }
      },
      {
        "name": "event_type",
        "in": "query",
        "required": false,
        "schema": {
          "type": "string",
          "description": "Wildcard match: 'cron.*' or exact 'ml.churn_reference'",
          "default": "*",
          "title": "Event Type"
        },
        "description": "Wildcard match: 'cron.*' or exact 'ml.churn_reference'"
      },
      {
        "name": "since_epoch",
        "in": "query",
        "required": false,
        "schema": {
          "type": "number",
          "minimum": 0,
          "default": 0.0,
          "title": "Since Epoch"
        }
      },
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 500,
          "minimum": 1,
          "default": 50,
          "title": "Limit"
        }
      },
      {
        "name": "include_pii",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 1,
          "minimum": 0,
          "default": 0,
          "title": "Include Pii"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response List Transactions Api V1 Holy Transactions  Dept  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/holy/transactions/{dept}/{event_id}
- id: `get_event_api_v1_holy_transactions__dept___event_id__get`
- tags: `holy, transactions`
- input: path/query params `3`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Event Api V1 Holy Transactions  Dept   Event Id  Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_event_api_v1_holy_transactions__dept___event_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/holy/transactions/{dept}/{event_id}",
  "input": {
    "params": [
      {
        "name": "dept",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Dept"
        }
      },
      {
        "name": "event_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Event Id"
        }
      },
      {
        "name": "include_pii",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 1,
          "minimum": 0,
          "default": 0,
          "title": "Include Pii"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Event Api V1 Holy Transactions  Dept   Event Id  Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/jobs
- id: `list_jobs_api_v1_jobs_get`
- tags: `jobs`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/PaginatedResponse_JobSummary_"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_jobs_api_v1_jobs_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/jobs",
  "input": {
    "params": [
      {
        "name": "offset",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 0,
          "default": 0,
          "title": "Offset"
        }
      },
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 200,
          "minimum": 1,
          "default": 50,
          "title": "Limit"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/PaginatedResponse_JobSummary_"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/jobs
- id: `create_job_api_v1_jobs_post`
- tags: `jobs`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/JobResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "create_job_api_v1_jobs_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/jobs",
  "input": {
    "params": [],
    "body": {
      "required": true,
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/JobCreate"
          }
        }
      }
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "201",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/JobResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/jobs/{job_id}
- id: `get_job_api_v1_jobs__job_id__get`
- tags: `jobs`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/JobResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_job_api_v1_jobs__job_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/jobs/{job_id}",
  "input": {
    "params": [
      {
        "name": "job_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Job Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/JobResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/jobs/{job_id}/results
- id: `get_job_results_api_v1_jobs__job_id__results_get`
- tags: `jobs`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/JobResultResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_job_results_api_v1_jobs__job_id__results_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/jobs/{job_id}/results",
  "input": {
    "params": [
      {
        "name": "job_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Job Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/JobResultResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/models
- id: `list_models_api_v1_models_get`
- tags: `models`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/PaginatedResponse_ModelSummary_"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_models_api_v1_models_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/models",
  "input": {
    "params": [
      {
        "name": "offset",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 0,
          "default": 0,
          "title": "Offset"
        }
      },
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 200,
          "minimum": 1,
          "default": 50,
          "title": "Limit"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/PaginatedResponse_ModelSummary_"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/models
- id: `create_model_api_v1_models_post`
- tags: `models`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/ModelResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "create_model_api_v1_models_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/models",
  "input": {
    "params": [],
    "body": {
      "required": true,
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/ModelCreate"
          }
        }
      }
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "201",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/ModelResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/models/{model_id}
- id: `get_model_api_v1_models__model_id__get`
- tags: `models`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/ModelResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_model_api_v1_models__model_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/models/{model_id}",
  "input": {
    "params": [
      {
        "name": "model_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Model Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/ModelResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/models/{model_id}/metrics
- id: `get_model_metrics_api_v1_models__model_id__metrics_get`
- tags: `models`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": true, "title": "Response Get Model Metrics Api V1 Models  Model Id  Metrics Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_model_metrics_api_v1_models__model_id__metrics_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/models/{model_id}/metrics",
  "input": {
    "params": [
      {
        "name": "model_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Model Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": true,
      "title": "Response Get Model Metrics Api V1 Models  Model Id  Metrics Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/models/{model_id}/predict
- id: `predict_api_v1_models__model_id__predict_post`
- tags: `models`
- input: path/query params `1`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/PredictResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "predict_api_v1_models__model_id__predict_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/models/{model_id}/predict",
  "input": {
    "params": [
      {
        "name": "model_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Model Id"
        }
      }
    ],
    "body": {
      "required": true,
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/PredictRequest"
          }
        }
      }
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/PredictResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/openclaw/manifest
- id: `get_manifest_api_v1_openclaw_manifest_get`
- tags: `openclaw`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/OpenClawManifestResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_manifest_api_v1_openclaw_manifest_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/openclaw/manifest",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "$ref": "#/components/schemas/OpenClawManifestResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/openclaw/status
- id: `get_status_api_v1_openclaw_status_get`
- tags: `openclaw`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/OpenClawStatusResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_status_api_v1_openclaw_status_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/openclaw/status",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "$ref": "#/components/schemas/OpenClawStatusResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/openclaw/tasks
- id: `create_task_api_v1_openclaw_tasks_post`
- tags: `openclaw`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/OpenClawTaskResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "create_task_api_v1_openclaw_tasks_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/openclaw/tasks",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/OpenClawTaskRequest"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/OpenClawTaskResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/openclaw/tasks/{task_id}
- id: `get_task_result_api_v1_openclaw_tasks__task_id__get`
- tags: `openclaw`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/OpenClawTaskResultResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_task_result_api_v1_openclaw_tasks__task_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/openclaw/tasks/{task_id}",
  "input": {
    "params": [
      {
        "name": "task_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Task Id"
        }
      },
      {
        "name": "mode",
        "in": "query",
        "required": false,
        "schema": {
          "enum": [
            "council",
            "simple"
          ],
          "type": "string",
          "default": "council",
          "title": "Mode"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/OpenClawTaskResultResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/paperclip/clips
- id: `list_clips_api_v1_paperclip_clips_get`
- tags: `paperclip`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"items": {"$ref": "#/components/schemas/PaperclipArtifactResponse"}, "type": "array", "title": "Response List Clips Api V1 Paperclip Clips Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_clips_api_v1_paperclip_clips_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/paperclip/clips",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "items": {
        "$ref": "#/components/schemas/PaperclipArtifactResponse"
      },
      "type": "array",
      "title": "Response List Clips Api V1 Paperclip Clips Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/paperclip/clips
- id: `create_clip_api_v1_paperclip_clips_post`
- tags: `paperclip`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/PaperclipArtifactResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "create_clip_api_v1_paperclip_clips_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/paperclip/clips",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/PaperclipCreateRequest"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "201",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/PaperclipArtifactResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/paperclip/clips/{clip_id}
- id: `get_clip_api_v1_paperclip_clips__clip_id__get`
- tags: `paperclip`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/PaperclipArtifactDetail"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_clip_api_v1_paperclip_clips__clip_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/paperclip/clips/{clip_id}",
  "input": {
    "params": [
      {
        "name": "clip_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Clip Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/PaperclipArtifactDetail"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## DELETE /api/v1/paperclip/clips/{clip_id}
- id: `delete_clip_api_v1_paperclip_clips__clip_id__delete`
- tags: `paperclip`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "object", "additionalProperties": {"type": "string"}, "title": "Response Delete Clip Api V1 Paperclip Clips  Clip Id  Delete"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "delete_clip_api_v1_paperclip_clips__clip_id__delete",
  "type": "api_contract",
  "method": "DELETE",
  "path": "/api/v1/paperclip/clips/{clip_id}",
  "input": {
    "params": [
      {
        "name": "clip_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "title": "Clip Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "object",
      "additionalProperties": {
        "type": "string"
      },
      "title": "Response Delete Clip Api V1 Paperclip Clips  Clip Id  Delete"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/paperclip/context-pack
- id: `build_context_pack_api_v1_paperclip_context_pack_post`
- tags: `paperclip`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/PaperclipContextPackResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "build_context_pack_api_v1_paperclip_context_pack_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/paperclip/context-pack",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/PaperclipContextPackRequest"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/PaperclipContextPackResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/paperclip/status
- id: `get_status_api_v1_paperclip_status_get`
- tags: `paperclip`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/PaperclipStatusResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_status_api_v1_paperclip_status_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/paperclip/status",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "$ref": "#/components/schemas/PaperclipStatusResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/processes/{process_id}
- id: `get_process_api_v1_processes__process_id__get`
- tags: `processes`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/ProcessResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_process_api_v1_processes__process_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/processes/{process_id}",
  "input": {
    "params": [
      {
        "name": "process_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Process Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/ProcessResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/processes/{process_id}/ai-mappings
- id: `get_process_ai_mappings_api_v1_processes__process_id__ai_mappings_get`
- tags: `processes`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "array", "items": {"$ref": "#/components/schemas/AIMappingResponse"}, "title": "Response Get Process Ai Mappings Api V1 Processes  Process Id  Ai Mappings Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_process_ai_mappings_api_v1_processes__process_id__ai_mappings_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/processes/{process_id}/ai-mappings",
  "input": {
    "params": [
      {
        "name": "process_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Process Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/AIMappingResponse"
      },
      "title": "Response Get Process Ai Mappings Api V1 Processes  Process Id  Ai Mappings Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/processes/{process_id}/data-flow
- id: `get_process_data_flow_api_v1_processes__process_id__data_flow_get`
- tags: `processes`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "array", "items": {"$ref": "#/components/schemas/DataFlowStepResponse"}, "title": "Response Get Process Data Flow Api V1 Processes  Process Id  Data Flow Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_process_data_flow_api_v1_processes__process_id__data_flow_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/processes/{process_id}/data-flow",
  "input": {
    "params": [
      {
        "name": "process_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Process Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/DataFlowStepResponse"
      },
      "title": "Response Get Process Data Flow Api V1 Processes  Process Id  Data Flow Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/processes/{process_id}/models
- id: `get_process_models_api_v1_processes__process_id__models_get`
- tags: `processes`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "array", "items": {"type": "object", "additionalProperties": true}, "title": "Response Get Process Models Api V1 Processes  Process Id  Models Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_process_models_api_v1_processes__process_id__models_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/processes/{process_id}/models",
  "input": {
    "params": [
      {
        "name": "process_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Process Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": true
      },
      "title": "Response Get Process Models Api V1 Processes  Process Id  Models Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/processes/{process_id}/test-cases
- id: `get_process_test_cases_api_v1_processes__process_id__test_cases_get`
- tags: `processes`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"type": "array", "items": {"type": "object", "additionalProperties": true}, "title": "Response Get Process Test Cases Api V1 Processes  Process Id  Test Cases Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_process_test_cases_api_v1_processes__process_id__test_cases_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/processes/{process_id}/test-cases",
  "input": {
    "params": [
      {
        "name": "process_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Process Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": true
      },
      "title": "Response Get Process Test Cases Api V1 Processes  Process Id  Test Cases Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/sales/forecast
- id: `forecast_api_v1_sales_forecast_post`
- tags: `sales`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/ForecastResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "forecast_api_v1_sales_forecast_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/sales/forecast",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/ForecastRequest"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/ForecastResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/sales/simulate
- id: `simulate_api_v1_sales_simulate_post`
- tags: `sales`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/schemas__sales__SimulationResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "simulate_api_v1_sales_simulate_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/sales/simulate",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/schemas__sales__SimulationRequest"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/schemas__sales__SimulationResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/sales/stores
- id: `list_stores_api_v1_sales_stores_get`
- tags: `sales`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"items": {"$ref": "#/components/schemas/StoreSummary"}, "type": "array", "title": "Response List Stores Api V1 Sales Stores Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_stores_api_v1_sales_stores_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/sales/stores",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "items": {
        "$ref": "#/components/schemas/StoreSummary"
      },
      "type": "array",
      "title": "Response List Stores Api V1 Sales Stores Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/schedules
- id: `create_schedule_api_v1_schedules_post`
- tags: `scheduling, scheduling`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/ScheduleResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "create_schedule_api_v1_schedules_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/schedules",
  "input": {
    "params": [],
    "body": {
      "required": true,
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/ScheduleCreate"
          }
        }
      }
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "201",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/ScheduleResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/schedules
- id: `list_schedules_api_v1_schedules_get`
- tags: `scheduling, scheduling`
- input: path/query params `2`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/PaginatedResponse_ScheduleSummary_"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_schedules_api_v1_schedules_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/schedules",
  "input": {
    "params": [
      {
        "name": "offset",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "minimum": 0,
          "default": 0,
          "title": "Offset"
        }
      },
      {
        "name": "limit",
        "in": "query",
        "required": false,
        "schema": {
          "type": "integer",
          "maximum": 500,
          "minimum": 1,
          "default": 50,
          "title": "Limit"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/PaginatedResponse_ScheduleSummary_"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/schedules/{schedule_id}
- id: `get_schedule_api_v1_schedules__schedule_id__get`
- tags: `scheduling, scheduling`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/ScheduleResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "get_schedule_api_v1_schedules__schedule_id__get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/schedules/{schedule_id}",
  "input": {
    "params": [
      {
        "name": "schedule_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Schedule Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/ScheduleResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## DELETE /api/v1/schedules/{schedule_id}
- id: `delete_schedule_api_v1_schedules__schedule_id__delete`
- tags: `scheduling, scheduling`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/SuccessResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "delete_schedule_api_v1_schedules__schedule_id__delete",
  "type": "api_contract",
  "method": "DELETE",
  "path": "/api/v1/schedules/{schedule_id}",
  "input": {
    "params": [
      {
        "name": "schedule_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Schedule Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/SuccessResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## PUT /api/v1/schedules/{schedule_id}/pause
- id: `pause_schedule_api_v1_schedules__schedule_id__pause_put`
- tags: `scheduling, scheduling`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/SuccessResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "pause_schedule_api_v1_schedules__schedule_id__pause_put",
  "type": "api_contract",
  "method": "PUT",
  "path": "/api/v1/schedules/{schedule_id}/pause",
  "input": {
    "params": [
      {
        "name": "schedule_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Schedule Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/SuccessResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## PUT /api/v1/schedules/{schedule_id}/resume
- id: `resume_schedule_api_v1_schedules__schedule_id__resume_put`
- tags: `scheduling, scheduling`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/SuccessResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "resume_schedule_api_v1_schedules__schedule_id__resume_put",
  "type": "api_contract",
  "method": "PUT",
  "path": "/api/v1/schedules/{schedule_id}/resume",
  "input": {
    "params": [
      {
        "name": "schedule_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Schedule Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/SuccessResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/schedules/{schedule_id}/run-now
- id: `run_schedule_now_api_v1_schedules__schedule_id__run_now_post`
- tags: `scheduling, scheduling`
- input: path/query params `1`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/SuccessResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "run_schedule_now_api_v1_schedules__schedule_id__run_now_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/schedules/{schedule_id}/run-now",
  "input": {
    "params": [
      {
        "name": "schedule_id",
        "in": "path",
        "required": true,
        "schema": {
          "type": "integer",
          "title": "Schedule Id"
        }
      }
    ],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "202",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/SuccessResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/supply-chain/eta
- id: `eta_api_v1_supply_chain_eta_post`
- tags: `supply-chain`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/ETAResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "eta_api_v1_supply_chain_eta_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/supply-chain/eta",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/ETARequest"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/ETAResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/supply-chain/simulate
- id: `simulate_api_v1_supply_chain_simulate_post`
- tags: `supply-chain`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/schemas__supply_chain__SimulationResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "simulate_api_v1_supply_chain_simulate_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/supply-chain/simulate",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/schemas__supply_chain__SimulationRequest"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/schemas__supply_chain__SimulationResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/supply-chain/skus
- id: `list_skus_api_v1_supply_chain_skus_get`
- tags: `supply-chain`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"items": {"$ref": "#/components/schemas/SkuSummary"}, "type": "array", "title": "Response List Skus Api V1 Supply Chain Skus Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_skus_api_v1_supply_chain_skus_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/supply-chain/skus",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "items": {
        "$ref": "#/components/schemas/SkuSummary"
      },
      "type": "array",
      "title": "Response List Skus Api V1 Supply Chain Skus Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## POST /api/v1/supply-chain/stockout-risk
- id: `stockout_risk_api_v1_supply_chain_stockout_risk_post`
- tags: `supply-chain`
- input: path/query params `0`, request body `present`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"$ref": "#/components/schemas/StockoutRiskResponse"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "stockout_risk_api_v1_supply_chain_stockout_risk_post",
  "type": "api_contract",
  "method": "POST",
  "path": "/api/v1/supply-chain/stockout-risk",
  "input": {
    "params": [],
    "body": {
      "content": {
        "application/json": {
          "schema": {
            "$ref": "#/components/schemas/StockoutRiskRequest"
          }
        }
      },
      "required": true
    }
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200",
      "422"
    ],
    "schema": {
      "$ref": "#/components/schemas/StockoutRiskResponse"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

## GET /api/v1/supply-chain/suppliers
- id: `list_suppliers_api_v1_supply_chain_suppliers_get`
- tags: `supply-chain`
- input: path/query params `0`, request body `none`
- process: Router validates HTTP input and delegates to the matching service/repository/domain function. Expand per endpoint during feature hardening.
- output: response schema `{"items": {"$ref": "#/components/schemas/SupplierScored"}, "type": "array", "title": "Response List Suppliers Api V1 Supply Chain Suppliers Get"}`
- security: demo RBAC via `X-Demo-Role` where middleware matrix applies; production target is JWT + scopes/permissions
- tracing: frontend sends `X-Client-Trace-Id`; backend correlation middleware should log correlation/request IDs

JSON test case shape:
```json
{
  "id": "list_suppliers_api_v1_supply_chain_suppliers_get",
  "type": "api_contract",
  "method": "GET",
  "path": "/api/v1/supply-chain/suppliers",
  "input": {
    "params": [],
    "body": null
  },
  "process": "validate -> authorize -> service -> repository/domain -> response",
  "output": {
    "status": [
      "200"
    ],
    "schema": {
      "items": {
        "$ref": "#/components/schemas/SupplierScored"
      },
      "type": "array",
      "title": "Response List Suppliers Api V1 Supply Chain Suppliers Get"
    }
  },
  "security": {
    "auth": "demo_role_header_now_jwt_required_for_production"
  }
}
```

