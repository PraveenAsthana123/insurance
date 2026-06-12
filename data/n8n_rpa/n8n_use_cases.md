# §142 · n8n Use Case Catalog · 60 use cases × 19 depts

> n8n = open-source workflow automation · 400+ nodes · self-hostable.
> Each use case: trigger → process → action with named integrations.

## n8n use cases organized by 19 depts

### 1. CLAIMS (8 use cases)

| # | Trigger | Process | Action | Integrations |
|---|---|---|---|---|
| C-1 | Webhook (FNOL) | Validate → enrich (vehicle, policy) | DB insert + notify adjuster | Postgres, Slack |
| C-2 | Email (claim docs) | Extract attachments → OCR | Store in S3 + create case | Gmail, AWS, JIRA |
| C-3 | Schedule (daily 8AM) | Query open claims > 30d | Generate aging report → email | Postgres, SendGrid |
| C-4 | Photo upload | Call CV API → severity score | Update claim status | HTTP, DB |
| C-5 | SMS (status req) | Lookup claim → respond template | SMS reply | Twilio |
| C-6 | Webhook (settlement) | Validate payee → split rules | ACH initiate | Banking API |
| C-7 | Voicemail → Whisper | Transcribe → intent classify | Assign + alert | Twilio, OpenAI |
| C-8 | Calendar event (appraisal) | Send reminders T-24h T-2h | SMS + email | Twilio, SendGrid |

### 2. UNDERWRITING (5)

| # | Trigger | Process | Action |
|---|---|---|---|
| U-1 | Application webhook | Pull credit + MVR | Score + route to UW |
| U-2 | Schedule (monthly) | Audit decisions sample | Generate compliance report |
| U-3 | Quote request | Multi-carrier API fanout | Best price → CRM |
| U-4 | Renewal due | Pull loss runs → re-rate | Email broker |
| U-5 | New regulation | Parse PDF → diff against book | Slack alert |

### 3. POLICY-ADMIN (3)

| # | Use case |
|---|---|
| PA-1 | Endorsement upload → validate → update policy → confirm |
| PA-2 | Cancellation webhook → calculate pro-rata refund → notify |
| PA-3 | Renewal cron 30d before → generate quote → send broker |

### 4. CUSTOMER-SUPPORT (4)

| # | Use case |
|---|---|
| CS-1 | Email inbound → intent classify (BERT) → route to queue |
| CS-2 | Chat transcript → summarize → log to CRM |
| CS-3 | NPS survey response → if detractor, alert manager |
| CS-4 | Knowledge base update → trigger RAG re-index |

### 5. FINANCE (3)

| # | Use case |
|---|---|
| F-1 | Invoice email → OCR → match PO → post to GL |
| F-2 | Daily bank feed → reconcile → exceptions to AP team |
| F-3 | Month-end → close checks → variance report to CFO |

### 6. HR (4)

| # | Use case |
|---|---|
| HR-1 | New hire form → create accounts (AD/Slack/JIRA) → onboarding email |
| HR-2 | Resume submitted → parse → ATS create → screen via LLM |
| HR-3 | Leave request → policy check → manager approve → calendar update |
| HR-4 | Birthday/anniversary → automated greeting |

### 7. SALES (4)

| # | Use case |
|---|---|
| SA-1 | Lead form → enrich Clearbit → CRM create + assign |
| SA-2 | Quote sent → 3d no response → follow-up email |
| SA-3 | Deal closed-won → kickoff workflow (DocuSign + invoice + welcome) |
| SA-4 | Slack #pipeline message → log activity in CRM |

### 8. MARKETING (4)

| # | Use case |
|---|---|
| MK-1 | Blog publish → social media post (LinkedIn, Twitter) |
| MK-2 | Form submit → tag + add to nurture sequence |
| MK-3 | Campaign metrics nightly → dashboard refresh |
| MK-4 | Webinar signup → reminder schedule (T-7d T-1d T-1h) |

### 9. OPERATIONS (3)

| # | Use case |
|---|---|
| OP-1 | Incident webhook → page on-call (PagerDuty) → status page update |
| OP-2 | Deploy success → release notes → Slack #releases |
| OP-3 | SLA breach → escalate → ticket update |

### 10. LEGAL (2)

| # | Use case |
|---|---|
| LG-1 | Contract email → extract clauses → flag risk → route counsel |
| LG-2 | Litigation hold trigger → preserve mailbox → log |

### 11. PROCUREMENT (2)

| # | Use case |
|---|---|
| PR-1 | PR submitted → 3-bid require → vendor email out |
| PR-2 | Vendor onboard → tax form + insurance cert verify |

### 12. ENGINEERING (3)

| # | Use case |
|---|---|
| EN-1 | PR opened → auto-assign reviewer (CODEOWNERS) |
| EN-2 | Build fail → Slack alert + JIRA ticket |
| EN-3 | Issue label triage → assign team |

### 13. SECURITY-OPERATIONS (4)

| # | Use case |
|---|---|
| SC-1 | SIEM alert → enrich threat intel → ticket |
| SC-2 | Phishing email reported → block sender domain → user-train |
| SC-3 | Vuln scan finding → severity-route to team |
| SC-4 | Failed login spike → temporary block + notify |

### 14. SUPPLY-CHAIN (2)

| # | Use case |
|---|---|
| SP-1 | Reorder point hit → 3-supplier RFQ |
| SP-2 | Shipment delay → auto-notify customer + reroute |

### 15. IT-OPERATIONS (4)

| # | Use case |
|---|---|
| IT-1 | New employee → provision accounts (AD/SSO/email) |
| IT-2 | Hardware request → approval chain → procurement |
| IT-3 | Password reset request → MFA verify → reset |
| IT-4 | Software install request → license check → install MDM |

### 16. DISTRIBUTION (2)

| # | Use case |
|---|---|
| DI-1 | New producer signed → onboarding (NIPR check + appointments) |
| DI-2 | Commission run weekly → distribute statements |

### 17. CUSTOMER-EXPERIENCE (2)

| # | Use case |
|---|---|
| CX-1 | Survey response → sentiment classify → if negative, alert CSM |
| CX-2 | Journey milestone → personalized email |

### 18. FRAUD-INVESTIGATION (3)

| # | Use case |
|---|---|
| FR-1 | Claim flagged → pull related claims (same VIN/SSN) → bundle |
| FR-2 | SIU agent assigned → checklist generation |
| FR-3 | Settlement above threshold → fraud screening required |

### 19. ACTUARIAL (2)

| # | Use case |
|---|---|
| AC-1 | Quarterly reserve calc → run scripts → publish report |
| AC-2 | New product LRP → calculation kick-off |

**TOTAL**: 60 cataloged n8n use cases · 19 depts covered

## Common n8n node patterns (used above)

```
Trigger nodes:      Webhook · Email IMAP · Schedule (cron) · HTTP · MQTT
                    Form (n8n form) · File watch · SQS · Slack · Telegram
Logic nodes:        IF · Switch · Loop · Merge · Item Lists
Data nodes:         Set · Code (JS/Python) · Function · Edit Image
Integration nodes:  Postgres · MongoDB · Redis · S3 · Slack · Gmail
                    SendGrid · Twilio · Stripe · GitHub · JIRA · Zendesk
                    OpenAI · Anthropic · HF Inference · Google Sheets
AI nodes:           LLM Chat · Vector Store · Embeddings · Information Extractor
Output:             Webhook respond · Email · Slack · DB write · HTTP
```

## How to compose with §141 (text2sql · LoRA · CV · RAG)

Per §142.3 the hybrid scenario column shows when each layer adds:
- ML model → n8n calls HTTP node to FastAPI /api/v1/predict/*
- RAG → n8n calls HTTP node to /api/v1/rag/query
- LoRA-tuned model → exposed via Ollama → n8n LLM Chat node
- CV → n8n calls HTTP to /api/v1/cv/segmentation
- Text2SQL → n8n calls /api/v1/text2sql/run

n8n is the orchestrator · per §142 spec.

§142 spec · 2026-06-11
