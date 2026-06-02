# DB Viewer + LLM-Observability Tool Comparison

> Per global §68.2 — every project must publish this evaluation before
> shipping the Observability Hub. Locks the "build thin, not embed heavy"
> verdict with auditable reasoning per §52 brutal-tool-review.

## §1 — DB Viewer alternatives

| # | Tool | License | Maintained | Multi-DB | OSS | TenantId-aware | RBAC-aware | PII-aware | Audit hook | Fits INSUR stack | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **CloudBeaver** | GPLv2 | ✅ active | ✅ yes | ✅ | ❌ | bring-your-own SSO | ❌ | ❌ | partial | **skip** — GPLv2 license, no native PII layer, would bypass our middleware stack |
| 2 | **sqlite-web** | MIT | ✅ active | ❌ SQLite-only | ✅ | ❌ | ❌ | ❌ | ❌ | weak | **skip** — Postgres-first project; would only cover per-tenant SQLite files |
| 3 | **pgweb** | MIT | ✅ active | ❌ Postgres-only | ✅ | ❌ | ❌ | ❌ | ❌ | partial | **skip** — single binary works for one DB but bypasses the audit + PII stack |
| 4 | **Adminer** | Apache-2 | 🟡 slow | ✅ yes | ✅ | ❌ | ❌ | ❌ | ❌ | weak | **skip** — PHP runtime adds a new tech-stack dependency |
| 5 | **Datasette** | Apache-2 | ✅ active | ❌ SQLite | ✅ | 🟡 plugin | 🟡 plugin | 🟡 plugin | 🟡 plugin | partial | **skip** — Postgres-first; plugin-based PII is per-instance, not cluster-wide |
| 6 | **sqladmin (aminalinz)** | BSD-3 | ✅ active | ✅ via SQLAlchemy | ✅ | ❌ | bring-your-own | ❌ | ❌ | strong | **defer** — FastAPI-native; reconsider in iter 4 if scope grows to need rich CRUD |
| 7 | **Metabase** | AGPLv3 | ✅ active | ✅ yes | partial | bring-your-own | ✅ | ❌ | partial | weak | **skip** — heavy JVM runtime + AGPLv3 forces source disclosure |
| 8 | **DBeaver Desktop** | Apache-2 | ✅ active | ✅ yes | ✅ | ❌ | ❌ | ❌ | ❌ | N/A | **skip** — desktop only; not embeddable |
| 9 | **Custom thin viewer** (this project, §68.1) | project license | ✅ | ✅ via psycopg2 | ✅ | ✅ enforced at SQL | ✅ via PERMS_MATRIX | ✅ default-on | ✅ insur_audit | ✅ | **ADOPT** — composes with TenantId + RBAC + audit + PII out of the box |

### Rationale for "build thin"

Every off-the-shelf option either (a) bypasses our existing middleware
stack (`TenantIdMiddleware` + `RBACMiddleware` + `core.insur_audit`) or
(b) drags in a heavy runtime (PHP / JVM / GPL). A thin custom viewer
costs ~300 LOC backend + ~200 LOC frontend, ships under the existing
license + audit posture, and lights up incrementally (4 endpoints
shipped today; 4 more in iter 2).

**Skipping discipline**: per §56.3 the rejection is **documented here**
so a future contributor doesn't silently re-adopt one of these tools.

## §2 — LLM Observability alternatives (§68.13)

| # | Tool | License | OSS self-host | Provider-agnostic | OTel-native | Best for | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **LangSmith** | SaaS (paid) | ❌ | partial | ❌ | LangChain-deep projects | **skip** for OSS-first projects |
| 2 | **Langfuse** | MIT | ✅ self-host | ✅ | partial | provider-agnostic LLM tracing + eval | **ADOPT** as default (next §56 Stage-1 adapter) |
| 3 | **Arize Phoenix** | BSD | ✅ self-host | ✅ | ✅ | heavy eval workflow + drift detection | **defer** — adopt if eval workload exceeds Langfuse |
| 4 | **Helicone** | MIT (proxy) / SaaS | partial | ✅ | ❌ | drop-in OpenAI/Anthropic proxy | **defer** — proxy model conflicts with our LiteLLM gateway adapter |
| 5 | **OpenLIT** | Apache-2 | ✅ | ✅ | ✅ | OpenTelemetry-native | **defer** — adopt when OTel adoption deepens |

**Default for new projects**: **Langfuse** as the 5th §56 Stage-1
adapter (after AgentOps + LiteLLM + typed-council + DSPy optimizer).

## §3 — Multi-model comparison (§68.11)

| Surface | Why |
|---|---|
| `POST /api/v1/insur/evals/model-compare` (custom) | Composes with existing LiteLLM gateway (§56.2) — invoke N models with the same eval set, score each via the same metric whitelist as `dspy_optimizer.run_optimization` (`exact_match` / `contains` / latency_p95 / cost). Persist comparison_id + per-model scorecard in `data/eval/model-compare/<comparison_id>/manifest.json`. |

Not adopting: per-vendor consoles (OpenAI Playground / Anthropic Console)
— they don't compose with our cost-tracker or audit envelope.

## §4 — When to revisit this comparison

- **Quarterly**: re-walk every row; check upstream activity, new entrants.
- **On incident**: any incident traced to a missing observability surface re-opens the eval.
- **When a new §56 Stage-1 adapter lands**: ensure the comparison still holds (i.e. Langfuse adapter shipping doesn't make `helicone` more attractive).

## §5 — Composes with

- §47.6 (SOC2 CC6.2) — every adopted tool MUST flow through the existing PII layer
- §52 brutal tool review — each "skip" verdict has documented evidence
- §56.2 — Langfuse adoption follows the Stage-1 contract
- §57.7 — every tool degrades gracefully when unreachable
- §68 (global) — this file IS the artifact required by §68.2
