-- 014_dashboard_catalog_phases_40_50.sql — Extend Phase 1-7 dashboard catalog
-- to Phases 40-50 enterprise AI strategic frameworks.
--
-- Per operator choice "A": same dashboard_catalog table, same build orchestrator,
-- expanded window (180h ≈ 7.5 days) to accommodate ~130 additional rows.
--
-- Phase 40-50 are FRAMEWORKS more than dashboards — each framework contains
-- maturity ladders, governance boards, operating models, AND a set of
-- representative dashboards. We seed the dashboards here; the framework
-- narratives live in docs/UI_DASHBOARD_BUILD_PLAN.md (extended).
--
-- Composes with §66 (read-only) + §68 (aggregator) — every framework
-- dashboard maps to a backend_endpoint (NULL when source-of-truth is
-- external: jira/finance/HR tracker).

-- ----------------------------------------------------------------------------
-- Phase 40-50 phase definitions
-- ----------------------------------------------------------------------------

INSERT INTO dashboard_phase (id, code, name, owner, goal, estimated_count, backend_coverage_pct) VALUES
    (40, 'marketplace',         'Enterprise AI Marketplace',                  'AI Marketplace Office',          'Build-once-publish-many — internal AI asset marketplace with discovery, governance, billing', 15, 5),
    (41, 'digital_twin',         'Enterprise AI Digital Twin Blueprint',       'AI Architecture / Simulation',   'Living digital model of enterprise — simulate outcomes before they happen',                 18, 5),
    (42, 'autonomous_enterprise','Autonomous Enterprise Framework',            'CAIO / COO / Autonomy Office',   'End-state — humans govern, AI executes; maturity ladder L1→L5',                              22, 10),
    (43, 'transformation',       'Enterprise AI Transformation Playbook',      'AI Transformation Office',       'Multi-year transformation program with executive sponsorship + adoption + value tracking',  16, 10),
    (44, 'pmo',                  'Enterprise AI PMO Framework',                'AI PMO',                         'Program/portfolio/risk/funding/release governance — turn strategy into measurable delivery', 20, 15),
    (45, 'value_realization',    'Enterprise AI Value Realization Framework',  'CFO / Value Office',             'Connect investment → capability → product → outcome → ROI — financial accountability layer', 18, 20),
    (46, 'portfolio',            'Enterprise AI Portfolio Management',         'CAIO / Portfolio Office',        'Manage 100s of AI initiatives as one portfolio — prioritize/fund/scale/retire',              20, 15),
    (47, 'investment',           'Enterprise AI Investment & Funding Framework','CFO / Finance',                 'AI budgeting + unit economics + chargeback/showback + capital planning',                     18, 15),
    (48, 'reference_data_model', 'Enterprise AI Reference Data Model (EARDM)', 'Enterprise Architecture',        'Canonical model — single source of truth for products/agents/prompts/models/KPIs',           15, 25),
    (49, 'knowledge_graph',      'Enterprise AI Knowledge Graph Architecture',  'AI Architecture / Semantic',     'Reasoning layer — entities/relationships/ontology powering RAG + agents + governance',       16, 10),
    (50, 'master_repository',    'Enterprise AI Operating System Master Repo',  'CAIO',                           'Final consolidation — 1000+ KPIs, 500+ dashboards, 1000+ controls, 1000+ SOPs',              10, 5)
ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        owner = EXCLUDED.owner,
        goal = EXCLUDED.goal,
        estimated_count = EXCLUDED.estimated_count,
        backend_coverage_pct = EXCLUDED.backend_coverage_pct;

-- ----------------------------------------------------------------------------
-- Categories per Phase 40-50 — one row per major subsection in the operator's
-- taxonomy. Lets the frontend group framework dashboards naturally.
-- ----------------------------------------------------------------------------

INSERT INTO dashboard_category (phase_id, code, name) VALUES
    -- Phase 40 Marketplace
    (40, 'marketplace_executive', 'Executive Marketplace View'),
    (40, 'marketplace_assets',    'Asset Catalog'),
    (40, 'marketplace_billing',   'Billing & Chargeback'),
    (40, 'marketplace_trust',     'Trust & Governance'),

    -- Phase 41 Digital Twin
    (41, 'twin_business',  'Business Twin'),
    (41, 'twin_process',   'Process Twin'),
    (41, 'twin_ai',        'AI / Agent / RAG Twins'),
    (41, 'twin_security',  'Security / Compliance / Cost Twins'),
    (41, 'twin_scenarios', 'Scenario Engine'),

    -- Phase 42 Autonomous Enterprise
    (42, 'autonomous_executive',  'Executive — Maturity Ladder'),
    (42, 'autonomous_governance', 'Autonomous Governance'),
    (42, 'autonomous_ops',        'Autonomous Operations'),
    (42, 'autonomous_finance',    'Autonomous FinOps + Cost'),
    (42, 'autonomous_security',   'Autonomous Security + Compliance'),
    (42, 'autonomous_workforce',  'Autonomous Workforce + Products'),

    -- Phase 43 Transformation
    (43, 'transformation_executive', 'Executive Sponsorship + Maturity'),
    (43, 'transformation_change',    'Change Management + Adoption'),
    (43, 'transformation_workforce', 'Workforce + Training'),
    (43, 'transformation_funding',   'Funding + Portfolio'),

    -- Phase 44 PMO
    (44, 'pmo_executive',     'Executive PMO Cockpit'),
    (44, 'pmo_portfolio',     'Portfolio + Program'),
    (44, 'pmo_intake',        'Intake + Business Case'),
    (44, 'pmo_governance',    'Stage Gates + Governance'),
    (44, 'pmo_risk_dep',      'Risk + Dependency Management'),

    -- Phase 45 Value
    (45, 'value_executive', 'Executive ROI Scorecard'),
    (45, 'value_categories','Value Categories (Revenue/Cost/Productivity/Risk)'),
    (45, 'value_attribution','Attribution + Benefits Realization'),
    (45, 'value_governance','Value Risk + Maturity'),

    -- Phase 46 Portfolio
    (46, 'portfolio_executive', 'Executive Portfolio Board'),
    (46, 'portfolio_intake',    'Intake + Prioritization'),
    (46, 'portfolio_lifecycle', 'Lifecycle + Capacity'),
    (46, 'portfolio_review',    'Reviews + Optimization'),

    -- Phase 47 Investment
    (47, 'invest_executive', 'CFO Cockpit'),
    (47, 'invest_budget',    'Budget + Categories'),
    (47, 'invest_unit_econ', 'Unit Economics + Cost Drivers'),
    (47, 'invest_allocation','Allocation + Chargeback/Showback'),
    (47, 'invest_optim',     'Cost Optimization + P&L'),

    -- Phase 48 Reference Data Model
    (48, 'eardm_canonical', 'Canonical Domains'),
    (48, 'eardm_registries','Registries (Model/Prompt/Agent/MCP)'),
    (48, 'eardm_rag',       'RAG + Knowledge Asset Metadata'),
    (48, 'eardm_governance','Governance + Security + Financial Models'),
    (48, 'eardm_kpi',       'KPI + Dashboard + Lineage Metadata'),

    -- Phase 49 Knowledge Graph
    (49, 'kg_executive',   'Executive KG View'),
    (49, 'kg_domains',     'Core Domains (Org/Product/Agent/Model)'),
    (49, 'kg_governance',  'Governance / Trust / Security Graphs'),
    (49, 'kg_finance',     'Finance / Twin / Marketplace Graphs'),
    (49, 'kg_powered',     'Graph-Powered RAG + Agents'),

    -- Phase 50 Master Repository
    (50, 'master_inventory', 'Master Inventory'),
    (50, 'master_lineage',   'Lineage + Cross-Phase References')
ON CONFLICT (phase_id, code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Phase 40-50 representative dashboards
-- (highest-leverage dashboards per phase; ~12 per phase average → ~130 rows)
-- ----------------------------------------------------------------------------

-- Phase 40 — Marketplace
INSERT INTO dashboard_catalog
    (phase_id, category_id, slug, name, purpose, primary_audience, primary_visualization, refresh_cadence, backend_endpoint, backend_status, is_top1_addition, priority, scenario_plan)
VALUES
    (40, (SELECT id FROM dashboard_category WHERE phase_id=40 AND code='marketplace_executive'),
     'marketplace_overview', 'Marketplace Overview Dashboard', 'Executive view of internal AI marketplace',
     'EXEC', 'kpi_card', 'daily', NULL, 'spec', FALSE, 1,
     '{"tiles":["assets published","monthly transactions","top consumers","top contributors","platform spend"],"drill_targets":["asset_catalog","billing"]}'::jsonb),

    (40, (SELECT id FROM dashboard_category WHERE phase_id=40 AND code='marketplace_assets'),
     'marketplace_asset_catalog', 'Asset Catalog Dashboard', 'Browse all published AI assets (agents/prompts/models/MCP)',
     'PROD', 'treemap', 'real-time-60s', NULL, 'spec', FALSE, 1,
     '{"facets":["type","owner","trust_score","cost_tier","compliance"],"search":"semantic","preview":"interactive"}'::jsonb),

    (40, (SELECT id FROM dashboard_category WHERE phase_id=40 AND code='marketplace_billing'),
     'marketplace_chargeback', 'Marketplace Chargeback Dashboard', 'Per-tenant per-asset usage billing',
     'BIZ', 'sankey', 'daily', NULL, 'spec', FALSE, 1,
     '{"flow":"consumer→asset→provider→cost","exports":["csv","pdf"]}'::jsonb),

    (40, (SELECT id FROM dashboard_category WHERE phase_id=40 AND code='marketplace_trust'),
     'marketplace_trust_scores', 'Marketplace Trust Scoreboard', 'Per-asset trust + safety + adoption',
     'RISK', 'radar', 'hourly', NULL, 'spec', FALSE, 1,
     '{"axes":["accuracy","safety","fairness","explainability","reliability"],"drill":"asset_card"}'::jsonb),

    (40, (SELECT id FROM dashboard_category WHERE phase_id=40 AND code='marketplace_assets'),
     'marketplace_publisher', 'Publisher Dashboard', 'Per-publisher metrics: revenue/consumers/reviews',
     'BIZ', 'bar', 'daily', NULL, 'spec', FALSE, 2,
     '{"author_view":true,"metrics":["consumers","downloads","ratings","revenue"]}'::jsonb),

    (40, (SELECT id FROM dashboard_category WHERE phase_id=40 AND code='marketplace_trust'),
     'marketplace_certification', 'Asset Certification Dashboard', 'Asset approval lifecycle',
     'RISK', 'funnel', 'daily', NULL, 'spec', FALSE, 1,
     '{"stages":["submitted","reviewed","certified","published","deprecated"]}'::jsonb);

-- Phase 41 — Digital Twin
INSERT INTO dashboard_catalog
    (phase_id, category_id, slug, name, purpose, primary_audience, primary_visualization, refresh_cadence, backend_endpoint, backend_status, is_top1_addition, priority, scenario_plan)
VALUES
    (41, (SELECT id FROM dashboard_category WHERE phase_id=41 AND code='twin_business'),
     'twin_business_overview', 'Business Twin Dashboard', 'Revenue/cost/customer simulation',
     'EXEC', 'network_graph', 'daily', NULL, 'spec', FALSE, 1,
     '{"simulate":["customer_growth","ai_adoption","revenue_impact"],"what_if":"slider_controls"}'::jsonb),

    (41, (SELECT id FROM dashboard_category WHERE phase_id=41 AND code='twin_process'),
     'twin_process_simulator', 'Process Twin Simulator', 'Simulate workflow automation outcomes',
     'OPS', 'dag', 'on-demand', NULL, 'spec', FALSE, 1,
     '{"process_select":"current vs ai_automated","metrics":["cycle_time","cost","error_rate"]}'::jsonb),

    (41, (SELECT id FROM dashboard_category WHERE phase_id=41 AND code='twin_ai'),
     'twin_ai_simulator', 'AI Twin Simulator', 'What-if: model change / retrieval failure / agent loop / cost double',
     'ENG', 'decision_tree', 'on-demand', NULL, 'spec', TRUE, 1,
     '{"what_if":["model_swap","retrieval_fail","agent_loop","cost_2x"],"outputs":["sla_impact","cost_impact","trust_impact"]}'::jsonb),

    (41, (SELECT id FROM dashboard_category WHERE phase_id=41 AND code='twin_ai'),
     'twin_agent_simulator', 'Agent Twin Dashboard', 'Simulate agent reasoning + recovery',
     'ENG', 'decision_tree', 'on-demand', NULL, 'spec', FALSE, 1,
     '{"axes":["planning","memory","tool_use","escalation"],"outputs":["success_rate","alt_outcomes"]}'::jsonb),

    (41, (SELECT id FROM dashboard_category WHERE phase_id=41 AND code='twin_security'),
     'twin_cost_simulator', 'Cost Twin Dashboard', 'Cost forecast as function of usage + model mix',
     'BIZ', 'waterfall', 'on-demand', NULL, 'spec', FALSE, 1,
     '{"inputs":["users","tokens","model_mix"],"outputs":["monthly_cost","annual_cost","cost_per_user"]}'::jsonb),

    (41, (SELECT id FROM dashboard_category WHERE phase_id=41 AND code='twin_security'),
     'twin_security_simulator', 'Security Twin Dashboard', 'Simulate prompt-injection / DLP / vendor compromise',
     'RISK', 'mitre_matrix', 'on-demand', NULL, 'spec', FALSE, 1,
     '{"scenarios":["prompt_injection","jailbreak","data_leakage","insider","mcp_attack","credential_theft"]}'::jsonb),

    (41, (SELECT id FROM dashboard_category WHERE phase_id=41 AND code='twin_scenarios'),
     'twin_scenario_dashboard', 'Enterprise Scenario Engine', '100 users → 10000 users impact analysis',
     'EXEC', 'line', 'on-demand', NULL, 'spec', FALSE, 1,
     '{"scenarios":["growth","risk","compliance","cost","reliability","workforce","ai_adoption"]}'::jsonb);

-- Phase 42 — Autonomous Enterprise
INSERT INTO dashboard_catalog
    (phase_id, category_id, slug, name, purpose, primary_audience, primary_visualization, refresh_cadence, backend_endpoint, backend_status, is_top1_addition, priority, scenario_plan)
VALUES
    (42, (SELECT id FROM dashboard_category WHERE phase_id=42 AND code='autonomous_executive'),
     'autonomous_maturity', 'Autonomous Enterprise Maturity Dashboard', 'L1→L5 maturity progression',
     'EXEC', 'scorecard', 'monthly', NULL, 'spec', FALSE, 1,
     '{"levels":["manual","digitized","ai_assisted","ai_augmented","autonomous"],"per_domain":true}'::jsonb),

    (42, (SELECT id FROM dashboard_category WHERE phase_id=42 AND code='autonomous_executive'),
     'autonomous_cockpit', 'Autonomous Enterprise Cockpit', 'Executive KPI summary: automation rate / autonomous decisions / human escalations',
     'EXEC', 'kpi_card', 'real-time-60s', NULL, 'spec', FALSE, 1,
     '{"kpis":["automation_rate","autonomous_decisions","human_escalation_rate","trust_index","compliance_index","cost_reduction","productivity_gain","roi"]}'::jsonb),

    (42, (SELECT id FROM dashboard_category WHERE phase_id=42 AND code='autonomous_governance'),
     'autonomous_governance', 'Autonomous Governance Dashboard', 'Policy → Monitor → Detect → Remediate loop',
     'RISK', 'dag', 'real-time-60s', '/api/v1/holy/security/_global', 'partial', FALSE, 1,
     '{"loop":["policy","monitor","detect","remediate"],"per_policy_metrics":true}'::jsonb),

    (42, (SELECT id FROM dashboard_category WHERE phase_id=42 AND code='autonomous_ops'),
     'autonomous_ops_loop', 'Autonomous Operations Dashboard', 'Observe → Detect → Respond → Recover loop',
     'OPS', 'dag', 'real-time-60s', NULL, 'spec', FALSE, 1,
     '{"loop":["observe","detect","respond","recover"],"sla_per_step":true}'::jsonb),

    (42, (SELECT id FROM dashboard_category WHERE phase_id=42 AND code='autonomous_finance'),
     'autonomous_finops', 'Autonomous FinOps Dashboard', 'Cost spike → detect → optimize → reduction',
     'BIZ', 'sankey', 'hourly', '/api/v1/holy/evals/cost/_global', 'partial', FALSE, 1,
     '{"loop":["spike","detect","optimize"],"savings_attribution":true}'::jsonb),

    (42, (SELECT id FROM dashboard_category WHERE phase_id=42 AND code='autonomous_security'),
     'autonomous_security', 'Autonomous Security Dashboard', 'Threat detection → containment → recovery loop',
     'RISK', 'mitre_matrix', 'real-time-60s', '/api/v1/holy/security/_global', 'partial', FALSE, 1,
     '{"functions":["threat_detection","prompt_attack","access_monitoring","dlp","response","risk_scoring","forensics","recovery"]}'::jsonb),

    (42, (SELECT id FROM dashboard_category WHERE phase_id=42 AND code='autonomous_workforce'),
     'autonomous_workforce', 'Autonomous Workforce Dashboard', 'Training/skill-assessment/talent-mapping automation',
     'PROD', 'radar', 'monthly', NULL, 'spec', FALSE, 2,
     '{"functions":["training_rec","skill_assess","workforce_plan","cert_track","talent_map","capacity_plan","adoption_track","change_mgmt"]}'::jsonb),

    (42, (SELECT id FROM dashboard_category WHERE phase_id=42 AND code='autonomous_workforce'),
     'human_in_the_loop', 'HITL Risk-Routing Dashboard', 'Risk tier × human role escalation matrix',
     'EXEC', 'risk_heatmap', 'real-time-60s', '/api/v1/holy/guardrails/_global', 'partial', TRUE, 1,
     '{"matrix":"risk_tier × human_role","escalation":"confidence_check"}'::jsonb);

-- Phase 43 — Transformation Playbook
INSERT INTO dashboard_catalog
    (phase_id, category_id, slug, name, purpose, primary_audience, primary_visualization, refresh_cadence, backend_endpoint, backend_status, is_top1_addition, priority, scenario_plan)
VALUES
    (43, (SELECT id FROM dashboard_category WHERE phase_id=43 AND code='transformation_executive'),
     'transformation_roadmap', 'Transformation Roadmap Dashboard', '4-phase (Foundation→Scale→Industrialize→Autonomous) timeline',
     'EXEC', 'timeline', 'monthly', NULL, 'spec', FALSE, 1,
     '{"phases":["foundation_0_12mo","scale_12_36mo","industrialize_36_60mo","optimize_60plus"],"milestones":true}'::jsonb),

    (43, (SELECT id FROM dashboard_category WHERE phase_id=43 AND code='transformation_executive'),
     'transformation_scorecard', 'Transformation Scorecard', 'AI Adoption / Maturity / ROI / Trust / Compliance / Automation Rate / Value',
     'EXEC', 'scorecard', 'monthly', NULL, 'spec', FALSE, 1,
     '{"kpis":["ai_adoption","ai_maturity","roi","productivity","trust_score","compliance_score","automation_rate","value_delivered"]}'::jsonb),

    (43, (SELECT id FROM dashboard_category WHERE phase_id=43 AND code='transformation_change'),
     'change_management', 'Change Management Dashboard', 'Awareness→Understanding→Adoption→Usage→Optimization lifecycle',
     'PROD', 'funnel', 'weekly', NULL, 'spec', FALSE, 1,
     '{"stages":["awareness","understanding","adoption","usage","optimization"],"per_stakeholder_group":true}'::jsonb),

    (43, (SELECT id FROM dashboard_category WHERE phase_id=43 AND code='transformation_workforce'),
     'workforce_transformation', 'Workforce Transformation Dashboard', 'AI Literacy / Training / Certifications / Role Evolution',
     'EXEC', 'sunburst', 'monthly', NULL, 'spec', FALSE, 1,
     '{"streams":["ai_literacy","ai_training","certifications","role_evolution","career_paths","leadership","coe","communities"]}'::jsonb),

    (43, (SELECT id FROM dashboard_category WHERE phase_id=43 AND code='transformation_funding'),
     'transformation_risks', 'Transformation Risks Dashboard', 'Strategy/Funding/Adoption/Security/Governance/Workforce/Vendor/Tech risks',
     'RISK', 'risk_heatmap', 'weekly', NULL, 'spec', FALSE, 1,
     '{"categories":["strategy","funding","adoption","security","governance","workforce","vendor","technology"]}'::jsonb);

-- Phase 44 — PMO Framework
INSERT INTO dashboard_catalog
    (phase_id, category_id, slug, name, purpose, primary_audience, primary_visualization, refresh_cadence, backend_endpoint, backend_status, is_top1_addition, priority, scenario_plan)
VALUES
    (44, (SELECT id FROM dashboard_category WHERE phase_id=44 AND code='pmo_executive'),
     'pmo_control_tower', 'PMO Control Tower Dashboard', 'Portfolio/Programs/Projects/Products/Risks/Funding/Adoption/Value',
     'EXEC', 'scorecard', 'real-time-60s', NULL, 'spec', FALSE, 1,
     '{"domains":["portfolio","programs","projects","products","risks","funding","adoption","value"]}'::jsonb),

    (44, (SELECT id FROM dashboard_category WHERE phase_id=44 AND code='pmo_portfolio'),
     'pmo_portfolio_health', 'Portfolio Health Dashboard', 'Portfolio Value / ROI / Risks / Adoption / Compliance / Budget',
     'EXEC', 'bullet', 'weekly', NULL, 'spec', FALSE, 1,
     '{"kpis":["portfolio_value","portfolio_roi","delivery_health","risks","adoption","compliance","budget","value_delivered"]}'::jsonb),

    (44, (SELECT id FROM dashboard_category WHERE phase_id=44 AND code='pmo_intake'),
     'pmo_intake_funnel', 'Intake Funnel Dashboard', 'Idea→Assessment→Business Case→Approval→Funding→Execution',
     'PROD', 'funnel', 'weekly', NULL, 'spec', FALSE, 1,
     '{"sources":["business_units","product_teams","innovation_labs","executive","regulatory","customer","market","tech_opp"]}'::jsonb),

    (44, (SELECT id FROM dashboard_category WHERE phase_id=44 AND code='pmo_governance'),
     'pmo_stage_gates', 'Stage Gates Dashboard', '8 gates: Idea→Business Case→Architecture→Security→Compliance→Production→Adoption→Value',
     'RISK', 'funnel', 'weekly', NULL, 'spec', FALSE, 1,
     '{"gates":["idea","business_case","architecture","security","compliance","production","adoption","value"]}'::jsonb),

    (44, (SELECT id FROM dashboard_category WHERE phase_id=44 AND code='pmo_risk_dep'),
     'pmo_dependencies', 'Dependency Graph Dashboard', 'Cross-program dependencies + critical path',
     'PROD', 'network_graph', 'weekly', NULL, 'spec', FALSE, 1,
     '{"types":["data","platform","security","architecture","vendor","product","workforce","compliance"]}'::jsonb),

    (44, (SELECT id FROM dashboard_category WHERE phase_id=44 AND code='pmo_risk_dep'),
     'pmo_risk_register', 'PMO Risk Register Dashboard', 'Identify→Assess→Mitigate→Monitor lifecycle',
     'RISK', 'risk_heatmap', 'weekly', NULL, 'spec', FALSE, 1,
     '{"categories":["strategic","financial","technology","security","compliance","vendor","workforce","adoption"]}'::jsonb);

-- Phase 45 — Value Realization
INSERT INTO dashboard_catalog
    (phase_id, category_id, slug, name, purpose, primary_audience, primary_visualization, refresh_cadence, backend_endpoint, backend_status, is_top1_addition, priority, scenario_plan)
VALUES
    (45, (SELECT id FROM dashboard_category WHERE phase_id=45 AND code='value_executive'),
     'value_roi_scorecard', 'Value ROI Scorecard', 'AI ROI / Value Delivered / Savings / Revenue / Productivity / Risk Reduction',
     'EXEC', 'scorecard', 'monthly', NULL, 'partial', FALSE, 1,
     '{"kpis":["ai_roi","value_delivered","savings","revenue","productivity","risk_reduction","csat","adoption"]}'::jsonb),

    (45, (SELECT id FROM dashboard_category WHERE phase_id=45 AND code='value_categories'),
     'value_revenue', 'Revenue Value Dashboard', 'New Revenue / Upsell / Cross-Sell / Retention / Market Expansion',
     'BIZ', 'waterfall', 'monthly', NULL, 'spec', FALSE, 1,
     '{"categories":["new_revenue","upsell","cross_sell","lead_conversion","retention","market_expansion","product_innovation","faster_sales"]}'::jsonb),

    (45, (SELECT id FROM dashboard_category WHERE phase_id=45 AND code='value_categories'),
     'value_cost_savings', 'Cost Savings Dashboard', 'Labor / Automation / Infrastructure / Cloud / Vendor / Operational / Rework / Support',
     'BIZ', 'treemap', 'monthly', NULL, 'spec', FALSE, 1,
     '{"categories":["labor_savings","automation","infrastructure","cloud","vendor","operational","reduced_rework","reduced_support"]}'::jsonb),

    (45, (SELECT id FROM dashboard_category WHERE phase_id=45 AND code='value_categories'),
     'value_risk_avoidance', 'Risk Avoidance Value Dashboard', 'Fraud / Security / Compliance / Audit / Legal / Operational / Model / Vendor',
     'RISK', 'bar', 'quarterly', NULL, 'spec', FALSE, 1,
     '{"categories":["fraud_reduction","security_risk","compliance_risk","audit_cost","legal_risk","operational_risk","model_risk","vendor_risk"]}'::jsonb),

    (45, (SELECT id FROM dashboard_category WHERE phase_id=45 AND code='value_attribution'),
     'value_attribution', 'Value Attribution Dashboard', 'Direct / Assisted / Influenced / Strategic attribution',
     'BIZ', 'sankey', 'monthly', NULL, 'spec', TRUE, 1,
     '{"levels":["direct","assisted","influenced","strategic"],"flow":"ai_usage→outcome→impact→value"}'::jsonb),

    (45, (SELECT id FROM dashboard_category WHERE phase_id=45 AND code='value_attribution'),
     'value_productivity', 'Productivity Dashboard', 'Employee / Developer / Contact Center / Operations productivity',
     'BIZ', 'bar', 'monthly', NULL, 'spec', FALSE, 1,
     '{"areas":["employee","developer","contact_center","operations","compliance","analyst","finance","executive"],"metrics":["hours_saved","tasks_automated","cycle_time","throughput"]}'::jsonb);

-- Phase 46 — Portfolio Management
INSERT INTO dashboard_catalog
    (phase_id, category_id, slug, name, purpose, primary_audience, primary_visualization, refresh_cadence, backend_endpoint, backend_status, is_top1_addition, priority, scenario_plan)
VALUES
    (46, (SELECT id FROM dashboard_category WHERE phase_id=46 AND code='portfolio_executive'),
     'portfolio_board', 'Executive Portfolio Board', 'Portfolio Value / ROI / Risk / Cost / Adoption / Strategic Alignment',
     'EXEC', 'bullet', 'monthly', NULL, 'spec', FALSE, 1,
     '{"kpis":["portfolio_value","portfolio_roi","portfolio_risk","portfolio_cost","adoption","strategic_alignment","benefits","funding_util"]}'::jsonb),

    (46, (SELECT id FROM dashboard_category WHERE phase_id=46 AND code='portfolio_intake'),
     'portfolio_prioritization', 'Portfolio Prioritization Dashboard', 'Strategy/Value/ROI/Adoption × Risk/Complexity scoring',
     'EXEC', 'scatter', 'weekly', NULL, 'spec', FALSE, 1,
     '{"weights":{"strategic_align":0.20,"business_value":0.20,"roi":0.15,"adoption":0.10,"risk":0.10,"compliance":0.10,"complexity":0.10,"innovation":0.05}}'::jsonb),

    (46, (SELECT id FROM dashboard_category WHERE phase_id=46 AND code='portfolio_lifecycle'),
     'portfolio_value_matrix', 'AI Product Value Matrix', '2×2: Value × Cost — Accelerate/Optimize/Monitor/Retire',
     'EXEC', 'scatter', 'monthly', NULL, 'spec', TRUE, 1,
     '{"quadrants":{"high_value_low_cost":"accelerate","high_value_high_cost":"optimize","low_value_low_cost":"monitor","low_value_high_cost":"retire"}}'::jsonb),

    (46, (SELECT id FROM dashboard_category WHERE phase_id=46 AND code='portfolio_lifecycle'),
     'portfolio_lifecycle', 'Portfolio Lifecycle Dashboard', 'Ideation→Investment→Execution→Adoption→Value→Optimization→Retirement',
     'PROD', 'funnel', 'monthly', NULL, 'spec', FALSE, 1,
     '{"stages":["ideation","investment","execution","adoption","value","optimization","retirement"]}'::jsonb),

    (46, (SELECT id FROM dashboard_category WHERE phase_id=46 AND code='portfolio_review'),
     'portfolio_capacity', 'Portfolio Capacity Dashboard', 'Budget/Workforce/Platform/Infra/Vendor capacity vs demand',
     'EXEC', 'gauge', 'monthly', NULL, 'spec', FALSE, 1,
     '{"areas":["budget","workforce","platform","infrastructure","vendors","security","governance","operations"],"horizons":["quarterly","annual","3yr","5yr"]}'::jsonb);

-- Phase 47 — Investment & Funding
INSERT INTO dashboard_catalog
    (phase_id, category_id, slug, name, purpose, primary_audience, primary_visualization, refresh_cadence, backend_endpoint, backend_status, is_top1_addition, priority, scenario_plan)
VALUES
    (47, (SELECT id FROM dashboard_category WHERE phase_id=47 AND code='invest_executive'),
     'cfo_cockpit', 'CFO Cockpit Dashboard', 'AI Spend / ROI / Portfolio Value / Cost per User / Budget Variance / Savings / Revenue Impact',
     'EXEC', 'scorecard', 'real-time-60s', '/api/v1/holy/evals/cost/_global', 'partial', FALSE, 1,
     '{"kpis":["ai_spend","ai_roi","portfolio_value","cost_per_user","cost_per_product","budget_variance","savings","revenue_impact"]}'::jsonb),

    (47, (SELECT id FROM dashboard_category WHERE phase_id=47 AND code='invest_budget'),
     'ai_budget_allocation', 'AI Budget Allocation Dashboard', 'Platform 25% / Products 20% / Data 15% / Security 10% / Governance 5% / Workforce 10% / Ops 10% / Innovation 5%',
     'BIZ', 'treemap', 'monthly', NULL, 'spec', FALSE, 1,
     '{"categories":{"platform":25,"products":20,"data":15,"security":10,"governance":5,"workforce":10,"operations":10,"innovation":5}}'::jsonb),

    (47, (SELECT id FROM dashboard_category WHERE phase_id=47 AND code='invest_unit_econ'),
     'ai_unit_economics', 'AI Unit Economics Dashboard', 'Cost per User/Request/Agent/Workflow/Product/BU/Dept/Outcome',
     'BIZ', 'bar', 'weekly', '/api/v1/holy/evals/cost/by-model', 'partial', FALSE, 1,
     '{"units":["user","request","agent","workflow","product","business_unit","department","outcome"]}'::jsonb),

    (47, (SELECT id FROM dashboard_category WHERE phase_id=47 AND code='invest_allocation'),
     'cost_allocation_flow', 'Cost Allocation Flow Dashboard', 'Cloud → Platform → Product → Business Unit',
     'BIZ', 'sankey', 'daily', '/api/v1/holy/evals/cost/_global', 'partial', FALSE, 1,
     '{"flow":"cloud→platform→product→business_unit","dimensions":["bu","product","dept","agent","workflow","model","region","customer"]}'::jsonb),

    (47, (SELECT id FROM dashboard_category WHERE phase_id=47 AND code='invest_optim'),
     'cost_optimization', 'Cost Optimization Dashboard', 'Caching 20-60% / Model Routing 10-40% / Context 10-30% / Prompt 5-20% / Agent 10-25%',
     'EXEC', 'waterfall', 'weekly', '/api/v1/holy/evals/cost/_global', 'partial', TRUE, 1,
     '{"optimizations":{"caching":[20,60],"model_routing":[10,40],"context":[10,30],"prompt":[5,20],"agent":[10,25]}}'::jsonb),

    (47, (SELECT id FROM dashboard_category WHERE phase_id=47 AND code='invest_optim'),
     'ai_pnl', 'AI P&L Dashboard', 'Revenue/Savings/Productivity vs Models/Cloud/Infra/Workforce/Governance/Security/Ops/Vendors',
     'EXEC', 'waterfall', 'monthly', NULL, 'spec', TRUE, 1,
     '{"revenue":["revenue_growth","cost_savings","productivity","risk_reduction","compliance"],"expense":["models","cloud","infrastructure","workforce","governance","security","operations","vendors"]}'::jsonb);

-- Phase 48 — Reference Data Model
INSERT INTO dashboard_catalog
    (phase_id, category_id, slug, name, purpose, primary_audience, primary_visualization, refresh_cadence, backend_endpoint, backend_status, is_top1_addition, priority, scenario_plan)
VALUES
    (48, (SELECT id FROM dashboard_category WHERE phase_id=48 AND code='eardm_canonical'),
     'eardm_canonical_model', 'EARDM Canonical Model Dashboard', 'Strategy→Portfolio→Program→Product→Capability→Service→Agent→Model→Prompt→Knowledge',
     'ENG', 'dag', 'monthly', NULL, 'spec', FALSE, 1,
     '{"chain":["strategy","portfolio","program","product","capability","service","agent","model","prompt","knowledge"]}'::jsonb),

    (48, (SELECT id FROM dashboard_category WHERE phase_id=48 AND code='eardm_registries'),
     'eardm_model_registry', 'Model Registry Schema Dashboard', 'Model entity: id/name/provider/version/cost/accuracy/trust/SLA',
     'ENG', 'kpi_card', 'real-time-60s', '/api/v1/holy/evals/functional/_global', 'partial', FALSE, 1,
     '{"attributes":["model_id","name","provider","version","cost","accuracy","trust_score","sla"]}'::jsonb),

    (48, (SELECT id FROM dashboard_category WHERE phase_id=48 AND code='eardm_registries'),
     'eardm_prompt_registry', 'Prompt Registry Schema Dashboard', 'Prompt entity: id/owner/version/status/risk/trust/eval',
     'ENG', 'kpi_card', 'real-time-60s', NULL, 'spec', FALSE, 1,
     '{"attributes":["prompt_id","name","owner","version","status","risk_level","trust_score","evaluation_score"]}'::jsonb),

    (48, (SELECT id FROM dashboard_category WHERE phase_id=48 AND code='eardm_registries'),
     'eardm_agent_registry', 'Agent Registry Schema Dashboard', 'Agent entity: id/name/type/owner/status/trust/cost/SLA',
     'ENG', 'kpi_card', 'real-time-60s', '/api/v1/holy/agentic_stack/_global', 'partial', FALSE, 1,
     '{"attributes":["agent_id","name","type","owner","status","trust_score","cost","sla"]}'::jsonb),

    (48, (SELECT id FROM dashboard_category WHERE phase_id=48 AND code='eardm_rag'),
     'eardm_rag_lineage', 'RAG Lineage Dashboard', 'Document→Chunk→Embedding→Index→Retrieval→Citation→Evaluation',
     'ENG', 'dag', 'daily', NULL, 'spec', FALSE, 1,
     '{"chain":["source","document","chunk","embedding","index","retrieval","citation","evaluation"]}'::jsonb),

    (48, (SELECT id FROM dashboard_category WHERE phase_id=48 AND code='eardm_kpi'),
     'eardm_kpi_metadata', 'KPI Metadata Dashboard', 'KPI catalog: id/name/definition/owner/calculation/frequency/threshold/dashboard',
     'OPS', 'kpi_card', 'daily', NULL, 'spec', FALSE, 1,
     '{"attributes":["kpi_id","name","definition","owner","calculation","frequency","threshold","dashboard"]}'::jsonb);

-- Phase 49 — Knowledge Graph
INSERT INTO dashboard_catalog
    (phase_id, category_id, slug, name, purpose, primary_audience, primary_visualization, refresh_cadence, backend_endpoint, backend_status, is_top1_addition, priority, scenario_plan)
VALUES
    (49, (SELECT id FROM dashboard_category WHERE phase_id=49 AND code='kg_executive'),
     'kg_executive', 'Knowledge Graph Executive Dashboard', 'Connected Assets / Graph Coverage / Knowledge Freshness / Trust / Search Success',
     'EXEC', 'kpi_card', 'daily', NULL, 'spec', FALSE, 1,
     '{"kpis":["connected_assets","graph_coverage","knowledge_freshness","trust_score","search_success","relationship_quality","metadata_completeness","graph_growth"]}'::jsonb),

    (49, (SELECT id FROM dashboard_category WHERE phase_id=49 AND code='kg_domains'),
     'kg_org_graph', 'Organization Graph Dashboard', 'Enterprise→BU→Dept→Team→User→Role→Partner→Vendor',
     'EXEC', 'network_graph', 'weekly', NULL, 'spec', FALSE, 1,
     '{"nodes":["enterprise","business_unit","department","team","user","role","partner","vendor"]}'::jsonb),

    (49, (SELECT id FROM dashboard_category WHERE phase_id=49 AND code='kg_domains'),
     'kg_product_graph', 'Product Graph Dashboard', 'Portfolio→Program→Product→Service→Capability→Feature→KPI→Value Stream',
     'EXEC', 'force_graph', 'weekly', NULL, 'spec', FALSE, 1,
     '{"nodes":["portfolio","program","product","service","capability","feature","kpi","value_stream"]}'::jsonb),

    (49, (SELECT id FROM dashboard_category WHERE phase_id=49 AND code='kg_domains'),
     'kg_agent_graph', 'Agent Graph Dashboard', 'Agent→Workflow→Tool→Memory→MCP→User→Goal→Task',
     'ENG', 'network_graph', 'daily', NULL, 'spec', FALSE, 1,
     '{"nodes":["agent","workflow","tool","memory","mcp","user","goal","task"]}'::jsonb),

    (49, (SELECT id FROM dashboard_category WHERE phase_id=49 AND code='kg_governance'),
     'kg_governance_graph', 'Governance Graph Dashboard', 'Policy→Standard→Control→Risk→Audit→Evidence→Exception→Regulation',
     'RISK', 'force_graph', 'weekly', '/api/v1/holy/security/_global', 'partial', FALSE, 1,
     '{"nodes":["policy","standard","control","risk","audit","evidence","exception","regulation"]}'::jsonb),

    (49, (SELECT id FROM dashboard_category WHERE phase_id=49 AND code='kg_governance'),
     'kg_trust_graph', 'Trust Graph Dashboard', 'Trust/Safety/Fairness/Explainability/Human Oversight/Incident/Risk/Control',
     'RISK', 'radar', 'hourly', '/api/v1/holy/evals/safety/_global', 'partial', FALSE, 1,
     '{"nodes":["trust_score","safety_score","fairness_score","explainability","human_oversight","incident","risk","control"]}'::jsonb),

    (49, (SELECT id FROM dashboard_category WHERE phase_id=49 AND code='kg_powered'),
     'kg_powered_rag', 'Graph-Powered RAG Dashboard', 'Question→Graph Traversal→Vector Search→Reasoning quality metrics',
     'ENG', 'dag', 'real-time-60s', NULL, 'spec', TRUE, 1,
     '{"flow":"question→graph_traversal→vector_search→reasoning","quality":["context","accuracy","explainability","trust","governance","discovery"]}'::jsonb);

-- Phase 50 — Master Repository
INSERT INTO dashboard_catalog
    (phase_id, category_id, slug, name, purpose, primary_audience, primary_visualization, refresh_cadence, backend_endpoint, backend_status, is_top1_addition, priority, scenario_plan)
VALUES
    (50, (SELECT id FROM dashboard_category WHERE phase_id=50 AND code='master_inventory'),
     'master_inventory', 'Enterprise AI OS Master Inventory Dashboard', '1000+ KPIs / 500+ Dashboards / 1000+ Controls / 1000+ SOPs',
     'EXEC', 'sunburst', 'monthly', NULL, 'spec', FALSE, 1,
     '{"counts":{"kpis":1000,"dashboards":500,"controls":1000,"sops":1000,"runbooks":1000,"policies":500,"standards":500,"services":500,"products":500,"metadata_entities":1000}}'::jsonb),

    (50, (SELECT id FROM dashboard_category WHERE phase_id=50 AND code='master_lineage'),
     'master_cross_phase', 'Cross-Phase Lineage Dashboard', 'Trace any artifact from Strategy → Operations across all 50 phases',
     'ENG', 'sankey', 'monthly', NULL, 'spec', TRUE, 1,
     '{"phases":50,"lineage_depth":"strategy→portfolio→program→product→service→agent→model→prompt→knowledge→decision→value"}'::jsonb);

-- ----------------------------------------------------------------------------
-- Update sample drill-down links — Phases 40-50 mostly drill INTO Phases 1-7
-- ----------------------------------------------------------------------------
UPDATE dashboard_catalog SET drill_into_id = (SELECT id FROM dashboard_catalog WHERE slug='ai_cost')         WHERE slug='cfo_cockpit';
UPDATE dashboard_catalog SET drill_into_id = (SELECT id FROM dashboard_catalog WHERE slug='ai_risk_heatmap') WHERE slug='autonomous_security';
UPDATE dashboard_catalog SET drill_into_id = (SELECT id FROM dashboard_catalog WHERE slug='ai_cost')         WHERE slug='cost_optimization';
UPDATE dashboard_catalog SET drill_into_id = (SELECT id FROM dashboard_catalog WHERE slug='ai_roi')          WHERE slug='value_attribution';
