# Role Enhancement Processes — Per Department

**Date:** 2026-04-19
**Status:** Content spec (feeds Phase 2 UI: Manager → Roles & Responsibilities tab, Admin → Workflows tab)
**Scope:** Continuous-improvement / enhancement workflows executed by **Manager** and **Team Member (Employee)** roles across all 14 BEV departments.

## Pattern

Every enhancement process entry answers four questions:
- **Name** — what the process is called
- **Description** — one sentence on what happens
- **Trigger** — schedule / event / on-demand
- **KPI moved** — the metric this improves

This catalog feeds:
1. **Admin → Workflows tab** (ops + config view of the process)
2. **Manager → Roles & Responsibilities tab** (responsibilities per role)
3. **Manager → Team Performance tab** (adherence metrics)

---

## 1. Sales & Demand  📈

### Manager enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Territory rebalancing** | Reassign accounts / regions based on performance + capacity | Quarterly + on attrition | Revenue per rep, coverage % |
| **Forecast accuracy review** | Inspect model error patterns, promote challenger if MAPE beats champion | Monthly | Forecast MAPE |
| **Pipeline hygiene audit** | Flag stale deals, enforce stage-transition discipline | Weekly | Pipeline coverage ratio |
| **Win/loss readout** | Structured post-mortem → update playbook | After each closed deal > $X | Win rate %, avg deal cycle |
| **Discount-desk policy tune** | Raise/lower auto-approve thresholds based on margin leakage | Monthly | Net margin %, discount rate |

### Team Member enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **CRM hygiene sweep** | Deduplicate contacts, fill missing fields, update stages | Daily | Data quality % |
| **Lead-score calibration** | Flag false positives/negatives back to ML team | On lead feedback | Lead → SQL conversion |
| **Activity pattern review** | Compare own call/email counts to top-quartile peers | Weekly | Activities per rep |
| **Talk-track A/B** | Test new pitch line, record outcome | Per sales call | Conversion per pitch |

---

## 2. Supply Chain  🔗

### Manager enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Supplier diversification** | Add/replace suppliers based on risk + cost + lead-time | Quarterly | Supplier concentration, OTIF |
| **Safety-stock tuning** | Adjust reorder points per volatility | Monthly | Stockout rate, working capital |
| **S&OP cycle review** | Reconcile demand vs supply plans with Sales + Ops | Monthly | Plan attainment % |
| **Lane optimization** | Switch modes / carriers / routes based on cost + transit | Quarterly | Cost per unit shipped |
| **Exception playbook update** | Encode newly-seen disruptions as automated responses | After each major incident | Incident MTTR |

### Team Member enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Cycle count** | Physical inventory audit of a bin/zone | Daily rolling | Inventory accuracy % |
| **PO exception triage** | Work queue of delayed/short-shipped POs | Daily | PO on-time % |
| **Supplier score review** | Update KPI card with this week's receipts | Weekly | Supplier OTIF |
| **Demand anomaly feedback** | Mark false-positive anomalies back to model | On alert | Anomaly precision |

---

## 3. Logistics  🚚

### Manager enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Network redesign** | Revisit DC footprint, cross-dock choices | Annual + on volume shift | Cost per case, transit days |
| **Carrier RFP** | Re-bid lanes, renegotiate | Annual | Freight cost/unit |
| **Last-mile pilot** | Test new provider / mode on a segment | Quarterly | Last-mile cost, CSAT |
| **Route-planner tuning** | Update optimization weights (speed vs cost) | Monthly | On-time delivery % |

### Team Member enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Delivery exception close-out** | Resolve failed delivery, capture root cause | On exception | Exception resolution time |
| **Yard check-in audit** | Verify truck seal / paperwork, flag issues | Per arrival | Dock turnaround |
| **Fleet telemetry review** | Flag idle / harsh-braking / over-speed events | Daily | Fuel per mile, safety score |

---

## 4. Manufacturing  🏭

### Manager enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **OEE improvement sprint** | Kaizen event on bottleneck line | Monthly | OEE % |
| **SKU-to-line re-routing** | Move products to best-fit line based on yield + throughput | Quarterly | Schedule attainment |
| **Defect root-cause board** | Track top 5 defects, assign CAPA owners | Weekly | Defect rate |
| **Energy & waste review** | Tune runtime + scrap to reduce cost per case | Monthly | Cost per case, scrap % |

### Team Member enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Shift handoff checklist** | Pass open issues cleanly between crews | Per shift change | First-pass yield |
| **Andon / stop-and-fix** | Pull line, escalate, document | On defect cluster | MTBF, FPY |
| **Pre-run calibration** | Verify machine setpoints before SKU change | Per changeover | Changeover time |

---

## 5. Maintenance  🔧

### Manager enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **PM cycle optimization** | Adjust preventive maintenance intervals based on failure data | Quarterly | Unplanned downtime |
| **Spare-parts stocking** | Re-level critical spares per failure probability | Monthly | MTTR, parts availability |
| **Predictive-model retraining** | Retrain on fresh sensor data; evaluate recall/precision | Monthly | Early-warning precision |
| **Reliability review** | Pareto of top failures, assign fixes | Monthly | MTBF |

### Team Member enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Work-order close-out** | Document actual vs planned hours + parts | Per WO | PM compliance % |
| **Vibration / thermal round** | Manual sensor sweep on non-wired assets | Weekly | Early-detection count |
| **Safety lockout audit** | Verify LOTO compliance | Per repair | Safety incidents |

---

## 6. Retail  🛒

### Manager enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Planogram refresh** | Update shelf layouts per category performance | Seasonal | Sales per linear ft |
| **Price architecture review** | Re-tier good/better/best pricing | Quarterly | Margin %, units/visit |
| **Channel-mix rebalance** | Shift trade spend across retailers based on uplift | Quarterly | Trade ROI |
| **Store-clustering refresh** | Regroup stores by format + demand pattern | Semi-annual | Allocation accuracy |

### Team Member enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Shelf compliance audit** | Photo-based check of planogram adherence | Weekly | Compliance % |
| **Out-of-stock resolution** | Triage empty-shelf alert, flag root cause | On CV alert | On-shelf availability |
| **Promotion execution check** | Verify displays / end-caps live in-store | Campaign launch | Exec-compliance % |

---

## 7. Customer Analytics  👥

### Manager enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Segment definition review** | Validate segment boundaries vs new behavior | Quarterly | Segment migration stability |
| **Churn-model retraining** | Refresh features + retrain; compare recall | Monthly | Churn prediction precision |
| **Loyalty program tune** | Adjust tier thresholds / benefits based on LTV lift | Semi-annual | LTV, redemption % |
| **NPS action loop** | Route detractor feedback to owners; track closure | Weekly | NPS |

### Team Member enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Churn-risk outreach** | Contact top-N at-risk customers with save offer | Daily | Save rate |
| **Segment-quality tagging** | Mark mis-segmented customers back to model | On anomaly | Segment precision |
| **Feedback tagging** | Annotate survey / review comments for downstream NLP | Continuous | Tag agreement % |

---

## 8. Finance  💰

### Manager enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Trade-spend waterfall review** | Decompose variance, reassign budget | Monthly | Trade ROI |
| **Margin bridge build** | Decompose margin change by driver | Quarterly | Gross margin % |
| **Scenario plan refresh** | Rerun price × volume × cost scenarios | Quarterly | Scenario P&L band |
| **Forecast consolidation** | Reconcile dept forecasts → corporate | Monthly | Forecast accuracy % |

### Team Member enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Accrual clean-up** | Reconcile + close open accruals | Monthly close | Close cycle days |
| **AP / AR exception queue** | Work disputed invoices + aging | Daily | DSO, DPO |
| **Variance tagging** | Assign cause codes to budget variance | Month-end | Variance explained % |

---

## 9. Procurement

### Manager enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Strategic sourcing event** | RFX for a category, re-award | Annual | Cost savings % |
| **Contract renewal pipeline** | Track expiring contracts 90 days out | Quarterly | On-time renewals |
| **Supplier risk review** | Score financial / geo / ESG risk | Quarterly | Supplier risk index |

### Team Member enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **3-way match triage** | Resolve PO / GR / invoice mismatches | Daily | Match rate % |
| **Vendor onboarding checklist** | KYC + banking + diligence | Per new vendor | Onboarding days |
| **Spend classification** | Tag off-contract spend back to catalog | Weekly | On-contract spend % |

---

## 10. Quality  ✅

### Manager enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **CAPA governance** | Review corrective/preventive actions + closure | Weekly | CAPA on-time % |
| **Supplier quality review** | Rank suppliers by NCR, drive improvement | Monthly | PPM defects |
| **Recall readiness drill** | Simulate recall, time the response | Quarterly | Recall response time |
| **Customer complaint trend** | Pareto, drive root causes into design | Monthly | Complaints per 1k units |

### Team Member enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Inspection checklist close-out** | Record pass/fail with evidence | Per batch | NCR rate |
| **Non-conformance report** | File NCR with root-cause hypothesis | On defect | First-pass yield |
| **Calibration compliance** | Verify instruments due for calibration | Daily roster | OOC rate |

---

## 11. Governance  🛡️

### Manager enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Policy review cycle** | Refresh policies based on regulatory change | Quarterly | Policies up-to-date % |
| **Risk register re-score** | Update likelihood × impact on each risk | Monthly | Open risk exposure |
| **Model-governance board** | Approve model deploy / retire | Bi-weekly | Approved model coverage |
| **Audit finding close-out** | Track remediation to completion | Weekly | Findings > SLA |

### Team Member enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Access-review attestation** | Quarterly review of user permissions | Quarterly | Access review completion % |
| **Data-quality SLA monitoring** | Flag feeds breaching freshness SLA | Hourly | Feed SLA % |
| **Incident report filing** | Document security / compliance event | On incident | Incident-report completeness |

---

## 12. Contact Center  ☎️

### Manager enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Voice-AI prompt tuning** | Review call samples, adjust system prompt + rerank | Weekly | Deflection %, CSAT |
| **Workforce schedule refresh** | Re-forecast call volume, rebuild shifts | Weekly | Service level (80/20) |
| **Calibration session** | Align QA scoring across reviewers | Monthly | QA inter-rater agreement |
| **Skill-routing redesign** | Re-map queues to agent skills | Quarterly | First-contact resolution |

### Team Member enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Post-call note quality** | Write disposition + reason in agreed taxonomy | Per call | Note quality score |
| **Escalation playbook compliance** | Follow defined escalation tree | On escalation | Escalation adherence % |
| **KB correction feedback** | Flag outdated KB articles while on calls | On encounter | KB freshness |
| **CSAT follow-through** | Close loop on negative surveys | Daily | Save rate |

---

## 13. Marketing  📣

### Manager enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Attribution model review** | Re-weight channels based on incrementality tests | Quarterly | Model-to-reality error |
| **Creative review board** | Approve AI-generated creative for brand fit | Weekly | Brand compliance % |
| **Audience-segment refresh** | Retrain segment model, migrate audiences | Monthly | Segment lift |
| **Budget reallocation** | Shift spend across channels per real-time ROI | Bi-weekly | Blended CAC |

### Team Member enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **AI-assisted content QA** | Review generative ads / emails / landing copy before publish | Per asset | Reject rate, time-to-publish |
| **A/B test read-out** | Record winner, update playbook | Per test | Test cycle days |
| **Campaign QA checklist** | UTM / consent / frequency cap checks | Pre-launch | Campaign-defect rate |
| **SEO content refresh** | Update stale articles per Search Console drop | Monthly | Organic sessions |

---

## 14. Telehealth  🩺

### Manager enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Triage-AI calibration** | Review AI vs clinician agreement; tune thresholds | Weekly | Triage accuracy |
| **Panel-balancing** | Rebalance clinician caseloads | Monthly | Wait time |
| **Care-pathway review** | Update protocols per outcome data | Quarterly | Outcome compliance |
| **Privacy / HIPAA audit** | Verify session logs + access controls | Monthly | Audit finding rate |

### Team Member enhancement processes
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Encounter note quality** | Complete structured note in EHR | Per encounter | Note completeness |
| **AI-suggestion acceptance** | Accept / reject AI recommendations with rationale | Per suggestion | Suggestion acceptance % |
| **Patient follow-up** | Close loop on abnormal results or missed appts | Daily | Follow-up rate |

---

## How this maps to Phase 1 scaffolding

| This catalog feeds | In the UI | Phase |
|---|---|---|
| Manager columns above | Manager → **Roles & Responsibilities** tab (rolesByDept[dept].manager.responsibilities) | 2 |
| Team Member columns above | Manager → **Roles & Responsibilities** tab (rolesByDept[dept]['team-member'].responsibilities) | 2 |
| Each process as a workflow row | Admin → **Workflows** tab (process × trigger × owner × status) | 2 |
| KPI columns | Manager → **KPI Dashboard** tab (with drill-down from KPI → process → owner) | 2 |

---

---

# Appendix — Compliance role enhancement processes

Appended 2026-04-19. Completes the 4-role catalog (Manager, Team Member, Compliance, Reporting & Monitoring) per dept.

## 1. Sales & Demand — Compliance
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Discount-approval audit** | Sample discount approvals > threshold; verify policy adherence | Weekly | Off-policy discount rate |
| **CRM PII access review** | Check who accessed customer PII fields | Monthly | Unauthorized-access rate |
| **Lead-scoring fairness check** | Test model for bias across demographics / regions | Quarterly | Fairness metric (demographic parity) |
| **Deal-desk exception log** | Review write-offs, unusual terms | Monthly | Exceptions per 100 deals |

## 2. Supply Chain — Compliance
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Supplier due-diligence refresh** | Re-verify KYC, sanctions, ESG per supplier | Annual + on flag | Supplier DD currency % |
| **Import/export license audit** | Confirm licenses current per country | Quarterly | License-expiry lead days |
| **Trade-compliance screening** | Automated sanctions / denied-party screening on POs | Per PO | Screening hit-rate |

## 3. Logistics — Compliance
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Driver-hours (HOS) audit** | Verify driver hours-of-service regulation compliance | Weekly | HOS violations |
| **Hazmat documentation** | Confirm proper manifests + placards for dangerous goods | Per shipment | Hazmat-doc error rate |
| **Cross-border compliance** | Customs paperwork audit | Per cross-border move | Customs-hold rate |

## 4. Manufacturing — Compliance
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **GMP batch-record review** | Verify good-manufacturing-practice records complete | Per batch | Batch-record defects |
| **OSHA / safety audit** | Inspect line for safety violations | Monthly | Recordable incident rate |
| **Environmental discharge monitoring** | Verify effluent / emissions within permit | Continuous | Exceedance events |

## 5. Maintenance — Compliance
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **LOTO (lockout-tagout) compliance** | Verify proper lockout during repairs | Per repair | LOTO violations |
| **Calibration traceability** | Verify instruments traceable to NIST / standard | Quarterly | Out-of-cal instruments |
| **Contractor qualification** | Verify contractor badges / insurance / training | Per engagement | Unqualified-entry events |

## 6. Retail — Compliance
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Pricing-law compliance** | Ensure displayed price matches scanner price | Weekly | Price-discrepancy rate |
| **Promotion-claim substantiation** | Verify ad claims have data backing | Per campaign | Unsubstantiated claims |
| **Age-gated product controls** | Verify POS blocks under-age sales | Per txn | Underage-sale attempts |

## 7. Customer Analytics — Compliance
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **GDPR / CCPA request fulfillment** | Process data-subject access / deletion requests | On request (30-day SLA) | Requests > SLA |
| **Consent-record audit** | Verify marketing consent still valid | Monthly | Expired-consent usage |
| **Segment-bias check** | Test segmentation for discriminatory proxy variables | Quarterly | Bias score |

## 8. Finance — Compliance
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **SOX control testing** | Re-test key financial controls | Quarterly | Control pass rate |
| **Revenue-recognition review** | Audit rev-rec judgments (ASC 606) | Monthly | Rev-rec adjustments |
| **Month-end cutoff audit** | Verify transactions booked to correct period | Monthly close | Cutoff errors |

## 9. Procurement — Compliance
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Conflict-of-interest attestation** | Buyers attest no undisclosed supplier relationships | Annual | Late attestations |
| **Anti-corruption (FCPA) training** | Confirm completion + renewals | Annual | Completion % |
| **Bid-integrity review** | Review awarded RFXs for single-bid / off-process | Per award | Single-bid awards % |

## 10. Quality — Compliance
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **FDA / ISO audit readiness** | Pre-audit mock walkthrough | Quarterly | Audit findings |
| **Recall traceability test** | Simulate trace-forward / trace-back on a batch | Quarterly | Trace completion time |
| **CAPA regulatory closure** | Verify CAPAs meet regulator-required close-out | Weekly | CAPAs overdue |

## 11. Governance — Compliance
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Model-risk register review** | Update registered models + risk tier | Quarterly | Unregistered models in prod |
| **AI explainability audit** | Verify decisions have captured rationale | Monthly | Unexplained decisions |
| **Third-party AI license audit** | Verify LLM / model licenses (OSS, commercial) are current | Annual | License exceptions |

## 12. Contact Center — Compliance
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Call-recording consent verification** | Confirm disclosures + jurisdictional consent | Daily sample | Consent-defect rate |
| **PCI / TCPA audit** | Verify card data handling + dialer compliance | Monthly | PCI / TCPA findings |
| **AI-agent script compliance** | Verify AI responses don't make unapproved claims | Weekly | Script-violation rate |
| **Complaint regulatory reporting** | File complaints to regulators where required | Within SLA | Late filings |

## 13. Marketing — Compliance
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Email-marketing law audit** | CAN-SPAM / GDPR / PECR compliance sample | Monthly | Violation rate |
| **Advertising-claim review** | Ensure generative claims are factually accurate | Per asset | Disputed-claim rate |
| **Brand-safety / UGC review** | Review AI-generated + influencer content for brand risk | Per campaign | Brand-safety incidents |
| **Cookie / tracker audit** | Verify site tags match consent banner | Quarterly | Non-consented trackers |

## 14. Telehealth — Compliance
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **HIPAA access audit** | Review PHI access logs for unusual patterns | Weekly | Unauthorized-access rate |
| **Clinician license verification** | Verify state licensure for telemedicine | Monthly | Expired-license events |
| **Triage-AI clinical-safety review** | Clinician oversight of AI triage decisions | Weekly | Discordant decisions reviewed |
| **BAA (business-associate) audit** | Verify BAAs in place with vendors | Annual | Missing-BAA exceptions |

---

# Appendix — Reporting & Monitoring role enhancement processes

## 1. Sales & Demand — Reporting & Monitoring
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Forecast-drift dashboard ops** | Watch MAPE drift bands, trigger alerts | Continuous | MAPE drift alerts MTTD |
| **Scheduled-job SLA watch** | Ensure daily/weekly reports land on time | Hourly | Job SLA % |
| **Pipeline-anomaly triage** | Investigate anomaly alerts, classify true/false | On alert | Anomaly precision |

## 2. Supply Chain — Reporting & Monitoring
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Feed freshness watch** | Monitor incoming EDI / API feeds for stale data | Continuous | Stale-feed alerts MTTR |
| **Inventory-accuracy drift** | Watch cycle-count variance trend | Weekly | Inventory accuracy trend |
| **Service-level dashboard ops** | Maintain OTIF + fill-rate real-time | Continuous | Dashboard uptime |

## 3. Logistics — Reporting & Monitoring
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Telemetry pipeline watch** | Monitor IoT fleet data ingestion | Continuous | Pipeline lag |
| **ETA-model accuracy** | Track predicted vs actual ETA error | Daily | ETA MAE |
| **Exception-feed monitoring** | Watch for spike in delivery exceptions | Hourly | Exception rate |

## 4. Manufacturing — Reporting & Monitoring
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **OEE live dashboard ops** | Maintain line-level OEE feeds | Continuous | Dashboard uptime |
| **MES / SCADA connectivity** | Watch plant-data connectivity health | Continuous | Connectivity % |
| **Defect-detection model drift** | Monitor CV model recall on inspected units | Daily | Recall drop alerts |

## 5. Maintenance — Reporting & Monitoring
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Sensor telemetry gaps** | Detect and alert on sensor offline events | Continuous | Offline-sensor MTTR |
| **PM-compliance dashboard** | Keep on-time PM metric current | Daily | Dashboard freshness |
| **Predictive-model scoring ops** | Watch scoring-job success rate | Hourly | Job success % |

## 6. Retail — Reporting & Monitoring
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **POS data ingestion** | Monitor POS feeds from each chain | Continuous | Feed lag |
| **Shelf-CV model accuracy** | Track CV detection error rate | Daily | Detection precision |
| **Price-sync verification** | Alert on price mismatch between ERP and stores | Hourly | Mismatch rate |

## 7. Customer Analytics — Reporting & Monitoring
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Churn-model drift watch** | Monitor AUC / recall drift | Daily | Drift alerts |
| **Event-stream health** | Watch clickstream ingestion | Continuous | Stream lag |
| **Segment-size anomaly** | Alert on sudden segment shifts | Daily | Anomalies flagged |

## 8. Finance — Reporting & Monitoring
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Close-cycle progress** | Track close-cycle task completion | During close | On-time task % |
| **Variance-calc pipeline** | Monitor variance calc jobs | Monthly | Job SLA % |
| **Fraud-signal watch** | Monitor unusual vendor / employee transactions | Daily | Fraud-signal precision |

## 9. Procurement — Reporting & Monitoring
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Spend dashboard ops** | Maintain real-time spend feeds | Continuous | Feed freshness |
| **Contract-expiry alerts** | Watch contracts coming due | Daily | Missed renewals |
| **Savings realization tracking** | Compare promised vs realized savings | Monthly | Realization % |

## 10. Quality — Reporting & Monitoring
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **NCR trend monitoring** | Alert on NCR spike by SKU / plant | Daily | Spike MTTD |
| **Complaint feed ops** | Ensure complaint feeds ingest cleanly | Continuous | Feed lag |
| **Lab-result pipeline** | Monitor LIMS data flow | Continuous | Pipeline uptime |

## 11. Governance — Reporting & Monitoring
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Data-quality scorecard ops** | Maintain data-quality scorecards per domain | Daily | DQ score trend |
| **Model-performance dashboards** | Centralized view of all production models | Continuous | Dashboard coverage |
| **Control-effectiveness watch** | Monitor key control KPIs | Weekly | Control breaches |

## 12. Contact Center — Reporting & Monitoring
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Voice-AI latency ops** | Monitor STT / LLM / TTS latency p95 | Continuous | Latency SLO adherence |
| **Queue-health dashboard** | Live view of queue wait / abandon | Continuous | Dashboard uptime |
| **Call-disposition feed ops** | Watch disposition pipeline to CRM | Continuous | Sync lag |
| **QA-sampling pipeline** | Ensure QA call-sampling job runs | Daily | Job success % |

## 13. Marketing — Reporting & Monitoring
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **Attribution feed freshness** | Watch multi-touch attribution feeds | Hourly | Feed lag |
| **Ad-spend pacing dashboard** | Alert on over/under-pacing | Continuous | Pacing deviation |
| **Funnel anomaly watch** | Detect drop-off spikes in real time | Continuous | Anomaly MTTD |
| **Creative-performance ops** | Monitor real-time creative KPIs | Continuous | Dashboard freshness |

## 14. Telehealth — Reporting & Monitoring
| Process | Description | Trigger | KPI |
|---|---|---|---|
| **EHR-integration health** | Watch EHR API / HL7 / FHIR feeds | Continuous | Feed uptime |
| **Triage-AI accuracy dashboard** | Track AI vs clinician agreement | Daily | Agreement trend |
| **Session-telemetry ops** | Monitor video / audio quality metrics | Continuous | Call-quality score |

---

## RBAC (explicitly deferred)

User paused this stream 2026-04-19 (see memory `project_phase2_pivot.md`). Roadmap §2.1 and §12 will resume it later.

---

## Totals (final — verified against extracted workflows.js, commit ff9b42d)

- **57** Manager enhancement processes
- **46** Team Member enhancement processes
- **46** Compliance enhancement processes
- **44** Reporting & Monitoring enhancement processes

**Grand total: 193 enhancement processes across 4 roles × 14 departments.** (Earlier "196" estimate was my miscount while drafting — the source-of-truth is `frontend/src/data/workflows.js`.)

Each entry carries `{name, description, trigger, KPI}` — ready to be extracted into a JS data file (`frontend/src/data/workflows.js`) when Phase 2 builds the Workflows tab.
