#!/usr/bin/env bash
# Advanced agentic stack — single-command boot of the full operator-requested
# parallel-orchestration + auto-approve + monitoring stack.
#
# Per operator 2026-06-01:
#   "what else tool can be setup to run parallel ..and code writing, approval,
#    scheduling, monitoring, using 100 agent ...auto approve"
#   "use the global approval policy for next and approval"
#   "create advance tool to do that"
#   "dangerously approve" (broadened auto-approve overlay enabled)
#
# Brings up:
#   - OPA policy engine (auto-approve decisions per Rego)
#   - OTel Collector + Jaeger + Prometheus + Grafana + Phoenix (monitoring)
#   - Temporal + UI + worker (durable scheduling)
#   - Reuses existing 100-agent hub-and-spoke + council fleet
#   - LangGraph workflow available via Python entry-point
#
# All gated operations (per global §42) remain locked even in danger mode.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python}"
LOG_DIR="$REPO/jobs/logs"
DANGER_MODE="${DANGER_MODE:-false}"

mkdir -p "$LOG_DIR"

# Color helpers
red()    { printf "\033[1;31m%s\033[0m\n" "$*"; }
green()  { printf "\033[1;32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[1;33m%s\033[0m\n" "$*"; }
blue()   { printf "\033[1;34m%s\033[0m\n" "$*"; }

# ─────────────────────────────────────────────────────────────────────────
# Step 1 — Verify prerequisites
# ─────────────────────────────────────────────────────────────────────────
blue "═══ Step 1: Prerequisites ═══"
for tool in docker python3 curl jq; do
    if command -v "$tool" >/dev/null 2>&1; then
        green "  ✓ $tool"
    else
        red "  ✗ $tool missing"
        exit 1
    fi
done

# ─────────────────────────────────────────────────────────────────────────
# Step 2 — Verify the 3 new module installs exist
# ─────────────────────────────────────────────────────────────────────────
blue "═══ Step 2: Verify module installations ═══"
for path in infra/orchestration infra/policy infra/observability; do
    if [[ -d "$REPO/$path" ]]; then
        green "  ✓ $path"
    else
        yellow "  ! $path missing — installing"
        bash "$HOME/.claude/scripts/scaffold-production-readiness.sh" \
            --target "$REPO" --name insur_project --slug insur \
            --prefix INSUR --domain insur.example.com \
            --module agent-orchestration,policy-engine,observability
        break
    fi
done

# ─────────────────────────────────────────────────────────────────────────
# Step 3 — Danger mode overlay
# ─────────────────────────────────────────────────────────────────────────
blue "═══ Step 3: Approval policy mode ═══"
if [[ "$DANGER_MODE" == "true" ]]; then
    yellow "  ⚠ DANGER_MODE=true — broadened auto-approve enabled"
    yellow "  ⚠ §42 hard-gated ops STILL require explicit operator confirmation"
    cp -f "$REPO/infra/policy/policies/data.danger.json" \
          "$REPO/infra/policy/policies/data.json" 2>/dev/null || \
        yellow "  (data.danger.json not yet created; using default)"
else
    green "  ✓ Standard auto-approve mode (per global §42 + §69)"
    # Remove danger overlay if present
    rm -f "$REPO/infra/policy/policies/data.json" 2>/dev/null || true
fi

# ─────────────────────────────────────────────────────────────────────────
# Step 4 — Test OPA policies (independent of running)
# ─────────────────────────────────────────────────────────────────────────
blue "═══ Step 4: OPA policy unit tests ═══"
if command -v docker >/dev/null 2>&1; then
    docker run --rm -v "$REPO/infra/policy/policies:/policies" \
        openpolicyagent/opa:0.68.0 test /policies -v 2>&1 \
        | tee "$LOG_DIR/opa_test.log" | tail -15 || \
        yellow "  ! OPA tests failed — review $LOG_DIR/opa_test.log"
fi

# ─────────────────────────────────────────────────────────────────────────
# Step 5 — Boot OPA + Observability + Temporal (use compose overlays)
# ─────────────────────────────────────────────────────────────────────────
blue "═══ Step 5: Boot services via docker-compose overlays ═══"
COMPOSE_FILES=("-f" "$REPO/docker-compose.yml")
for overlay in \
    "$REPO/infra/policy/docker-compose.opa.yml" \
    "$REPO/infra/observability/docker-compose.observability.yml" \
    "$REPO/infra/orchestration/docker-compose.temporal.yml"; do
    if [[ -f "$overlay" ]]; then
        COMPOSE_FILES+=("-f" "$overlay")
        green "  ✓ overlay: $overlay"
    fi
done

# Don't auto-boot in this script — emit the command for the operator
yellow "  → To boot, run:"
echo "    docker compose ${COMPOSE_FILES[*]} up -d"

# ─────────────────────────────────────────────────────────────────────────
# Step 6 — Status surface
# ─────────────────────────────────────────────────────────────────────────
blue "═══ Step 6: Status URLs ═══"
cat <<EOF
  Local UIs (after boot):
    OPA            http://localhost:8181
    Jaeger         http://localhost:16686
    Prometheus     http://localhost:9090
    Grafana        http://localhost:3001
    Phoenix        http://localhost:6006
    Temporal UI    http://localhost:8233

  Existing fleet (already running per docker-compose):
    Backend        http://localhost:8000
    Frontend       http://localhost:3000
    Ollama         http://localhost:11434

  Logs:           $LOG_DIR/
EOF

# ─────────────────────────────────────────────────────────────────────────
# Step 7 — Recap of the advanced stack
# ─────────────────────────────────────────────────────────────────────────
blue "═══ Step 7: Advanced agentic stack — operator-facing summary ═══"
cat <<EOF
  Parallel orchestration:
    backend/orchestration/langgraph_workflow.py
    Run: $PYTHON -c "import asyncio; from backend.orchestration.langgraph_workflow import run_goal; asyncio.run(run_goal('your goal'))"

  Durable scheduling:
    backend/orchestration/temporal_worker.py
    Workers run as docker-compose service ($([[ "$DANGER_MODE" == "true" ]] && echo 'DANGER MODE ON' || echo 'standard mode'))

  Auto-approve policy:
    infra/policy/policies/approval.rego  (8 unit tests in approval_test.rego)
    Wire via: from core.opa_client import check_approval

  Monitoring 100 agents:
    OTel → Jaeger (traces) + Phoenix (LLM-specific) + Grafana (dashboards)

  Composes with existing:
    100-agent hub-and-spoke fleet (agents/, council_agents/ services)
    BMAD + Archon + OpenClaw + auto-approval watcher
EOF

green ""
green "✓ Advanced agentic stack provisioned. Manual: docker compose ${COMPOSE_FILES[*]} up -d"
green "✓ DANGER_MODE=$DANGER_MODE"
green "✓ Per global §42 — §42 hard-gated ops remain gated regardless of DANGER_MODE"
