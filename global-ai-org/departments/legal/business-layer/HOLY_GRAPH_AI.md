# HOLY Beverage — Legal — Graph AI

> Per operator 2026-05-23 — relationship graph unifying every per-dept
> artifact (entities, processes, pipelines, roles, reports, demos,
> audit events, dashboards) into one network.
> Anchor flow: **contract ─ extracted by NLP ─ flagged by clause_classifier**.
> Composes with global §38 audit + §39 RAG knowledge graph + §45 (KG
> non-negotiable) + §47 (C4 L5 dep view) + §49 (compose-footer ≈ graph
> edges) + §59 MDD + §63 + §64.43 #14 + §66.

## 1. Node taxonomy

| Type | Source-of-truth | Count for this dept |
|---|---|---|
| `master_entity` | HOLY_MASTER_DATA.md (15 entities) | 15 |
| `process` | HOLY_PROCESS_MGMT.md | varies |
| `pipeline` | HOLY_PIPELINES.md | 1-3 detailed + stubs |
| `role` | §63 15-role archetype set | 15 |
| `report` | HOLY_REPORTS_CATALOG.md (15 standard) | 15 |
| `demo` | HOLY_DEMO_STORIES_BY_ROLE.md (15 per dept) | 15 |
| `audit_event_type` | HOLY_TRANSACTIONS.md (cron / ml / sim / decision) | ≥ 4 prefixes |
| `dashboard` | dashboards-by-role/ × 15 roles | 15 |

Total nodes per dept: **~74+** (15 entities + N processes + N pipelines
+ 15 roles + 15 reports + 15 demos + ≥4 audit prefixes + 15 dashboards).

## 2. Edge taxonomy

| Edge | Direction | Cardinality | Source artifact |
|---|---|---|---|
| `entity → process` | master_entity flows into process | 1:N | HOLY_PROCESS_MGMT input contracts |
| `process → pipeline` | process implemented by pipeline | 1:1 | HOLY_PIPELINES (process_id == pipeline_id) |
| `pipeline → report` | pipeline phase 5 produces report | N:M | HOLY_PIPELINES phase 5 → HOLY_REPORTS_CATALOG |
| `report → role` | role consumes report (owner + audience) | M:N | HOLY_REPORTS_CATALOG.audience |
| `role → demo` | role has scripted demo | 1:1 | HOLY_DEMO_STORIES_BY_ROLE |
| `role → dashboard` | role's dashboard | 1:1 | §64.37 per-role dashboards |
| `process → audit_event_type` | process emits event type | 1:N | HOLY_TRANSACTIONS event taxonomy |
| `dashboard → tile` | dashboard composed of tiles | 1:N | HOLY_DASHBOARD per role |

## 3. Anchor traversal (the demo path)

The operator-facing narrative path through THIS dept's graph:

```
contract ─ extracted by NLP ─ flagged by clause_classifier
       │
       ▼
  pipeline.run() → audit_event → report → role-dashboard → demo
```

Walking this path answers the §57.5 5-question runbook: WHAT (process)
WHEN (audit timestamp) WHO (role) WHY (decision audit) HOW (demo script).

## 4. Use cases for Graph AI per dept

1. **Impact analysis** — "If we change customer_master schema, which
   processes / pipelines / reports / dashboards break?" → traverse
   downstream edges from `entity:customer` node.
2. **Onboarding** — "Show me everything a `manager` in legal touches."
   → expand role node + 1-hop neighbors.
3. **Audit reconstruction** — "Given audit_event evt-ml-XYZ, show the
   full chain from input entity to final report." → walk backward from
   audit_event_type to entity.
4. **Compose-footer auto-derivation** — every `HOLY_*.md` compose-footer
   should be derivable from this graph; broken footer ⇒ missing edge.
5. **§52 brutal tool review prep** — graph isolates the "blast radius"
   of any tool by counting downstream dependent nodes.
6. **§40 decision routing** — show which decisions get auto / review /
   reject for each role's queue.

## 5. Backend API

| Endpoint | Returns |
|---|---|
| `GET /api/v1/holy/graph/legal` | Full graph (nodes + edges) as JSON |
| `GET /api/v1/holy/graph/legal/nodes?type=role` | Filtered node list |
| `GET /api/v1/holy/graph/legal/neighbors/<node_id>` | 1-hop neighbors of a node |
| `GET /api/v1/holy/graph/_global` | Cross-dept graph summary (counts) |

Response shape (Cytoscape.js-compatible):

```json
{
  "dept": "legal",
  "nodes": [
    {"id": "entity:customer",   "type": "master_entity", "label": "customer"},
    {"id": "process:lead_score", "type": "process",       "label": "Lead Scoring"},
    {"id": "role:manager",       "type": "role",          "label": "Dept Manager"}
  ],
  "edges": [
    {"source": "entity:customer", "target": "process:lead_score", "type": "entity_to_process"},
    {"source": "process:lead_score", "target": "role:manager", "type": "process_to_role"}
  ]
}
```

## 6. Drill (release blocker)

`tests/drills/drill_graph_ai.py` asserts:
- Per-dept graph has ≥ 50 nodes (15 entities + 15 roles + 15 reports + 15 demos + ≥ 1 process)
- Every node has unique id within dept
- Every edge.source + edge.target resolve to existing nodes (no dangling)
- Every node has type ∈ allowed taxonomy
- NEGATIVE: unknown dept → 404
- NEGATIVE: unknown node_id in neighbors → 404
- NEGATIVE: malformed type filter (`?type=Bogus!`) → 400
- _global cross-dept rollup returns all 19 depts + total node count

## 7. Compose-footer (§49)

- [`HOLY_MASTER_DATA.md`](./HOLY_MASTER_DATA.md) — provides `master_entity` nodes
- [`HOLY_PROCESS_MGMT.md`](./HOLY_PROCESS_MGMT.md) — provides `process` nodes
- [`HOLY_PIPELINES.md`](./HOLY_PIPELINES.md) — provides `pipeline` nodes + 5-phase edges
- [`HOLY_REPORTS_CATALOG.md`](./HOLY_REPORTS_CATALOG.md) — provides `report` nodes + audience edges
- [`HOLY_DEMO_STORIES_BY_ROLE.md`](./HOLY_DEMO_STORIES_BY_ROLE.md) — provides `demo` nodes + role edges
- [`HOLY_TRANSACTIONS.md`](./HOLY_TRANSACTIONS.md) — provides `audit_event_type` nodes
- [`HOLY_MONITORING_AI.md`](./HOLY_MONITORING_AI.md) — graph health overlay surface
- [`dashboards-by-role/`](../dashboards-by-role/) — provides `dashboard` nodes
