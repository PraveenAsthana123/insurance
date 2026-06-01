// roles.js — Five canonical roles, with per-department responsibilities.
// All 14 departments populated. Content is derived from
// docs/specs/ROLE_ENHANCEMENT_PROCESSES.md (Manager, Team Member, Compliance,
// Reporting & Monitoring appendices). The 5th role "tester" was added in
// Phase ζ to cover QA-focused enhancement processes across every dept.

export const ROLE_IDS = ['manager', 'team-member', 'compliance', 'reporting-monitoring', 'tester'];

export const ROLE_LABELS = {
  manager: 'Manager',
  'team-member': 'Team Member',
  compliance: 'Compliance',
  'reporting-monitoring': 'Reporting & Monitoring',
  tester: 'Tester',
};

export const ROLE_ICONS = {
  manager: '👔',
  'team-member': '🧑‍💻',
  compliance: '🛡️',
  'reporting-monitoring': '📡',
  tester: '🧪',
};

// reports array uses IDs from reports.js
export const rolesByDept = {
  sales: {
    manager: {
      title: 'Sales Manager',
      responsibilities: [
        'Set quarterly revenue targets and territory plans',
        'Approve forecast models and pricing strategy changes',
        'Review pipeline health and team scorecards weekly',
        'Own SLA and ROI outcomes for the Sales function',
      ],
      kpis: ['Revenue $', 'Forecast accuracy %', 'Deal cycle days', 'Win rate %'],
      reports: ['exec-kpi', 'mbr', 'team-scorecard', 'roi-tracker', 'pipeline-health'],
    },
    'team-member': {
      title: 'Sales Analyst',
      responsibilities: [
        'Maintain CRM hygiene and opportunity stages',
        'Run daily pipeline reports and flag at-risk deals',
        'Execute lead-scoring tasks assigned by Manager',
      ],
      kpis: ['Tasks completed', 'Data quality %', 'Forecasts submitted on time'],
      reports: ['my-tasks', 'daily-productivity', 'personal-scorecard'],
    },
    compliance: {
      title: 'Sales Compliance Officer',
      responsibilities: [
        'Audit discount approvals and deal-desk exceptions',
        'Track PII access in CRM',
        'Validate model fairness for lead scoring',
      ],
      kpis: ['Violation rate', 'Audit findings closed', 'PII access alerts'],
      reports: ['audit-trail', 'policy-violations', 'model-fairness', 'pii-access'],
    },
    'reporting-monitoring': {
      title: 'Sales Ops Monitor',
      responsibilities: [
        'Watch forecasting model drift and data pipeline health',
        'Respond to anomaly alerts in sales telemetry',
        'Maintain scheduled job calendar for daily/weekly reports',
      ],
      kpis: ['System uptime %', 'Drift incidents', 'Jobs failed/recovered'],
      reports: ['system-health', 'model-drift', 'pipeline-status', 'anomaly-detection', 'scheduled-jobs'],
    },
    tester: {
      title: 'Sales QA Analyst',
      responsibilities: [
        'Design and execute test cases for forecast, simulation, and pipeline endpoints (positive/negative/edge)',
        'Validate AI model outputs (Prophet, scoring) against known ground-truth fixtures',
        'Run regression suites after prompt/model/feature changes — sign off on releases',
        'Maintain RBAC boundary tests across all four demo roles',
      ],
      kpis: ['Defect escape rate', 'Test automation coverage %', 'Mean time to detect regression'],
      reports: ['regression-test-coverage', 'defect-log', 'test-run-history', 'smoke-test-status'],
    },
  },
  marketing: {
    manager: {
      title: 'Marketing Manager',
      responsibilities: [
        'Own campaign calendar and channel budget allocation',
        'Approve generative creative and landing-page variants',
        'Review attribution and funnel conversion weekly',
      ],
      kpis: ['Campaign ROI %', 'CAC', 'Conversion rate %', 'Funnel drop-off %'],
      reports: ['exec-kpi', 'mbr', 'roi-tracker', 'pipeline-health'],
    },
    'team-member': {
      title: 'Marketing Specialist',
      responsibilities: [
        'Execute AI-assisted content generation (ads, emails, SEO)',
        'A/B test variants and report winners',
        'Maintain audience segments and CRM journeys',
      ],
      kpis: ['Content shipped', 'Variants tested', 'Engagement rate'],
      reports: ['my-tasks', 'daily-productivity', 'personal-scorecard'],
    },
    compliance: {
      title: 'Marketing Compliance Officer',
      responsibilities: [
        'Ensure generative content meets brand and legal standards',
        'Audit consent records (CAN-SPAM, GDPR, CCPA)',
        'Validate model fairness for audience targeting',
      ],
      kpis: ['Consent violations', 'Brand compliance %', 'Audit findings closed'],
      reports: ['audit-trail', 'regulatory-checklist', 'policy-violations', 'model-fairness', 'pii-access'],
    },
    'reporting-monitoring': {
      title: 'Marketing Analytics Ops',
      responsibilities: [
        'Monitor attribution model drift and feed freshness',
        'Watch funnel anomalies and alert creative team',
        'Operate scheduled campaign performance reports',
      ],
      kpis: ['Data freshness', 'Anomalies flagged', 'Scheduled job success %'],
      reports: ['system-health', 'model-drift', 'pipeline-status', 'anomaly-detection', 'scheduled-jobs'],
    },
    tester: {
      title: 'Marketing Content QA Tester',
      responsibilities: [
        'Test generative creative outputs (ads, emails, landing pages) for brand voice and factual drift',
        'Validate A/B test harness — randomization, exposure logging, winner calc',
        'Run regression suites for attribution + funnel reporting after model changes',
        'Automate e2e tests for campaign publish → track → attribute flow',
      ],
      kpis: ['Content defect escape rate', 'Automation coverage %', 'A/B test regression pass rate'],
      reports: ['regression-test-coverage', 'defect-log', 'test-run-history', 'automation-coverage'],
    },
  },
  'contact-center': {
    manager: {
      title: 'Contact Center Manager',
      responsibilities: [
        'Plan workforce schedules and SLA targets',
        'Review AI agent handoff quality and CSAT trends',
        'Approve voice-AI prompt changes and model versions',
      ],
      kpis: ['AHT', 'CSAT', 'First-contact resolution %', 'Agent utilization %'],
      reports: ['exec-kpi', 'mbr', 'team-scorecard', 'sla-summary', 'roi-tracker'],
    },
    'team-member': {
      title: 'Customer Service Agent',
      responsibilities: [
        'Handle customer contacts with AI whisper coaching',
        'Escalate complex cases per playbook',
        'Log call dispositions and feedback',
      ],
      kpis: ['Calls handled', 'CSAT per agent', 'Adherence %'],
      reports: ['my-tasks', 'daily-productivity', 'personal-scorecard', 'assigned-incidents'],
    },
    compliance: {
      title: 'Contact Center Compliance Officer',
      responsibilities: [
        'Audit call recordings for PII handling and script adherence',
        'Review AI agent responses for regulatory compliance',
        'Track complaint resolution SLAs',
      ],
      kpis: ['PII incidents', 'Script compliance %', 'Regulatory findings'],
      reports: ['audit-trail', 'regulatory-checklist', 'policy-violations', 'model-fairness', 'pii-access', 'change-mgmt'],
    },
    'reporting-monitoring': {
      title: 'Contact Center Ops Monitor',
      responsibilities: [
        'Watch queue health, IVR drop-off, voice-AI latency',
        'Alert on anomalies (surge, outage, drift)',
        'Operate shift-level ops dashboards',
      ],
      kpis: ['Queue wait', 'Voice-AI latency', 'Uptime %'],
      reports: ['system-health', 'model-drift', 'pipeline-status', 'anomaly-detection', 'scheduled-jobs', 'api-latency'],
    },
    tester: {
      title: 'Contact Center QA Specialist',
      responsibilities: [
        'Script test calls covering IVR, voice-AI whisper, and agent handoff scenarios',
        'Validate voice-AI prompt versions against golden transcripts before rollout',
        'Run regression suites for CSAT scoring and disposition classifier',
        'File and triage defects on voice-AI latency and transcription accuracy',
      ],
      kpis: ['Voice-AI defect escape rate', 'Prompt regression pass rate', 'Mean time to detect regression'],
      reports: ['regression-test-coverage', 'defect-log', 'test-run-history', 'smoke-test-status'],
    },
  },

  'supply-chain': {
    manager: {
      title: 'Supply Chain Manager',
      responsibilities: [
        'Diversify suppliers based on risk, cost, and lead-time',
        'Tune safety-stock and reorder points per demand volatility',
        'Run S&OP cycle with Sales and Operations',
        'Update exception playbook after each major disruption',
      ],
      kpis: ['OTIF %', 'Stockout rate', 'Working capital days', 'Plan attainment %'],
      reports: ['exec-kpi', 'mbr', 'budget-vs-actuals', 'roi-tracker'],
    },
    'team-member': {
      title: 'Supply Chain Analyst',
      responsibilities: [
        'Execute cycle counts and resolve inventory discrepancies',
        'Triage delayed / short-shipped POs',
        'Update supplier KPI scorecards weekly',
        'Feed false-positive anomalies back to the model',
      ],
      kpis: ['Inventory accuracy %', 'PO on-time %', 'Supplier OTIF'],
      reports: ['my-tasks', 'daily-productivity', 'personal-scorecard'],
    },
    compliance: {
      title: 'Trade Compliance Officer',
      responsibilities: [
        'Refresh supplier due-diligence (KYC, sanctions, ESG)',
        'Audit import/export licenses per country',
        'Screen every PO against sanctions and denied-party lists',
      ],
      kpis: ['Supplier DD currency %', 'License-expiry lead days', 'Screening hit rate'],
      reports: ['audit-trail', 'regulatory-checklist', 'policy-violations'],
    },
    'reporting-monitoring': {
      title: 'Supply Chain Ops Monitor',
      responsibilities: [
        'Monitor incoming EDI / API feeds for stale data',
        'Watch cycle-count variance trend',
        'Maintain real-time OTIF and fill-rate dashboards',
      ],
      kpis: ['Stale-feed alerts MTTR', 'Dashboard uptime', 'Feed lag'],
      reports: ['system-health', 'pipeline-status', 'anomaly-detection', 'scheduled-jobs'],
    },
    tester: {
      title: 'Supply Chain QA Engineer',
      responsibilities: [
        'Design test cases for stockout-risk, ETA, and network-simulation endpoints',
        'Validate supplier ingestion against schema contracts + referential integrity',
        'Run regression suites after any scoring model retrain',
        'Automate e2e tests for supplier onboarding → screening → scorecard flow',
      ],
      kpis: ['Defect escape rate', 'Automation coverage %', 'Contract-test pass rate'],
      reports: ['regression-test-coverage', 'defect-log', 'test-run-history', 'automation-coverage'],
    },
  },

  logistics: {
    manager: {
      title: 'Logistics Manager',
      responsibilities: [
        'Revisit DC footprint and cross-dock choices',
        'Run annual carrier RFP and renegotiate lanes',
        'Pilot new last-mile providers on selected segments',
        'Tune route-planner optimization weights',
      ],
      kpis: ['Cost per case', 'Transit days', 'On-time delivery %', 'Last-mile cost'],
      reports: ['exec-kpi', 'mbr', 'budget-vs-actuals', 'sla-summary', 'roi-tracker'],
    },
    'team-member': {
      title: 'Dispatch Associate',
      responsibilities: [
        'Resolve failed deliveries and capture root cause',
        'Verify truck seal and paperwork at yard check-in',
        'Review fleet telemetry for idle / harsh-braking / speeding',
      ],
      kpis: ['Exception resolution time', 'Dock turnaround', 'Fuel per mile'],
      reports: ['my-tasks', 'daily-productivity', 'assigned-incidents'],
    },
    compliance: {
      title: 'Transportation Compliance Officer',
      responsibilities: [
        'Audit driver hours-of-service (HOS) compliance',
        'Verify hazmat manifests and placards per shipment',
        'Review customs paperwork on cross-border moves',
      ],
      kpis: ['HOS violations', 'Hazmat-doc error rate', 'Customs-hold rate'],
      reports: ['audit-trail', 'regulatory-checklist', 'policy-violations'],
    },
    'reporting-monitoring': {
      title: 'Logistics Ops Monitor',
      responsibilities: [
        'Monitor IoT fleet telemetry ingestion',
        'Track ETA model error vs actuals',
        'Watch for spikes in delivery exceptions',
      ],
      kpis: ['Pipeline lag', 'ETA MAE', 'Exception rate'],
      reports: ['system-health', 'model-drift', 'pipeline-status', 'anomaly-detection'],
    },
    tester: {
      title: 'Logistics QA Analyst',
      responsibilities: [
        'Execute test cases across route-plan, ETA, and dispatch exception scenarios',
        'Validate IoT telemetry ingest against bad-data fixtures (gaps, out-of-range)',
        'Run regression suites on ETA model after weights retune',
        'Sign off on fleet dashboard releases — smoke + acceptance tests',
      ],
      kpis: ['Defect escape rate', 'ETA regression pass rate', 'Mean time to detect regression'],
      reports: ['regression-test-coverage', 'defect-log', 'test-run-history', 'smoke-test-status'],
    },
  },

  manufacturing: {
    manager: {
      title: 'Production Manager',
      responsibilities: [
        'Drive OEE improvement sprints on bottleneck lines',
        'Re-route SKUs to best-fit lines based on yield + throughput',
        'Maintain defect root-cause board with CAPA owners',
        'Review energy and waste for cost per case reduction',
      ],
      kpis: ['OEE %', 'Schedule attainment', 'Defect rate', 'Cost per case'],
      reports: ['exec-kpi', 'mbr', 'team-scorecard', 'budget-vs-actuals'],
    },
    'team-member': {
      title: 'Line Operator',
      responsibilities: [
        'Complete shift handoff checklists between crews',
        'Pull andon and escalate defect clusters',
        'Verify setpoints before every SKU changeover',
      ],
      kpis: ['First-pass yield', 'MTBF', 'Changeover time'],
      reports: ['my-tasks', 'daily-productivity', 'personal-scorecard'],
    },
    compliance: {
      title: 'GMP Compliance Officer',
      responsibilities: [
        'Review good-manufacturing-practice batch records',
        'Audit lines for OSHA / safety violations',
        'Verify effluent and emissions within permit limits',
      ],
      kpis: ['Batch-record defects', 'Recordable incident rate', 'Exceedance events'],
      reports: ['audit-trail', 'regulatory-checklist', 'policy-violations', 'change-mgmt'],
    },
    'reporting-monitoring': {
      title: 'Plant Floor Monitor',
      responsibilities: [
        'Maintain line-level OEE live dashboards',
        'Watch MES / SCADA connectivity health',
        'Monitor CV defect-detection model recall on inspected units',
      ],
      kpis: ['Dashboard uptime', 'Connectivity %', 'Recall drop alerts'],
      reports: ['system-health', 'model-drift', 'pipeline-status', 'anomaly-detection'],
    },
    tester: {
      title: 'Manufacturing Quality Tester',
      responsibilities: [
        'Sample CV defect-detection false-positive/false-negative images for model eval',
        'Execute batch-record test scenarios covering OEE, yield, and changeover edges',
        'Run regression suites for MES/SCADA ingest after schema changes',
        'Maintain golden-batch fixtures and defect-detection test data sets',
      ],
      kpis: ['CV recall on fixture set', 'Defect escape rate', 'Automation coverage %'],
      reports: ['regression-test-coverage', 'defect-log', 'test-run-history', 'automation-coverage'],
    },
  },

  maintenance: {
    manager: {
      title: 'Reliability Manager',
      responsibilities: [
        'Optimize preventive maintenance cycles from failure data',
        'Re-level critical spare parts per failure probability',
        'Retrain predictive models monthly; evaluate recall/precision',
        'Run Pareto reliability reviews and assign fixes',
      ],
      kpis: ['Unplanned downtime', 'MTTR', 'Early-warning precision', 'MTBF'],
      reports: ['exec-kpi', 'mbr', 'budget-vs-actuals', 'roi-tracker'],
    },
    'team-member': {
      title: 'Maintenance Technician',
      responsibilities: [
        'Close out work orders with actual hours and parts',
        'Run weekly vibration / thermal rounds on non-wired assets',
        'Verify lockout-tagout compliance on every repair',
      ],
      kpis: ['PM compliance %', 'Early-detection count', 'Safety incidents'],
      reports: ['my-tasks', 'daily-productivity', 'assigned-incidents'],
    },
    compliance: {
      title: 'Maintenance Compliance Officer',
      responsibilities: [
        'Verify LOTO (lockout-tagout) procedures on every repair',
        'Audit instrument calibration traceability to NIST',
        'Confirm contractor qualifications and insurance',
      ],
      kpis: ['LOTO violations', 'Out-of-cal instruments', 'Unqualified-entry events'],
      reports: ['audit-trail', 'regulatory-checklist', 'policy-violations'],
    },
    'reporting-monitoring': {
      title: 'Maintenance Ops Monitor',
      responsibilities: [
        'Detect and alert on sensor offline events',
        'Keep on-time PM compliance dashboard current',
        'Watch predictive-model scoring job success rate',
      ],
      kpis: ['Offline-sensor MTTR', 'Dashboard freshness', 'Job success %'],
      reports: ['system-health', 'model-drift', 'pipeline-status', 'scheduled-jobs'],
    },
    tester: {
      title: 'Maintenance Reliability QA',
      responsibilities: [
        'Design test cases for predictive-failure model against labelled history',
        'Validate work-order close-out flows with positive/negative path coverage',
        'Run regression suites after model retrain — precision/recall delta gate',
        'Maintain vibration/thermal fixture data set for offline model eval',
      ],
      kpis: ['Model regression pass rate', 'Defect escape rate', 'Mean time to detect regression'],
      reports: ['regression-test-coverage', 'defect-log', 'test-run-history', 'smoke-test-status'],
    },
  },

  retail: {
    manager: {
      title: 'Retail Category Manager',
      responsibilities: [
        'Refresh planograms per category performance',
        'Review good/better/best price architecture quarterly',
        'Rebalance trade spend across retailers by uplift',
        'Refresh store clusters by format and demand pattern',
      ],
      kpis: ['Sales per linear ft', 'Margin %', 'Trade ROI', 'Allocation accuracy'],
      reports: ['exec-kpi', 'mbr', 'team-scorecard', 'roi-tracker'],
    },
    'team-member': {
      title: 'Field Merchandiser',
      responsibilities: [
        'Complete weekly photo-based planogram compliance audits',
        'Triage out-of-stock alerts and flag root causes',
        'Verify promotion displays and end-caps are live',
      ],
      kpis: ['Compliance %', 'On-shelf availability', 'Exec-compliance %'],
      reports: ['my-tasks', 'daily-productivity', 'personal-scorecard'],
    },
    compliance: {
      title: 'Retail Compliance Officer',
      responsibilities: [
        'Ensure displayed price matches scanner price',
        'Verify advertising claims have data substantiation',
        'Confirm POS blocks under-age sales on controlled products',
      ],
      kpis: ['Price-discrepancy rate', 'Unsubstantiated claims', 'Underage-sale attempts'],
      reports: ['audit-trail', 'regulatory-checklist', 'policy-violations'],
    },
    'reporting-monitoring': {
      title: 'Retail Analytics Ops',
      responsibilities: [
        'Monitor POS feeds from each chain for lag',
        'Track shelf-CV model detection error rate',
        'Alert on price mismatches between ERP and stores',
      ],
      kpis: ['Feed lag', 'Detection precision', 'Mismatch rate'],
      reports: ['system-health', 'model-drift', 'pipeline-status', 'anomaly-detection'],
    },
    tester: {
      title: 'Retail QA Analyst',
      responsibilities: [
        'Validate planogram-compliance CV output against audit photos (labelled set)',
        'Execute price-integrity tests comparing ERP vs POS vs shelf tags',
        'Run regression suites for promotion-uplift model after refresh',
        'Automate smoke tests for POS feed ingest per chain',
      ],
      kpis: ['CV precision on fixture set', 'Price-mismatch catch rate', 'Automation coverage %'],
      reports: ['regression-test-coverage', 'defect-log', 'test-run-history', 'automation-coverage'],
    },
  },

  customer: {
    manager: {
      title: 'Customer Insights Manager',
      responsibilities: [
        'Validate segment boundaries vs new behavior',
        'Retrain churn model monthly; compare recall',
        'Tune loyalty program tiers based on LTV lift',
        'Route detractor feedback to owners and track closure',
      ],
      kpis: ['Segment migration stability', 'Churn precision', 'LTV', 'NPS'],
      reports: ['exec-kpi', 'mbr', 'team-scorecard', 'roi-tracker'],
    },
    'team-member': {
      title: 'Customer Insights Analyst',
      responsibilities: [
        'Contact top-N at-risk customers with save offers',
        'Tag mis-segmented customers back to the model',
        'Annotate survey and review comments for NLP training',
      ],
      kpis: ['Save rate', 'Segment precision', 'Tag agreement %'],
      reports: ['my-tasks', 'daily-productivity', 'personal-scorecard'],
    },
    compliance: {
      title: 'Privacy Compliance Officer',
      responsibilities: [
        'Process GDPR / CCPA data-subject requests within 30-day SLA',
        'Audit marketing consent validity monthly',
        'Test segmentation for discriminatory proxy variables',
      ],
      kpis: ['Requests > SLA', 'Expired-consent usage', 'Bias score'],
      reports: ['audit-trail', 'regulatory-checklist', 'policy-violations', 'model-fairness', 'pii-access'],
    },
    'reporting-monitoring': {
      title: 'Customer Analytics Ops',
      responsibilities: [
        'Monitor churn-model AUC / recall drift',
        'Watch clickstream ingestion for lag',
        'Alert on sudden segment shifts',
      ],
      kpis: ['Drift alerts', 'Stream lag', 'Anomalies flagged'],
      reports: ['system-health', 'model-drift', 'pipeline-status', 'anomaly-detection'],
    },
    tester: {
      title: 'Customer Analytics QA',
      responsibilities: [
        'Design test cases for churn-predict and cohort-analysis endpoints (edge + boundary)',
        'Validate churn model output against holdout set — recall/precision gate on release',
        'Run fairness smoke tests across protected-class cohorts before rollout',
        'Maintain synthetic customer fixtures for deterministic e2e tests',
      ],
      kpis: ['Defect escape rate', 'Model regression pass rate', 'Automation coverage %'],
      reports: ['regression-test-coverage', 'defect-log', 'test-run-history', 'automation-coverage'],
    },
  },

  finance: {
    manager: {
      title: 'Finance Manager',
      responsibilities: [
        'Decompose trade-spend variance and reassign budget',
        'Build margin bridges by driver quarterly',
        'Rerun price × volume × cost scenario plans',
        'Consolidate department forecasts into corporate plan',
      ],
      kpis: ['Trade ROI', 'Gross margin %', 'Scenario P&L band', 'Forecast accuracy %'],
      reports: ['exec-kpi', 'mbr', 'budget-vs-actuals', 'roi-tracker'],
    },
    'team-member': {
      title: 'Finance Analyst',
      responsibilities: [
        'Reconcile and close open accruals at month-end',
        'Work disputed invoices and aging queue daily',
        'Assign cause codes to budget variance at month-end',
      ],
      kpis: ['Close cycle days', 'DSO / DPO', 'Variance explained %'],
      reports: ['my-tasks', 'daily-productivity', 'personal-scorecard'],
    },
    compliance: {
      title: 'SOX Compliance Officer',
      responsibilities: [
        'Re-test key financial controls quarterly',
        'Audit revenue-recognition judgments (ASC 606)',
        'Verify transactions booked to correct period at month-end cutoff',
      ],
      kpis: ['Control pass rate', 'Rev-rec adjustments', 'Cutoff errors'],
      reports: ['audit-trail', 'regulatory-checklist', 'policy-violations', 'change-mgmt'],
    },
    'reporting-monitoring': {
      title: 'Finance Ops Monitor',
      responsibilities: [
        'Track close-cycle task completion during close',
        'Monitor variance-calc pipeline job SLAs',
        'Watch unusual vendor / employee transactions',
      ],
      kpis: ['On-time task %', 'Job SLA %', 'Fraud-signal precision'],
      reports: ['system-health', 'pipeline-status', 'anomaly-detection', 'scheduled-jobs'],
    },
    tester: {
      title: 'Finance QA Analyst',
      responsibilities: [
        'Execute test cases for close-cycle workflows, variance calc, and accrual flows',
        'Validate scenario-plan outputs against ground-truth spreadsheets',
        'Run regression suites after every chart-of-accounts or rule change',
        'Maintain SOX-aligned test evidence and sign-off artifacts',
      ],
      kpis: ['Defect escape rate', 'SOX regression pass rate', 'Mean time to detect regression'],
      reports: ['regression-test-coverage', 'defect-log', 'test-run-history', 'smoke-test-status'],
    },
  },

  procurement: {
    manager: {
      title: 'Category Manager',
      responsibilities: [
        'Run annual strategic sourcing events and re-award',
        'Track contract renewal pipeline 90 days out',
        'Score supplier financial / geo / ESG risk quarterly',
      ],
      kpis: ['Cost savings %', 'On-time renewals', 'Supplier risk index'],
      reports: ['exec-kpi', 'mbr', 'roi-tracker'],
    },
    'team-member': {
      title: 'Buyer',
      responsibilities: [
        'Resolve PO / GR / invoice 3-way match mismatches',
        'Complete KYC and banking onboarding for new vendors',
        'Tag off-contract spend back to catalog',
      ],
      kpis: ['Match rate %', 'Onboarding days', 'On-contract spend %'],
      reports: ['my-tasks', 'daily-productivity', 'assigned-incidents'],
    },
    compliance: {
      title: 'Procurement Compliance Officer',
      responsibilities: [
        'Collect annual buyer conflict-of-interest attestations',
        'Confirm anti-corruption (FCPA) training completion',
        'Review awarded RFXs for single-bid / off-process risk',
      ],
      kpis: ['Late attestations', 'Completion %', 'Single-bid awards %'],
      reports: ['audit-trail', 'regulatory-checklist', 'policy-violations'],
    },
    'reporting-monitoring': {
      title: 'Procurement Ops Monitor',
      responsibilities: [
        'Maintain real-time spend dashboard feeds',
        'Watch contracts coming due for renewal alerts',
        'Compare promised vs realized sourcing savings monthly',
      ],
      kpis: ['Feed freshness', 'Missed renewals', 'Realization %'],
      reports: ['system-health', 'pipeline-status', 'scheduled-jobs'],
    },
    tester: {
      title: 'Procurement QA Analyst',
      responsibilities: [
        'Design 3-way-match test cases (PO/GR/invoice) covering exceptions and tolerance bands',
        'Validate vendor-onboarding KYC flow against sanctions-hit fixtures',
        'Run regression suites for contract-renewal alerting after rule change',
        'Automate smoke tests for spend-analytics ingest',
      ],
      kpis: ['Defect escape rate', 'Match-test pass rate', 'Automation coverage %'],
      reports: ['regression-test-coverage', 'defect-log', 'test-run-history', 'automation-coverage'],
    },
  },

  quality: {
    manager: {
      title: 'Quality Manager',
      responsibilities: [
        'Govern CAPA pipeline and closure timelines',
        'Rank suppliers by NCR and drive improvement',
        'Run quarterly recall-readiness drills',
        'Pareto customer complaints into product design',
      ],
      kpis: ['CAPA on-time %', 'PPM defects', 'Recall response time', 'Complaints per 1k units'],
      reports: ['exec-kpi', 'mbr', 'team-scorecard', 'roi-tracker'],
    },
    'team-member': {
      title: 'QA Inspector',
      responsibilities: [
        'Record batch inspection pass/fail with evidence',
        'File non-conformance reports with root-cause hypothesis',
        'Verify instrument calibration status daily',
      ],
      kpis: ['NCR rate', 'First-pass yield', 'OOC rate'],
      reports: ['my-tasks', 'daily-productivity', 'assigned-incidents'],
    },
    compliance: {
      title: 'Regulatory Compliance Officer',
      responsibilities: [
        'Run pre-audit mock walkthroughs for FDA / ISO readiness',
        'Simulate recall trace-forward / trace-back quarterly',
        'Verify CAPAs meet regulator-required close-out',
      ],
      kpis: ['Audit findings', 'Trace completion time', 'CAPAs overdue'],
      reports: ['audit-trail', 'regulatory-checklist', 'policy-violations', 'change-mgmt'],
    },
    'reporting-monitoring': {
      title: 'Quality Analytics Ops',
      responsibilities: [
        'Alert on NCR spikes by SKU / plant',
        'Ensure complaint feeds ingest cleanly',
        'Monitor LIMS lab-result pipeline',
      ],
      kpis: ['Spike MTTD', 'Feed lag', 'Pipeline uptime'],
      reports: ['system-health', 'pipeline-status', 'anomaly-detection'],
    },
    tester: {
      title: 'Quality Systems QA',
      responsibilities: [
        'Execute CAPA-workflow test scenarios — open, review, close, and audit trail',
        'Validate LIMS ingestion against known-good and known-bad lab fixtures',
        'Run recall-readiness drill regression — trace-back / trace-forward coverage',
        'File defects on NCR classification and route them to resolution',
      ],
      kpis: ['Defect escape rate', 'CAPA-flow regression pass rate', 'Automation coverage %'],
      reports: ['regression-test-coverage', 'defect-log', 'test-run-history', 'smoke-test-status'],
    },
  },

  governance: {
    manager: {
      title: 'AI Governance Lead',
      responsibilities: [
        'Refresh policies based on regulatory changes quarterly',
        'Update likelihood × impact on every risk in the register',
        'Chair bi-weekly model-governance board for deploy/retire',
        'Track audit finding remediation to completion',
      ],
      kpis: ['Policies up-to-date %', 'Open risk exposure', 'Approved model coverage', 'Findings > SLA'],
      reports: ['exec-kpi', 'mbr', 'sla-summary', 'roi-tracker'],
    },
    'team-member': {
      title: 'Governance Analyst',
      responsibilities: [
        'Run quarterly access-review attestations for user permissions',
        'Flag feeds breaching freshness SLA',
        'File incident reports for security or compliance events',
      ],
      kpis: ['Access review completion %', 'Feed SLA %', 'Incident-report completeness'],
      reports: ['my-tasks', 'daily-productivity', 'assigned-incidents'],
    },
    compliance: {
      title: 'Model Risk Officer',
      responsibilities: [
        'Update model-risk register and tier each model',
        'Audit decisions for captured AI explainability rationale',
        'Verify LLM and third-party model licenses are current',
      ],
      kpis: ['Unregistered models in prod', 'Unexplained decisions', 'License exceptions'],
      reports: ['audit-trail', 'regulatory-checklist', 'model-fairness', 'change-mgmt'],
    },
    'reporting-monitoring': {
      title: 'Governance Ops Monitor',
      responsibilities: [
        'Maintain data-quality scorecards per domain',
        'Operate centralized view of all production models',
        'Monitor key control KPIs for breaches',
      ],
      kpis: ['DQ score trend', 'Dashboard coverage', 'Control breaches'],
      reports: ['system-health', 'model-drift', 'pipeline-status', 'anomaly-detection'],
    },
    tester: {
      title: 'Governance Controls QA',
      responsibilities: [
        'Execute RBAC-boundary test matrix across every role × endpoint combination',
        'Validate AI decision logs for completeness (required fields, correlation IDs)',
        'Run regression suites for policy-violation detectors after rule change',
        'Maintain audit-trail fixture suites for SOC-2 / ISO readiness checks',
      ],
      kpis: ['Unauthorized-access caught', 'Decision-log completeness %', 'Defect escape rate'],
      reports: ['regression-test-coverage', 'defect-log', 'test-run-history', 'automation-coverage'],
    },
  },

  telehealth: {
    manager: {
      title: 'Telehealth Clinical Lead',
      responsibilities: [
        'Review AI vs clinician triage agreement and tune thresholds',
        'Rebalance clinician panel caseloads monthly',
        'Update care pathway protocols from outcome data',
        'Run monthly HIPAA audit on session logs and access controls',
      ],
      kpis: ['Triage accuracy', 'Wait time', 'Outcome compliance', 'Audit finding rate'],
      reports: ['exec-kpi', 'mbr', 'team-scorecard', 'sla-summary'],
    },
    'team-member': {
      title: 'Telehealth Clinician',
      responsibilities: [
        'Complete structured encounter notes in the EHR',
        'Accept or reject AI recommendations with rationale',
        'Close loop on abnormal results and missed appointments',
      ],
      kpis: ['Note completeness', 'Suggestion acceptance %', 'Follow-up rate'],
      reports: ['my-tasks', 'daily-productivity', 'personal-scorecard'],
    },
    compliance: {
      title: 'HIPAA Compliance Officer',
      responsibilities: [
        'Review PHI access logs for unusual patterns weekly',
        'Verify clinician state licensure for telemedicine',
        'Run clinician oversight review of AI triage decisions',
      ],
      kpis: ['Unauthorized-access rate', 'Expired-license events', 'Discordant decisions reviewed'],
      reports: ['audit-trail', 'regulatory-checklist', 'policy-violations', 'model-fairness', 'pii-access'],
    },
    'reporting-monitoring': {
      title: 'Telehealth Platform Ops',
      responsibilities: [
        'Watch EHR API / HL7 / FHIR feed health',
        'Track AI vs clinician agreement trend',
        'Monitor video and audio session quality metrics',
      ],
      kpis: ['Feed uptime', 'Agreement trend', 'Call-quality score'],
      reports: ['system-health', 'model-drift', 'pipeline-status', 'api-latency'],
    },
    tester: {
      title: 'Telehealth Clinical QA',
      responsibilities: [
        'Validate AI triage recommendations against clinician-adjudicated golden set',
        'Execute EHR/FHIR integration test suites covering bad-data and timeout cases',
        'Run regression suites for triage-AI model after prompt/threshold change',
        'Maintain de-identified patient fixtures for deterministic e2e testing',
      ],
      kpis: ['Triage regression pass rate', 'Defect escape rate', 'Mean time to detect regression'],
      reports: ['regression-test-coverage', 'defect-log', 'test-run-history', 'smoke-test-status'],
    },
  },
};

export function getRolesForDept(deptId) {
  return rolesByDept[deptId] || {};
}
