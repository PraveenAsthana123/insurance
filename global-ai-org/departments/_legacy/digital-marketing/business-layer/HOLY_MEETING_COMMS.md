# HOLY Beverage — Digital Marketing — Meeting Summarization + Communication Management

> Per global CLAUDE.md §64.14 + §64.18 — every department MUST have this artifact.
> This stub is the contract; the AI-Strategy role fills in dept specifics.

## Owner

**Manager** (orchestration) + **Team-member role** (consumption).

## Meeting cadence

| Cadence | Meeting | Duration | Roster | AI summary? |
|---|---|---|---|---|
| Daily | Stand-up | 15 min | dept team | yes |
| Weekly | Dept review | 60 min | dept leads | yes |
| Monthly | Cross-dept sync | 90 min | extended team | yes |
| Quarterly | Strategy + planning | 4 hours | dept + exec | yes (sectioned) |

## Meeting AI pipeline

```
Audio capture (Zoom / Meet / Teams)
  → STT (Whisper-large)
  → Speaker diarization (pyannote)
  → Summarizer (LLM)
  → Action-item extractor (NER + heuristics)
  → Audit row per global §38.3
```

Quality gates:
- Summary faithfulness ≥ 0.85 (Ragas)
- Action-item recall ≥ 0.90 (vs human gold)
- Speaker diarization DER < 15%

## Action-item routing

- NLP-classified action items get auto-assigned to owner
- Default due-date: meeting + 7 days (override per item)
- Lands in `HOLY_PROCESS_MGMT.md` Task list for the relevant sub-process
- Notification: email + Slack DM to owner

## Communication channels

| Channel | Use | SLA | Automation % target |
|---|---|---|---|
| Email | Decisions, formal updates | 24h response | 30% (digest + auto-triage) |
| Slack / Teams | Quick coordination, escalations | 2h response | 60% (auto-route, AI suggestions) |
| WhatsApp | Field operations, mobile | 4h response | 40% |
| Portal | Status + dashboards | always-on | 95% (auto-published) |

## Newsletter / digest

- Weekly auto-digest published Friday 16:00 local
- Content: decisions made + KPIs moved + open risks + asks
- Recipients: dept + adjacent stakeholders
- Format: HTML email + portal post

## Comms templates (≥ 10 required)

- Status update (weekly)
- Escalation request
- Decision memo
- Incident comms (initial / update / resolution)
- Customer announcement
- Vendor outreach
- Risk alert
- KPI rollup
- OKR check-in
- Org / process change

## Tone + style guardrail

LLM guardrail enforces:
- Brand voice (per `HOLY_TECH_STACK.md` brand-voice section)
- No PII (Presidio scan before send)
- No commitments without approver (regex catch + human-in-loop)
- Reading-level cap (Flesch-Kincaid grade ≤ 10 for external)

## Multi-language

| Language | Use case | Translation engine |
|---|---|---|
| English | default | n/a |
| Hindi | India ops | DeepL / Google |
| Spanish | LATAM | DeepL / Google |
| _ | per dept | _ |

## Composes with

- `HOLY_CONTACT_CENTER.md` — customer comms
- `HOLY_PROCESS_MGMT.md` — action items become tasks
- Global §38.3 — every send is audit-rowed
