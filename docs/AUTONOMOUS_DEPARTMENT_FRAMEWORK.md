# Autonomous Enterprise AI Department · Reference Framework

> Operator brief 2026-06-08 · captured as permanent project reference.
> Implementation scaffold at `backend/autonomous_dept_registry/` + `frontend/src/pages/AutonomousDeptFrameworkPage.jsx`.
> Composes with §38 · §47 · §52 · §57.7 · §76 · §80 · §91 · `MARKETING_KPI_FRAMEWORK` · `ENTERPRISE_AI_TOOL_LANDSCAPE`.

## Why This Doc

What separates a proof-of-concept AI system from a production-grade autonomous department capable of operating safely · improving continuously · maintaining regulatory compliance. This is the **10-level autonomy maturity model** + **multi-AI hybrid use cases** + **MCP marketing/contact-center stack** + **Continuous Learning Governance** that top-1% enterprise teams ship.

---

## 10-Level Autonomy Progression

```
Descriptive → Diagnostic → Predictive → Prescriptive →
Decision AI → Workflow AI → Agentic AI → Autonomous Department
```

| Level | Stage | Question | Tech | Examples |
|---|---|---|---|---|
| **L1** | Descriptive | What happened? | BI · SQL · Dashboard · KPI | Claims/Fraud/Sales/Premium dashboards |
| **L2** | Diagnostic | Why did it happen? | ML · Correlation · Root cause · XAI | Why claim volume↑ · Why churn↑ |
| **L3** | Predictive | What will happen? | ML · DL · Time series · Transformer | Churn · Fraud · Claim · Loss-ratio prediction |
| **L4** | Prescriptive | What should we do? | Optimization · RL · Recommendation | Best retention offer · Best premium · Best repair shop |
| **L5** | Workflow | How do we execute? | BPM · Workflow · Rules · Process mining (Camunda · n8n · Activepieces · Airflow) | Claim→Fraud→Risk→Approval→Payment |
| **L6** | Intelligent Workflow | Workflow + AI | Workflow + ML + NLP + CV | AI-driven claim routing with fraud score |
| **L7** | Agent | Single autonomous agent | LangGraph · CrewAI · MCP · RAG | Claim agent · Fraud agent · UW agent · Sales agent |
| **L8** | Multi-Agent | Agents collaborate | LangGraph · CrewAI · MCP · RAG | Claim→Fraud→Investigation→Approval→Payment chain |
| **L9** | Decision Intelligence | Predictive + Prescriptive + RL + Graph + Agent | Customer-likely-to-churn → offer → contact → accept |
| **L10** | Autonomous Department | Hybrid stack handles end-to-end with HITL exceptions | CV + NLP + Speech + ML + TS + Graph + RAG + Workflow + RL + Agent | Customer→Vision→Damage→Fraud→Risk→Policy→Decision→Payment |

**This project state**: L5-L7 (autonomous_agent + scheduled execution + audit triad).

---

## Continuous Learning Governance Layer (the 1% differentiator)

What most AI projects miss · what top-1% adds:

```
Data → Model → Prediction → Decision → Execution →
  Human Review → Feedback → Scoring → Benchmarking →
  Correction → Retraining → Model Update
```

### 1. Confidence Score Routing

| Score | Action |
|---|---|
| 95-100% | Auto Execute |
| 85-95%  | Agent Review |
| 70-85%  | Human Approval |
| < 70%   | Manual Processing |

### 2. Threshold Management

```
Fraud Detection:    >95 auto-block · 80-95 investigate · 60-80 monitor · <60 approve
Churn Prediction:   >90% retention campaign · 70-90% sales follow-up · <70% no action
```

### 3. Human-in-the-Loop Capture Fields

`AI Decision · Human Decision · Reason · Reviewer · Timestamp` — audit trail.

### 4. Explicit + Implicit Feedback

- Explicit · good / bad / correct / incorrect
- Implicit · accepted / modified / rejected / ignored

### 5. AI Correction Layer

```
AI Output → Human Correction → Correction DB → eventually → Training Data
```

### 6. RLHF

```
AI Output → Human Rating → Reward Model → Policy Update
```

### 7. Evaluation Layer

| Domain | Metrics | Tools |
|---|---|---|
| NLP | Accuracy · Precision · Recall · F1 · BLEU · ROUGE | — |
| RAG | Faithfulness · Relevancy · Groundedness · Context Recall · Context Precision | RAGAS · DeepEval |

### 8. Benchmark Layer

Compare models continuously: GPT vs Claude vs Gemini vs Local Llama on per-domain accuracy.

### 9. AI Quality Score (weighted)

```
Accuracy 25% · Precision 15% · Recall 15% · Human Rating 15% ·
Latency 10% · Cost 10% · Compliance 10%
```

### 10. Drift Monitoring

- Data drift · training vs production
- Concept drift · customer behavior changed · fraud pattern changed
- Model drift · accuracy dropped → trigger retraining

### 11. Autonomous Review Agent

```
Prediction → Review Agent → Score Agent → Compliance Agent → Human Review
```

### 12. Benchmarking Agent

Production model vs shadow models on accuracy · cost · latency · business KPI.

### 13. Self-Healing AI

```
GPT Failure → Claude → Llama   (model fallback chain)
```

### 14. Continuous Learning Workflow

```
User → AI → Prediction → Human Review → Feedback → Correction →
  Scoring → Benchmark → Threshold Check → Approval →
  Training Dataset → Retraining → Registry → Deployment
```

---

## MCP Servers for Marketing Automation

| Area | MCP / Connector | Use |
|---|---|---|
| CRM | HubSpot · Salesforce · Postgres MCP | Customer/contact master |
| Email | Gmail · SMTP · Mailchimp custom MCP | Send/review campaign emails |
| Social | LinkedIn/X/Facebook/Instagram custom MCP via API | Publish posts · fetch comments |
| Survey | Typeform · Google Forms · LimeSurvey MCP | Create survey · collect responses |
| Files | Google Drive · OneDrive · S3 MCP | Store banners · CSVs · PDFs |
| Database | Postgres · MySQL · SQLite MCP | Campaign/contact/survey data |
| Analytics | Google Analytics · Matomo MCP | Track visits · clicks · conversions |
| Browser | Puppeteer MCP · Playwright MCP | Operate web UIs directly |
| Design | Canva · Figma MCP | Banner/design generation workflow |
| Workflow | n8n · Activepieces MCP | Trigger full campaign pipeline |
| Chat | Slack · Teams MCP | Approval · alerts · campaign review |
| Payments | Stripe · Shopify MCP | Customer/product/event triggers |
| Docs | Notion · Confluence MCP | Campaign briefs · script library |

### Top 10 priority MCP servers for marketing

1. Postgres MCP · contacts/campaigns/surveys
2. Google Drive / OneDrive MCP · banners/templates/CSV
3. Puppeteer / Playwright MCP · web UI navigation
4. Slack / Teams MCP · human approval workflow
5. HubSpot / Salesforce MCP · CRM integration
6. Figma / Canva MCP · creative workflow
7. Gmail / SMTP MCP · email sending
8. Matomo / GA MCP · campaign analytics
9. Survey MCP · LimeSurvey/Formbricks/Typeform
10. Social Media MCP · LinkedIn/X/FB/Instagram

---

## Open-Source Marketing Stack (Score 9.5+)

| Component | Tool | Score | Purpose |
|---|---|---|---|
| Campaign automation | Activepieces | 9.5 | Workflow · approvals · integrations |
| Email campaign | Mautic | 9.4 | Email · segments · landing pages · lead scoring |
| Newsletter sending | Listmonk | 9.5 | High-volume email |
| Survey link | LimeSurvey | 9.8 | Mobile/web surveys |
| Feedback widget | Formbricks | 9.5 | Website/app feedback |
| Banner generation | ComfyUI | 10 | Stable Diffusion · banner creation |
| AI copywriting | Ollama + Qwen/Llama | 9.0 | Email · social · survey copy |
| Social publishing | Mixpost | 9.7 | Multi-platform posting |
| Workflow | n8n / Activepieces / Apache Airflow | 9+ | Pipeline orchestration |
| Web tracking | Matomo | 8.8 | Campaign analytics |
| Dashboard | Metabase / Superset | 8.7 | Reporting |
| Local LLM | Ollama | — | Run Llama 3 / Qwen / Mistral locally |
| Vector DB | Postgres + pgvector | — | RAG / knowledge |

**Total stack score**: 9.7/10 (fully self-hosted · open-source autonomous marketing department).

---

## Autonomous Contact Center AI Platform

### Architecture

```
Customer → Phone → Voice Gateway → STT → LLM Agent →
  Knowledge Base (RAG) → CRM → Workflow → Analytics
```

### Voice AI Stack

| Layer | Tool | Score |
|---|---|---|
| **STT** | Deepgram (9.8) · AssemblyAI (9.5) · Whisper (9.3) · SpeechBrain (8.8) | — |
| **TTS** | ElevenLabs (10) · Cartesia (9.8) · Coqui TTS (9.0) · Piper TTS (8.8) | — |
| **Voice agents** | Vapi · Retell AI · LiveKit · Pipecat | — |
| **LLM** | GPT-4o · Claude · Gemini · Qwen · Llama 3 | — |

### Master Data Required

- **Customer master**: ID · Name · Phone · Email · Language · Product owned · Policy # · Region · Tier · Risk score · Preferred contact time
- **Product master**: ID · Name · Type · Benefits · Premium · Coverage · Exclusions
- **Campaign master**: ID · Name · Dates · Target group · Script version · Offer version
- **Call script master**: ID · Campaign · Objective · Opening · Questions · Responses · Escalation rules · Closing

### Pre-Sales Scenarios

1. **Lead qualification** · Voice AI · Qualification questions · Lead score → Hot/Warm/Cold
2. **Insurance quote campaign** · Needs analysis · Quote gen · Appointment booking
3. **Cross-sell** · Recommender + Voice AI + CRM

### Post-Sales Scenarios

1. **CSAT survey** · Customer purchase → 3 days later → Voice AI call → Survey → CRM
2. **NPS survey** · Score 0-6 Detractor · 7-8 Passive · 9-10 Promoter
3. **Renewal reminder** · Policy expiry → 30d before → AI call → renewal discussion

### Contact Center AI Agents

| Agent | Responsibility |
|---|---|
| Outbound Calling | Campaign calls |
| Survey | Feedback collection |
| Sales | Product selling |
| Customer Service | Support |
| Claims | Claims assistance |
| Scheduling | Appointment booking |
| Compliance | Regulatory checks |
| QA | Call quality review |
| Supervisor | Escalations |

### KPIs

**Operational**: Calls made · Connected · Avg duration · Survey completion · Lead conversion · Appointment rate · Renewal rate
**AI**: Intent accuracy · STT accuracy · TTS quality · Hallucination rate · Escalation rate · Human override rate

---

## Insurance AI Hybrid Use Cases (Multi-AI Combinations)

The Top 1% pattern: not one AI · many AIs working together.

| Use Case | Combination | Value |
|---|---|---|
| Fraud Detection | ML + NLP + CV + Graph AI + RAG + RLHF | Highest |
| Claims Automation | CV + NLP + Transformer + Workflow | Very High |
| Underwriting Copilot | NLP + RAG + Transformer + ML | Very High |
| Churn Prevention | Sentiment + ML + Time Series + RL | High |
| Dynamic Pricing | Time Series + RL + ML + DL + RAG | High |
| Agent Assist Contact Center | Speech + NLP + RAG + LLM + Workflow | High |
| Next Best Offer | Recommender + Transformer + Graph AI + RAG | High |
| Customer 360 | NLP + Recommender + RAG | Medium-High |
| CAT Risk Modeling | CV + Time Series + DL + Graph AI + Transformer | High |
| Autonomous Claims | CV + NLP + Speech + ML + TS + Graph + RAG + Workflow + RL + Agent | Highest |

### Most Valuable Enterprise Stack (2026)

```
ML + Time Series + Transformer + CV + Graph AI + RAG +
  Workflow Agents + RLHF + LLM
```

Covers: Underwriting · Claims · Fraud · Pricing · Customer Service · Sales · Risk · Compliance · Retention · CAT · Knowledge · Contact Center.

---

## Browser Automation + Computer Use Stack

The 6-layer browser-agent ecosystem (2026):

| Layer | Purpose | Tools |
|---|---|---|
| **1. Browser Control** | Open/Click/Type/Scroll/Upload/Download/Screenshot | Playwright · Puppeteer · Selenium · CDP |
| **2. Computer Use** | Operate ENTIRE desktop (browser + Excel + Outlook + SAP) | Claude Computer Use · OpenAI Operator · UI-TARS · Agent S2 |
| **3. Vision Agents** | See pixels when DOM breaks ("Blue button labeled Submit") | UI-TARS · OmniParser · GPT-4o Vision · Claude Vision |
| **4. OCR** | Invoices · passports · scanned PDFs | Azure DI · Google DI · Textract · Tesseract |
| **5. RPA Integration** | Legacy enterprise systems (SAP · Oracle · Mainframe · Citrix) | UiPath · Automation Anywhere · MS Power Automate · Blue Prism |
| **6. MCP Tool Layer** | Connect agents to systems (SharePoint · ServiceNow · Salesforce · Jira · SAP) | MCP servers |

### Human-in-the-Loop Risk Tiers

| Risk | Examples | Action |
|---|---|---|
| **Low** | Read email · Read report · Search KB | Auto execute |
| **Medium** | Submit form · Update ticket · Create user | Approval optional |
| **High** | Transfer money · Delete data · Approve loan · Terminate employee | Approval **mandatory** |

### Monitoring

Track: Success rate · Form fill accuracy · Browser failures · CAPTCHA failures · Login failures · Human escalations · Cost per task.

Tools: Langfuse · LangSmith · AgentOps · OpenTelemetry · Prometheus · Grafana.

### Job Application Agent (concrete worked example)

```
User → Supervisor Agent → Job Search Agent → Browser Agent →
  Resume Optimization → Cover Letter → Human Approval →
  Application Agent → Tracking Agent → Dashboard
```

Open-source stack: **Playwright + Skyvern + OpenAdapt + UI-TARS + LangGraph + Ollama + Docling + Langfuse + PostgreSQL** (9.9/10).

**Critical rule**: Never fully auto-submit. Pattern: Auto-fill → show review screen → user approves → submit. Avoids wrong answers · duplicate applications · ToS violations.

---

## CDP vs WebLLM (clarification)

| Category | CDP | WebLLM |
|---|---|---|
| Purpose | Browser automation/inspection | Run LLMs in browser |
| Type | Browser control protocol | Client-side AI inference |
| Runs LLM? | No | Yes |
| Uses GPU? | No (not for AI) | Yes (WebGPU) |
| Backend needed? | Usually yes | Can work fully local |
| Common tools | Puppeteer · Playwright | WebLLM (MLC AI) |

Per §91 · this project's canonical stack uses BOTH: WebLLM (browser inference) + CDP (browser control) + RAG + LangGraph.

---

## Composes With (this project)

- §38 · per-decision audit row (across all autonomy levels)
- §47 · architecture surfaces · agentic platform belongs at L7-L8
- §52 · 40-row tool review applies to each layer
- §57.7 · confidence-score routing IS honest fallback
- §76 · RAI governance · mandatory at all levels
- §80 · decision system IS the L9 hybrid
- §91 · WebLLM+CDP+RAG+LangGraph is the canonical agentic stack
- `MARKETING_KPI_FRAMEWORK.md` · KPIs measure each autonomy level
- `ENTERPRISE_AI_TOOL_LANDSCAPE.md` · 173 tools map to these layers

---

## Implementation Status (live · per this project)

| Capability | Status | Reference |
|---|---|---|
| L1 Descriptive (BI · Dashboard) | ✓ Used | AdminAuditPage · MarketingKPIsPage |
| L2 Diagnostic | ✓ Used | weekly_audit_digest (failing-row breakdown) |
| L3 Predictive | 🟡 Scaffolded | autonomous_agent (rule-based · §57.7) |
| L4 Prescriptive | 🟡 Scaffolded | NBA recommendation in decision chain |
| L5 Workflow | ✓ Used | run_due_schedules · run_due_postings cron |
| L6 Intelligent Workflow | ✓ Used | DLP gate + RAI gate + autonomous decisions |
| L7 Agent | ✓ Used | autonomous_agent_runs decision loop |
| L8 Multi-Agent | ⏳ Planned | Single agent currently · multi-coord planned |
| L9 Decision Intelligence | ⏳ Planned | Predictive + RL not yet wired |
| L10 Autonomous Department | ⏳ Planned | HITL exceptions + full pipeline planned |
| Confidence Score Routing | 🟡 Partial | fairness_di routes · need numeric confidence per decision |
| Threshold Management | ✓ Used | §76 DI ≥ 0.8 · target_breach alerts |
| HITL Capture | ⏳ Planned | T4.1 LLM-driven decide_next would need it |
| Explicit + Implicit Feedback | ⏳ Planned | Survey responses partially captured |
| AI Correction Layer | ⏳ Planned | T6.x roadmap |
| RLHF | ⏳ Planned | T6.x roadmap |
| Evaluation Layer (RAGAS · DeepEval) | ⏳ Planned | T6.8 |
| Benchmark Layer | ⏳ Planned | Compare models per use case |
| AI Quality Score | 🟡 Partial | Per-KPI alerts · composite score planned |
| Drift Monitoring | 🟡 Partial | T3.4 latency drift · concept drift planned |
| Self-Healing AI | ⏳ Planned | Model fallback chain planned |
| Continuous Learning | 🟡 Partial | weekly_audit_digest IS the learning loop |
