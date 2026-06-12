-- §144 · Full Enterprise AI OS persistent tables (operator master spec L10-L18)
-- Created 2026-06-11 · idempotent · CREATE TABLE IF NOT EXISTS

-- ════════════════════════════════════════════════════════════════
-- L12 · Evaluation + Benchmarking + Quality Engineering
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS benchmark_registry (
  benchmark_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_name VARCHAR(250) NOT NULL,
  benchmark_type VARCHAR(100),
  benchmark_definition JSONB,
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS golden_dataset (
  dataset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_name VARCHAR(250),
  dataset_type VARCHAR(100),
  source_reference UUID,
  approved_by VARCHAR(200),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experiment_run (
  experiment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_name VARCHAR(250),
  variant_a VARCHAR(100),
  variant_b VARCHAR(100),
  winner VARCHAR(100),
  metrics JSONB,
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- L13 · Learning Engine + Fine-Tuning Factory
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS prompt_version (
  prompt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_name VARCHAR(200),
  version VARCHAR(50),
  prompt_text TEXT,
  benchmark_score DECIMAL(5,2),
  active BOOLEAN DEFAULT FALSE,
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_version (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(200),
  version VARCHAR(50),
  benchmark_score DECIMAL(5,2),
  promoted BOOLEAN DEFAULT FALSE,
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_learning (
  learning_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id VARCHAR(200),
  success_rate DECIMAL(5,2),
  average_duration INT,
  optimization_score DECIMAL(5,2),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback_learning (
  learning_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(100),
  entity_id VARCHAR(200),
  original_recommendation TEXT,
  corrected_recommendation TEXT,
  correction_reason TEXT,
  reviewer_id VARCHAR(200),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fine_tune_job (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID,
  base_model VARCHAR(100),
  target_model VARCHAR(100),
  status VARCHAR(50) DEFAULT 'queued',
  benchmark_score DECIMAL(5,2),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- L14 · Autonomous Execution Engine
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS execution_plan (
  execution_plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_type VARCHAR(100),
  related_id VARCHAR(200),
  execution_graph JSONB,
  risk_score INT,
  approval_required BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'draft',
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution_node (
  node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_plan_id UUID REFERENCES execution_plan(execution_plan_id),
  node_name VARCHAR(200),
  node_type VARCHAR(100),
  dependency_node_id UUID,
  status VARCHAR(50) DEFAULT 'pending',
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS validation_result (
  validation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_run_id UUID,
  validation_type VARCHAR(100),
  result VARCHAR(50),
  evidence JSONB,
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rollback_execution (
  rollback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_run_id UUID,
  rollback_plan JSONB,
  rollback_status VARCHAR(50) DEFAULT 'pending',
  executed_at TIMESTAMPTZ,
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS self_healing_rule (
  rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_condition JSONB,
  action_id VARCHAR(200),
  validation_required BOOLEAN DEFAULT TRUE,
  active BOOLEAN DEFAULT TRUE,
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- L15 · Control Tower (additional inventories)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS prompt_inventory (
  inventory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_name VARCHAR(200),
  owner_team VARCHAR(200),
  version VARCHAR(50),
  active BOOLEAN DEFAULT TRUE,
  lifecycle_stage VARCHAR(50),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_inventory (
  inventory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name VARCHAR(200),
  owner_team VARCHAR(200),
  workflow_type VARCHAR(100),
  status VARCHAR(50),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_risk (
  risk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_category VARCHAR(100),
  risk_score INT,
  mitigation_plan TEXT,
  owner_team VARCHAR(200),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_cost (
  cost_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_type VARCHAR(100),
  service_name VARCHAR(200),
  amount DECIMAL(18,4),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compliance_control (
  control_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework VARCHAR(100),
  control_name VARCHAR(300),
  status VARCHAR(50),
  evidence JSONB,
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- L16 · AI OS (capability + workspace + workforce + marketplaces)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS capability (
  capability_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_name VARCHAR(250),
  business_owner VARCHAR(200),
  technology_owner VARCHAR(200),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace (
  workspace_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_name VARCHAR(250),
  workspace_type VARCHAR(100),
  owner_id VARCHAR(200),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS digital_worker (
  worker_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(200),
  department_id UUID,
  role_name VARCHAR(200),
  manager_agent_id VARCHAR(200),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS digital_team (
  team_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name VARCHAR(200),
  department_id UUID,
  manager_agent_id VARCHAR(200),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_marketplace (
  listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(200),
  listing_name VARCHAR(250),
  description TEXT,
  price_per_run DECIMAL(10,4),
  rating DECIMAL(3,2),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prompt_marketplace (
  listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID,
  listing_name VARCHAR(250),
  rating DECIMAL(3,2),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- L17 · Data Fabric · Data Mesh · Knowledge Fabric
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS data_domain (
  domain_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_name VARCHAR(200),
  owner_id VARCHAR(200),
  steward_id VARCHAR(200),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_product (
  data_product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name VARCHAR(250),
  domain_id UUID REFERENCES data_domain(domain_id),
  owner_id VARCHAR(200),
  sla_minutes INT,
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_catalog (
  catalog_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name VARCHAR(250),
  asset_type VARCHAR(100),
  owner_id VARCHAR(200),
  classification VARCHAR(100),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_lineage (
  lineage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_asset UUID,
  target_asset UUID,
  relationship_type VARCHAR(100),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_registry (
  feature_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name VARCHAR(250),
  feature_definition TEXT,
  owner_id VARCHAR(200),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vector_asset (
  vector_asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(100),
  source_id VARCHAR(200),
  embedding_model VARCHAR(100),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decision_asset (
  decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type VARCHAR(100),
  evidence JSONB,
  outcome TEXT,
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rag_evaluation_v2 (
  evaluation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID,
  retrieval_precision DECIMAL(5,2),
  retrieval_recall DECIMAL(5,2),
  groundedness_score DECIMAL(5,2),
  faithfulness_score DECIMAL(5,2),
  citation_score DECIMAL(5,2),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- L18 · Process Mining + Autonomous Department Framework
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS process_discovery (
  discovery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID,
  discovered_process JSONB,
  confidence_score DECIMAL(5,2),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS process_conformance (
  conformance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID,
  compliance_score DECIMAL(5,2),
  deviation_count INT,
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS process_metric (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID,
  metric_name VARCHAR(200),
  metric_value DECIMAL(18,4),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bottleneck_analysis (
  bottleneck_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_step VARCHAR(250),
  average_delay_hours DECIMAL(18,4),
  severity VARCHAR(50),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_candidate (
  candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID,
  process_step VARCHAR(250),
  automation_score DECIMAL(5,2),
  roi_score DECIMAL(5,2),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS autonomy_score (
  score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID,
  readiness_score DECIMAL(5,2),
  autonomy_level INT,
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS autonomous_department (
  department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_name VARCHAR(200),
  autonomy_score DECIMAL(5,2),
  automation_score DECIMAL(5,2),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_catalog (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID,
  task_name VARCHAR(250),
  frequency INT,
  automation_potential DECIMAL(5,2),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workforce_analysis (
  analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID,
  human_cost DECIMAL(18,2),
  agent_cost DECIMAL(18,2),
  savings DECIMAL(18,2),
  tenant_id VARCHAR(64) DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- Indexes for performance
-- ════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_proc_discovery_dept ON process_discovery(department_id);
CREATE INDEX IF NOT EXISTS idx_bottleneck_step ON bottleneck_analysis(process_step);
CREATE INDEX IF NOT EXISTS idx_autonomy_dept ON autonomy_score(department_id);
CREATE INDEX IF NOT EXISTS idx_data_product_domain ON data_product(domain_id);
CREATE INDEX IF NOT EXISTS idx_exec_plan_status ON execution_plan(status);
