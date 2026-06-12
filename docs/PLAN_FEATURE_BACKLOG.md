# PLAN — Feature Backlog · created 2026-06-12 16:55 MDT

> Operator directive 2026-06-12: "create plan · cron"
> Per earlier directives "no need to ask approval · complete autonomously"
> + "hold on login" + "I don't need dark mode" — both DROPPED from list.

## Snapshot
- 141 backend module prefixes · 952 endpoints
- 39 UI pages · 14+ routes in sidebar
- 5 gap-finders all green (advisor 0 · scorecard A · checklist 100% · status 0 ⏳ · processes 5/5)
- Cron: `*/15 INSUR-FIX-ALL-PENDING` + `*/2 INSUR-WATCHDOG` + this new one

## Categories

### 🤖 P1 · Autonomous-buildable (cron will close one per tick)

| # | Feature | Presence check | Closer |
|---|---|---|---|
| F01 | TTS endpoint + UI | `POST /api/v1/voice-ai/text-to-speech` + `/tts` page | scaffold + faster-whisper-tts |
| F02 | Notification Center UI | `frontend/.../NotificationCenterPage.jsx` + `/notifications` route | consume existing `/api/v1/notifications` |
| F03 | Feature Flags UI | `frontend/.../FeatureFlagsPage.jsx` + `/feature-flags` route | consume existing `/api/v1/feature-flags` |
| F04 | Audit Log Explorer UI | `frontend/.../AuditExplorerPage.jsx` + `/audit-explorer` route | consume existing `/api/v1/audit-search` |
| F05 | Cost Optimizer UI | `frontend/.../CostOptimizerPage.jsx` + `/cost` route | rule-based · consume `ai_cost` table |
| F06 | Drift Monitor Dashboard | `frontend/.../DriftMonitorPage.jsx` + `/drift` route | consume `drift_check` cron data |
| F07 | Prompt Playground UI | `frontend/.../PromptPlaygroundPage.jsx` + `/prompt-playground` route | consume `/api/v1/llm-gateway` |
| F08 | Vector DB Browser UI | `frontend/.../VectorBrowserPage.jsx` + `/vectors` route | scaffold + Chroma/Qdrant adapter |
| F09 | Model Comparison UI | `frontend/.../ModelComparePage.jsx` + `/model-compare` route | consume `/api/v1/insur/evals/model-compare` |
| F10 | Translation endpoint + UI | `POST /api/v1/translate/run` + `/translate` page | scaffold + Argos/Helsinki-NLP |
| F11 | Functional OCR | `POST /api/v1/image-clean/ocr` + UI tab on `/stt` | scaffold + pytesseract/easyocr |
| F12 | Fine-tune UI | `frontend/.../FineTuneUIPage.jsx` + `/finetune` route | consume `/api/v1/finetune` |
| F13 | Dataset Upload UI | `frontend/.../DatasetUploadPage.jsx` + `/datasets` route | consume `/api/v1/datasets` |
| F14 | Embedding Playground UI | `frontend/.../EmbeddingPlayground.jsx` + `/embeddings` route | scaffold + bge-m3 |
| F15 | Webhook Receiver Debug UI | `frontend/.../WebhookDebugPage.jsx` + `/webhooks` route | consume `/api/v1/webhooks` |
| F16 | SSE Event Stream UI | `frontend/.../SseStreamPage.jsx` + `/sse-stream` route | consume `/api/v1/sse` |

### ✋ P2 · Operator-input required (cron will FLAG · not auto-build)

| # | Feature | Why operator-gated |
|---|---|---|
| F20 | User profile + preferences UI | UX/copy decisions per operator brand |
| F21 | Onboarding wizard / first-run tour | UX flow per operator |
| F22 | Tenant onboarding wizard UI | Multi-tenant business rules per operator |
| F23 | Role management UI | RBAC matrix decisions per operator |
| F24 | SSO setup wizard | IDP credentials required |
| F25 | Email-to-ticket inbound | SMTP credentials required |
| F26 | Customer real-time WebSocket chat | Architecture decision (poll vs WebSocket vs SSE) |
| F27 | Calendar / meeting view | Calendar provider choice (Google/M365) |
| F28 | Mobile-responsive optimization pass | UX review on each page |
| F29 | Multi-language i18n | Locale matrix per operator |
| F30 | Print to PDF / report exporter | PDF library choice + brand template |
| F31 | Distributed trace explorer UI | Choose between Jaeger UI vs custom |
| F32 | A/B test framework UI | Experimentation policy per operator |
| F33 | Canary deployment UI | Deploy infra (K8s / Docker Swarm) decision |
| F34 | Billing / usage page | Pricing model per operator |
| F35 | Compliance report exporter (PDF/CSV) | Compliance framework per regulator |

### 🚫 P3 · §42 gated (need explicit operator approval)

| # | Feature | Gate reason |
|---|---|---|
| F40 | Image generation (SD/FLUX) | Heavy GPU compute + license review |
| F41 | Video generation | Heavy compute + license |
| F42 | Music / audio generation | License |
| F43 | stress/spike load p95 tuning | Server-side architecture change |
| F44 | Push 332 commits to GitHub | Per §42 + §51.3 push is gated |

## Closure mechanism

`scripts/feature_backlog_audit.py` runs every 30 min via cron tag
`INSUR-FEATURE-BACKLOG`. Each tick:

1. Read this plan doc
2. For every P1 row, run the **presence check**:
   - Backend: probe `GET /openapi.json` for the registered path
   - Frontend: check page file exists in `frontend/src/pages/`
   - Route: check the route is in `frontend/src/App.jsx`
3. Mark each row ✅ / ⏳ / 🟡 per evidence
4. Write JSON report to `jobs/reports/feature-backlog/audit-<ts>.json`
5. Update the plan doc statuses
6. If 5+ consecutive ticks find an item still ⏳ AND it has a registered
   builder script · invoke `scripts/closers/build_<id>.py`
7. On any state change · git commit the updated plan

## Stop conditions

- All P1 rows ✅ → cron emits "fully closed" report · keeps running for drift detection
- Any builder script fails → log + skip · 5-fail cooldown
- Operator says "stop" / "pause" → revert to manual-only

## Verification

```bash
# Check status anytime:
cat docs/PLAN_FEATURE_BACKLOG.md | grep -cE '✅|⏳|🟡'

# View the latest audit report:
ls -lt jobs/reports/feature-backlog/audit-*.json | head -1

# Check cron is armed:
crontab -l | grep INSUR-FEATURE-BACKLOG
```

**Effective**: 2026-06-12 16:55 MDT. Composes with §44 · §55 · §57.7 · §96 · §150.
