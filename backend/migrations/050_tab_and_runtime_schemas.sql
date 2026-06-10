-- Migration 050 — Per-tab and per-runtime-layer database schemas
-- Generated from TAB_DATABASE + LAYER_DATABASE + CANONICAL_COLUMNS in
-- frontend/src/pages/bank/BankUseCasePage.jsx (operator 2026-06-05).
-- Composes with:
--   §57.6 canonical fields (request_id · tenant_id · actor · latency_ms · outcome)
--   §47.6 multi-tenant isolation via tenant_id
--   §38.3 audit row immutability (every table append-only; DELETE = soft via deleted_at)
--   §76 technical runtime layers (rt_* tables)
--   §77.1 ownership matrix (owner column on every primary table)

-- ============================================================
-- Canonical columns (every primary table includes these via the macro below)
-- id          UUID PRIMARY KEY
-- request_id  UUID NOT NULL                — §57.6 propagated
-- tenant_id   TEXT NOT NULL                — §47.6 multi-tenant
-- actor       TEXT NOT NULL                — §57.6 who/what triggered
-- created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- latency_ms  INTEGER                      — §57.6 canonical latency
-- outcome     TEXT                         — ok | denied | failed | timeout
-- owner_role  TEXT                         — §77.1 accountability (R)
-- deleted_at  TIMESTAMPTZ                  — soft delete for GDPR
-- ============================================================

-- ============================================================
-- TAB-LEVEL TABLES (22 tabs)
-- ============================================================

-- README tab
CREATE TABLE IF NOT EXISTS tab_readme (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms INTEGER,
  outcome TEXT,
  owner_role TEXT DEFAULT 'Enterprise Architect',
  deleted_at TIMESTAMPTZ,
  title TEXT,
  section TEXT,
  content JSONB,
  version TEXT
);
CREATE TABLE IF NOT EXISTS tab_readme_brd (LIKE tab_readme INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_readme_frd (LIKE tab_readme INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_readme_hld (LIKE tab_readme INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_readme_adr (LIKE tab_readme INCLUDING ALL);
CREATE INDEX IF NOT EXISTS idx_tab_readme_tenant ON tab_readme(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tab_readme_created ON tab_readme(created_at);

-- Overview tab
CREATE TABLE IF NOT EXISTS tab_overview (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms INTEGER,
  outcome TEXT,
  owner_role TEXT DEFAULT 'Process Owner',
  deleted_at TIMESTAMPTZ,
  headline TEXT,
  status TEXT,
  owner TEXT,
  kpi_snapshot JSONB
);
CREATE TABLE IF NOT EXISTS tab_overview_snapshots (LIKE tab_overview INCLUDING ALL);
CREATE INDEX IF NOT EXISTS idx_tab_overview_tenant ON tab_overview(tenant_id);

-- Product Manager tab
CREATE TABLE IF NOT EXISTS tab_product_mgr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms INTEGER,
  outcome TEXT,
  owner_role TEXT DEFAULT 'AI Product Manager',
  deleted_at TIMESTAMPTZ,
  epic_id UUID,
  story_id UUID,
  priority TEXT,
  estimate INTEGER
);
CREATE TABLE IF NOT EXISTS tab_pm_stories (LIKE tab_product_mgr INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_pm_epics (LIKE tab_product_mgr INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_pm_sprints (LIKE tab_product_mgr INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_pm_releases (LIKE tab_product_mgr INCLUDING ALL);

-- Process tab
CREATE TABLE IF NOT EXISTS tab_process (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms INTEGER,
  outcome TEXT,
  owner_role TEXT DEFAULT 'Process Owner',
  deleted_at TIMESTAMPTZ,
  run_id UUID,
  step TEXT,
  status TEXT,
  result JSONB
);
CREATE TABLE IF NOT EXISTS tab_process_runs (LIKE tab_process INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_process_approvals (LIKE tab_process INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_process_history (LIKE tab_process INCLUDING ALL);

-- Data tab
CREATE TABLE IF NOT EXISTS tab_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latency_ms INTEGER,
  outcome TEXT,
  owner_role TEXT DEFAULT 'Data Owner',
  deleted_at TIMESTAMPTZ,
  source_id TEXT,
  quality_score NUMERIC,
  freshness_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS tab_data_sources (LIKE tab_data INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_data_quality (LIKE tab_data INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_data_lineage (LIKE tab_data INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_data_master (LIKE tab_data INCLUDING ALL);

-- Analytics tab
CREATE TABLE IF NOT EXISTS tab_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'Analytics Lead', deleted_at TIMESTAMPTZ,
  feature_name TEXT, eval_metric TEXT, score NUMERIC
);
CREATE TABLE IF NOT EXISTS tab_analytics_eda (LIKE tab_analytics INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_analytics_features (LIKE tab_analytics INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_analytics_evals (LIKE tab_analytics INCLUDING ALL);

-- AI tab
CREATE TABLE IF NOT EXISTS tab_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'AI Engineering Lead', deleted_at TIMESTAMPTZ,
  model_name TEXT, version TEXT, accuracy NUMERIC, ai_type TEXT
);
CREATE TABLE IF NOT EXISTS tab_ai_models (LIKE tab_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_ai_agents (LIKE tab_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_ai_experiments (LIKE tab_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_ai_registry (LIKE tab_ai INCLUDING ALL);

-- User Story tab
CREATE TABLE IF NOT EXISTS tab_user_story (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'AI Product Manager', deleted_at TIMESTAMPTZ,
  story_id UUID, as_a TEXT, i_want TEXT, so_that TEXT
);
CREATE TABLE IF NOT EXISTS tab_story_business (LIKE tab_user_story INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_story_functional (LIKE tab_user_story INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_story_acceptance (LIKE tab_user_story INCLUDING ALL);

-- User Demo tab
CREATE TABLE IF NOT EXISTS tab_user_demo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'Solution Architect', deleted_at TIMESTAMPTZ,
  persona TEXT, scenario TEXT, recording_url TEXT
);
CREATE TABLE IF NOT EXISTS tab_demo_scripts (LIKE tab_user_demo INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_demo_recordings (LIKE tab_user_demo INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_demo_feedback (LIKE tab_user_demo INCLUDING ALL);

-- Explainable AI tab
CREATE TABLE IF NOT EXISTS tab_exp_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'AI Reviewer', deleted_at TIMESTAMPTZ,
  prediction_id UUID, feature TEXT, shap_value NUMERIC, confidence NUMERIC
);
CREATE TABLE IF NOT EXISTS tab_shap (LIKE tab_exp_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_lime (LIKE tab_exp_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_counterfactual (LIKE tab_exp_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_decision_path (LIKE tab_exp_ai INCLUDING ALL);

-- Responsible AI tab
CREATE TABLE IF NOT EXISTS tab_res_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'Responsible AI Lead', deleted_at TIMESTAMPTZ,
  "group" TEXT, disparate_impact NUMERIC, eq_opp_gap NUMERIC
);
CREATE TABLE IF NOT EXISTS tab_fairness (LIKE tab_res_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_bias_audit (LIKE tab_res_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_oversight (LIKE tab_res_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_accountability (LIKE tab_res_ai INCLUDING ALL);

-- Governance AI tab
CREATE TABLE IF NOT EXISTS tab_gov_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'AI Governance Lead', deleted_at TIMESTAMPTZ,
  policy_id TEXT, control_id TEXT, effectiveness NUMERIC, risk_level TEXT
);
CREATE TABLE IF NOT EXISTS tab_policies (LIKE tab_gov_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_controls (LIKE tab_gov_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_approvals (LIKE tab_gov_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_risk_register (LIKE tab_gov_ai INCLUDING ALL);

-- Compliance AI tab
CREATE TABLE IF NOT EXISTS tab_comp_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'Compliance Lead', deleted_at TIMESTAMPTZ,
  regulation TEXT, violation_id UUID, severity TEXT
);
CREATE TABLE IF NOT EXISTS tab_regulations (LIKE tab_comp_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_violations (LIKE tab_comp_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_audit_findings (LIKE tab_comp_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_certifications (LIKE tab_comp_ai INCLUDING ALL);

-- Incident AI tab
CREATE TABLE IF NOT EXISTS tab_inc_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'SRE Lead', deleted_at TIMESTAMPTZ,
  incident_id UUID, severity TEXT, root_cause TEXT, mttr_minutes INTEGER
);
CREATE TABLE IF NOT EXISTS tab_incidents (LIKE tab_inc_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_postmortems (LIKE tab_inc_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_corrective_actions (LIKE tab_inc_ai INCLUDING ALL);

-- Meeting AI tab
CREATE TABLE IF NOT EXISTS tab_meet_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'Process Owner', deleted_at TIMESTAMPTZ,
  meeting_id UUID, participants TEXT[], decision TEXT, action_owner TEXT
);
CREATE TABLE IF NOT EXISTS tab_meetings (LIKE tab_meet_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_transcripts (LIKE tab_meet_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_action_items (LIKE tab_meet_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_decisions (LIKE tab_meet_ai INCLUDING ALL);

-- Note AI tab
CREATE TABLE IF NOT EXISTS tab_note_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'Knowledge Manager', deleted_at TIMESTAMPTZ,
  note_id UUID, title TEXT, content TEXT, tags TEXT[], category TEXT
);
CREATE TABLE IF NOT EXISTS tab_notes (LIKE tab_note_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_tags (LIKE tab_note_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_knowledge_links (LIKE tab_note_ai INCLUDING ALL);

-- Test AI tab
CREATE TABLE IF NOT EXISTS tab_test_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'Test Architect', deleted_at TIMESTAMPTZ,
  suite TEXT, case_id TEXT, passed BOOLEAN, coverage_pct NUMERIC
);
CREATE TABLE IF NOT EXISTS tab_tests_positive (LIKE tab_test_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_tests_negative (LIKE tab_test_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_tests_regression (LIKE tab_test_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_defects (LIKE tab_test_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_coverage (LIKE tab_test_ai INCLUDING ALL);

-- Job AI tab
CREATE TABLE IF NOT EXISTS tab_job_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'Platform Engineer', deleted_at TIMESTAMPTZ,
  job_name TEXT, cron_expr TEXT, next_run TIMESTAMPTZ, lock_key TEXT
);
CREATE TABLE IF NOT EXISTS tab_jobs (LIKE tab_job_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_cron (LIKE tab_job_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_runs (LIKE tab_job_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_failures (LIKE tab_job_ai INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_retries (LIKE tab_job_ai INCLUDING ALL);

-- Business Value tab
CREATE TABLE IF NOT EXISTS tab_biz_value (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'AI Strategy Lead', deleted_at TIMESTAMPTZ,
  kpi TEXT, value NUMERIC, target NUMERIC, delta_pct NUMERIC
);
CREATE TABLE IF NOT EXISTS tab_revenue (LIKE tab_biz_value INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_cost (LIKE tab_biz_value INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_productivity (LIKE tab_biz_value INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_risk (LIKE tab_biz_value INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_roi (LIKE tab_biz_value INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_customer (LIKE tab_biz_value INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_employee (LIKE tab_biz_value INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_esg (LIKE tab_biz_value INCLUDING ALL);

-- Dashboard tab
CREATE TABLE IF NOT EXISTS tab_dashboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'BI Lead', deleted_at TIMESTAMPTZ,
  role TEXT, tile_id TEXT, metric TEXT, value NUMERIC
);
CREATE TABLE IF NOT EXISTS tab_kpi_tiles (LIKE tab_dashboard INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_charts (LIKE tab_dashboard INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_drill_downs (LIKE tab_dashboard INCLUDING ALL);

-- Operations tab
CREATE TABLE IF NOT EXISTS tab_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'SRE Lead', deleted_at TIMESTAMPTZ,
  service TEXT, alert_id UUID, p95_latency NUMERIC, sla_target NUMERIC
);
CREATE TABLE IF NOT EXISTS tab_ops_monitoring (LIKE tab_operations INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_ops_alerts (LIKE tab_operations INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_ops_deploys (LIKE tab_operations INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_ops_rollbacks (LIKE tab_operations INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_ops_sla (LIKE tab_operations INCLUDING ALL);

-- Reports tab
CREATE TABLE IF NOT EXISTS tab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'Reporting Lead', deleted_at TIMESTAMPTZ,
  report_id TEXT, cadence TEXT, format TEXT, distributed_to TEXT[]
);
CREATE TABLE IF NOT EXISTS tab_report_runs (LIKE tab_reports INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_report_distribution (LIKE tab_reports INCLUDING ALL);
CREATE TABLE IF NOT EXISTS tab_report_evidence (LIKE tab_reports INCLUDING ALL);

-- ============================================================
-- RUNTIME-LAYER TABLES (§76 — 9 layers)
-- ============================================================

-- §76.1 Memory Operations
CREATE TABLE IF NOT EXISTS rt_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'MemoryOps Lead', deleted_at TIMESTAMPTZ,
  memory_type TEXT, salience NUMERIC, ttl_seconds INTEGER, payload JSONB
);
CREATE TABLE IF NOT EXISTS rt_memory_records (LIKE rt_memory INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_memory_versions (LIKE rt_memory INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_memory_links (LIKE rt_memory INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_memory_audit (LIKE rt_memory INCLUDING ALL);
CREATE INDEX IF NOT EXISTS idx_rt_memory_tenant ON rt_memory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rt_memory_type ON rt_memory(memory_type);

-- §76.2 Context Engineering
CREATE TABLE IF NOT EXISTS rt_context_eng (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'Context Engineering Lead', deleted_at TIMESTAMPTZ,
  source_id TEXT, relevance_score NUMERIC, citation JSONB
);
CREATE TABLE IF NOT EXISTS rt_context_sources (LIKE rt_context_eng INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_context_rankings (LIKE rt_context_eng INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_context_evidence (LIKE rt_context_eng INCLUDING ALL);

-- §76.3 Context Window Management
CREATE TABLE IF NOT EXISTS rt_context_window (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'LLMOps Lead', deleted_at TIMESTAMPTZ,
  layer_id TEXT, allocated_tokens INTEGER, used_tokens INTEGER
);
CREATE TABLE IF NOT EXISTS rt_token_budgets (LIKE rt_context_window INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_window_layers (LIKE rt_context_window INCLUDING ALL);

-- §76.4 Tool Layer
CREATE TABLE IF NOT EXISTS rt_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'Platform Engineering Lead', deleted_at TIMESTAMPTZ,
  tool_id TEXT, args JSONB, result JSONB, cost_usd NUMERIC
);
CREATE TABLE IF NOT EXISTS rt_tool_registry (LIKE rt_tools INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_tool_invocations (LIKE rt_tools INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_tool_results (LIKE rt_tools INCLUDING ALL);

-- §76.5 MCP Architecture
CREATE TABLE IF NOT EXISTS rt_mcp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'Platform Engineering Lead', deleted_at TIMESTAMPTZ,
  server_id TEXT, endpoint TEXT, scope_required TEXT, scope_granted BOOLEAN
);
CREATE TABLE IF NOT EXISTS rt_mcp_servers (LIKE rt_mcp INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_mcp_requests (LIKE rt_mcp INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_mcp_policies (LIKE rt_mcp INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_mcp_audit (LIKE rt_mcp INCLUDING ALL);

-- §76.6 RAG Architecture
CREATE TABLE IF NOT EXISTS rt_rag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'RAG Team Lead', deleted_at TIMESTAMPTZ,
  chunk_id UUID,
  -- vector VECTOR(768),   -- enable when pgvector extension is installed
  rerank_score NUMERIC, source_uri TEXT
);
CREATE TABLE IF NOT EXISTS rt_rag_chunks (LIKE rt_rag INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_rag_embeddings (LIKE rt_rag INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_rag_retrievals (LIKE rt_rag INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_rag_citations (LIKE rt_rag INCLUDING ALL);

-- §76.7 Model Serving
CREATE TABLE IF NOT EXISTS rt_model_serving (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'LLMOps Lead', deleted_at TIMESTAMPTZ,
  model TEXT, version TEXT, tokens_in INTEGER, tokens_out INTEGER, cost_usd NUMERIC
);
CREATE TABLE IF NOT EXISTS rt_model_registry (LIKE rt_model_serving INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_inference_calls (LIKE rt_model_serving INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_safety_filters (LIKE rt_model_serving INCLUDING ALL);

-- §76.8 Multi-Agent System
CREATE TABLE IF NOT EXISTS rt_multi_agent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'AgentOps Lead', deleted_at TIMESTAMPTZ,
  agent_role TEXT, parent_run_id UUID, message TEXT, state_snapshot JSONB
);
CREATE TABLE IF NOT EXISTS rt_agent_runs (LIKE rt_multi_agent INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_agent_messages (LIKE rt_multi_agent INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_agent_state (LIKE rt_multi_agent INCLUDING ALL);

-- §76.9 Evaluation Framework
CREATE TABLE IF NOT EXISTS rt_eval (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL, tenant_id TEXT NOT NULL, actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), latency_ms INTEGER, outcome TEXT,
  owner_role TEXT DEFAULT 'QA Lead', deleted_at TIMESTAMPTZ,
  metric TEXT, score NUMERIC, baseline NUMERIC, drift_psi NUMERIC
);
CREATE TABLE IF NOT EXISTS rt_eval_results (LIKE rt_eval INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_eval_benchmarks (LIKE rt_eval INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_eval_drift (LIKE rt_eval INCLUDING ALL);
CREATE TABLE IF NOT EXISTS rt_eval_feedback (LIKE rt_eval INCLUDING ALL);

-- ============================================================
-- Activity log table (for prompt history + button presses)
-- Operator 2026-06-05: "save all input prompt and show on UI"
-- ============================================================
CREATE TABLE IF NOT EXISTS insur_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kind TEXT NOT NULL,           -- 'global' | 'ai' | 'action' | 'navigation'
  text TEXT,                    -- prompt text or action label
  role TEXT,                    -- active role at the moment
  url TEXT,                     -- workspace URL when fired
  payload JSONB                 -- per-kind extras (component, op, sub-tab, etc.)
);
CREATE INDEX IF NOT EXISTS idx_activity_tenant_kind ON insur_activity_log(tenant_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_actor ON insur_activity_log(actor, created_at DESC);
