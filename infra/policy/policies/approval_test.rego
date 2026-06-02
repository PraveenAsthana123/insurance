# Policy unit tests — run with `opa test policies/`
# Per global §43 — every policy ships with negative + positive drills.

package insur.approval

test_safe_read_allowed {
    decision == "allow" with input as {
        "action": "read_file", "actor": "claude", "environment": "dev",
        "data_class": "public", "risk_score": 0.1,
    }
}

test_docs_edit_allowed_in_dev {
    decision == "allow" with input as {
        "action": "docs_edit", "actor": "claude", "environment": "dev",
        "data_class": "public", "risk_score": 0.0,
    }
}

test_high_risk_requires_human {
    decision == "require_human" with input as {
        "action": "deploy", "actor": "claude", "environment": "staging",
        "data_class": "public", "risk_score": 0.85,
    }
}

test_phi_requires_human {
    decision == "require_human" with input as {
        "action": "read_file", "actor": "claude", "environment": "dev",
        "data_class": "phi", "risk_score": 0.1,
    }
}

test_secret_requires_human {
    decision == "require_human" with input as {
        "action": "docs_edit", "actor": "claude", "environment": "dev",
        "data_class": "secret", "risk_score": 0.1,
    }
}

test_force_push_main_denied_in_prod {
    decision == "deny" with input as {
        "action": "git_push_force_main", "actor": "claude",
        "environment": "prod", "data_class": "public", "risk_score": 0.5,
    }
}

test_prod_non_safe_action_requires_human {
    decision == "require_human" with input as {
        "action": "docker_compose_up", "actor": "claude",
        "environment": "prod", "data_class": "public", "risk_score": 0.2,
    }
}

test_default_is_deny {
    decision == "deny" with input as {
        "action": "unknown_dangerous_action", "actor": "claude",
        "environment": "dev", "data_class": "public", "risk_score": 0.5,
    }
}
