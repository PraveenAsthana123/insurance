-- Iter 40 · Risk + Incident + Learning · 8 tables per operator spec 93-100.

-- 93. risk_alert_rule
CREATE TABLE IF NOT EXISTS risk_alert_rule (
    rule_id              VARCHAR(100) PRIMARY KEY,
    rule_name            VARCHAR(500) NOT NULL,
    rule_category        VARCHAR(100),
    risk_id              VARCHAR(100),
    kri_id               VARCHAR(100),
    trigger_condition    TEXT,
    warning_threshold    DECIMAL(15, 4),
    critical_threshold   DECIMAL(15, 4),
    notification_channel VARCHAR(100),
    escalation_level     VARCHAR(50)  DEFAULT 'L1',
    enabled              BOOLEAN      DEFAULT TRUE,
    status               VARCHAR(50)  DEFAULT 'Active',
    tenant_id            VARCHAR(100) DEFAULT 'default',
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rule_risk     ON risk_alert_rule(risk_id);
CREATE INDEX IF NOT EXISTS idx_rule_enabled  ON risk_alert_rule(enabled);

-- 94. risk_escalation
CREATE TABLE IF NOT EXISTS risk_escalation (
    escalation_id              VARCHAR(100) PRIMARY KEY,
    alert_id                   VARCHAR(100),
    risk_id                    VARCHAR(100),
    escalation_level           VARCHAR(50)  DEFAULT 'L1',     -- L1..L5
    escalation_reason          TEXT,
    assigned_team              VARCHAR(200),
    assigned_role              VARCHAR(200),
    escalation_owner           VARCHAR(200),
    response_sla_minutes       INT          DEFAULT 60,
    escalation_status          VARCHAR(50)  DEFAULT 'Open',
    acknowledged_at            TIMESTAMP,
    escalated_at               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    resolved_at                TIMESTAMP,
    executive_notification     BOOLEAN      DEFAULT FALSE,
    regulatory_notification    BOOLEAN      DEFAULT FALSE,
    tenant_id                  VARCHAR(100) DEFAULT 'default',
    created_at                 TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_esc_level   ON risk_escalation(escalation_level);
CREATE INDEX IF NOT EXISTS idx_esc_status  ON risk_escalation(escalation_status);

-- 95. incident_management
CREATE TABLE IF NOT EXISTS incident_management (
    incident_id                       VARCHAR(100) PRIMARY KEY,
    incident_title                    VARCHAR(500) NOT NULL,
    incident_category                 VARCHAR(100),                   -- AI/Agent/MCP/Model/Security/Privacy/Compliance/Ops/Vendor/BC
    incident_severity                 VARCHAR(50)  DEFAULT 'Sev-3',   -- Sev-1..Sev-5
    incident_status                   VARCHAR(50)  DEFAULT 'Open',    -- Open/Investigating/Contained/Resolved/Closed
    business_impact                   TEXT,
    affected_systems                  TEXT,
    reported_by                       VARCHAR(200),
    incident_owner                    VARCHAR(200),
    response_team                     TEXT,
    start_time                        TIMESTAMP,
    detected_time                     TIMESTAMP,
    resolved_time                     TIMESTAMP,
    root_cause_summary                TEXT,
    regulatory_reporting_required     BOOLEAN      DEFAULT FALSE,
    executive_notification_required   BOOLEAN      DEFAULT FALSE,
    tenant_id                         VARCHAR(100) DEFAULT 'default',
    created_at                        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_im_severity  ON incident_management(incident_severity);
CREATE INDEX IF NOT EXISTS idx_im_status    ON incident_management(incident_status);
CREATE INDEX IF NOT EXISTS idx_im_category  ON incident_management(incident_category);

-- 96. incident_timeline
CREATE TABLE IF NOT EXISTS incident_timeline (
    timeline_id            VARCHAR(100) PRIMARY KEY,
    incident_id            VARCHAR(100) NOT NULL,
    event_timestamp        TIMESTAMP    NOT NULL,
    event_type             VARCHAR(100),
    event_category         VARCHAR(100),                              -- Detection/Escalation/Response/Containment/Investigation/Communication/Security/Compliance/Recovery/Closure
    event_description      TEXT,
    actor_type             VARCHAR(100),                              -- user/agent/system/exec
    actor_id               VARCHAR(100),
    related_object_type    VARCHAR(100),
    related_object_id      VARCHAR(100),
    severity               VARCHAR(50),
    evidence_reference     TEXT,
    tenant_id              VARCHAR(100) DEFAULT 'default',
    created_at             TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tl_incident   ON incident_timeline(incident_id);
CREATE INDEX IF NOT EXISTS idx_tl_event_type ON incident_timeline(event_type);
CREATE INDEX IF NOT EXISTS idx_tl_event_ts   ON incident_timeline(event_timestamp);

-- 97. incident_rca
CREATE TABLE IF NOT EXISTS incident_rca (
    rca_id                       VARCHAR(100) PRIMARY KEY,
    incident_id                  VARCHAR(100) NOT NULL,
    rca_title                    VARCHAR(500),
    investigation_owner          VARCHAR(200),
    primary_root_cause           TEXT,
    contributing_factors         TEXT,
    failed_controls              TEXT,
    impacted_processes           TEXT,
    corrective_actions           TEXT,
    preventive_actions           TEXT,
    recurrence_probability       VARCHAR(50),
    executive_summary            TEXT,
    approval_status              VARCHAR(50)  DEFAULT 'Pending',
    completed_at                 TIMESTAMP,
    tenant_id                    VARCHAR(100) DEFAULT 'default',
    created_at                   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_rca_incident ON incident_rca(incident_id);
CREATE INDEX IF NOT EXISTS idx_rca_approval ON incident_rca(approval_status);

-- 98. incident_postmortem
CREATE TABLE IF NOT EXISTS incident_postmortem (
    postmortem_id            VARCHAR(100) PRIMARY KEY,
    incident_id              VARCHAR(100) NOT NULL,
    postmortem_title         VARCHAR(500),
    executive_summary        TEXT,
    business_impact          TEXT,
    timeline_summary         TEXT,
    root_cause_summary       TEXT,
    what_went_well           TEXT,
    what_went_poorly         TEXT,
    lessons_learned          TEXT,
    process_improvements     TEXT,
    governance_improvements  TEXT,
    approved_by              VARCHAR(200),
    approval_date            DATE,
    tenant_id                VARCHAR(100) DEFAULT 'default',
    created_at               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pm_incident ON incident_postmortem(incident_id);

-- 99. lessons_learned
CREATE TABLE IF NOT EXISTS lessons_learned (
    lesson_id              VARCHAR(100) PRIMARY KEY,
    lesson_title           VARCHAR(500) NOT NULL,
    lesson_category        VARCHAR(100),                            -- AI Governance/Security/AgentOps/MCP/ModelOps/Compliance/Ops/Architecture/Cost/Vendor
    source_type            VARCHAR(100),                            -- incident/audit/postmortem/risk/...
    source_id              VARCHAR(100),
    lesson_description     TEXT,
    root_cause_summary     TEXT,
    recommendation         TEXT,
    reusable_control       TEXT,
    best_practice          TEXT,
    anti_pattern           TEXT,
    owner                  VARCHAR(200),
    approval_status        VARCHAR(50)  DEFAULT 'Pending',
    lesson_status          VARCHAR(50)  DEFAULT 'Draft',
    tenant_id              VARCHAR(100) DEFAULT 'default',
    created_at             TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ll_category ON lessons_learned(lesson_category);
CREATE INDEX IF NOT EXISTS idx_ll_source   ON lessons_learned(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_ll_status   ON lessons_learned(lesson_status);

-- 100. knowledge_base
CREATE TABLE IF NOT EXISTS knowledge_base (
    knowledge_id        VARCHAR(100) PRIMARY KEY,
    knowledge_title     VARCHAR(500) NOT NULL,
    knowledge_category  VARCHAR(100),                               -- Policy/Standard/Control/Architecture/Security/Operations/Compliance/AI Gov/Lesson/Training
    knowledge_type      VARCHAR(100),                               -- policy/procedure/standard/control/architecture/runbook/playbook/training/lesson/faq
    source_type         VARCHAR(100),
    source_id           VARCHAR(100),
    content             TEXT,
    tags                TEXT,
    owner               VARCHAR(200),
    approval_status     VARCHAR(50)  DEFAULT 'Pending',
    version             VARCHAR(50)  DEFAULT 'v1.0',
    review_date         DATE,
    tenant_id           VARCHAR(100) DEFAULT 'default',
    created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(knowledge_category);
CREATE INDEX IF NOT EXISTS idx_kb_type     ON knowledge_base(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_kb_approval ON knowledge_base(approval_status);
