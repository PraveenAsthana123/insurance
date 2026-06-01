// catalogIndex.js — Static index of the three sibling catalogs.
// Mirrors what's actually on disk in docs/{ai_assurance, ml_methodology,
// digital_transformation}/ and the analysis_phase + departments tables.
// Each entry has a `path` (relative to repo root) so the page can fetch
// the raw markdown via the dev-server proxy + render with react-markdown.

export const aiAssuranceFrameworks = [
  { id: 101, code: 'reliable_ai',          name: 'Reliable AI',                 owner: 'SRE / AI Platform',          file: 'docs/ai_assurance/reliable_ai.md' },
  { id: 102, code: 'trustworthy_ai',       name: 'Trustworthy AI',              owner: 'RAI Office',                 file: 'docs/ai_assurance/trustworthy_ai.md' },
  { id: 103, code: 'safe_ai',              name: 'Safe AI',                     owner: 'Safety Engineering',         file: 'docs/ai_assurance/safe_ai.md' },
  { id: 104, code: 'accountable_ai',       name: 'Accountable AI',              owner: 'Governance / Legal',         file: 'docs/ai_assurance/accountable_ai.md' },
  { id: 105, code: 'auditable_ai',         name: 'Auditable AI',                owner: 'Audit / Compliance',         file: 'docs/ai_assurance/auditable_ai.md' },
  { id: 106, code: 'lifecycle_management', name: 'Model Lifecycle Management',  owner: 'MLOps',                      file: 'docs/ai_assurance/lifecycle_management.md' },
  { id: 107, code: 'monitoring_drift',     name: 'Monitoring & Drift Detection',owner: 'MLOps / SRE',                file: 'docs/ai_assurance/monitoring_drift.md' },
  { id: 108, code: 'sustainable_ai',       name: 'Sustainable / Green AI',      owner: 'FinOps / Sustainability',    file: 'docs/ai_assurance/sustainable_ai.md' },
  { id: 109, code: 'responsible_genai',    name: 'Responsible Generative AI',   owner: 'RAI Office / Content Safety',file: 'docs/ai_assurance/responsible_genai.md' },
  { id: 110, code: 'debug_ai',             name: 'Debug AI',                    owner: 'ML Engineering',             file: 'docs/ai_assurance/debug_ai.md' },
  { id: 111, code: 'portability_ai',       name: 'Portability AI',              owner: 'AI Architecture',            file: 'docs/ai_assurance/portability_ai.md' },
];

export const aiAssuranceHorizontals = [
  { code: 'responsible_by_design',          name: 'Responsible-by-Design (5 pillars)',    file: 'docs/ai_assurance/responsible_by_design.md' },
  { code: 'data_governance',                name: 'Data Governance',                       file: 'docs/ai_assurance/data_governance.md' },
  { code: 'fairness_framework',             name: 'Fairness Framework',                    file: 'docs/ai_assurance/fairness_framework.md' },
  { code: 'validation_playbook',            name: 'Validation Playbook',                   file: 'docs/ai_assurance/validation_playbook.md' },
  { code: 'hallucination_controls',         name: 'Hallucination Controls',                file: 'docs/ai_assurance/hallucination_controls.md' },
  { code: 'evaluation_metrics',             name: 'Evaluation Metrics',                    file: 'docs/ai_assurance/evaluation_metrics.md' },
  { code: 'performance_analysis_taxonomy',  name: 'Performance + Analysis Taxonomy',       file: 'docs/ai_assurance/performance_analysis_taxonomy.md' },
  { code: 'clinical_validation',            name: 'Clinical Validation',                   file: 'docs/ai_assurance/clinical_validation.md' },
  { code: 'reliability_matrix',             name: 'Reliability Matrix',                    file: 'docs/ai_assurance/reliability_matrix.md' },
];

export const mlMethodologyPhases = [
  { id: 201, code: 'framing',           name: 'Project Framing + Success Criteria',                   owner: 'Product / Tech Lead', file: 'docs/ml_methodology/phase_01_framing.md' },
  { id: 202, code: 'data_acquisition',  name: 'Data Acquisition + Dataset Design',                    owner: 'Data Engineering',    file: 'docs/ml_methodology/phase_02_data.md' },
  { id: 203, code: 'preprocessing',     name: 'Filtering + Preprocessing',                            owner: 'Signal Engineer',     file: 'docs/ml_methodology/phase_03_preprocessing.md' },
  { id: 204, code: 'normalization',     name: 'Standardization + Normalization (Leakage-Safe)',       owner: 'ML Engineer',         file: 'docs/ml_methodology/phase_04_normalization.md' },
  { id: 205, code: 'eda',               name: 'EDA + Feature Evaluation',                             owner: 'ML Engineer',         file: 'docs/ml_methodology/phase_05_eda.md' },
  { id: 206, code: 'feature_selection', name: 'Feature Selection + Dimensionality Reduction',         owner: 'ML Engineer',         file: 'docs/ml_methodology/phase_06_feature_selection.md' },
  { id: 207, code: 'training',          name: 'Model Training (Baselines → Deep)',                    owner: 'ML Engineer',         file: 'docs/ml_methodology/phase_07_training.md' },
  { id: 208, code: 'validation',        name: 'Model Validation',                                     owner: 'ML Eng + QA',         file: 'docs/ml_methodology/phase_08_validation.md' },
  { id: 209, code: 'testing',           name: 'Model Testing (Final Holdout) + Reporting',            owner: 'QA + Audit',          file: 'docs/ml_methodology/phase_09_testing.md' },
  { id: 210, code: 'benchmarking',      name: 'End-to-End Benchmarking + Reporting Pack',             owner: 'ML Eng + Research',   file: 'docs/ml_methodology/phase_10_benchmarking.md' },
  { id: 211, code: 'production',        name: 'Production / Pilot Deployment',                        owner: 'MLOps + SRE',         file: 'docs/ml_methodology/phase_11_production.md' },
];

export const digitalTransformationDocs = [
  // DT checklists (12-domain compliance overlays)
  { kind: 'checklist',         code: 'canada_healthcare_2026',     name: 'Canada Healthcare 2026',           industry: 'Healthcare',       file: 'docs/digital_transformation/canada_healthcare_2026.md' },
  { kind: 'checklist',         code: 'canada_cpg_2026',            name: 'Canada CPG / Beverage 2026',       industry: 'CPG / Beverage',   file: 'docs/digital_transformation/canada_cpg_2026.md' },
  // Process catalogs
  { kind: 'process_catalog',   code: 'insurerage_industry',          name: 'Beverage Industry Processes',      industry: 'Beverage',         file: 'docs/digital_transformation/insurerage_industry_processes.md' },
  { kind: 'process_catalog',   code: 'healthcare_industry',        name: 'Healthcare Industry Processes',    industry: 'Healthcare',       file: 'docs/digital_transformation/healthcare_industry_processes.md' },
];

// Departments + Tenants — fallback if /api/v1/admin/{tenants,departments} unreachable.
// Mirrors migration 017 seed data.
export const fallbackDepartments = [
  // Standard 19
  { id: 1,  code: 'marketing',            display_name: 'Marketing',                    family: 'standard',          sort_order: 10 },
  { id: 2,  code: 'hr',                   display_name: 'Human Resources',              family: 'standard',          sort_order: 20 },
  { id: 3,  code: 'sales',                display_name: 'Sales',                        family: 'standard',          sort_order: 30 },
  { id: 4,  code: 'finance',              display_name: 'Finance',                      family: 'standard',          sort_order: 40 },
  { id: 5,  code: 'operations',           display_name: 'Operations',                   family: 'standard',          sort_order: 50 },
  { id: 6,  code: 'legal',                display_name: 'Legal',                        family: 'standard',          sort_order: 60 },
  { id: 7,  code: 'procurement',          display_name: 'Procurement',                  family: 'standard',          sort_order: 70 },
  { id: 8,  code: 'customer_support',     display_name: 'Customer Support',             family: 'standard',          sort_order: 80 },
  { id: 9,  code: 'engineering',          display_name: 'Engineering',                  family: 'standard',          sort_order: 90 },
  { id: 10, code: 'security_operations',  display_name: 'Security Operations',          family: 'standard',          sort_order: 100 },
  { id: 11, code: 'supply_chain',         display_name: 'Supply Chain',                 family: 'standard',          sort_order: 110 },
  { id: 12, code: 'customer_experience',  display_name: 'Customer Experience',          family: 'standard',          sort_order: 120 },
  { id: 13, code: 'it_operations',        display_name: 'IT Operations',                family: 'standard',          sort_order: 130 },
  { id: 14, code: 'digital_marketing',    display_name: 'Digital Marketing',            family: 'standard',          sort_order: 140 },
  { id: 15, code: 'e_commerce',           display_name: 'E-Commerce',                   family: 'standard',          sort_order: 150 },
  { id: 16, code: 'manufacturing',        display_name: 'Manufacturing',                family: 'standard',          sort_order: 160 },
  { id: 17, code: 'retail_operations',    display_name: 'Retail Operations',            family: 'standard',          sort_order: 170 },
  { id: 18, code: 'product_rd',           display_name: 'Product R&D',                  family: 'standard',          sort_order: 180 },
  { id: 19, code: 'executive_leadership', display_name: 'Executive Leadership',         family: 'standard',          sort_order: 190 },
  // Beverage-specific 5
  { id: 20, code: 'plant_floor',          display_name: 'Plant Floor (OT/MES)',         family: 'insurerage_specific', sort_order: 200 },
  { id: 21, code: 'quality_lab',          display_name: 'Quality & Lab',                family: 'insurerage_specific', sort_order: 210 },
  { id: 22, code: 'trade_promo',          display_name: 'Trade Promotion Management',   family: 'insurerage_specific', sort_order: 220 },
  { id: 23, code: 'recall_traceability',  display_name: 'Recall & Traceability',        family: 'insurerage_specific', sort_order: 230 },
  { id: 24, code: 'sustainability_esg',   display_name: 'Sustainability & ESG',         family: 'insurerage_specific', sort_order: 240 },
];

export const fallbackTenants = [
  {
    id: 1,
    slug: 'holy_insur',
    display_name: 'HOLY Beverage',
    legal_name: 'HOLY Beverage Ltd.',
    industry: 'cpg_insurerage',
    jurisdiction: 'CA',
    region: 'CA-ON',
    data_residency: 'CA-CENTRAL',
    status: 'active',
    rate_limit_per_min: 5000,
    departments_enabled: 24,
  },
];
