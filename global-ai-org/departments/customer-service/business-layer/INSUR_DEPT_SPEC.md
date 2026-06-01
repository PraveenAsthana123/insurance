# Department Spec — Customer Service / Contact Center

The canonical reference for this department. Drives everything else.

## Overview

- **Owner**: Director of Customer Experience
- **Objective**: Highest customer-touch dept — drive automation + omnichannel + 24×7 + CSAT.
- **Business models**: B2C, B2B, B2E, B2G
- **AI priority**: Very High
- **ROI tier**: High

## Stakeholder Matrix

| Stakeholder | Pain | KPI | AI Assistant |
| --- | --- | --- | --- |
| Customer | Long wait time | CSAT | Customer Assistant (chatbot + voice) |
| CSR Agent | Repeated questions / burnout | Cases/day | Agent Copilot |
| Supervisor | SLA misses | SLA compliance | Supervisor Copilot |
| Operations Manager | Workforce planning | Productivity | Operations Copilot |
| Claims Team | Repeated status questions | Call deflection | Claims Assistant |
| Underwriting Team | Status inquiry volume | Request volume | UW Assistant |
| Sales Team | Product questions | Lead conversion | Sales Copilot |
| Executive | Customer experience visibility | NPS | CX Executive Copilot |

## Process Hierarchy (L1 → L2 → L3)

| L1 Process | L2 Process | L3 Sub-Process |
| --- | --- | --- |
| Customer Contact | Inbound Channels | Phone (IVR + agent) |
| Customer Contact | Inbound Channels | Email |
| Customer Contact | Inbound Channels | Chat (web + mobile) |
| Customer Contact | Inbound Channels | Mobile app |
| Customer Contact | Inbound Channels | Social media |
| Customer Contact | Inbound Channels | WhatsApp |
| Authentication | Identity & Security | Voice biometrics |
| Authentication | Identity & Security | Knowledge-based authentication |
| Authentication | Identity & Security | OTP / 2FA |
| Authentication | Identity & Security | Account number + DOB |
| Inquiry Management | Intent Routing | Policy Inquiry |
| Inquiry Management | Intent Routing | Claims Inquiry |
| Inquiry Management | Intent Routing | Billing Inquiry |
| Inquiry Management | Intent Routing | Coverage Inquiry |
| Inquiry Management | Intent Routing | Endorsement / Change Request |
| Case Management | Ticket Lifecycle | Ticket Creation |
| Case Management | Ticket Lifecycle | Ticket Assignment |
| Case Management | Ticket Lifecycle | Routing to Specialist |
| Case Management | Ticket Lifecycle | SLA Tracking |
| Resolution | Resolution Path | Self-Service (KB / chatbot) |
| Resolution | Resolution Path | Agent Resolution |
| Resolution | Resolution Path | Escalation |
| Escalation | Tiered Escalation | Supervisor Escalation |
| Escalation | Tiered Escalation | Claims / UW Escalation |
| Escalation | Tiered Escalation | Executive Escalation |
| Escalation | Tiered Escalation | Legal / Compliance Escalation |
| Feedback | Voice of Customer | Survey (CSAT) |
| Feedback | Voice of Customer | Net Promoter Score |
| Feedback | Voice of Customer | Complaint Capture |
| Feedback | Voice of Customer | Compliment Capture |
| Retention | Save Path | Renewal Reminder |
| Retention | Save Path | Save Offer |
| Retention | Save Path | Loyalty Program Surface |
| Retention | Save Path | Cross-sell Suggestion |

## AI Capability Matrix (per L2)

| Process | Transaction AI | Analytical AI | Generative AI | Conversational AI |
| --- | --- | --- | --- | --- |
| Customer Contact | Omnichannel Routing | Intent Classification | Smart Response Drafting | Conversational AI Chatbot + Voice |
| Authentication | Verification Workflow | Fraud Risk Scoring | Verification Narrative | Voice Bio Assistant |
| Inquiry | Ticket Workflow | Intent + Sentiment | Response Generation | Insurance Assistant |
| Case Management | Routing Workflow | Volume Forecasting | Case Summary | Supervisor Copilot |
| Resolution | Resolution Workflow | Resolution Prediction | FAQ + Article Generation | Knowledge Assistant |
| Escalation | Escalation Workflow | Escalation Risk Scoring | Escalation Narrative | Supervisor Copilot |
| Feedback | Survey Workflow | Sentiment Analytics | VOC Summary | VOC Assistant |
| Retention | Retention Workflow | Churn Prediction | Save-offer Generation | Retention Copilot |

## AI Agent Inventory

- Insurance Chatbot Agent
- Voice Virtual Agent
- Authentication Agent
- Intent Classification Agent
- Sentiment Analysis Agent
- Knowledge Search Agent
- FAQ Generator Agent
- Article Generator Agent
- Resolution Status Agent
- Response Suggestion Agent
- Follow-Up Reminder Agent
- Personalized Communication Agent
- Escalation Routing Agent
- Churn Prediction Agent

## KPIs

| KPI | AS-IS | TO-BE | Change |
| --- | --- | --- | --- |
| First Call Resolution (FCR) | 62% | 85%+ | +37% |
| Average Handle Time (AHT) | 18 min | 6 min | −67% |
| Chatbot Deflection / Self-Service | 22% | 85%+ | +286% |
| CSAT | 3.6 / 5 | 4.7 / 5 | +31% |
| Net Promoter Score (NPS) | +18 | +55 | +37 pts |
| Agent Attrition (annualized) | 38% | <18% | −53% |
| Cost per Contact | $8.40 | $3.20 | −62% |
| Voice-of-Customer Coverage | 2% | 100% | +98 pts |

## References

- Demo Story → [INSUR_DEMO_STORY.md](INSUR_DEMO_STORY.md)
- AS-IS Assessment → [INSUR_ASIS_ASSESSMENT.md](INSUR_ASIS_ASSESSMENT.md)
- DT Strategy → [INSUR_DT_STRATEGY.md](INSUR_DT_STRATEGY.md)
- Process Flow → [INSUR_PROCESS_FLOW.md](INSUR_PROCESS_FLOW.md)
- Architecture → [INSUR_ARCHITECTURE_FLOW.md](INSUR_ARCHITECTURE_FLOW.md)
- Business Models → [INSUR_BUSINESS_MODELS.md](INSUR_BUSINESS_MODELS.md)
- BRD → [../docs/brd/INSUR_BRD.md](../docs/brd/INSUR_BRD.md)
- FRD → [../docs/frd/INSUR_FRD.md](../docs/frd/INSUR_FRD.md)
