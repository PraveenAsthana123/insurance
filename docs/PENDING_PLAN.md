# Pending Plan · operator-readable roadmap

> Generated 2026-06-08 from the cumulative "fix all" iteration log.
> Updated per commit · regenerated on each cron run (Mon 14:00) via
> `scripts/weekly_audit_digest.py`.

## Current State

| Metric | Value |
|---|---|
| Cumulative commits this work-stream | 22 |
| Backend modules added | 4 (voice_ai · marketing_campaigns · content_ops · webllm_cdp_rag_langgraph) |
| Frontend pages added | 6 |
| DB tables added | 12 |
| Weekly cron audits | 10 (621 audit cells) |
| Schedule executor cron | every 15 minutes |
| CI workflow steps | 11 (ALL hard-fail) |
| 100-customer scale E2E | 9/9 PASS |
| Master contacts seeded | 103 |

## Pending Items · Prioritized

### Tier 1 · OPERATOR-GATED (need external decisions)

These cannot be completed by me without external inputs · marked
**deferred per §57.7 honest fallback**.

| # | Item | Blocker | Workaround in place |
|---|---|---|---|
| T1.1 | Real LinkedIn API integration | OAuth + `LINKEDIN_ACCESS_TOKEN` | Honest stub adapter logs payload + marks `external_id="stub-linkedin-..."` |
| T1.2 | Real email send (Postal · Mautic · Mailtrain) | SaaS choice from §92 catalog | Email content rendered correctly · `status='pending'` until manual export |
| T1.3 | Real Twitter API integration | API key (Twitter restricted access) | Adapter renders to 280 chars · payload ready |
| T1.4 | Banner generation (Fooocus · ComfyUI) | Operator install + GPU choice | `image_url` field accepts external URL · operator can paste from any tool |
| T1.5 | C2PA watermark on banner images | Pipeline integration (§82.21) | `watermark_required=true` flag on rendered payload |
| T1.6 | Backend container image build | Operator decision · `docker compose build` | In-process TestClient covers all assertions |

### Tier 2 · SMALL CONCRETE (~30 min each · ready to execute)

These are operator-aligned polish items · no external blockers.

| # | Item | Effort | Where it lands |
|---|---|---|---|
| T2.1 | "Last X days" filter on AdminAuditPage trend chart | small | Frontend dropdown (10 · 30 · 90 days) |
| T2.2 | Sparkline overlay on PASS tile | small | Inline SVG · ~30 lines |
| T2.3 | Drag-and-drop file zone in ContentOpsPage | small | Replace file-pick with dropzone (+ paste fallback) |
| T2.4 | Schedule executor for `content_postings.scheduled_for` | small | New cron `*/30 * * * *` reads draft postings due to publish |

### Tier 3 · MEDIUM EFFORT (1-2h each)

| # | Item | Effort | Value |
|---|---|---|---|
| T3.1 | Frontend `AutonomousAgentPage.jsx` (visualize decision loop) | medium | Operator-facing demo for §80 |
| T3.2 | Multi-cohort fairness eval (real DI < 1.0 cross-cohort test) | medium | Real §76 RAI testing |
| T3.3 | Operation_log rotation (>90d archive) | medium | §38.3 retention compliance |
| T3.4 | Per-step latency histograms on E2E flow (trend per assertion) | medium | Operator hasn't asked · defer |
| T3.5 | §82.21 DLP scan multilingual (non-US SSN/CC) | medium | Jurisdictional scope decision needed |

### Tier 6 · ENTERPRISE AI TOOL LANDSCAPE (NEW · operator brief 2026-06-08)

| # | Item | Effort | Status |
|---|---|---|---|
| T6.1 | Tool registry · 140 tools · 26 categories | done | `backend/ai_tool_registry/registry.py` |
| T6.2 | Read-only tool API · 7 endpoints | done | `/api/v1/ai-tools/*` |
| T6.3 | Tool Landscape Explorer UI · 4 tabs | done | `/ai-tools` route |
| T6.4 | This project tool usage · 5 'used' tools | done | matches actual codebase |
| T6.5 | Scaffolded tools · 4 (WebLLM · CDP · LangGraph · OTel) | scaffolded | webllm_cdp_rag_langgraph/ |
| T6.6 | Planned tools · 6 (Presidio · Garak · RAGAS · DeepEval · Langfuse · Phoenix) | planned | T6.x roadmap |
| T6.7 | Reference-only · 125 tools | reference | interview/architecture awareness |
| T6.8 | Adopt RAGAS for §75 metric measurement | medium | T6.x |
| T6.9 | Adopt Langfuse for §38.3 audit row enhancement | medium | T6.x |
| T6.10 | Adopt Presidio for §82.21 DLP extension | medium | T6.x · extends current 5-shape regex |
| T6.11 | Adopt Qdrant when scale > pgvector | medium | T6.x |
| T6.12 | Adopt Temporal when cron > 20 jobs | medium | T6.x · currently 11 audits + 2 executors |

Full reference: [docs/ENTERPRISE_AI_TOOL_LANDSCAPE.md](ENTERPRISE_AI_TOOL_LANDSCAPE.md)

### Tier 5 · ENTERPRISE MARKETING COMMAND CENTER (NEW · operator brief 2026-06-08)

| # | Item | Effort | Status |
|---|---|---|---|
| T5.1 | KPI registry · 85 KPIs · 15 categories | done | `backend/marketing_kpis/registry.py` |
| T5.2 | KPI read-only API · 8 endpoints | done | `/api/v1/marketing-kpis/*` |
| T5.3 | Marketing Command Center UI · 5 tabs | done | `/marketing-kpis` route |
| T5.4 | Live wiring · 13 KPIs marked 'live' | live | reads from existing tables |
| T5.5 | Scaffolded wiring · 38 KPIs | scaffolded | formula present · needs data hook |
| T5.6 | Planned KPIs · 34 deferred | planned | mostly require attribution/external data |
| T5.7 | Predictive models (churn · NBA · attribution) | medium | needs feature store + training |
| T5.8 | Real-time KPI calculation cron | medium | extends current weekly digest |
| T5.9 | Multi-touch attribution model | large | requires touchpoint tracking |
| T5.10 | Per-KPI alerting on target breach | medium | extends drift detection §82.7 |

Full reference: [docs/MARKETING_KPI_FRAMEWORK.md](MARKETING_KPI_FRAMEWORK.md)

### Tier 4 · LARGER SCOPE (>2h)

| # | Item | Effort | Why |
|---|---|---|---|
| T4.1 | LLM-driven `_decide_next()` using §91 WebLLM | large | Smarter autonomous agent · current is rule-based per §57.7 |
| T4.2 | Bulk-upload streaming for >10k rows | medium | Server cap already 10k/batch · client already chunks 100/batch |
| T4.3 | E2E latency dashboard with histograms over weeks | large | Long-term trend infrastructure |

## Recommended Next Move

**Tier 2 batch** · all 4 items in one commit:
- T2.1 trend chart day filter
- T2.2 PASS tile sparkline
- T2.3 drag-and-drop file zone
- T2.4 content posting scheduler

Estimated effort: ~30 min remaining (T2.4 closed). Other Tier 2 items already done in commit f810ebc.

## Cron Stack (after this commit)

| Schedule | Job | Purpose |
|---|---|---|
| `0 9 * * 1` | §64.22 RECOMMENDATION audit | 21 cells |
| `30 9 * * 1` | §64.29 GENERAL §64 audit | 315 cells |
| `0 10 * * 1` | §58/§63 FOLDER-README audit | 200 cells |
| `30 10 * * 1` | §90 L15 VOICE AI E2E audit | 12 cells |
| `0 11 * * 1` | §92 COMPLIANCE audit | 19 cells |
| `30 11 * * 1` | §64.13 MARKETING CAMPAIGNS audit | 16 cells |
| `0 12 * * 1` | E2E CONSUMER FLOW | 12 cells |
| `30 12 * * 1` | ADVANCED TESTS | 8 cells |
| `0 13 * * 1` | 100-CUSTOMER SCALE | 9 cells |
| `30 13 * * 1` | SCHEDULE EXECUTOR audit | 12 cells |
| **`0 14 * * 1`** | **WEEKLY DIGEST (NEW)** | **Aggregates all 10 audit results into one report** |
| `*/15 * * * *` | run_due_schedules (executor) | Continuous |
| **`*/30 * * * *`** | **content_posting_publisher (NEW)** | **Publishes scheduled_for postings due** |

## Composes With

- §38.3 (audit row per operation · across all 10 audits)
- §47.6 (CI hard-fail · 11 steps · postgres service block)
- §57.7 (honest stub for LinkedIn/email/banner · operator picks SaaS)
- §70 (cron audit pattern · 10 weekly audits + 2 continuous)
- §76 (RAI fairness gates in autonomous agent + 100-cust + advanced suite)
- §82.7 (drift detection via quality_score + last_run_status)
- §82.21 (DLP gates verified by adversarial 5-shape audit)
