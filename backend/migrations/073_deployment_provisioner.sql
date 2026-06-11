-- Migration 073 · Iter 75 · Phase 7 deploy provisioner.

-- tenant_project · isolates each blueprint deployment
CREATE TABLE IF NOT EXISTS tenant_project (
    project_id       VARCHAR(100) PRIMARY KEY,
    tenant_id        VARCHAR(100) DEFAULT 'default',
    project_name     VARCHAR(200) NOT NULL,
    blueprint_id     VARCHAR(100),
    deployed_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deployed_by      VARCHAR(100),
    approval_id      VARCHAR(100),
    status           VARCHAR(50) DEFAULT 'provisioning',
    config           JSONB,
    CONSTRAINT chk_tp_status CHECK (status IN ('provisioning','active','paused','retired','failed'))
);
CREATE INDEX IF NOT EXISTS idx_tp_tenant ON tenant_project(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tp_blueprint ON tenant_project(blueprint_id);

-- deploy_manifest · what was actually created during a deployment
CREATE TABLE IF NOT EXISTS deploy_manifest (
    manifest_id      BIGSERIAL PRIMARY KEY,
    project_id       VARCHAR(100) NOT NULL,
    artifact_type    VARCHAR(50),
    artifact_id      VARCHAR(200),
    parent_artifact  VARCHAR(200),
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_artifact_type CHECK (artifact_type IN ('agent','skill','mapping','table','endpoint','tab','tool'))
);
CREATE INDEX IF NOT EXISTS idx_manifest_project ON deploy_manifest(project_id);
