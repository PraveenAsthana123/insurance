-- Iter 42 · Tier-1 #2 · Data integrity constraints across 28 agentic+enterprise tables.
--
-- Adds:
--   · CHECK constraints on enum-shaped columns (status · risk · severity · etc.)
--   · NOT NULL on fields the application treats as required
--   · Foreign keys with NOT VALID + VALIDATE pattern (won't block existing rows)
--   · BEFORE UPDATE triggers for automatic updated_at
--
-- Idempotent · uses IF NOT EXISTS where supported · DO blocks with EXCEPTION
-- guards for constraints (Postgres doesn't have IF NOT EXISTS for constraints).
--
-- Pattern: backfill nulls → add constraint NOT VALID → VALIDATE separately
-- so existing data doesn't block migration · but new writes ARE checked.

-- ───────────────────────────────────────────────────────────────────
-- Helper · trigger function for automatic updated_at

CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- ───────────────────────────────────────────────────────────────────
-- Helper macro · safe ADD CONSTRAINT (DO block · catches duplicate)

-- Postgres lacks IF NOT EXISTS for constraints · wrap each in DO block.

-- ═══════════════════════════════════════════════════════════════════
-- agentic_core layer (Iter 37)
-- ═══════════════════════════════════════════════════════════════════

-- agent_registry
DO $$ BEGIN
    -- Backfill nulls so CHECK doesn't reject
    UPDATE agent_registry SET status = 'Draft' WHERE status IS NULL;
    UPDATE agent_registry SET risk_level = 'Medium' WHERE risk_level IS NULL;
    UPDATE agent_registry SET autonomy_level = 'Approval Required' WHERE autonomy_level IS NULL;
    UPDATE agent_registry SET tenant_id = 'default' WHERE tenant_id IS NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_registry
        ADD CONSTRAINT chk_agent_status CHECK (status IN ('Draft','Active','Disabled','Retired'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_registry VALIDATE CONSTRAINT chk_agent_status; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_registry
        ADD CONSTRAINT chk_agent_risk CHECK (risk_level IN ('Low','Medium','High','Critical'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_registry VALIDATE CONSTRAINT chk_agent_risk; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_registry
        ADD CONSTRAINT chk_agent_autonomy CHECK (autonomy_level IN ('Manual','Approval Required','Automatic'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_registry VALIDATE CONSTRAINT chk_agent_autonomy; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_agent_updated_at ON agent_registry;
CREATE TRIGGER trg_agent_updated_at BEFORE UPDATE ON agent_registry
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- skill_registry
DO $$ BEGIN
    UPDATE skill_registry SET status = 'Draft' WHERE status IS NULL;
    UPDATE skill_registry SET risk_level = 'Low' WHERE risk_level IS NULL;
    UPDATE skill_registry SET execution_mode = 'Automatic' WHERE execution_mode IS NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE skill_registry
        ADD CONSTRAINT chk_skill_status CHECK (status IN ('Draft','Testing','Approved','Active','Disabled','Retired'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE skill_registry VALIDATE CONSTRAINT chk_skill_status; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE skill_registry
        ADD CONSTRAINT chk_skill_risk CHECK (risk_level IN ('Low','Medium','High','Critical'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE skill_registry VALIDATE CONSTRAINT chk_skill_risk; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_skill_updated_at ON skill_registry;
CREATE TRIGGER trg_skill_updated_at BEFORE UPDATE ON skill_registry
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- tool_registry
DO $$ BEGIN
    UPDATE tool_registry SET status = 'Available' WHERE status IS NULL;
    UPDATE tool_registry SET tool_type = 'Read' WHERE tool_type IS NULL;
    UPDATE tool_registry SET risk_level = 'Low' WHERE risk_level IS NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE tool_registry
        ADD CONSTRAINT chk_tool_status CHECK (status IN ('Draft','Testing','Available','Restricted','Down','Disabled','Deprecated'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tool_registry VALIDATE CONSTRAINT chk_tool_status; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE tool_registry
        ADD CONSTRAINT chk_tool_type CHECK (tool_type IN ('Read','Write','Execute','Delete','MCP','AI','Webhook'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tool_registry VALIDATE CONSTRAINT chk_tool_type; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP TRIGGER IF EXISTS trg_tool_updated_at ON tool_registry;
CREATE TRIGGER trg_tool_updated_at BEFORE UPDATE ON tool_registry
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- agent_skill_mapping (FK references)
-- Drop orphans first so FK doesn't fail
DELETE FROM agent_skill_mapping WHERE agent_id NOT IN (SELECT agent_id FROM agent_registry);
DELETE FROM agent_skill_mapping WHERE skill_id NOT IN (SELECT skill_id FROM skill_registry);

DO $$ BEGIN
    ALTER TABLE agent_skill_mapping
        ADD CONSTRAINT chk_asm_mode CHECK (execution_mode IN ('Automatic','Approval Required','Manual'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_skill_mapping VALIDATE CONSTRAINT chk_asm_mode; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_skill_mapping
        ADD CONSTRAINT chk_asm_status CHECK (status IN ('Active','Disabled'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_skill_mapping VALIDATE CONSTRAINT chk_asm_status; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- agent_invocation
DO $$ BEGIN
    UPDATE agent_invocation SET status = 'Failed' WHERE status IS NULL;
    UPDATE agent_invocation SET tenant_id = 'default' WHERE tenant_id IS NULL;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_invocation
        ADD CONSTRAINT chk_inv_status CHECK (status IN ('Running','Success','Failed','Cancelled','PendingApproval','PartialFailure'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_invocation VALIDATE CONSTRAINT chk_inv_status; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_invocation
        ADD CONSTRAINT chk_inv_duration_ge_0 CHECK (duration_ms IS NULL OR duration_ms >= 0)
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_invocation VALIDATE CONSTRAINT chk_inv_duration_ge_0; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_invocation
        ADD CONSTRAINT chk_inv_cost_ge_0 CHECK (cost_usd IS NULL OR cost_usd >= 0)
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_invocation VALIDATE CONSTRAINT chk_inv_cost_ge_0; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- agentic_ops layer (Iter 38)
-- ═══════════════════════════════════════════════════════════════════

DO $$ BEGIN
    ALTER TABLE agent_feedback
        ADD CONSTRAINT chk_fb_severity CHECK (severity IN ('Low','Medium','High','Critical'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_feedback VALIDATE CONSTRAINT chk_fb_severity; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_feedback
        ADD CONSTRAINT chk_fb_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_feedback VALIDATE CONSTRAINT chk_fb_rating; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_incident
        ADD CONSTRAINT chk_inc_severity CHECK (severity IN ('P1','P2','P3','P4','P5'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_incident VALIDATE CONSTRAINT chk_inc_severity; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_incident
        ADD CONSTRAINT chk_inc_status CHECK (status IN ('Open','Assigned','Investigating','Contained','Resolved','Closed','Reopened'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_incident VALIDATE CONSTRAINT chk_inc_status; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_dependency
        ADD CONSTRAINT chk_dep_criticality CHECK (criticality IN ('Critical','High','Medium','Low'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_dependency VALIDATE CONSTRAINT chk_dep_criticality; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_dependency
        ADD CONSTRAINT chk_dep_status CHECK (status IN ('Healthy','Degraded','Failed','Testing','Retired'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_dependency VALIDATE CONSTRAINT chk_dep_status; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_sla
        ADD CONSTRAINT chk_sla_tier CHECK (sla_tier IN ('Tier1','Tier2','Tier3'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_sla VALIDATE CONSTRAINT chk_sla_tier; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_sla
        ADD CONSTRAINT chk_sla_availability CHECK (availability_target >= 0 AND availability_target <= 100)
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_sla VALIDATE CONSTRAINT chk_sla_availability; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_capacity
        ADD CONSTRAINT chk_cap_min_le_max CHECK (autoscale_min_instances <= autoscale_max_instances)
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_capacity VALIDATE CONSTRAINT chk_cap_min_le_max; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_queue
        ADD CONSTRAINT chk_q_priority CHECK (priority >= 1 AND priority <= 5)
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_queue VALIDATE CONSTRAINT chk_q_priority; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE agent_queue
        ADD CONSTRAINT chk_q_status CHECK (queue_status IN ('Pending','Running','Completed','Failed','Retrying','Delayed','Stuck','Cancelled','DLQ'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE agent_queue VALIDATE CONSTRAINT chk_q_status; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- enterprise_governance layer (Iter 39)
-- ═══════════════════════════════════════════════════════════════════

DO $$ BEGIN
    ALTER TABLE department
        ADD CONSTRAINT chk_dept_maturity CHECK (maturity_level IN ('L1','L2','L3','L4','L5'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE department VALIDATE CONSTRAINT chk_dept_maturity; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE team
        ADD CONSTRAINT chk_team_support_level CHECK (support_level IN ('L1','L2','L3','L4'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE team VALIDATE CONSTRAINT chk_team_support_level; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE responsibility_matrix
        ADD CONSTRAINT chk_raci_type CHECK (responsibility_type IN ('R','A','C','I'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE responsibility_matrix VALIDATE CONSTRAINT chk_raci_type; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE stakeholder
        ADD CONSTRAINT chk_sh_influence CHECK (influence_level IS NULL OR influence_level IN ('High','Medium','Low'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE stakeholder VALIDATE CONSTRAINT chk_sh_influence; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE ai_policy
        ADD CONSTRAINT chk_pol_enforcement CHECK (enforcement_level IN ('Mandatory','Recommended','Advisory'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ai_policy VALIDATE CONSTRAINT chk_pol_enforcement; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- risk_incident_learning layer (Iter 40)
-- ═══════════════════════════════════════════════════════════════════

DO $$ BEGIN
    ALTER TABLE risk_escalation
        ADD CONSTRAINT chk_esc_level CHECK (escalation_level IN ('L1','L2','L3','L4','L5'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE risk_escalation VALIDATE CONSTRAINT chk_esc_level; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE incident_management
        ADD CONSTRAINT chk_im_severity CHECK (incident_severity IN ('Sev-1','Sev-2','Sev-3','Sev-4','Sev-5'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE incident_management VALIDATE CONSTRAINT chk_im_severity; EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE incident_management
        ADD CONSTRAINT chk_im_status CHECK (incident_status IN ('Open','Investigating','Contained','Resolved','Closed','Reopened'))
        NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE incident_management VALIDATE CONSTRAINT chk_im_status; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- Partial indexes on hot paths (status='Active' is the 99% query)
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_agent_registry_active   ON agent_registry(department_id) WHERE status='Active';
CREATE INDEX IF NOT EXISTS idx_skill_registry_active   ON skill_registry(skill_category) WHERE status='Active';
CREATE INDEX IF NOT EXISTS idx_tool_registry_available ON tool_registry(tool_type)      WHERE status='Available';
CREATE INDEX IF NOT EXISTS idx_inc_open                ON incident_management(incident_severity) WHERE incident_status='Open';
CREATE INDEX IF NOT EXISTS idx_esc_open                ON risk_escalation(escalation_level) WHERE escalation_status='Open';
CREATE INDEX IF NOT EXISTS idx_q_pending               ON agent_queue(priority) WHERE queue_status IN ('Pending','Retrying');
