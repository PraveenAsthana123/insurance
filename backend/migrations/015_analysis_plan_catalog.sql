-- 015_analysis_plan_catalog.sql — AI Assurance Frameworks Catalog
--
-- Persists 11 generic AI assurance frameworks (Reliable / Trustworthy /
-- Safe / Accountable / Auditable / Lifecycle / Monitoring-Drift /
-- Sustainable / Responsible-GenAI / Debug / Portability) — each with
-- ~18 standard analysis modules covering: core question, what is
-- analyzed, output artifacts.
--
-- Per operator directive (2026-06-01): ignore domain-specific (EEG)
-- content; focus on frameworks REUSABLE across this project's 19
-- departments. Per-department applicability mapping is a follow-up
-- migration (see README in docs/ai_assurance/).
--
-- Schema is FLAT with rich JSONB details so adding a new framework
-- never requires schema changes. Companion folder docs/ai_assurance/
-- holds the human-readable framework summaries + per-department
-- mapping (later).

CREATE TABLE IF NOT EXISTS analysis_phase (
    id                SMALLINT PRIMARY KEY,
    code              VARCHAR(60) NOT NULL UNIQUE,
    name              TEXT NOT NULL,
    answers_question  TEXT,
    owner             TEXT,
    family            VARCHAR(40) NOT NULL DEFAULT 'ai_assurance',
    -- 'ai_assurance' (generic) | 'ml_methodology' | 'governance'
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analysis_module (
    id            SERIAL PRIMARY KEY,
    phase_id      SMALLINT NOT NULL REFERENCES analysis_phase(id),
    seq           SMALLINT NOT NULL,
    slug          VARCHAR(140) NOT NULL UNIQUE,
    name          TEXT NOT NULL,
    core_question TEXT,
    -- 4-column framework: what_analyzed + outputs go into details JSONB
    -- so adding a 5th column (e.g., "responsible_role") doesn't require
    -- a schema migration.
    details       JSONB NOT NULL DEFAULT '{}'::JSONB,
    status        VARCHAR(40) NOT NULL DEFAULT 'spec',
    tags          TEXT[] NOT NULL DEFAULT '{}',
    UNIQUE (phase_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_analysis_module_phase  ON analysis_module(phase_id);
CREATE INDEX IF NOT EXISTS idx_analysis_module_status ON analysis_module(status);

-- ============================================================================
-- 11 frameworks
-- ============================================================================

INSERT INTO analysis_phase (id, code, name, answers_question, owner, family) VALUES
    (101, 'reliable_ai',         'Reliable AI',                'Does the AI deliver consistent, available, predictable behavior?',                          'SRE / AI Platform',          'ai_assurance'),
    (102, 'trustworthy_ai',      'Trustworthy AI',             'Can stakeholders trust outputs, decisions, and limits?',                                   'RAI Office',                 'ai_assurance'),
    (103, 'safe_ai',             'Safe AI',                    'Can the AI cause harm — and if so, can harm be prevented or contained?',                  'Safety Engineering',         'ai_assurance'),
    (104, 'accountable_ai',      'Accountable AI',             'Who is responsible when things go wrong, and how is that responsibility enforced?',       'Governance / Legal',         'ai_assurance'),
    (105, 'auditable_ai',        'Auditable AI',               'Can every decision, dataset, and update be reconstructed and verified later?',            'Audit / Compliance',         'ai_assurance'),
    (106, 'lifecycle_management','Model Lifecycle Management', 'Is the model governed end-to-end — from problem definition through retirement?',          'MLOps',                      'ai_assurance'),
    (107, 'monitoring_drift',    'Monitoring & Drift Detection','Are degradations and drifts detected, attributed, and acted upon in production?',        'MLOps / SRE',                'ai_assurance'),
    (108, 'sustainable_ai',      'Sustainable / Green AI',     'What is the energy, carbon, and resource footprint — and is it controlled?',              'FinOps / Sustainability',    'ai_assurance'),
    (109, 'responsible_genai',   'Responsible Generative AI',  'Is generation safe, grounded, non-harmful, IP-respecting, and properly disclosed?',       'RAI Office / Content Safety','ai_assurance'),
    (110, 'debug_ai',            'Debug AI',                   'When models or pipelines fail, can we identify, attribute, and fix the root cause?',     'ML Engineering',             'ai_assurance'),
    (111, 'portability_ai',      'Portability AI',             'Can the model move across environments, domains, and infrastructure without breaking?',  'AI Architecture',            'ai_assurance')
ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        answers_question = EXCLUDED.answers_question,
        owner = EXCLUDED.owner,
        family = EXCLUDED.family,
        updated_at = NOW();

-- ============================================================================
-- Framework 101 — Reliable AI (18 modules)
-- ============================================================================
INSERT INTO analysis_module (phase_id, seq, slug, name, core_question, details) VALUES
    (101,1, 'rel_definition_scope',      'Reliability Definition & SLA Analysis',     'What does reliable mean for this AI?',                          '{"analyzed":["Business criticality","Failure tolerance","Expected availability","SLAs/SLOs"],"output":"Reliability definition + SLA document"}'::jsonb),
    (101,2, 'rel_correctness_consistency','Correctness Consistency Analysis',         'Is correctness consistent across runs?',                        '{"analyzed":["Repeated inference tests","Seed/temperature variance"],"output":"Consistency score report"}'::jsonb),
    (101,3, 'rel_robustness_inputs',     'Robustness to Input Variation',             'Does behavior hold under small changes?',                       '{"analyzed":["Noise injection","Paraphrase/perturbation tests"],"output":"Robustness evaluation report"}'::jsonb),
    (101,4, 'rel_calibration_confidence','Calibration & Confidence Reliability',      'Can confidence be trusted?',                                    '{"analyzed":["Calibration curves","Over/under-confidence analysis","Abstention behavior"],"output":"Calibration reliability report"}'::jsonb),
    (101,5, 'rel_failure_mode_coverage', 'Failure Mode Coverage Analysis',            'Are known failures anticipated?',                               '{"analyzed":["Failure taxonomy","Edge-case handling"],"output":"Failure coverage matrix"}'::jsonb),
    (101,6, 'rel_graceful_degradation',  'Graceful Degradation Analysis',             'Does the system fail safely?',                                  '{"analyzed":["Fallback logic","Partial service behavior"],"output":"Degradation & fallback plan"}'::jsonb),
    (101,7, 'rel_dependency_reliability','Dependency Reliability Analysis',           'Are upstream/downstream systems reliable?',                     '{"analyzed":["Tool/API health","Retriever availability","Timeouts & retries"],"output":"Dependency reliability map"}'::jsonb),
    (101,8, 'rel_latency_throughput',    'Latency & Throughput Stability',            'Is performance stable under load?',                             '{"analyzed":["Load testing","Tail-latency analysis"],"output":"Performance stability report"}'::jsonb),
    (101,9, 'rel_resource_exhaustion',   'Resource Exhaustion Analysis',              'Does it fail under resource pressure?',                         '{"analyzed":["Memory/CPU/GPU stress tests","Rate-limit behavior"],"output":"Resource resilience report"}'::jsonb),
    (101,10,'rel_drift_temporal',        'Drift & Temporal Reliability Analysis',     'Does reliability decay over time?',                             '{"analyzed":["Data/prediction drift","Knowledge staleness"],"output":"Reliability drift report"}'::jsonb),
    (101,11,'rel_monitoring_signal',     'Monitoring Signal Reliability',             'Are failures detected early?',                                  '{"analyzed":["Alert precision/recall","Detection latency"],"output":"Monitoring quality report"}'::jsonb),
    (101,12,'rel_incident_recovery',     'Incident Frequency & Recovery Analysis',    'How often and how fast do we recover?',                         '{"analyzed":["MTBF/MTTR","Incident trends"],"output":"Incident metrics dashboard"}'::jsonb),
    (101,13,'rel_regression_protection', 'Regression Protection Analysis',            'Do updates break reliability?',                                 '{"analyzed":["Canarying","A/B & rollback tests"],"output":"Regression test report"}'::jsonb),
    (101,14,'rel_hitl_reliability',      'Human-in-the-Loop Reliability',             'Do humans improve reliability?',                                '{"analyzed":["Override success rate","Automation bias"],"output":"HITL reliability delta"}'::jsonb),
    (101,15,'rel_data_pipeline',         'Data Pipeline Reliability',                 'Is data delivery dependable?',                                  '{"analyzed":["Ingestion failures","Schema drift"],"output":"Data pipeline health report"}'::jsonb),
    (101,16,'rel_security_abuse',        'Security & Abuse Resilience',               'Does misuse reduce reliability?',                               '{"analyzed":["Prompt abuse","Rate abuse","Injection impact"],"output":"Abuse-resilience assessment"}'::jsonb),
    (101,17,'rel_ops_runbooks',          'Operational Readiness & Runbooks',          'Can teams operate it reliably?',                                '{"analyzed":["On-call readiness","Runbooks & SOPs"],"output":"Ops readiness checklist"}'::jsonb),
    (101,18,'rel_governance',            'Reliability Governance & Accountability',   'Who owns reliability and enforces it?',                         '{"analyzed":["Ownership & RACI","Go/No-Go gates","Review cadence"],"output":"Reliability governance policy + audit trail"}'::jsonb)
ON CONFLICT (phase_id, seq) DO NOTHING;

-- ============================================================================
-- Framework 102 — Trustworthy AI (18 modules)
-- ============================================================================
INSERT INTO analysis_module (phase_id, seq, slug, name, core_question, details) VALUES
    (102,1, 'trust_definition_scope',  'Trustworthiness Definition & Scope Analysis','What does trustworthy mean in this context?',                  '{"analyzed":["Stakeholder expectations","Risk tolerance","Decision criticality"],"output":"Trustworthiness scope + context definition"}'::jsonb),
    (102,2, 'trust_correctness_validity','Correctness & Validity Analysis',          'Are outputs actually correct and valid?',                      '{"analyzed":["Accuracy & error rates","Task validity","Ground truth quality"],"output":"Validity & correctness report"}'::jsonb),
    (102,3, 'trust_robustness',        'Robustness & Reliability Analysis',          'Does it behave consistently under variation?',                 '{"analyzed":["Stress tests","Noise robustness","Failure consistency"],"output":"Robustness & reliability report"}'::jsonb),
    (102,4, 'trust_safety_harm',       'Safety & Harm Prevention Analysis',          'Does it prevent or contain harm?',                             '{"analyzed":["Hazard analysis","Safe completion","Fail-safe mechanisms"],"output":"Safety assurance evidence"}'::jsonb),
    (102,5, 'trust_fairness',          'Fairness & Non-Discrimination Analysis',     'Are outcomes equitable and justifiable?',                      '{"analyzed":["Group & individual fairness","Error burden distribution"],"output":"Fairness assessment report"}'::jsonb),
    (102,6, 'trust_explainability',    'Explainability & Transparency Analysis',     'Can decisions be understood and inspected?',                   '{"analyzed":["Local/global explanations","Explanation stability","Transparency limits"],"output":"Explainability artifact set"}'::jsonb),
    (102,7, 'trust_interpretability',  'Interpretability by Design Analysis',        'Is logic intrinsically understandable?',                       '{"analyzed":["Model transparency","Simplicity & traceability"],"output":"Interpretable model documentation"}'::jsonb),
    (102,8, 'trust_accountability',    'Accountability & Ownership Analysis',        'Who is responsible when things go wrong?',                     '{"analyzed":["Named owners","RACI mapping","Enforcement authority"],"output":"Accountability register"}'::jsonb),
    (102,9, 'trust_auditability',      'Auditability & Traceability Analysis',       'Can decisions be reconstructed later?',                        '{"analyzed":["Decision logs","Lineage & versioning"],"output":"Audit trail & evidence pack"}'::jsonb),
    (102,10,'trust_human_oversight',   'Human Oversight & Control Analysis',         'Can humans intervene effectively?',                            '{"analyzed":["HITL points","Override authority","Escalation rules"],"output":"Human-oversight workflow"}'::jsonb),
    (102,11,'trust_drift_monitoring',  'Monitoring & Drift Trust Analysis',          'Is trust maintained over time?',                               '{"analyzed":["Performance drift","Fairness drift","Behavior drift"],"output":"Drift & monitoring report"}'::jsonb),
    (102,12,'trust_calibration',       'Calibration & Confidence Trust Analysis',    'Does confidence match correctness?',                           '{"analyzed":["Over/under-confidence","Abstention behavior"],"output":"Calibration & confidence report"}'::jsonb),
    (102,13,'trust_misuse_resistance', 'Misuse & Abuse Resistance Analysis',         'Can the system be exploited?',                                 '{"analyzed":["Adversarial inputs","Prompt abuse","Access misuse"],"output":"Misuse resistance assessment"}'::jsonb),
    (102,14,'trust_data_privacy',      'Data Responsibility & Privacy Analysis',     'Is data handled responsibly?',                                 '{"analyzed":["Consent & provenance","PII leakage risk"],"output":"Data responsibility audit"}'::jsonb),
    (102,15,'trust_lifecycle',         'Lifecycle & Change Management Trust',        'Is trust preserved across updates?',                           '{"analyzed":["Version control","Regression protection"],"output":"Lifecycle trust record"}'::jsonb),
    (102,16,'trust_transparency_users','Transparency to Users & Stakeholders',       'Are limits and risks communicated?',                           '{"analyzed":["Disclosures","Usage constraints"],"output":"Trust disclosure statement"}'::jsonb),
    (102,17,'trust_regulatory',        'Regulatory & Societal Alignment Analysis',   'Does it meet external expectations?',                          '{"analyzed":["Legal compliance","Ethical norms"],"output":"Regulatory alignment report"}'::jsonb),
    (102,18,'trust_governance',        'Trustworthy AI Governance & Enforcement',    'Who enforces trustworthiness standards?',                      '{"analyzed":["Governance bodies","Approval gates","Audit cadence"],"output":"Trustworthy AI governance policy + enforcement records"}'::jsonb)
ON CONFLICT (phase_id, seq) DO NOTHING;

-- ============================================================================
-- Framework 103 — Safe AI (18 modules)
-- ============================================================================
INSERT INTO analysis_module (phase_id, seq, slug, name, core_question, details) VALUES
    (103,1, 'safe_definition_risk',    'Safety Definition & Risk Scope Analysis',    'What does safe mean for this AI system?',                       '{"analyzed":["Harm categories (physical, psychological, financial, social)","Severity & reversibility","Intended vs unintended use"],"output":"Safety scope + risk classification"}'::jsonb),
    (103,2, 'safe_usecase_appropriate','Use-Case Safety Appropriateness Analysis',   'Should AI be used here at all?',                                '{"analyzed":["Automation risk","Human vs AI control","Failure tolerance"],"output":"Use-case safety justification"}'::jsonb),
    (103,3, 'safe_hazard_id',          'Hazard Identification & Risk Enumeration',   'What can go wrong?',                                            '{"analyzed":["Known hazards","Unknown/novel risks","Worst-case scenarios"],"output":"Hazard register + risk taxonomy"}'::jsonb),
    (103,4, 'safe_input',              'Input Safety & Misuse Analysis',             'Can inputs cause unsafe behavior?',                             '{"analyzed":["Adversarial prompts","Injection attacks","Unsafe data patterns"],"output":"Input safety test report"}'::jsonb),
    (103,5, 'safe_output_harm',        'Output Safety & Harm Prevention Analysis',   'Can outputs cause harm?',                                       '{"analyzed":["Harmful advice","Misinformation","Abuse facilitation"],"output":"Output safety assessment"}'::jsonb),
    (103,6, 'safe_refusal',            'Safe Completion & Refusal Analysis',         'Does the system refuse correctly?',                             '{"analyzed":["Refusal triggers","Tone & alternatives","Boundary consistency"],"output":"Refusal quality report"}'::jsonb),
    (103,7, 'safe_bias_harm',          'Bias-Related Safety Analysis',               'Can bias lead to harm?',                                        '{"analyzed":["Discriminatory outcomes","Stereotype amplification","Group-specific risk"],"output":"Bias-safety risk report"}'::jsonb),
    (103,8, 'safe_over_reliance',      'Over-Reliance & Automation Bias Analysis',   'Will users trust it too much?',                                 '{"analyzed":["Confidence inflation","User override behavior","Decision delegation risk"],"output":"Automation bias assessment"}'::jsonb),
    (103,9, 'safe_uncertainty',        'Uncertainty & Abstention Safety Analysis',   'Does the system know when not to answer?',                      '{"analyzed":["Confidence calibration","Abstention thresholds","Deferral logic"],"output":"Uncertainty handling policy"}'::jsonb),
    (103,10,'safe_edge_ood',           'Safety in Edge & OOD Conditions',            'Is it safe outside normal conditions?',                         '{"analyzed":["OOD detection","Edge-case stress tests"],"output":"OOD safety report"}'::jsonb),
    (103,11,'safe_dependency',         'System & Dependency Safety Analysis',        'Can upstream/downstream failures cause harm?',                  '{"analyzed":["Tool failures","Retriever errors","API instability"],"output":"System safety dependency map"}'::jsonb),
    (103,12,'safe_hitl_controls',      'Human-in-the-Loop Safety Controls',          'Where must humans intervene?',                                  '{"analyzed":["Mandatory review thresholds","Override authority","Escalation rules"],"output":"HITL safety workflow"}'::jsonb),
    (103,13,'safe_monitoring',         'Monitoring & Safety Signal Detection',       'Are safety issues detected early?',                             '{"analyzed":["Harm indicators","Alert sensitivity","Latency"],"output":"Safety monitoring dashboard"}'::jsonb),
    (103,14,'safe_incident_response',  'Incident Response & Containment Analysis',   'What happens when harm occurs?',                                '{"analyzed":["Kill-switch readiness","Output takedown","User notification"],"output":"Safety incident response plan"}'::jsonb),
    (103,15,'safe_recovery',           'Recovery & Harm Mitigation Analysis',        'How is harm reduced after failure?',                            '{"analyzed":["Rollback procedures","Correction mechanisms","Compensation paths"],"output":"Harm mitigation report"}'::jsonb),
    (103,16,'safe_documentation',      'Safety Documentation & Communication',       'Are safety limits clearly communicated?',                       '{"analyzed":["Warnings","Usage constraints","Known limitations"],"output":"Safety documentation pack"}'::jsonb),
    (103,17,'safe_regulatory',         'Regulatory & Safety Standard Alignment',     'Does the system meet safety laws/standards?',                   '{"analyzed":["Sector regulations","Safety guidelines","Certification needs"],"output":"Safety compliance report"}'::jsonb),
    (103,18,'safe_governance',         'Safety Governance & Accountability',         'Who owns safety and enforces it?',                              '{"analyzed":["Safety owner & RACI","Approval gates","Audit cadence"],"output":"Safety governance policy + audit trail"}'::jsonb)
ON CONFLICT (phase_id, seq) DO NOTHING;

-- ============================================================================
-- Framework 104 — Accountable AI (18 modules)
-- ============================================================================
INSERT INTO analysis_module (phase_id, seq, slug, name, core_question, details) VALUES
    (104,1, 'acc_definition_scope',    'Accountability Definition & Scope Analysis', 'What does accountability mean for this AI?',                    '{"analyzed":["Legal vs organizational accountability","Decision vs recommendation scope","Impact severity"],"output":"Accountability scope + responsibility boundaries"}'::jsonb),
    (104,2, 'acc_ownership_id',        'Ownership Identification Analysis',           'Who owns the AI system end-to-end?',                            '{"analyzed":["Product owner","Model owner","Data owner","Risk owner"],"output":"Named ownership register"}'::jsonb),
    (104,3, 'acc_decision_responsibility','Decision Responsibility Mapping',          'Who is responsible for each decision type?',                    '{"analyzed":["AI vs human decisions","Escalation points","Override authority"],"output":"Decision responsibility matrix"}'::jsonb),
    (104,4, 'acc_raci_mapping',        'RACI Mapping Analysis',                       'Who is Responsible/Accountable/Consulted/Informed?',            '{"analyzed":["Role clarity across lifecycle","Conflict resolution paths"],"output":"RACI chart"}'::jsonb),
    (104,5, 'acc_lifecycle',           'Accountability Across Lifecycle Analysis',    'Who is accountable at each lifecycle stage?',                   '{"analyzed":["Design","Training","Deployment","Monitoring","Retirement"],"output":"Lifecycle accountability map"}'::jsonb),
    (104,6, 'acc_hitl',                'Human-in-the-Loop Accountability Analysis',   'When humans intervene, who is accountable?',                    '{"analyzed":["Override decisions","Review thresholds","Approval authority"],"output":"HITL accountability policy"}'::jsonb),
    (104,7, 'acc_error_harm',          'Error & Harm Responsibility Analysis',        'Who is accountable when harm occurs?',                          '{"analyzed":["Error attribution","Harm severity","Responsibility assignment"],"output":"Harm accountability report"}'::jsonb),
    (104,8, 'acc_incident_escalation', 'Incident Escalation Accountability',          'Who responds to incidents and how fast?',                       '{"analyzed":["Escalation paths","SLAs","Authority to act"],"output":"Incident escalation SOP"}'::jsonb),
    (104,9, 'acc_explainability_resp', 'Explainability Responsibility Analysis',      'Who must explain decisions to users/regulators?',               '{"analyzed":["Explanation ownership","Communication responsibility"],"output":"Explanation responsibility assignment"}'::jsonb),
    (104,10,'acc_fairness',            'Fairness Accountability Analysis',            'Who owns fairness outcomes?',                                   '{"analyzed":["Fairness metrics ownership","Mitigation approval"],"output":"Fairness accountability register"}'::jsonb),
    (104,11,'acc_monitoring_drift',    'Monitoring & Drift Accountability Analysis',  'Who acts when drift is detected?',                              '{"analyzed":["Alert ownership","Response authority"],"output":"Monitoring accountability plan"}'::jsonb),
    (104,12,'acc_compliance',          'Compliance Accountability Analysis',          'Who ensures legal & policy compliance?',                        '{"analyzed":["Regulatory mapping","Compliance sign-off"],"output":"Compliance accountability record"}'::jsonb),
    (104,13,'acc_vendor_3rdparty',     'Vendor & Third-Party Accountability',         'Who is accountable for external components?',                   '{"analyzed":["Cloud/model vendors","SLAs","Liability clauses"],"output":"Vendor accountability agreement"}'::jsonb),
    (104,14,'acc_transparency',        'Transparency & Disclosure Accountability',    'Who decides what is disclosed and to whom?',                    '{"analyzed":["User disclosure rules","Public transparency"],"output":"Disclosure responsibility policy"}'::jsonb),
    (104,15,'acc_redress',             'Contestability & Redress Accountability',     'Who handles user appeals and corrections?',                     '{"analyzed":["Appeal review authority","Correction rights"],"output":"Redress & appeal SOP"}'::jsonb),
    (104,16,'acc_enforcement',         'Accountability Enforcement Mechanisms',       'How is accountability enforced?',                               '{"analyzed":["Approval gates","Kill-switch authority","Sanctions"],"output":"Enforcement & control policy"}'::jsonb),
    (104,17,'acc_documentation',       'Documentation & Evidence Accountability',     'Who maintains accountability evidence?',                        '{"analyzed":["Logs","Reports","Audit artifacts"],"output":"Accountability evidence index"}'::jsonb),
    (104,18,'acc_governance',          'Accountability Governance & Review',          'Who oversees accountability long-term?',                        '{"analyzed":["Governance bodies","Review cadence","Continuous improvement"],"output":"Accountability governance charter + review records"}'::jsonb)
ON CONFLICT (phase_id, seq) DO NOTHING;

-- ============================================================================
-- Framework 105 — Auditable AI (18 modules)
-- ============================================================================
INSERT INTO analysis_module (phase_id, seq, slug, name, core_question, details) VALUES
    (105,1, 'audit_scope_materiality',  'Audit Scope & Materiality Definition',      'What must be auditable and why?',                                '{"analyzed":["Regulatory vs internal audit scope","Model criticality","Risk materiality"],"output":"Audit scope + materiality assessment"}'::jsonb),
    (105,2, 'audit_decision_trace',     'Decision Traceability Analysis',             'Can every decision be reconstructed?',                          '{"analyzed":["Input→feature→model→output trace","Timestamping","Deterministic replay"],"output":"End-to-end decision trace logs"}'::jsonb),
    (105,3, 'audit_data_lineage',       'Data Lineage & Provenance Auditability',    'Where did the data come from?',                                  '{"analyzed":["Source systems","Consent & rights","Dataset versions"],"output":"Data lineage diagrams + provenance records"}'::jsonb),
    (105,4, 'audit_feature_transform',  'Feature & Transformation Auditability',     'How were inputs transformed?',                                   '{"analyzed":["Feature definitions","Preprocessing logic","Versioned pipelines"],"output":"Feature documentation + transformation logs"}'::jsonb),
    (105,5, 'audit_model_version',      'Model Versioning & Change Auditability',     'What changed and when?',                                        '{"analyzed":["Model versions","Hyperparameters","Prompt/config changes"],"output":"Model changelog + version registry"}'::jsonb),
    (105,6, 'audit_training_repro',     'Training & Experiment Reproducibility',     'Can results be reproduced?',                                     '{"analyzed":["Code versioning","Seeds","Environment capture"],"output":"Reproducibility report"}'::jsonb),
    (105,7, 'audit_validation_approval','Validation & Approval Auditability',         'Who approved this model?',                                      '{"analyzed":["Review records","Sign-offs","Go/No-Go gates"],"output":"Approval & sign-off logs"}'::jsonb),
    (105,8, 'audit_explainability',     'Explainability Artifact Auditability',       'Are explanations stored and verifiable?',                       '{"analyzed":["XAI methods used","Explanation persistence","Scope & limits"],"output":"Stored explanation artifacts"}'::jsonb),
    (105,9, 'audit_fairness_evidence',  'Fairness & Bias Evidence Auditability',     'Can fairness claims be proven?',                                 '{"analyzed":["Test methods","Metrics by group","Mitigation records"],"output":"Fairness audit report"}'::jsonb),
    (105,10,'audit_performance',        'Performance & Accuracy Auditability',       'Is performance evidence traceable?',                             '{"analyzed":["Evaluation datasets","Metric calculations","Threshold logic"],"output":"Performance evidence pack"}'::jsonb),
    (105,11,'audit_monitoring',         'Monitoring & Drift Auditability',           'Are post-deployment changes recorded?',                          '{"analyzed":["Drift alerts","Monitoring logs","Response actions"],"output":"Monitoring audit trail"}'::jsonb),
    (105,12,'audit_incident_override',  'Incident & Override Auditability',          'Are failures and overrides recorded?',                           '{"analyzed":["Incident tickets","Human overrides","Remediation actions"],"output":"Incident & override logs"}'::jsonb),
    (105,13,'audit_hitl',               'Human-in-the-Loop Auditability',            'Are human decisions traceable?',                                 '{"analyzed":["Reviewer identity","Rationale capture","Timing"],"output":"HITL decision records"}'::jsonb),
    (105,14,'audit_security_access',    'Security & Access Auditability',             'Who accessed or modified the system?',                          '{"analyzed":["Access controls","Privileged actions","Key usage"],"output":"Access & security logs"}'::jsonb),
    (105,15,'audit_compliance_evidence','Compliance Evidence Management',            'Is compliance demonstrable on demand?',                          '{"analyzed":["Regulatory mappings","Evidence retention","Audit readiness"],"output":"Compliance evidence index"}'::jsonb),
    (105,16,'audit_documentation',      'Documentation Completeness Auditability',    'Is documentation sufficient and current?',                      '{"analyzed":["Model cards","Limitations","Usage guidance"],"output":"Documentation completeness checklist"}'::jsonb),
    (105,17,'audit_retention',          'Retention & Immutability Analysis',          'Are records tamper-resistant?',                                 '{"analyzed":["Log immutability","Retention policies","Legal hold"],"output":"Retention & immutability policy"}'::jsonb),
    (105,18,'audit_governance',         'Audit Governance & Accountability',          'Who owns audits and enforces findings?',                        '{"analyzed":["Audit ownership","Escalation paths","Remediation enforcement"],"output":"Audit governance policy + audit resolution log"}'::jsonb)
ON CONFLICT (phase_id, seq) DO NOTHING;

-- ============================================================================
-- Framework 106-111 — bulk seed (Lifecycle / Monitoring-Drift / Sustainable /
-- Responsible GenAI / Debug / Portability) — compact rows; full details
-- captured in docs/ai_assurance/<framework>.md files for human reading.
-- ============================================================================

INSERT INTO analysis_module (phase_id, seq, slug, name, core_question, details) VALUES
    (106,1,'lcm_scope_ownership','Lifecycle Scope & Ownership Definition','Who owns the model across its life?','{"analyzed":["Model purpose & criticality","Named owners (product/data/risk)","RACI across stages"],"output":"Lifecycle ownership map + model registry entry"}'::jsonb),
    (106,2,'lcm_usecase_control','Use-Case & Problem Definition Control','Is the problem well-defined and valid?','{"analyzed":["Business objective clarity","Automation suitability","Success criteria"],"output":"Use-case approval document"}'::jsonb),
    (106,3,'lcm_data_sourcing','Data Sourcing & Governance Management','Is data managed responsibly over time?','{"analyzed":["Data provenance","Consent & access rights","Versioned datasets"],"output":"Data lineage records + dataset version logs"}'::jsonb),
    (106,4,'lcm_feature_lifecycle','Feature Engineering Lifecycle Control','Are features stable and traceable?','{"analyzed":["Feature definitions","Feature drift risk","Reusability"],"output":"Feature store metadata + feature change log"}'::jsonb),
    (106,5,'lcm_experiment_tracking','Model Development & Experiment Tracking','Are experiments reproducible?','{"analyzed":["Code versioning","Hyperparameters","Random seeds"],"output":"Experiment tracking records"}'::jsonb),
    (106,6,'lcm_selection_governance','Model Selection & Validation Governance','Why was this model chosen?','{"analyzed":["Benchmark comparisons","Risk-adjusted metrics","Reviewer sign-off"],"output":"Model selection justification"}'::jsonb),
    (106,7,'lcm_risk_validation','Fairness/Explainability/Risk Validation','Does the model meet AI assurance standards?','{"analyzed":["Fairness tests","XAI artifacts","Safety checks"],"output":"Pre-deployment risk assessment"}'::jsonb),
    (106,8,'lcm_deployment_readiness','Deployment Readiness & Release Control','Is the model safe to deploy?','{"analyzed":["Go/No-Go criteria","Canarying strategy","Rollback plan"],"output":"Deployment approval record"}'::jsonb),
    (106,9,'lcm_versioning','Versioning & Configuration Management','Can we track every model change?','{"analyzed":["Model versioning","Config & prompt changes","Dependency locks"],"output":"Version registry & changelog"}'::jsonb),
    (106,10,'lcm_runtime','Inference & Runtime Management','Is runtime behavior controlled?','{"analyzed":["Latency & cost limits","Resource allocation","Scaling behavior"],"output":"Runtime performance report"}'::jsonb),
    (106,11,'lcm_monitoring_drift','Monitoring & Drift Lifecycle Integration','Are changes detected over time?','{"analyzed":["Data/prediction drift","Performance decay","Alert thresholds"],"output":"Monitoring dashboard"}'::jsonb),
    (106,12,'lcm_incident_mgmt','Incident Management & Escalation','What happens when things go wrong?','{"analyzed":["Incident detection","Severity classification","Escalation paths"],"output":"Incident tickets & RCA"}'::jsonb),
    (106,13,'lcm_retraining','Retraining & Update Strategy','When and how is the model updated?','{"analyzed":["Retraining triggers","Data refresh cadence","Validation gates"],"output":"Retraining plan"}'::jsonb),
    (106,14,'lcm_regression','Regression & Backward Compatibility','Do updates break existing behavior?','{"analyzed":["A/B testing","Regression suites","Safety regression"],"output":"Regression test report"}'::jsonb),
    (106,15,'lcm_hitl','Human-in-the-Loop Lifecycle Control','Where do humans intervene over time?','{"analyzed":["Review thresholds","Override effectiveness"],"output":"HITL audit logs"}'::jsonb),
    (106,16,'lcm_compliance_audit','Compliance, Audit & Documentation','Is the lifecycle auditable?','{"analyzed":["Model cards","Audit trails","Evidence retention"],"output":"Compliance documentation pack"}'::jsonb),
    (106,17,'lcm_portability','Portability & Transfer Management','Can the model move safely?','{"analyzed":["Environment changes","Domain transfer checks"],"output":"Portability validation report"}'::jsonb),
    (106,18,'lcm_decommission','Decommissioning & Retirement Management','How is the model safely retired?','{"analyzed":["Sunset criteria","Data & access cleanup","Replacement plan"],"output":"Decommissioning record"}'::jsonb),

    -- Framework 107 — Monitoring & Drift Detection (18 modules)
    (107,1,'mon_scope_objective','Monitoring Scope & Objective Analysis','What must be monitored and why?','{"analyzed":["Business-critical outcomes","Safety/fairness/reliability signals","Detection vs diagnosis"],"output":"Monitoring scope + KPI ownership map"}'::jsonb),
    (107,2,'mon_input_drift','Input Data Drift Detection','Has the input distribution changed?','{"analyzed":["Feature distribution shift","Statistical distance (PSI, KS, JS)","Schema changes"],"output":"Input drift report + alert logs"}'::jsonb),
    (107,3,'mon_feature_drift','Feature-Level Drift Analysis','Which features are drifting?','{"analyzed":["Per-feature shift","Correlated drift","Missing feature emergence"],"output":"Feature drift heatmap"}'::jsonb),
    (107,4,'mon_embedding_drift','Embedding / Representation Drift','Has semantic meaning changed?','{"analyzed":["Embedding centroid shift","Cosine distance over time","Cluster movement"],"output":"Representation drift report"}'::jsonb),
    (107,5,'mon_concept_drift','Concept Drift (Target Drift)','Has the meaning of the target changed?','{"analyzed":["Label distribution shift","Outcome prevalence change","Ground-truth delay analysis"],"output":"Concept drift assessment"}'::jsonb),
    (107,6,'mon_prediction_drift','Prediction Distribution Drift','Are outputs changing abnormally?','{"analyzed":["Score distribution shift","Class frequency change","Confidence shift"],"output":"Output drift dashboard"}'::jsonb),
    (107,7,'mon_performance_drift','Performance Drift Analysis','Is accuracy degrading over time?','{"analyzed":["Rolling-window metrics","Slice-based degradation","Delayed labels"],"output":"Performance drift report"}'::jsonb),
    (107,8,'mon_calibration_drift','Calibration Drift Analysis','Is confidence becoming unreliable?','{"analyzed":["ECE over time","Overconfidence growth","Abstention drift"],"output":"Calibration drift report"}'::jsonb),
    (107,9,'mon_fairness_drift','Fairness Drift Analysis','Are disparities increasing?','{"analyzed":["Group metric deltas","Error redistribution","Intersectional drift"],"output":"Fairness drift report"}'::jsonb),
    (107,10,'mon_explainability_drift','Explainability Drift Analysis','Has model reasoning changed?','{"analyzed":["Feature importance shift","SHAP distribution drift","Shortcut emergence"],"output":"Explanation drift audit"}'::jsonb),
    (107,11,'mon_data_quality','Data Quality Drift','Is data quality degrading?','{"analyzed":["Missingness increase","Outlier rate growth","Noise escalation"],"output":"Data quality monitoring report"}'::jsonb),
    (107,12,'mon_pipeline_dependency','Pipeline & Dependency Drift','Are upstream systems changing?','{"analyzed":["Schema/API changes","Tool/retriever behavior drift"],"output":"Pipeline drift incident log"}'::jsonb),
    (107,13,'mon_alert_sensitivity','Threshold & Alert Sensitivity Analysis','Are alerts meaningful?','{"analyzed":["False alert rate","Missed drift incidents","Detection latency"],"output":"Alert quality assessment"}'::jsonb),
    (107,14,'mon_root_cause','Root Cause Attribution Analysis','Why did drift occur?','{"analyzed":["Data vs model vs environment","Causal tracing","Change correlation"],"output":"Drift root-cause report"}'::jsonb),
    (107,15,'mon_response_readiness','Response & Mitigation Readiness Analysis','What happens when drift is detected?','{"analyzed":["Retraining triggers","Rollback rules","Human review paths"],"output":"Drift response playbook"}'::jsonb),
    (107,16,'mon_genai','Monitoring for Generative AI','Is generation behavior drifting?','{"analyzed":["Toxicity drift","Hallucination rate drift","Style & refusal drift"],"output":"GenAI behavior drift report"}'::jsonb),
    (107,17,'mon_infra_reliability','Monitoring Infrastructure Reliability','Can monitoring itself be trusted?','{"analyzed":["Logging completeness","Metric latency","Observability gaps"],"output":"Monitoring health report"}'::jsonb),
    (107,18,'mon_governance','Monitoring Governance & Accountability','Who owns monitoring and enforces action?','{"analyzed":["Ownership & RACI","Review cadence","Go/No-Go triggers"],"output":"Monitoring governance policy + audit trail"}'::jsonb),

    -- Framework 108 — Sustainable / Green AI (18 modules)
    (108,1,'sus_scope','Sustainability Definition & Scope Analysis','What does sustainable AI mean here?','{"analyzed":["Environmental vs economic sustainability","Training vs inference focus","Short-term vs lifecycle view"],"output":"Sustainability scope + system boundary"}'::jsonb),
    (108,2,'sus_energy','Energy Consumption Analysis','How much energy does the AI consume?','{"analyzed":["Training energy (kWh)","Inference energy per request","Idle vs peak usage"],"output":"Energy consumption report"}'::jsonb),
    (108,3,'sus_carbon','Carbon Footprint Analysis','What is the carbon impact?','{"analyzed":["CO2e from training","CO2e per inference","Grid carbon intensity"],"output":"Carbon footprint statement"}'::jsonb),
    (108,4,'sus_hardware','Hardware Efficiency Analysis','Is hardware used efficiently?','{"analyzed":["GPU/CPU utilization","Memory efficiency","Accelerator choice"],"output":"Hardware efficiency audit"}'::jsonb),
    (108,5,'sus_model_size','Model Size & Complexity Analysis','Is the model larger than necessary?','{"analyzed":["Parameter count","FLOPs","Redundancy vs performance"],"output":"Model efficiency justification"}'::jsonb),
    (108,6,'sus_training_strategy','Training Strategy Sustainability Analysis','Is training done responsibly?','{"analyzed":["Full training vs fine-tuning","PEFT/LoRA usage","Early stopping"],"output":"Training sustainability plan"}'::jsonb),
    (108,7,'sus_inference','Inference Efficiency Analysis','Is runtime usage optimized?','{"analyzed":["Batch size","Quantization","Caching"],"output":"Inference optimization report"}'::jsonb),
    (108,8,'sus_data_efficiency','Data Efficiency Analysis','Is data used efficiently?','{"analyzed":["Data reuse","Curriculum learning","Sample efficiency"],"output":"Data efficiency metrics"}'::jsonb),
    (108,9,'sus_lifecycle','Lifecycle Resource Analysis','What is the total lifecycle cost?','{"analyzed":["Train→deploy→retrain→retire","Resource accumulation"],"output":"Lifecycle sustainability assessment"}'::jsonb),
    (108,10,'sus_deployment_location','Deployment Location Analysis','Where is compute happening?','{"analyzed":["Region energy mix","Edge vs cloud trade-offs"],"output":"Deployment carbon comparison"}'::jsonb),
    (108,11,'sus_scalability','Scalability Sustainability Analysis','Does impact grow linearly or exponentially?','{"analyzed":["Cost vs scale curve","Energy scaling behavior"],"output":"Sustainability scaling curve"}'::jsonb),
    (108,12,'sus_monitoring','Monitoring & Reporting Analysis','Is sustainability measured continuously?','{"analyzed":["Energy KPIs","Carbon tracking","Alerting"],"output":"Sustainability dashboard"}'::jsonb),
    (108,13,'sus_tradeoff','Trade-off Analysis (Accuracy vs Sustainability)','What is sacrificed to be greener?','{"analyzed":["Accuracy vs energy","Latency vs carbon"],"output":"Sustainability trade-off curve"}'::jsonb),
    (108,14,'sus_business_impact','User & Business Impact Analysis','Does sustainability affect users or value?','{"analyzed":["Cost savings","Performance impact","User experience"],"output":"Business impact assessment"}'::jsonb),
    (108,15,'sus_vendor','Vendor & Supply-Chain Sustainability','Are providers sustainable?','{"analyzed":["Cloud provider energy sourcing","Hardware lifecycle"],"output":"Vendor sustainability checklist"}'::jsonb),
    (108,16,'sus_esg','Regulatory & ESG Alignment Analysis','Does it meet sustainability regulations?','{"analyzed":["ESG requirements","Climate reporting rules"],"output":"ESG / regulatory alignment report"}'::jsonb),
    (108,17,'sus_disclosure','Transparency & Disclosure Analysis','Is environmental impact disclosed?','{"analyzed":["Public reporting","Internal accountability"],"output":"Sustainability disclosure statement"}'::jsonb),
    (108,18,'sus_governance','Sustainable AI Governance & Accountability','Who owns sustainability and enforces it?','{"analyzed":["Ownership & RACI","Sustainability gates","Audit cadence"],"output":"Green AI governance policy + audit trail"}'::jsonb),

    -- Framework 109 — Responsible Generative AI (18 modules)
    (109,1,'rgai_scope','Responsible GenAI Definition & Scope Analysis','What does responsible mean for this generative use case?','{"analyzed":["Content type (text/code/image/audio)","Audience & exposure level","Generation vs transformation"],"output":"Responsible GenAI scope + use-case boundary"}'::jsonb),
    (109,2,'rgai_usecase','Use-Case Appropriateness Analysis','Should GenAI be used here at all?','{"analyzed":["Automation suitability","Human creativity vs AI generation","Risk of misuse"],"output":"Use-case justification / rejection note"}'::jsonb),
    (109,3,'rgai_stakeholder','Stakeholder & Impact Analysis','Who is affected by generated content?','{"analyzed":["End users","Subjects of generation","Third-party impact"],"output":"Stakeholder impact map + harm severity matrix"}'::jsonb),
    (109,4,'rgai_harm_risk','Harmful Content Risk Analysis','What harmful content could be generated?','{"analyzed":["Violence/self-harm/hate","Medical/legal harm","Misinformation"],"output":"Harm risk register"}'::jsonb),
    (109,5,'rgai_bias_gen','Bias & Stereotype Generation Analysis','Does GenAI amplify bias or stereotypes?','{"analyzed":["Demographic bias in outputs","Representation imbalance","Prompt sensitivity"],"output":"Bias generation audit report"}'::jsonb),
    (109,6,'rgai_hallucination','Hallucination & Fabrication Risk Analysis','Does the model invent facts or sources?','{"analyzed":["Unsupported claims","False citations","Overconfidence"],"output":"Hallucination risk assessment"}'::jsonb),
    (109,7,'rgai_grounding','Grounding & Faithfulness Analysis','Is generated content grounded when required?','{"analyzed":["RAG faithfulness checks","Source attribution correctness"],"output":"Grounding validation report"}'::jsonb),
    (109,8,'rgai_misuse','Misuse & Abuse Scenario Analysis','How could GenAI be misused?','{"analyzed":["Disallowed prompt patterns","Dual-use risks","Social engineering"],"output":"Misuse threat model"}'::jsonb),
    (109,9,'rgai_injection','Prompt Injection & Jailbreak Analysis','Can safeguards be bypassed?','{"analyzed":["Instruction override attempts","Context poisoning"],"output":"Jailbreak robustness report"}'::jsonb),
    (109,10,'rgai_ip','Intellectual Property & Copyright Analysis','Does generation violate IP?','{"analyzed":["Training data exposure risk","Style imitation","License conflicts"],"output":"IP risk assessment"}'::jsonb),
    (109,11,'rgai_privacy','Privacy & Data Leakage Analysis','Does GenAI leak personal or sensitive data?','{"analyzed":["Memorization tests","PII regeneration","Prompt leakage"],"output":"Privacy leakage audit"}'::jsonb),
    (109,12,'rgai_disclosure','Output Transparency & Disclosure Analysis','Are users informed content is AI-generated?','{"analyzed":["AI disclosure labeling","Watermarking / provenance"],"output":"Disclosure & provenance policy"}'::jsonb),
    (109,13,'rgai_user_control','User Control & Customization Analysis','Can users control generation safely?','{"analyzed":["Safety-aware parameters","Style/tone constraints"],"output":"User control guidelines"}'::jsonb),
    (109,14,'rgai_refusal','Refusal & Safe Completion Analysis','Does GenAI refuse responsibly?','{"analyzed":["Refusal triggers","Tone & alternatives offered"],"output":"Refusal quality report"}'::jsonb),
    (109,15,'rgai_hitl','Human-in-the-Loop Oversight Analysis','Where must humans review or approve outputs?','{"analyzed":["Review thresholds","Escalation criteria"],"output":"HITL workflow diagram"}'::jsonb),
    (109,16,'rgai_monitoring','Monitoring & Post-Deployment Responsibility','Are harms tracked after deployment?','{"analyzed":["Output audits","Abuse reporting","Drift detection"],"output":"Monitoring dashboard"}'::jsonb),
    (109,17,'rgai_incident','Incident Response & Remediation Analysis','What happens when harmful content appears?','{"analyzed":["Takedown process","User notification","Model adjustment"],"output":"Incident response playbook"}'::jsonb),
    (109,18,'rgai_governance','Responsible GenAI Governance & Enforcement','Who owns and enforces responsibility?','{"analyzed":["Ownership & RACI","Approval gates","Periodic audits"],"output":"Responsible GenAI governance policy + audit trail"}'::jsonb),

    -- Framework 110 — Debug AI (20 modules)
    (110,1,'dbg_problem_def','Problem Definition Debug Analysis','Are we solving the right problem?','{"analyzed":["Label definition sanity","Target leakage risk","Decision vs prediction mismatch"],"output":"Problem validation note + target definition approval"}'::jsonb),
    (110,2,'dbg_data_integrity','Data Integrity & Quality Debugging','Is the data technically valid?','{"analyzed":["Missing values","Outliers","Schema violations","Corrupt samples"],"output":"Data quality report + rejected sample log"}'::jsonb),
    (110,3,'dbg_data_leakage','Data Leakage Debugging','Is accuracy inflated artificially?','{"analyzed":["Train-test overlap","Temporal leakage","Identifier leakage","Near-duplicate detection"],"output":"Leakage audit report"}'::jsonb),
    (110,4,'dbg_label_noise','Label Noise & Consistency Debugging','Are labels reliable?','{"analyzed":["Annotation agreement","Noise estimation","Label drift"],"output":"Label quality assessment"}'::jsonb),
    (110,5,'dbg_split','Dataset Split & Sampling Debugging','Are splits valid and fair?','{"analyzed":["Stratification","Group separation","Class balance"],"output":"Split validation report"}'::jsonb),
    (110,6,'dbg_feature_integrity','Feature Integrity Debugging','Do features mean what we think?','{"analyzed":["Range violations","Unit mismatches","Constant / dead features"],"output":"Feature sanity checklist"}'::jsonb),
    (110,7,'dbg_feature_shortcut','Feature Leakage & Shortcut Debugging','Is the model cheating?','{"analyzed":["Proxy features","Suspicious importance spikes","Timestamp shortcuts"],"output":"Shortcut detection report"}'::jsonb),
    (110,8,'dbg_class_imbalance','Class Imbalance Debugging','Is performance hiding minority failure?','{"analyzed":["Per-class metrics","Confusion matrix","Collapse detection"],"output":"Class performance breakdown"}'::jsonb),
    (110,9,'dbg_capacity','Model Capacity Debugging','Is the model too weak or too strong?','{"analyzed":["Underfitting signals","Overfitting patterns","Learning curves"],"output":"Capacity assessment"}'::jsonb),
    (110,10,'dbg_training_dynamics','Training Dynamics Debugging','Is training stable?','{"analyzed":["Loss curves","Gradient explosions/vanishing","Optimization failures"],"output":"Training diagnostics"}'::jsonb),
    (110,11,'dbg_hp_sensitivity','Hyperparameter Sensitivity Debugging','Is performance fragile?','{"analyzed":["Parameter perturbation tests","Stability across seeds"],"output":"Sensitivity report"}'::jsonb),
    (110,12,'dbg_metric','Evaluation Metric Debugging','Are metrics misleading?','{"analyzed":["Metric-task mismatch","Threshold sensitivity","Averaging artifacts"],"output":"Metric suitability justification"}'::jsonb),
    (110,13,'dbg_error_pattern','Error Pattern Debugging','Where does the model fail?','{"analyzed":["Error clustering","Slice-based failure analysis"],"output":"Failure mode catalog"}'::jsonb),
    (110,14,'dbg_xai_assisted','Explainability-Assisted Debugging','Do explanations reveal bugs?','{"analyzed":["SHAP/LIME sanity checks","Unexpected drivers"],"output":"XAI-based debug findings"}'::jsonb),
    (110,15,'dbg_robustness','Robustness & Stress Debugging','Does it break under stress?','{"analyzed":["Noise injection","Adversarial inputs","Edge cases"],"output":"Robustness test report"}'::jsonb),
    (110,16,'dbg_train_serve_skew','Train-Serve Skew Debugging','Does production match training?','{"analyzed":["Feature pipeline parity","Preprocessing differences"],"output":"Skew detection report"}'::jsonb),
    (110,17,'dbg_pipeline_system','Pipeline & System Debugging','Where does the system fail?','{"analyzed":["Retrieval errors (RAG)","Tool-call failures","Integration mismatches"],"output":"System failure attribution map"}'::jsonb),
    (110,18,'dbg_regression','Deployment Regression Debugging','Did something break after changes?','{"analyzed":["Version comparison","Accuracy regressions","Safety regressions"],"output":"Regression test report"}'::jsonb),
    (110,19,'dbg_monitoring','Monitoring Signal Debugging','Are alerts meaningful?','{"analyzed":["False alerts","Missed failures","Signal latency"],"output":"Monitoring quality report"}'::jsonb),
    (110,20,'dbg_governance','Debug Governance & Accountability','Who owns debugging and fixes?','{"analyzed":["Debug ownership","Escalation paths","Fix validation gates"],"output":"Debug RACI + fix approval & audit trail"}'::jsonb),

    -- Framework 111 — Portability AI (18 modules)
    (111,1,'port_scope','Portability Definition & Scope Analysis','What does portable mean for this AI?','{"analyzed":["Target environments (cloud/edge/on-prem)","Domain transfer vs infra transfer","Performance expectations"],"output":"Portability scope + supported environments list"}'::jsonb),
    (111,2,'port_data_dependency','Data Dependency Analysis','How dependent is the model on specific data?','{"analyzed":["Feature availability","Schema rigidity","Training data assumptions"],"output":"Data dependency map + required vs optional inputs"}'::jsonb),
    (111,3,'port_feature','Feature Portability Analysis','Do features exist in new environments?','{"analyzed":["Feature re-creation feasibility","Sensor/signal availability","Semantic consistency"],"output":"Feature portability audit"}'::jsonb),
    (111,4,'port_domain_shift','Domain Shift Sensitivity Analysis','How does performance change across domains?','{"analyzed":["In-domain vs out-of-domain accuracy","Distribution shift impact"],"output":"Domain transfer performance report"}'::jsonb),
    (111,5,'port_generalization','Model Generalization Analysis','Does the model generalize beyond training context?','{"analyzed":["Cross-domain validation","Robustness under variation"],"output":"Generalization score"}'::jsonb),
    (111,6,'port_infra','Infrastructure & Platform Compatibility Analysis','Can the model run elsewhere?','{"analyzed":["OS / hardware support","GPU/CPU/edge constraints","Dependency portability"],"output":"Platform compatibility matrix"}'::jsonb),
    (111,7,'port_resource_cost','Resource & Cost Portability Analysis','Are compute costs acceptable elsewhere?','{"analyzed":["Memory footprint","Latency changes","Cost scaling"],"output":"Resource requirement report"}'::jsonb),
    (111,8,'port_tooling','Tooling & Dependency Portability Analysis','Are tools and libraries portable?','{"analyzed":["Library version constraints","Vendor lock-in risks"],"output":"Dependency portability checklist"}'::jsonb),
    (111,9,'port_training_repro','Training Reproducibility Analysis','Can the model be retrained elsewhere?','{"analyzed":["Seed stability","Training determinism","Config completeness"],"output":"Reproducibility report"}'::jsonb),
    (111,10,'port_xai','Explainability Portability Analysis','Do explanations remain valid after transfer?','{"analyzed":["SHAP/logic stability","Feature meaning consistency"],"output":"Explanation portability assessment"}'::jsonb),
    (111,11,'port_fairness','Fairness Portability Analysis','Does fairness hold in new contexts?','{"analyzed":["Group definition changes","Error redistribution"],"output":"Cross-domain fairness report"}'::jsonb),
    (111,12,'port_safety_risk','Safety & Risk Portability Analysis','Do risks change in new environments?','{"analyzed":["New misuse scenarios","Context-specific harm"],"output":"Risk re-assessment document"}'::jsonb),
    (111,13,'port_performance_degradation','Performance Degradation Analysis','How much accuracy is lost when ported?','{"analyzed":["Accuracy drop thresholds","Acceptable degradation"],"output":"Performance delta report"}'::jsonb),
    (111,14,'port_config_robustness','Configuration & Parameter Robustness Analysis','Are hyperparameters brittle?','{"analyzed":["Sensitivity to settings","Default safety margins"],"output":"Parameter robustness report"}'::jsonb),
    (111,15,'port_integration','Integration & Pipeline Portability Analysis','Does it fit new pipelines?','{"analyzed":["API compatibility","Upstream/downstream coupling"],"output":"Integration readiness checklist"}'::jsonb),
    (111,16,'port_monitoring','Monitoring & Observability Portability','Can it be monitored everywhere?','{"analyzed":["Logging availability","Metric consistency"],"output":"Monitoring portability plan"}'::jsonb),
    (111,17,'port_compliance','Governance & Compliance Portability Analysis','Are rules consistent across regions?','{"analyzed":["Regulatory differences","Data locality laws"],"output":"Compliance portability matrix"}'::jsonb),
    (111,18,'port_governance','Portability Governance & Accountability','Who approves and owns portability decisions?','{"analyzed":["Ownership & RACI","Re-validation requirements","Go/No-Go gates"],"output":"Portability governance policy + approval & audit trail"}'::jsonb)
ON CONFLICT (phase_id, seq) DO NOTHING;

COMMENT ON TABLE analysis_module IS
    'AI assurance framework catalog — 11 generic frameworks × ~18 modules each = ~200 reusable analysis types. Companion folder: docs/ai_assurance/. Per-department applicability mapping is a follow-up migration.';
