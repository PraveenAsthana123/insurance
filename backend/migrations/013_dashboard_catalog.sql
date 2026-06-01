-- 013_dashboard_catalog.sql — UI Dashboard Catalog
-- ----------------------------------------------------------------------------
-- Persists the top-1% enterprise AI dashboard taxonomy (7 phases, ~665
-- dashboards) so the frontend can render them from a queryable source +
-- the governance team can audit "which dashboards are missing backends"
-- via SQL instead of grep'ing markdown.
--
-- Schema:
--   dashboard_phase           the 7 phases (Executive / LLM Ops / RAG / ...)
--   dashboard_category        sub-grouping within a phase (Cost, Quality, ...)
--   dashboard_audience        who consumes it (EXEC, OPS, ENG, RISK, BIZ, PROD)
--   dashboard_visualization   reference table of chart types (Line, Bar, ...)
--   dashboard_catalog         one row per dashboard — the master inventory
--   dashboard_metric          per-dashboard metric definitions (1-to-many)
--   dashboard_drill_down      level-1 → level-2 → level-3 navigation tree
--
-- Composes with §66 (read-only federation pattern) + §68 (Observability
-- Hub) — every dashboard row points at the backend surface (`backend_endpoint`)
-- that feeds it; NULL = backend not yet shipped.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dashboard_phase (
    id              SMALLINT PRIMARY KEY,
    code            VARCHAR(40) NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    owner           TEXT NOT NULL,
    goal            TEXT,
    estimated_count INTEGER,
    backend_coverage_pct INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_audience (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    persona_examples TEXT,
    desired_visuals  TEXT
);

CREATE TABLE IF NOT EXISTS dashboard_visualization (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    use_case TEXT,
    interactive BOOLEAN NOT NULL DEFAULT TRUE,
    library_hint TEXT  -- recharts / plotly / echarts / d3 / custom
);

CREATE TABLE IF NOT EXISTS dashboard_category (
    id          SERIAL PRIMARY KEY,
    phase_id    SMALLINT NOT NULL REFERENCES dashboard_phase(id),
    code        VARCHAR(80) NOT NULL,
    name        TEXT NOT NULL,
    UNIQUE (phase_id, code)
);

CREATE TABLE IF NOT EXISTS dashboard_catalog (
    id               SERIAL PRIMARY KEY,
    phase_id         SMALLINT NOT NULL REFERENCES dashboard_phase(id),
    category_id      INTEGER REFERENCES dashboard_category(id),
    slug             VARCHAR(120) NOT NULL UNIQUE,
    name             TEXT NOT NULL,
    purpose          TEXT NOT NULL,
    -- Scenario detail plan — JSONB so each dashboard can carry the
    -- richer spec (use-cases, sample queries, mock data shape, etc.)
    -- without forcing schema changes per dashboard.
    scenario_plan    JSONB NOT NULL DEFAULT '{}'::JSONB,
    primary_audience TEXT REFERENCES dashboard_audience(code),
    primary_visualization TEXT REFERENCES dashboard_visualization(code),
    refresh_cadence  VARCHAR(40),  -- 'real-time-60s' / 'hourly' / 'daily' / 'weekly' / 'monthly' / 'quarterly'
    backend_endpoint TEXT,         -- e.g. '/api/v1/holy/evals/cost/_global' OR NULL when backend not yet shipped
    backend_status   VARCHAR(40) NOT NULL DEFAULT 'spec',
                                    -- 'spec' | 'partial' | 'shipped' | 'deprecated'
    is_top1_addition BOOLEAN NOT NULL DEFAULT FALSE,
    priority         SMALLINT NOT NULL DEFAULT 3,  -- 1=must, 2=should, 3=could, 4=nice-to-have
    drill_into_id    INTEGER REFERENCES dashboard_catalog(id),  -- level-N → level-N+1 navigation
    tags             TEXT[] NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_catalog_phase   ON dashboard_catalog(phase_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_catalog_status  ON dashboard_catalog(backend_status);
CREATE INDEX IF NOT EXISTS idx_dashboard_catalog_audience ON dashboard_catalog(primary_audience);

CREATE TABLE IF NOT EXISTS dashboard_metric (
    id            SERIAL PRIMARY KEY,
    dashboard_id  INTEGER NOT NULL REFERENCES dashboard_catalog(id) ON DELETE CASCADE,
    metric_name   TEXT NOT NULL,
    source_field  TEXT,        -- e.g. 'cost_runs.cost_usd'
    aggregation   TEXT,        -- 'sum' / 'count' / 'avg' / 'p95' / 'distinct'
    visualization TEXT REFERENCES dashboard_visualization(code),
    unit          TEXT,        -- 'usd' / 'ms' / 'count' / 'percent'
    -- threshold for gauges / alerts
    threshold_warn NUMERIC,
    threshold_crit NUMERIC,
    UNIQUE (dashboard_id, metric_name)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_metric_dash ON dashboard_metric(dashboard_id);

-- ----------------------------------------------------------------------------
-- Seed: 7 phases (TOC) + Phase 1 fully detailed (23 dashboards)
-- ----------------------------------------------------------------------------

INSERT INTO dashboard_phase (id, code, name, owner, goal, estimated_count, backend_coverage_pct) VALUES
    (1, 'executive',    'Executive AI Governance & Business',       'AI Steering Committee / Business Sponsor / Exec Office', 'Answer "Is enterprise AI healthy, governed, profitable, and safe?" in <60s', 23, 48),
    (2, 'llmops',       'LLM & Model Operations',                    'AI Platform / LLMOps / GenAI Engineering',               'Monitor → Optimize → Evaluate → Govern → Scale → Reduce Cost',                84, 60),
    (3, 'rag',          'RAG & Retrieval Operations',                'RAG Engineering / Knowledge Engineering',                '70-90% of GenAI prod issues live here — retrieval/index/freshness/perm',     160, 30),
    (4, 'agentops',     'Agentic AI & Multi-Agent Operations',       'AgentOps / Agent Engineering',                          'Monitor agents, planning, reasoning, tools, memory, coordination, control',  80, 40),
    (5, 'mcp_workflow', 'MCP, Tooling, Workflow & Integration',      'Platform / Integration',                                'MCP servers + tool registry + workflows + LangGraph + APIs + enterprise apps',106, 20),
    (6, 'sec_gov',      'Security, Compliance, Governance & RAI',    'CISO / Legal / Risk / RAI Team',                        'Highest-priority layer for prod AI — auditor/regulator surface',            122, 50),
    (7, 'infra',        'Infrastructure, Cloud, K8s, GPU, Observability', 'SRE / Platform Eng / FinOps',                      'SRE + Platform + LLMOps Infra Layer',                                        90, 10)
ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        owner = EXCLUDED.owner,
        goal = EXCLUDED.goal,
        estimated_count = EXCLUDED.estimated_count,
        backend_coverage_pct = EXCLUDED.backend_coverage_pct;

INSERT INTO dashboard_audience (code, name, persona_examples, desired_visuals) VALUES
    ('EXEC', 'Executive',           'CEO, CFO, CIO, Board, AI Steering',          'KPI cards + gauges + trends + waterfall'),
    ('PROD', 'Product Management',  'Product mgr, AI product owner',              'KPI + funnel + adoption curves'),
    ('OPS',  'AI Operations',       'AI Ops, SRE, LLMOps engineer',               'Heatmaps + time series + alerts'),
    ('ENG',  'Engineering',         'AI engineer, RAG engineer, agent developer', 'Detail tables + traces + drill-downs'),
    ('RISK', 'Risk / Compliance',   'CISO, compliance, legal, audit, RAI',        'Matrices + scorecards + heatmaps'),
    ('BIZ',  'Business / Domain',   'Dept head, line-of-business owner',          'Treemap + waterfall + business KPIs')
ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        persona_examples = EXCLUDED.persona_examples,
        desired_visuals = EXCLUDED.desired_visuals;

INSERT INTO dashboard_visualization (code, name, use_case, interactive, library_hint) VALUES
    ('kpi_card',         'KPI Card + Delta Arrow',           'Single-metric snapshot',                TRUE,  'custom'),
    ('line',             'Line Chart',                        'Trends over time',                      TRUE,  'recharts'),
    ('area',             'Area Chart',                        'Growth + stacked totals',               TRUE,  'recharts'),
    ('bar',              'Bar / Stacked Bar',                 'Comparison + distribution',             TRUE,  'recharts'),
    ('pie',              'Pie',                               'Share of total',                        TRUE,  'recharts'),
    ('donut',            'Donut',                             'Share of total (modern)',               TRUE,  'recharts'),
    ('gauge',            'Gauge',                             'SLA / threshold against target',        TRUE,  'echarts'),
    ('heatmap',          'Heatmap',                           'Failure density / cohort analysis',     TRUE,  'plotly'),
    ('treemap',          'Treemap',                           'Cost allocation + hierarchy',           TRUE,  'plotly'),
    ('sankey',           'Sankey',                            'Flow (tokens / routing / leakage)',     TRUE,  'plotly'),
    ('network_graph',    'Network Graph',                     'Agents / MCP / dependencies',           TRUE,  'd3'),
    ('radar',            'Radar / Spider',                    'Multi-axis trust / quality',            TRUE,  'recharts'),
    ('scatter',          'Scatter Plot',                      'Drift + correlation',                   TRUE,  'plotly'),
    ('pca_umap',         'PCA / UMAP Projection',             'Embedding analysis',                    TRUE,  'plotly'),
    ('box',              'Box Plot',                          'Latency distribution',                  TRUE,  'plotly'),
    ('histogram',        'Histogram',                         'Token-size / response-size',            TRUE,  'recharts'),
    ('funnel',           'Funnel',                            'Workflow / approval drop-off',          TRUE,  'recharts'),
    ('timeline',         'Timeline',                          'Incidents + audit trail',               TRUE,  'plotly'),
    ('geo_map',          'Geo Map',                           'Regional usage + attack origin',        TRUE,  'leaflet'),
    ('waterfall',        'Waterfall',                         'Cost decomposition + business value',   TRUE,  'recharts'),
    ('pareto',           'Pareto (80/20)',                    'Root cause analysis',                   TRUE,  'recharts'),
    ('sunburst',         'Sunburst',                          'Hierarchical usage + classification',   TRUE,  'plotly'),
    ('decision_tree',    'Decision Tree',                     'Agent reasoning + tool selection',      TRUE,  'd3'),
    ('chord',            'Chord Diagram',                     'Agent-to-agent collaboration',          TRUE,  'd3'),
    ('fishbone',         'Fishbone / Ishikawa',               'RCA brainstorming',                     FALSE, 'custom'),
    ('leaderboard',      'Leaderboard',                       'Model + agent benchmarking',            TRUE,  'recharts'),
    ('dag',              'DAG Graph',                         'Workflow + LangGraph execution',        TRUE,  'd3'),
    ('risk_heatmap',     'Risk Heatmap',                      'Board-level risk posture',              TRUE,  'plotly'),
    ('compliance_matrix','Compliance Matrix',                 'Regulatory tracking',                   TRUE,  'custom'),
    ('raci_matrix',      'RACI Matrix',                       'Ownership + responsibility',            FALSE, 'custom'),
    ('mitre_matrix',     'MITRE ATT&CK Matrix',               'Red-team / adversarial',                FALSE, 'custom'),
    ('force_graph',      'Force-Directed Graph',              'Knowledge graph + entity influence',    TRUE,  'd3'),
    ('shap',             'SHAP Force Plot',                   'Explainability — feature attribution',  TRUE,  'plotly'),
    ('lime',             'LIME Plot',                         'Local explainability',                  TRUE,  'plotly'),
    ('bullet',           'Bullet Chart',                      'Planned vs actual',                     TRUE,  'recharts'),
    ('scorecard',        'Multi-Axis Scorecard',              'Executive C-level reporting',           FALSE, 'custom'),
    ('s_curve',          'S-Curve / Adoption Curve',          'Rollout adoption analysis',             TRUE,  'recharts'),
    ('kanban',           'Kanban Board',                      'Portfolio + reviewer queue',            TRUE,  'custom')
ON CONFLICT (code) DO UPDATE
    SET name = EXCLUDED.name,
        use_case = EXCLUDED.use_case,
        interactive = EXCLUDED.interactive,
        library_hint = EXCLUDED.library_hint;

-- Phase 1 categories
INSERT INTO dashboard_category (phase_id, code, name) VALUES
    (1, 'executive',     'Executive'),
    (1, 'governance',    'Governance'),
    (1, 'financial',     'Financial'),
    (1, 'business_kpi',  'Business KPI'),
    (1, 'adoption',      'Adoption'),
    (1, 'risk',          'Risk')
ON CONFLICT (phase_id, code) DO NOTHING;

-- Phase 1 dashboard catalog seed (23 dashboards) -----------------------------
INSERT INTO dashboard_catalog
    (phase_id, category_id, slug, name, purpose, primary_audience, primary_visualization, refresh_cadence, backend_endpoint, backend_status, is_top1_addition, priority, scenario_plan)
VALUES
    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='executive'), 'exec_ai',
     'Executive AI Dashboard', 'Overall AI health one-glance', 'EXEC', 'kpi_card', 'real-time-60s',
     '/api/v1/holy/observability-hub/_overview', 'shipped', FALSE, 1,
     '{"hero_tiles":["Total AI Requests (today)","Active Users","Cost (MTD)","ROI YTD","Availability","Open Incidents"],"drill_targets":["business_kpi","ai_cost","ai_governance","ai_risk"],"sample_query":"SELECT n_source_present, n_source_errored FROM /observability-hub/_overview","interactive":["click tile → drill","hover sparkline → 7-day trend","time-range picker"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='financial'), 'ai_cost',
     'AI Cost Dashboard', 'FinOps for AI — total spend by model/team/workflow/agent', 'EXEC', 'treemap', 'real-time-60s',
     '/api/v1/holy/evals/cost/_global', 'shipped', FALSE, 1,
     '{"layout":["treemap: cost by model","line: cost trend 30d","waterfall: cost decomp 24h vs 7d vs 30d","bar: cost by tenant","forecast: 90d projection"],"drill_targets":["model_dashboard"],"interactive":["click treemap cell → per-model history","date-range slider","aggregation toggle: 24h/7d/30d/all"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='adoption'), 'ai_usage',
     'AI Usage Dashboard', 'Adoption — daily users, sessions, growth', 'EXEC', 'line', 'hourly',
     '/api/v1/holy/transactions/_global', 'shipped', FALSE, 1,
     '{"layout":["line: DAU/WAU/MAU","area: cumulative users","bar: sessions per dept","s-curve: adoption rollout"],"interactive":["dept filter","cohort comparison","funnel: signup→first-use→retained"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='business_kpi'), 'business_kpi',
     'Business KPI Dashboard', 'Business value linkage — productivity / revenue / time-saved', 'EXEC', 'treemap', 'daily',
     NULL, 'partial', FALSE, 1,
     '{"layout":["treemap: value by dept","waterfall: planned vs realized","forecast: 12-mo value curve","bullet: KPI vs target"],"sources_needed":["initiative_tracker","okr_system"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='executive'), 'ai_portfolio',
     'AI Portfolio Dashboard', 'Initiative tracking — projects/risks/benefits', 'EXEC', 'kanban', 'weekly',
     NULL, 'spec', FALSE, 2,
     '{"layout":["kanban: backlog/in-flight/launched/sunset","scorecard: per-initiative risk×benefit","timeline: milestones"],"sources_needed":["jira_or_linear"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='governance'), 'ai_governance',
     'AI Governance Dashboard', 'Oversight + policy hits — approvals/policies/exceptions', 'EXEC', 'funnel', 'real-time-60s',
     '/api/v1/holy/guardrails/_global', 'shipped', FALSE, 1,
     '{"layout":["funnel: approve→broker→OpenClaw→complete","matrix: by guardrail_type × decision","timeline: recent denials"],"drill_targets":["guardrails_per_dept","approval_broker_history"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='risk'), 'responsible_ai',
     'Responsible AI Dashboard', 'Trust — fairness, bias, explainability', 'EXEC', 'radar', 'hourly',
     '/api/v1/holy/evals/safety/_global', 'shipped', FALSE, 1,
     '{"layout":["radar: 5 axes (fairness/bias/explainability/transparency/accountability)","gauge: disparate_impact","bar: per-model fairness_gate pass rate"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='risk'), 'ai_risk',
     'AI Risk Dashboard', 'Enterprise AI risk posture', 'EXEC', 'risk_heatmap', 'real-time-60s',
     '/api/v1/holy/security/_global', 'shipped', FALSE, 1,
     '{"layout":["risk_heatmap: probability × impact","kpi: high-risk model count","timeline: incidents 7d","gauge: compliance score"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='governance'), 'ai_compliance',
     'AI Compliance Dashboard', 'Regulatory state — GDPR/HIPAA/ISO42001/NIST RMF', 'RISK', 'compliance_matrix', 'daily',
     '/api/v1/holy/security/_global', 'shipped', FALSE, 1,
     '{"layout":["matrix: framework × control × pass/fail","scorecard: per-framework readiness"],"frameworks":["GDPR","HIPAA","PIPEDA","ISO42001","NIST_RMF","SOC2"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='executive'), 'exec_scorecard',
     'Executive Scorecard', 'C-level monthly summary', 'EXEC', 'scorecard', 'monthly',
     NULL, 'partial', FALSE, 2,
     '{"layout":["scorecard: 5 axes (SLA / Cost / Accuracy / Adoption / ROI)","trend per axis","commentary section"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='financial'), 'ai_roi',
     'AI ROI Dashboard', 'Top-1% — ROI by initiative (NPV/IRR/payback)', 'EXEC', 'waterfall', 'monthly',
     NULL, 'partial', TRUE, 1,
     '{"layout":["waterfall: investment → savings → net","bar: ROI by initiative","forecast: 36-mo NPV"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='financial'), 'ai_investment',
     'AI Investment Dashboard', 'Top-1% — investment trail (capex/opex/burn)', 'EXEC', 'bar', 'monthly',
     NULL, 'spec', TRUE, 2,
     '{"layout":["stacked_bar: capex/opex over time","forecast: run-rate","gauge: budget utilization"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='risk'), 'ai_risk_heatmap',
     'AI Risk Heatmap', 'Top-1% — board-level risk view', 'EXEC', 'risk_heatmap', 'real-time-60s',
     '/api/v1/holy/security/_global', 'shipped', TRUE, 1,
     '{"layout":["heatmap: AI surface × risk category","drill on cell → surface detail"],"axes":["surface","risk_type"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='business_kpi'), 'business_value_realization',
     'Business Value Realization Dashboard', 'Top-1% — planned vs realized', 'BIZ', 'bullet', 'quarterly',
     NULL, 'partial', TRUE, 2,
     '{"layout":["bullet: realized vs planned","waterfall: value-leakage by stage","heatmap: realization % by dept"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='adoption'), 'ai_adoption_curve',
     'AI Adoption Curve Dashboard', 'Top-1% — rollout S-curve', 'EXEC', 's_curve', 'daily',
     '/api/v1/holy/transactions/_global', 'partial', TRUE, 2,
     '{"layout":["s_curve: cumulative adoption","funnel: signup → first-use → retained","cohort: viral coefficient"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='business_kpi'), 'ai_roi_by_dept',
     'AI ROI by Department Dashboard', 'Per-dept value attribution', 'BIZ', 'treemap', 'monthly',
     NULL, 'partial', FALSE, 2,
     '{"layout":["treemap: value by dept","table: ROI per dept × initiative"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='business_kpi'), 'ai_roi_by_usecase',
     'AI ROI by Use Case Dashboard', 'Per-use-case attribution (lead-scoring/churn/forecast)', 'BIZ', 'bar', 'monthly',
     NULL, 'partial', FALSE, 2,
     '{"layout":["bar: ROI per use-case","waterfall: cost/savings per use-case"],"use_cases_source":"holy_nav.process_id"}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='risk'), 'ai_project_risk_register',
     'AI Project Risk Register Dashboard', 'Project-level risk tracking', 'RISK', 'risk_heatmap', 'weekly',
     NULL, 'spec', FALSE, 2,
     '{"layout":["table: open risks","heatmap: severity × probability"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='executive'), 'ai_strategy_alignment',
     'AI Strategy Alignment Dashboard', 'OKR alignment + initiative-to-OKR mapping', 'EXEC', 'raci_matrix', 'quarterly',
     NULL, 'spec', FALSE, 3,
     '{"layout":["raci: initiative × OKR","grid: alignment score per initiative"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='executive'), 'ai_talent_capability',
     'AI Talent & Capability Dashboard', 'Team readiness — headcount/skills/cert/hiring', 'EXEC', 'sunburst', 'monthly',
     NULL, 'spec', FALSE, 3,
     '{"layout":["sunburst: org × discipline × skill","bar: cert coverage"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='financial'), 'ai_vendor_spend',
     'AI Vendor Spend Dashboard', 'Vendor concentration + lock-in risk', 'EXEC', 'treemap', 'monthly',
     NULL, 'spec', FALSE, 2,
     '{"layout":["treemap: $ per vendor","pareto: top-10 vendors","gauge: lock-in risk"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='governance'), 'ai_audit_readiness',
     'AI Audit-Readiness Dashboard', 'Top-1% — audit-prep coverage', 'RISK', 'scorecard', 'weekly',
     '/api/v1/holy/security/_global', 'shipped', TRUE, 1,
     '{"layout":["scorecard: evidence coverage per control","gap-analysis: missing docs","drill: open audit findings"]}'::jsonb),

    (1, (SELECT id FROM dashboard_category WHERE phase_id=1 AND code='risk'), 'ai_incident_exec',
     'AI Incident Executive Dashboard', 'Incident summary for execs (MTTD/MTTR/$ impact)', 'EXEC', 'timeline', 'real-time-60s',
     '/api/v1/holy/transactions/_global', 'shipped', FALSE, 1,
     '{"layout":["timeline: incidents 30d","kpi: MTTD / MTTR / $ impact","pareto: incident causes","filter: severity / category"]}'::jsonb)
ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        purpose = EXCLUDED.purpose,
        primary_audience = EXCLUDED.primary_audience,
        primary_visualization = EXCLUDED.primary_visualization,
        refresh_cadence = EXCLUDED.refresh_cadence,
        backend_endpoint = EXCLUDED.backend_endpoint,
        backend_status = EXCLUDED.backend_status,
        is_top1_addition = EXCLUDED.is_top1_addition,
        priority = EXCLUDED.priority,
        scenario_plan = EXCLUDED.scenario_plan,
        updated_at = NOW();

-- Per-dashboard metric mappings (sample for the Cost Dashboard) -----------
INSERT INTO dashboard_metric (dashboard_id, metric_name, source_field, aggregation, visualization, unit)
SELECT id, m.metric_name, m.source_field, m.aggregation, m.visualization, m.unit
FROM dashboard_catalog d,
LATERAL (VALUES
    ('Monthly Cost (USD)',        'cost_runs.cost_usd',        'sum',      'kpi_card', 'usd'),
    ('Cost Trend 30d',            'cost_runs.cost_usd',        'sum',      'line',     'usd'),
    ('Cost by Model',             'cost_runs.cost_usd',        'sum',      'treemap',  'usd'),
    ('Cost by Tenant',            'cost_runs.cost_usd',        'sum',      'bar',      'usd'),
    ('Cost Forecast 90d',         'cost_runs.cost_usd',        'forecast', 'line',     'usd'),
    ('Total Tokens',              'cost_runs.total_tokens',    'sum',      'kpi_card', 'count'),
    ('Cost per Token',            'cost_runs.cost_usd / total_tokens', 'avg', 'kpi_card', 'usd')
) AS m(metric_name, source_field, aggregation, visualization, unit)
WHERE d.slug = 'ai_cost'
ON CONFLICT (dashboard_id, metric_name) DO NOTHING;

INSERT INTO dashboard_metric (dashboard_id, metric_name, source_field, aggregation, visualization, unit, threshold_warn, threshold_crit)
SELECT id, m.metric_name, m.source_field, m.aggregation, m.visualization, m.unit, m.warn, m.crit
FROM dashboard_catalog d,
LATERAL (VALUES
    ('Hallucination Rate',        'safety_eval.hallucination_rate', 'avg', 'gauge',     'percent', 0.05, 0.10),
    ('Toxicity Score',            'safety_eval.toxicity_score',     'avg', 'gauge',     'percent', 0.02, 0.05),
    ('Bias Score',                'safety_eval.bias_score',         'avg', 'gauge',     'percent', 0.10, 0.20),
    ('Disparate Impact',          'safety_eval.disparate_impact',   'min', 'gauge',     'ratio',   0.80, 0.70),
    ('Equal-Opportunity Gap',     'safety_eval.equal_opportunity_gap','max','gauge',    'percent', 0.05, 0.10),
    ('Fairness Pass Rate',        'safety_eval.fairness_gate',      'percent_pass', 'bar', 'percent', NULL, NULL)
) AS m(metric_name, source_field, aggregation, visualization, unit, warn, crit)
WHERE d.slug = 'responsible_ai'
ON CONFLICT (dashboard_id, metric_name) DO NOTHING;

-- Drill-down hierarchy (exec → level 2)
UPDATE dashboard_catalog SET drill_into_id = (SELECT id FROM dashboard_catalog WHERE slug='business_kpi')   WHERE slug='exec_ai';
UPDATE dashboard_catalog SET drill_into_id = (SELECT id FROM dashboard_catalog WHERE slug='ai_cost')        WHERE slug='ai_roi';
UPDATE dashboard_catalog SET drill_into_id = (SELECT id FROM dashboard_catalog WHERE slug='ai_risk_heatmap') WHERE slug='ai_risk';
