-- Migration 051 — Global user input event persistence
--
-- Creates the canonical append-only table for saving every meaningful user
-- input that can drive AI, analytics, simulation, reporting, approval, or
-- agentic operations. Contract: docs/GLOBAL_INPUT_PERSISTENCE_POLICY.md.
--
-- This migration is intentionally table-only. Routers/services/repositories
-- must implement capture through backend code, never direct browser DB writes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS user_input_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  actor TEXT NOT NULL DEFAULT 'anonymous',
  role_code TEXT,
  session_id TEXT,
  request_id UUID,
  idempotency_key TEXT,
  source_surface TEXT NOT NULL,
  route_path TEXT,
  component_id TEXT,
  department_id TEXT,
  process_id TEXT,
  input_kind TEXT NOT NULL,
  input_name TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  payload_redacted BOOLEAN NOT NULL DEFAULT TRUE,
  payload_hash TEXT,
  pii_classification TEXT NOT NULL DEFAULT 'moderate',
  retention_class TEXT NOT NULL DEFAULT 'standard',
  purpose TEXT,
  downstream_ref TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  error_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_user_input_kind CHECK (input_kind IN (
    'prompt', 'chat', 'form', 'filter', 'simulation', 'feedback',
    'approval', 'upload', 'command', 'search', 'export', 'other'
  )),
  CONSTRAINT chk_user_input_pii_classification CHECK (pii_classification IN (
    'none', 'low', 'moderate', 'high', 'restricted'
  )),
  CONSTRAINT chk_user_input_retention CHECK (retention_class IN (
    'transient', 'standard', 'audit', 'legal_hold'
  )),
  CONSTRAINT chk_user_input_status CHECK (status IN (
    'received', 'validated', 'processed', 'rejected', 'failed', 'redacted'
  ))
);

CREATE INDEX IF NOT EXISTS idx_user_input_events_tenant_created
  ON user_input_events (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_input_events_actor_created
  ON user_input_events (tenant_id, actor, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_input_events_surface_created
  ON user_input_events (tenant_id, source_surface, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_input_events_process_created
  ON user_input_events (tenant_id, department_id, process_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_input_events_kind_created
  ON user_input_events (tenant_id, input_kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_input_events_request_id
  ON user_input_events (request_id) WHERE request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_input_events_idempotency
  ON user_input_events (tenant_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_input_events_payload_gin
  ON user_input_events USING GIN (payload);
CREATE INDEX IF NOT EXISTS idx_user_input_events_metadata_gin
  ON user_input_events USING GIN (metadata);

COMMENT ON TABLE user_input_events IS
  'Append-only capture table for meaningful user inputs per docs/GLOBAL_INPUT_PERSISTENCE_POLICY.md.';
COMMENT ON COLUMN user_input_events.payload IS
  'JSONB payload. Must be redacted/tokenized for restricted data; browser must not write directly.';
COMMENT ON COLUMN user_input_events.payload_hash IS
  'SHA-256 of normalized raw payload when available and allowed; supports dedupe without exposing raw input.';
COMMENT ON COLUMN user_input_events.downstream_ref IS
  'Optional linked output/run/model/report/agent reference created from this input.';
