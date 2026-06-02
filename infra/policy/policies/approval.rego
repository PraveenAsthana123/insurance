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

decision := "allow" if {
    input.action in safe_actions
}

# Per-environment auto-allow for low-risk dev actions
decision := "allow" if {
    input.environment == "dev"
    input.action in {"docker_compose_up", "docker_compose_down", "pytest", "ruff"}
}

# ──────────────────────────────────────────────────────────────────────
# Hard-deny — never proceed without explicit operator confirmation
# (these match global §42 gated-list)
# ──────────────────────────────────────────────────────────────────────
hard_deny_actions := {
    "git_push_force_main", "rm_rf_home", "drop_production_db",
    "npm_publish", "pip_upload", "cargo_publish", "docker_push_hub",
    "modify_billing", "modify_auth_provider", "modify_secret_store",
}

decision := "deny" if {
    input.action in hard_deny_actions
    input.environment == "prod"
}

# ──────────────────────────────────────────────────────────────────────
# Require human approval — risk above threshold OR PHI / secrets
# ──────────────────────────────────────────────────────────────────────
decision := "require_human" if {
    input.risk_score > 0.6
}

decision := "require_human" if {
    input.data_class in {"phi", "secret"}
}

decision := "require_human" if {
    input.environment == "prod"
    not input.action in safe_actions
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
