# HOLY Beverage — Retail Operations — Contact Center Automation

> Per global CLAUDE.md §64.5 + §64.18 — every department MUST have this artifact.
> This stub is the contract; the AI-Strategy role fills in dept specifics.

## Owner

**Manager** + **CX role** (dept = retail-operations). For non-CX depts this covers
internal helpdesk + vendor support + partner queries.

## Scope (channels — at least 4)

- [ ] Voice (Twilio / Genesys)
- [ ] Email (SES / SMTP)
- [ ] Chat (web widget / Intercom)
- [ ] WhatsApp / Telegram (Meta API)
- [ ] Portal (in-app)
- [ ] Other (specify): _

## Intent taxonomy (≥ 20 top intents required)

| # | Intent | Frequency / month | Auto-resolvable? | Backing model |
|---|---|---|---|---|
| 1 | _stub: replace with real intent for retail-operations_ | _ | yes/no | DistilBERT |
| … | (20 total minimum) | | | |

## Automation tiers

| Tier | Examples | SLA | Owner |
|---|---|---|---|
| **Self-service** | KB lookup, FAQ answer | < 1 sec | RAG pipeline |
| **AI-resolve** | Reset password, balance check, status update | < 5 sec | LLM + tools |
| **Human-assist** | Complex inquiry with AI suggestions | < 5 min | Agent + copilot |
| **Human-only** | Sensitive / regulated / VIP | per SLA | Senior agent |

## Routing rules

- Intent confidence ≥ 0.85 → auto-resolve attempt
- Intent confidence 0.5-0.85 → human-assist with AI suggestions
- Intent confidence < 0.5 → human-only + flag for retraining set
- VIP customer → always human-only (override automation)
- Sentiment < -0.5 → escalate to senior agent

## KB coverage map

- Total KB articles: _
- Articles per top-20 intent: _
- Stale articles (> 90 days, low CTR): _ — backlog for refresh

## Conversational AI integration

- LLM model: `gemma3:4b` (default for retail-operations) — adjust per latency/cost SLO
- RAG corpus: `data/retail-operations/kb/` + `data/retail-operations/sops/`
- Guardrails: PII redaction, profanity filter, off-topic detector, hallucination check (faithfulness ≥ 0.85)
- Citation requirement: every AI answer MUST cite at least one KB chunk

## Quality metrics (mandatory)

| Metric | Target | Current | Source |
|---|---|---|---|
| Average handle time (AHT) | _ min | _ | telephony logs |
| First-contact resolution (FCR) | _ % | _ | ticket disposition |
| CSAT | _ | _ | post-interaction survey |
| Automation rate | _ % | _ | router logs |
| Escalation rate | _ % | _ | router logs |

## Compliance

- Call recording consent (per region — GDPR, CCPA)
- PII redaction in transcripts (Presidio / DLP)
- Retention per data class (per global §38 + §64.32)
- Audit row per AI decision (per global §38.3)

## Composes with

- `HOLY_INCIDENT_MGMT.md` — L2/L3 escalation chain
- `HOLY_CONTACTS.md` — contact registry
- `HOLY_RECOMMENDATION.md` — agent-action suggestions
- Global §64.32 — security capture for all conversations
