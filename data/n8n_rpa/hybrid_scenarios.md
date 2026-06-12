# §142 · Hybrid Scenarios · ML/CV/DL/NLP + RAG + n8n + RPA

> 20 hybrid scenarios composing AI + retrieval + workflow + RPA. Each row names
> EVERY layer involved so the engineering team can sequence build/test/operate.

## The 20 hybrid scenarios

| # | Scenario | ML | CV | DL | NLP | RAG | n8n | RPA | LLM |
|---|---|---|---|---|---|---|---|---|---|
| H-01 | Claim photo damage triage end-to-end | scoring | YOLO+U-Net | ResNet | summarize | policy lookup | orchestrate | legacy portal | report |
| H-02 | Adjuster co-pilot voicemail → action | rec | — | — | intent+entities | similar claims | route | CRM update | reply |
| H-03 | Underwriting application → quote | risk score | doc cls | — | clause extract | precedent | route | rating engine | bind |
| H-04 | Fraud SIU bundle creation | anomaly | image forensics | autoencoder | NER | similar fraud | bundle | NICB lookup | summary |
| H-05 | Customer churn save flow | propensity | — | — | sentiment | offer KB | trigger | CRM tag | personalized email |
| H-06 | NPS detractor recovery | classify | — | — | sentiment | playbook | escalate | retention portal | apology |
| H-07 | Invoice → GL post | match | OCR table | — | entity | vendor history | route | ERP post | exception note |
| H-08 | New hire 360 onboarding | — | doc verify | — | resume parse | benefits FAQ | orchestrate | AD provisioning | welcome |
| H-09 | Phishing email triage | classify | logo cls | — | URL intent | indicator KB | block | firewall sync | user notify |
| H-10 | Vendor risk assessment | scoring | logo verify | — | SBOM extract | OSINT KB | dispatch | portal data | report |
| H-11 | Renewal pricing review | propensity | — | — | clause diff | precedent | route | quote portal | broker letter |
| H-12 | Claim status proactive SMS | predict ETA | — | — | template fill | FAQ | schedule | — | personalized SMS |
| H-13 | Demand forecasting + reorder | TS forecast | — | LSTM | — | supplier rules | trigger | RFQ portal | summary |
| H-14 | Compliance evidence collection | classify | doc verify | — | NER | reg text | orchestrate | regulator portal | filing draft |
| H-15 | Help desk ticket triage | classify | — | — | intent | runbook | route | jira create | summary |
| H-16 | Marketing copy A/B optimization | bandit | banner ad | — | rewrite | brand voice KB | publish | platform RPA | metrics report |
| H-17 | Legal contract review | clause classify | sig verify | — | NER | clause library | route | esign portal | redline |
| H-18 | Loss reserve recalc | regression | — | LSTM | — | actuarial KB | schedule | report tool | exec brief |
| H-19 | Cyber incident workflow | classify | screenshot | — | log NLP | playbook | orchestrate | SIEM rule sync | post-mortem |
| H-20 | Recruiter screen-to-offer | rank | — | — | resume NER | candidate KB | route | ATS update | offer letter |

## The canonical 6-layer pattern

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 1. INGEST   (n8n trigger / webhook / cron / email / form)            │
│ 2. PERCEIVE (CV: YOLO/U-Net/ResNet · ASR: Whisper · OCR: Tesseract)  │
│ 3. UNDERSTAND (NLP: BERT/RoBERTa entity+intent · spaCy NER)          │
│ 4. RETRIEVE (RAG: bge-m3 → Qdrant top-K → rerank)                    │
│ 5. DECIDE   (ML: XGBoost score · LLM: Ollama summary · §103.5 gate)  │
│ 6. ACT      (n8n route · RPA: Playwright legacy portal · DB write)   │
└──────────────────────────────────────────────────────────────────────┘
                                ↑
              §38.3 audit row at EVERY layer transition
```

## Why hybrid is the production answer (not pure-anything)

- Pure ML → outputs decisions but can't ACT on systems without API → needs n8n + RPA
- Pure n8n → can't reason · can't understand text · can't see images → needs ML/CV/NLP
- Pure LLM → hallucinates without grounding → needs RAG
- Pure RPA → no decision-making · brittle on UI change → needs ML + n8n
- Pure CV → labels images but no action → needs decision + workflow

**Conclusion**: every realistic enterprise use case needs ≥4 of the 6 layers.
§142 codifies this contract.

## Per-dept hybrid mapping (which depts use which scenarios)

| Dept | H-01 | H-02 | H-03 | H-04 | H-05 | H-06 | H-07 | H-08 | H-09 | H-10 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| claims | ✓ | ✓ | | ✓ | | | | | | |
| underwriting | | | ✓ | | | | | | | |
| customer-support | | ✓ | | | ✓ | ✓ | | | | |
| finance | | | | | | | ✓ | | | |
| hr | | | | | | | | ✓ | | |
| security-operations | | | | | | | | | ✓ | ✓ |
| fraud-investigation | | | | ✓ | | | | | | |
| procurement | | | | | | | | | | ✓ |

| Dept | H-11 | H-12 | H-13 | H-14 | H-15 | H-16 | H-17 | H-18 | H-19 | H-20 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| policy-admin | ✓ | | | | | | | | | |
| customer-experience | | ✓ | | | | | | | | |
| supply-chain | | | ✓ | | | | | | | |
| legal | | | | ✓ | | | ✓ | | | |
| it-operations | | | | | ✓ | | | | | |
| marketing | | | | | | ✓ | | | | |
| actuarial | | | | | | | | ✓ | | |
| security-operations | | | | | | | | | ✓ | |
| hr | | | | | | | | | | ✓ |

Total mapping: **every dept appears in ≥1 hybrid scenario**.

§142 spec · 2026-06-11
