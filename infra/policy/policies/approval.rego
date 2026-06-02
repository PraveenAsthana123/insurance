# OPA policy: should we auto-approve this operator/agent action?
# Per Codex 2026-06-01 recommendation + global §42 (operational autonomy).
#
# Inputs (provided by Python client):
#   action       — the action being taken (e.g. "git_push", "deploy_prod")
#   target       — where it's targeting (e.g. "main", "staging")
#   actor        — who's doing it (e.g. "operator", "claude", "codex")
#   environment  — dev | staging | prod
#   data_class   — public | pii | phi | secret
#   risk_score   — 0.0..1.0
#
# Output: allow | deny | require_human

package insur.approval

import future.keywords.if
import future.keywords.in

default decision := "deny"

# ──────────────────────────────────────────────────────────────────────
# Always-allow list (matches global §69 broad-allow pattern)
# ──────────────────────────────────────────────────────────────────────
safe_actions := {
    "read_file", "list_dir", "git_status", "git_diff", "git_log",
    "docs_edit", "markdown_edit", "run_test", "run_drill", "lint",
    "type_check", "format_check",
}

# Priority: hard_deny > require_human > allow > default deny.
# Helper rules disambiguate so multiple decisions cannot fire with
# conflicting outputs (eval_conflict_error).

hard_deny_actions := {
    "git_push_force_main", "rm_rf_home", "drop_production_db",
    "npm_publish", "pip_upload", "cargo_publish", "docker_push_hub",
    "modify_billing", "modify_auth_provider", "modify_secret_store",
}

dev_actions := {"docker_compose_up", "docker_compose_down", "pytest", "ruff"}

# Helper: is this hard-denied?
hard_denied_in_prod if {
    input.action in hard_deny_actions
    input.environment == "prod"
}

# Helper: is data class sensitive?
sensitive_data if input.data_class in {"phi", "secret"}

# Helper: is risk high?
high_risk if input.risk_score > 0.6

# 1) Hard-deny in production — highest priority
decision := "deny" if hard_denied_in_prod

# 2) Require human for sensitive data (PHI/secret) UNLESS already hard-denied
decision := "require_human" if {
    sensitive_data
    not hard_denied_in_prod
}

# 3) Require human for high risk UNLESS already hard-denied / sensitive
decision := "require_human" if {
    high_risk
    not sensitive_data
    not hard_denied_in_prod
}

# 4) Require human in prod for non-safe actions
decision := "require_human" if {
    input.environment == "prod"
    not input.action in safe_actions
    not input.action in hard_deny_actions
    not sensitive_data
    not high_risk
}

# 5) Allow safe actions UNLESS sensitive data class OR high risk OR hard-denied
decision := "allow" if {
    input.action in safe_actions
    not sensitive_data
    not high_risk
    not hard_denied_in_prod
}

# 6) Allow specific dev actions UNLESS sensitive data class OR high risk
decision := "allow" if {
    input.environment == "dev"
    input.action in dev_actions
    not sensitive_data
    not high_risk
}

# ──────────────────────────────────────────────────────────────────────
# Reasoning — surfaced in the response for transparency
# ──────────────────────────────────────────────────────────────────────
reasons[r] {
    input.action in safe_actions
    r := sprintf("auto-allow: action %v in safe_actions list", [input.action])
}

reasons[r] {
    input.action in hard_deny_actions
    input.environment == "prod"
    r := sprintf("hard-deny: %v in production", [input.action])
}

reasons[r] {
    input.risk_score > 0.6
    r := sprintf("require_human: risk_score %.2f > 0.6", [input.risk_score])
}

reasons[r] {
    input.data_class in {"phi", "secret"}
    r := sprintf("require_human: data_class is %v", [input.data_class])
}
