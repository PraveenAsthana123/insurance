# Enterprise Digital Marketing KPI Framework

> Operator brief 2026-06-08 · captured as permanent project reference.
> Implementation scaffold lives at `backend/marketing_kpis/` + `frontend/src/pages/MarketingKPIsPage.jsx`.
> Builds incrementally on `marketing_campaigns/` (4 channels) + `content_ops/` (job+blog) + autonomous agent (decision loop).

## Composition Hierarchy

```
15 Process Groups        ──→  150+ Sub-Processes
15 KPI Categories        ──→  200+ KPIs
6  Dashboard Tiers       ──→  100+ Reports
30+ AI Agents
20+ Predictive Models
10+ Autonomous Workflows
Full Governance · Observability · AI-Driven Decisioning
```

---

## 1. Executive KPIs (10)

| KPI | Formula | Target |
|---|---|---|
| Marketing ROI | (Revenue - Cost) / Cost | > 300% |
| Revenue Generated | Campaign Revenue | Growth |
| Customer Acquisition Cost (CAC) | Cost / New Customers | Reduce |
| Customer Lifetime Value (CLV) | Lifetime Revenue | Increase |
| Marketing Contribution | Marketing Revenue / Total Revenue | Increase |
| Cost Per Lead | Spend / Leads | Reduce |
| Cost Per Acquisition | Spend / Customers | Reduce |
| Return on Ad Spend (ROAS) | Revenue / Ad Spend | > 4x |
| Pipeline Contribution | Marketing Pipeline | Increase |
| Revenue Attribution | Attributed Revenue | Increase |

## 2. Customer KPIs (10)

| KPI | Business Question |
|---|---|
| Total Customers | How many customers? |
| Active Customers | Who is active? |
| New Customers | Acquisition trend? |
| Repeat Customers | Loyalty trend? |
| Churn Rate | Customer loss? |
| Retention Rate | Customer retention? |
| Customer Growth Rate | Growth? |
| NPS | Loyalty? |
| CSAT | Satisfaction? |
| CES | Ease of service? |

## 3. Segmentation KPIs (8)

Segment Size · Segment Growth · Segment Conversion · Segment Revenue · AI Segment Accuracy · Segment Engagement · Churn Segment Rate · VIP Segment Growth

## 4. Campaign KPIs (10)

Campaign Reach · Impressions · CTR · Conversion Rate · Revenue · Cost · ROI · Completion Rate · Response Rate · Attribution Score

## 5. Email Marketing KPIs (10)

Delivery Rate · Open Rate · Unique Open Rate · Click Rate · Click-To-Open Rate · Bounce Rate · Hard Bounce · Soft Bounce · Unsubscribe Rate · Complaint Rate

## 6. Website KPIs (10)

Visitors · Unique Visitors · Sessions · Page Views · Bounce Rate · Average Session Time · Conversion Rate · Goal Completion · Landing Page Performance · Heatmap Engagement Score

## 7. Social Media KPIs (10)

Followers · Reach · Impressions · Likes · Comments · Shares · Engagement Rate · Sentiment Score · Influencer ROI · Community Growth

## 8. Lead Management KPIs (10)

Leads Generated · MQL Count · SQL Count · Lead Conversion Rate · Lead Quality Score · Lead Response Time · Lead Acceptance Rate · Opportunity Creation Rate · Cost Per Lead · Revenue Per Lead

## 9. Customer Journey KPIs (8)

Journey Completion Rate · Journey Drop-Off Rate · Time To Conversion · Customer Touchpoints · Journey Satisfaction · Next Best Action Accuracy · Journey Engagement · Journey ROI

## 10. Survey KPIs (9)

Survey Response Rate · NPS · CSAT · CES · Sentiment Score · Complaint Volume · Feedback Quality Score · Survey Completion Rate · Recommendation Score

## 11. Advertising KPIs (9)

CPC · CPM · CPA · ROAS · Conversion Rate · Quality Score · Impression Share · Ad Relevance · Ad CTR

## 12. Loyalty KPIs (8)

Active Members · Points Earned · Redemption Rate · Loyalty Retention · Membership Growth · Loyalty Revenue · Tier Upgrade Rate · Loyalty Churn

## 13. Financial KPIs (8)

Marketing Spend · Budget Utilization · Revenue Attribution · Gross Margin · CLV/CAC Ratio · Marketing Cost Ratio · Campaign Profitability · Revenue Growth

## 14. AI KPIs (10)

Lead Scoring Accuracy · Churn Prediction Accuracy · Recommendation Accuracy · Personalization Accuracy · Next Best Offer Accuracy · Campaign Forecast Accuracy · AI Adoption Rate · AI Cost Per Request · AI ROI · AI Trust Score

## 15. Governance KPIs (8)

Consent Compliance · PII Violation Count · Audit Findings · Campaign Approval SLA · Policy Violation Rate · Data Quality Score · AI Bias Score · Explainability Score

---

## AI Dashboard Hierarchy (6 tiers)

| Tier | Audience | Focus |
|---|---|---|
| **Executive** | Board · C-Suite | Revenue · ROI · CLV · CAC · Marketing Health Score |
| **Director** | VP Marketing | Campaign · Audience · Channel · Forecasting |
| **Manager** | Marketing Manager | Leads · Conversion · Engagement · Journey |
| **Operations** | Ops Team | Email · SMS · Social · Ads |
| **AI** | ML Team | Lead Scoring · Churn · Recommendation · AI Cost · AI Drift |
| **Governance** | Compliance | Consent · PII · Audit · Responsible AI |

---

## Marketing Command Center Scorecard

Weighted final score across 8 categories:

| Category | Weight |
|---|---|
| Revenue Impact | 25% |
| Customer Growth | 15% |
| Campaign Performance | 15% |
| Customer Experience | 10% |
| Lead Management | 10% |
| Operational Excellence | 10% |
| AI Performance | 10% |
| Governance | 5% |

> **Final Marketing Health Score** = Weighted Score Across All KPI Categories

---

## 15 Process Groups · 150+ Sub-Processes (excerpt)

| # | Group | Example sub-processes |
|---|---|---|
| 1 | Strategy | Business Goal · Marketing Planning · Campaign Planning · Budget · Channels · Calendar · Launch · Seasonal · Competitor Analysis |
| 2 | Customer Data | Registration · Onboarding · Customer 360 · Deduplication · Validation · Consent · Enrichment · Preferences · Profiling · Classification |
| 3 | Audience | Demographic · Geographic · Behavioral · Product Interest · Churn · Loyalty · Revenue · AI Predicted · Lookalike · Suppression |
| 4 | Campaign | Creation · Scheduling · Budgeting · Approval · Versioning · Publishing · Monitoring · Optimization · Closure · Benchmarking |
| 5 | Content | Banner · Video · Email · SMS · WhatsApp · Landing Page · Social · Blog · Review · Personalization |
| 6 | Email | Template · Subject · Audience · Personalization · Delivery · Open · Click · Bounce · Unsubscribe · Optimization |
| 7 | Social | Publishing · Comment Monitoring · Influencer · Listening · Community · Trend · Brand · Advertising · Hashtag · Sentiment |
| 8 | Advertising | Google · Facebook · LinkedIn · Instagram · YouTube · Budget · Optimization · Attribution · Reporting · Experimentation |
| 9 | Website | Landing Page · Banner · Content · Forms · Visitor Tracking · Conversion · SEO · Personalization · Heatmap · A/B |
| 10 | Lead | Capture · Validation · Enrichment · Scoring · Routing · Qualification · Opportunity · Nurturing · Conversion · Analytics |
| 11 | Journey | Design · Trigger · Touchpoints · Analytics · Optimization · Simulation · Personalization · Automation · Monitoring · Benchmarking |
| 12 | Survey | Design · Delivery · Reminder · Collection · NPS · CSAT · Sentiment · VOC · Complaint · Action Tracking |
| 13 | Loyalty | Membership · Points · Reward · Tier · Redemption · Campaigns · Retention · Analytics · Prediction · Optimization |
| 14 | Analytics | Campaign · Customer · Lead · Revenue · Executive · Attribution · ROI · Funnel · Cohort · Forecasting Dashboards |
| 15 | Governance | Consent · Privacy · PII · Brand · Audit · Approval Workflow · Risk · Policy Enforcement · Data Governance · Regulatory |

## 16. AI & Autonomous Marketing (15 sub-processes)

Audience Prediction · Lead Scoring · Churn Prediction · Recommendation · Next Best Action · Next Best Offer · Campaign Prediction · Content Generation · Banner Generation · Email Generation · AI Copilot · Marketing Agent · Budget Optimization · Attribution AI · Forecasting AI

---

## 30+ AI Agents

| Marketing Function | AI Agent |
|---|---|
| Campaign Planning | Campaign Planner Agent |
| Audience Selection | Segmentation Agent |
| Banner Creation | Creative Agent |
| Email Creation | Content Agent |
| Social Posting | Social Agent |
| Lead Qualification | Lead Agent |
| Customer Journey | Journey Agent |
| Survey Analysis | Feedback Agent |
| Reporting | Analytics Agent |
| Compliance | Governance Agent |
| Budget Control | FinOps Agent |
| Optimization | Optimization Agent |
| Executive Reporting | Executive Copilot |
| Forecasting | Prediction Agent |
| Autonomous Marketing | Supervisor Agent |

---

## End-to-End Process Flow (20 stages)

```
Business Goal → Campaign Planning → Target Audience → Segmentation →
Lead Scoring → Campaign Design → Banner Creation → Email/SMS/WhatsApp →
Landing Page → Approval Workflow → Scheduling → Execution →
Customer Interaction → Response Tracking → Lead Qualification →
Sales Handoff → Survey Collection → Customer Feedback →
Analytics & Reporting → AI Optimization → Next Campaign Trigger
```

---

## 12 Operating Phases

| Phase | Inputs | Outputs |
|---|---|---|
| 1 Strategy & Planning | Business Objectives · Budget · Historical Data | Campaign Strategy · Calendar · Plan |
| 2 Customer Data Mgmt | CRM · ERP · Website · App · Social · Contact Center | Customer Master · Contact · Consent Master |
| 3 Audience Segmentation | Customer Master · Transactions · Behavior | Target Groups · Audience Lists |
| 4 Campaign Creation | Goal · Target Group · Product | Campaign Assets · Banners · Emails · Social Posts |
| 5 Approval Workflow | Marketing · Legal · Compliance · Security Reviews | Approved Campaign |
| 6 Campaign Automation | Triggers · Schedules · Events | Automated Journey |
| 7 Multi-Channel Execution | Email · SMS · WhatsApp · Web · App · LinkedIn · FB · IG · Google · YouTube | Delivered Campaigns |
| 8 Engagement Tracking | Email Open · Click · Visit · Banner Click · Form · Download · Purchase · Survey | Engagement Data |
| 9 Lead Management | Forms · Webinar · Social | Qualified Leads |
| 10 Survey & Feedback | NPS · CSAT · CES · Product Feedback | Voice of Customer |
| 11 Analytics & Reporting | All Above | Executive · Operational · AI Dashboards |
| 12 AI Optimization | All Reports | Lead Scoring · Churn · Recommendation · Sentiment · Campaign Optimization · Attribution · Personalization · NBA |

---

## Daily / Weekly / Monthly Cycle

| Frequency | Activities |
|---|---|
| Daily | Campaign Monitoring · Lead Tracking · Response Tracking |
| Weekly | Campaign Optimization · A/B Testing · Audience Refresh |
| Bi-Weekly | Journey Review · Personalization Updates |
| Monthly | ROI Analysis · Budget Review · Executive Reporting |
| Quarterly | Strategy Review · Customer Segmentation Refresh |
| Half-Yearly | Marketing Transformation · AI Model Retraining |
| Yearly | Marketing Strategy & Budget Planning |

---

## Marketing AI Maturity Model

| Level | Stage | Characteristics |
|---|---|---|
| L1 | Manual Marketing | Human-driven campaigns |
| L2 | Automated Marketing | Scheduled campaigns |
| L3 | AI Assisted Marketing | AI recommendations |
| L4 | Predictive Marketing | AI forecasts outcomes |
| L5 | Autonomous Marketing | AI executes campaigns |
| L6 | Self-Optimizing Marketing | AI continuously improves itself |

> **insur_project current state**: between **L2 and L3** · automated campaign execution shipped (commit `1f96dfe`) · autonomous decision agent shipped (commit `36b86a2` · rule-based per §57.7).

---

## 20 Top High-Value AI Use Cases

| AI Use Case | Business Value |
|---|---|
| Lead Scoring AI | 20–40% more qualified leads |
| Customer Segmentation AI | 15–30% higher conversion |
| Personalized Email AI | 20–50% higher open rates |
| Banner Generation AI | 60–80% faster campaign creation |
| Churn Prediction AI | 10–25% retention improvement |
| Next Best Offer AI | 15–35% upsell increase |
| Recommendation Engine | 10–30% revenue increase |
| Marketing Copilot | 30–50% productivity gain |
| Journey Automation AI | 40–70% reduction in manual effort |
| Sentiment Analysis AI | Faster customer feedback insights |
| Campaign Optimization AI | 15–40% ROI improvement |
| Multi-Touch Attribution AI | Better budget allocation |
| AI A/B Testing | Higher CTR + conversions |
| Predictive Audience AI | Better targeting accuracy |
| AI Budget Optimizer | Reduced campaign spend waste |
| Social Media Content AI | Faster content production |
| Survey Analytics AI | Improved customer satisfaction |
| AI Landing Page Optimization | Higher conversion rates |
| Next Best Channel AI | Better engagement rates |
| Hyper-Personalization AI | Improved customer experience |

---

## Composes With

- §38.3 (audit row per KPI calculation)
- §47.6 (CI hard-fail · 12 steps · KPI registry validated)
- §57.7 (honest "—" when data not available · no fake KPIs)
- §70 (cron audit pattern · KPI refresh + drift detection)
- §75 (per-process metric matrices)
- §76 (RAI · governance KPIs)
- §82.7 (drift · KPI trend monitoring)
- §82.21 (PII KPI · violation count)
- §90 L13/L14 (digital marketing block)
- §92 (ai-agents/ catalogue)

---

## Implementation Status (live)

| Capability | Status | Reference |
|---|---|---|
| Multi-channel campaign execution | ✓ Done | `marketing_campaigns/` · 4 channels |
| Job + Blog publishing automation | ✓ Done | `content_ops/postings` · LinkedIn stub |
| Master contacts (CSV upload + manual) | ✓ Done | `content_ops/contacts` · dedup_key |
| Campaign scheduling (daily/weekly/monthly + EOM) | ✓ Done | `campaign_schedules` table |
| Autonomous AI agent (decision loop) | ✓ Done | `autonomous_agent_runs` · rule-based |
| Audit infrastructure | ✓ Done | 11 cron audits · 631 cells · all GREEN |
| Marketing Command Center scorecard | 🟡 Scaffolded | This commit · `MarketingKPIsPage.jsx` |
| KPI registry | 🟡 Scaffolded | `backend/marketing_kpis/registry.py` |
| Real-time KPI calculation | ⏳ Future | Tier 5 in `PENDING_PLAN.md` |
| Predictive models (churn · NBA · etc.) | ⏳ Future | T4.1 (LLM-driven `_decide_next()`) |
| Multi-cohort fairness | ⏳ Future | T3.2 |
