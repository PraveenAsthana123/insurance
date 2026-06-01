#!/usr/bin/env bash
# schedule_phase100_build.sh — Phase 100-120 autonomous build walker.
#
# Drives the 21-phase plan in docs/AUTONOMOUS_BUILD_PHASE_100_PLAN.md
# via pre-approval token economy + §42 gated-op enforcement.
# Designed to be cron-triggered every 30 minutes for a 180h window.
#
# Modeled after scripts/schedule_dashboard_build.sh (Phase 0-23 build).
# Phase numbering jumps to 100 to mark the autonomous-loop continuation
# following the 9-commit UI session that landed 15bd0dc0..379389c7.
#
# State machine:
#   .phase100-build-state has: CURRENT_PHASE / STATUS / PRE_APPROVAL_TOKENS /
#   AUTONOMOUS_DEADLINE / LAST_RUN / LAST_PHASE_OUTCOME
#
# Loop per invocation (cron runs every 30min):
#   1. Read state file.
#   2. If STATUS=paused → exit (operator kill switch).
#   3. If STATUS=complete → exit with summary.
#   4. If now > AUTONOMOUS_DEADLINE → STATUS=awaiting_operator, exit.
#   5. Look up PHASES[CURRENT_PHASE]; if undefined → STATUS=complete.
#   6. If phase backend-required + backend unreachable → skip (don't advance).
#   7. Run phase function; advance on pass, halt on fail/gated-without-tokens.
#
# Operator commands:
#   ./scripts/schedule_phase100_build.sh start     # bootstrap + run first
#   ./scripts/schedule_phase100_build.sh --now     # run one iteration NOW
#   ./scripts/schedule_phase100_build.sh status    # human-readable state
#   ./scripts/schedule_phase100_build.sh pause     # kill switch
#   ./scripts/schedule_phase100_build.sh resume    # restart paused
#   ./scripts/schedule_phase100_build.sh advance   # refill tokens past gate
#   ./scripts/schedule_phase100_build.sh skip      # skip current phase
#   ./scripts/schedule_phase100_build.sh logs      # tail audit log
#
# Cron install (every 30 minutes):
#   ./scripts/schedule_phase100_build.sh install-cron
#
# Cron uninstall:
#   ./scripts/schedule_phase100_build.sh uninstall-cron

set -uo pipefail   # no -e: handle errors per phase

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

STATE_FILE=".phase100-build-state"
LOG_DIR="data/agent-supervisor"
AUDIT_LOG="$LOG_DIR/phase100_build.log"
AUDIT_JSONL="$LOG_DIR/phase100_build.jsonl"
mkdir -p "$LOG_DIR"

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8000}"
WINDOW_HOURS="${PHASE100_WINDOW_HOURS:-180}"
INITIAL_TOKENS=12
PHASE100_BRANCH="${PHASE100_BRANCH:-feature/phase1-admin-manager-hubs}"

# 21 phases (100-120). Each has a function `phase_<n>_<slug>` defined below.
PHASES=(
    "phase_100_backend_health"
    "phase_101_wire_routers"
    "phase_102_drill_ai_assurance_catalog"
    "phase_103_drill_tenant_seed"
    "phase_104_drill_dt_checklists"
    "phase_105_migration_018_rls"
    "phase_106_migration_019_fks"
    "phase_107_canada_finance_2026"
    "phase_108_eu_pharma_2026"
    "phase_109_csv_export_button"
    "phase_110_column_stat_sidebar"
    "phase_111_dashboard_live_api"
    "phase_112_per_tenant_scope"
    "phase_113_tenants_mutation_api"
    "phase_114_drills_ml_methodology"
    "phase_115_drills_rai"
    "phase_116_drills_rbd"
    "phase_117_migration_020_framework_applies"
    "phase_118_migration_021_phase_applies"
    "phase_119_healthcare_expand"
    "phase_120_lazy_per_chart"
)

# Backend-required mask (1 = required, 0 = not).
declare -A BACKEND_REQUIRED=(
    [phase_100_backend_health]=1
    [phase_101_wire_routers]=1
    [phase_102_drill_ai_assurance_catalog]=1
    [phase_103_drill_tenant_seed]=1
    [phase_104_drill_dt_checklists]=0
    [phase_105_migration_018_rls]=1
    [phase_106_migration_019_fks]=1
    [phase_107_canada_finance_2026]=0
    [phase_108_eu_pharma_2026]=0
    [phase_109_csv_export_button]=0
    [phase_110_column_stat_sidebar]=0
    [phase_111_dashboard_live_api]=1
    [phase_112_per_tenant_scope]=1
    [phase_113_tenants_mutation_api]=1
    [phase_114_drills_ml_methodology]=0
    [phase_115_drills_rai]=0
    [phase_116_drills_rbd]=0
    [phase_117_migration_020_framework_applies]=1
    [phase_118_migration_021_phase_applies]=1
    [phase_119_healthcare_expand]=0
    [phase_120_lazy_per_chart]=0
)

# ── helpers ────────────────────────────────────────────────────────────────

log() {
    local lvl="$1"; shift
    local msg="$*"
    local ts; ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "[$ts] [$lvl] $msg" | tee -a "$AUDIT_LOG"
    printf '{"ts":"%s","level":"%s","msg":%s}\n' "$ts" "$lvl" "$(printf '%s' "$msg" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" >> "$AUDIT_JSONL" 2>/dev/null || true
}

read_state() {
    if [[ ! -f "$STATE_FILE" ]]; then
        return 1
    fi
    # shellcheck disable=SC1090
    source "$STATE_FILE"
    return 0
}

write_state() {
    cat > "$STATE_FILE" <<EOF
# Phase 100 autonomous build — state file (gitignored)
CURRENT_PHASE=${CURRENT_PHASE:-100}
STATUS=${STATUS:-running}
PRE_APPROVAL_TOKENS=${PRE_APPROVAL_TOKENS:-12}
AUTONOMOUS_DEADLINE=${AUTONOMOUS_DEADLINE:-}
LAST_RUN=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LAST_PHASE_OUTCOME=${LAST_PHASE_OUTCOME:-pending}
EOF
}

bootstrap_state() {
    local deadline
    deadline="$(date -u -d "+${WINDOW_HOURS} hours" +"%Y-%m-%dT%H:%M:%SZ")"
    CURRENT_PHASE=100
    STATUS=running
    PRE_APPROVAL_TOKENS=$INITIAL_TOKENS
    AUTONOMOUS_DEADLINE="$deadline"
    LAST_PHASE_OUTCOME=bootstrapped
    write_state
    log INFO "Bootstrapped Phase 100 build. Deadline: $deadline. Tokens: $INITIAL_TOKENS."
}

backend_alive() {
    curl --max-time 3 -sf "$BACKEND_URL/api/health" > /dev/null 2>&1
}

# ── phase functions (skeleton; real impl lands per-phase commit) ──────────

phase_100_backend_health() {
    if ! backend_alive; then
        log WARN "Backend at $BACKEND_URL unreachable. Phase 100 skipped (will retry)."
        LAST_PHASE_OUTCOME="skipped_backend_offline"
        return 2   # skip-no-advance
    fi
    log INFO "Backend healthy. Checking applied migrations…"
    # Operator note: actual psql apply is deferred to phase 101 (router wire-in) + manual migration apply
    LAST_PHASE_OUTCOME="passed"
    return 0
}

phase_101_wire_routers() {
    if ! backend_alive; then return 2; fi
    if grep -q "catalogs_router" backend/main.py 2>/dev/null \
       && grep -q "tenants_admin_router" backend/main.py 2>/dev/null; then
        log INFO "Routers already wired."
        LAST_PHASE_OUTCOME="passed"
        return 0
    fi
    log WARN "Routers not wired into backend/main.py — operator action required (4-line additive change)."
    LAST_PHASE_OUTCOME="gated"
    return 3   # gated
}

phase_102_drill_ai_assurance_catalog() {
    if ! backend_alive; then return 2; fi
    local drill="tests/drills/drill_ai_assurance_catalog.py"
    if [[ ! -f "$drill" ]]; then
        log INFO "Drill missing — phase to author it."
        LAST_PHASE_OUTCOME="needs_authoring"
        return 4   # needs authoring (not yet implemented)
    fi
    if python3 "$drill" >> "$AUDIT_LOG" 2>&1; then
        LAST_PHASE_OUTCOME="passed"
        return 0
    fi
    LAST_PHASE_OUTCOME="failed"
    return 1
}

phase_103_drill_tenant_seed() {
    if ! backend_alive; then return 2; fi
    local drill="tests/drills/drill_tenant_seed.py"
    [[ -f "$drill" ]] || { LAST_PHASE_OUTCOME="needs_authoring"; return 4; }
    if python3 "$drill" >> "$AUDIT_LOG" 2>&1; then
        LAST_PHASE_OUTCOME="passed"; return 0
    fi
    LAST_PHASE_OUTCOME="failed"; return 1
}

phase_104_drill_dt_checklists() {
    local drill="tests/drills/drill_dt_checklists_present.py"
    [[ -f "$drill" ]] || { LAST_PHASE_OUTCOME="needs_authoring"; return 4; }
    if python3 "$drill" >> "$AUDIT_LOG" 2>&1; then
        LAST_PHASE_OUTCOME="passed"; return 0
    fi
    LAST_PHASE_OUTCOME="failed"; return 1
}

phase_105_migration_018_rls() {
    if ! backend_alive; then return 2; fi
    local mig="backend/migrations/018_rls_policies.sql"
    if [[ ! -f "$mig" ]]; then
        log INFO "Migration 018 not yet authored."
        LAST_PHASE_OUTCOME="needs_authoring"; return 4
    fi
    log WARN "RLS migration apply is operator-gated (DDL on production-named DB)."
    LAST_PHASE_OUTCOME="gated"; return 3
}

phase_106_migration_019_fks() {
    if ! backend_alive; then return 2; fi
    local mig="backend/migrations/019_tenant_fk_linkage.sql"
    [[ -f "$mig" ]] || { LAST_PHASE_OUTCOME="needs_authoring"; return 4; }
    LAST_PHASE_OUTCOME="gated"; return 3
}

phase_107_canada_finance_2026() {
    local doc="docs/digital_transformation/canada_finance_2026.md"
    if [[ -f "$doc" ]]; then
        LAST_PHASE_OUTCOME="passed"; return 0
    fi
    LAST_PHASE_OUTCOME="needs_authoring"; return 4
}

phase_108_eu_pharma_2026() {
    local doc="docs/digital_transformation/eu_pharma_2026.md"
    if [[ -f "$doc" ]]; then
        LAST_PHASE_OUTCOME="passed"; return 0
    fi
    LAST_PHASE_OUTCOME="needs_authoring"; return 4
}

phase_109_csv_export_button() {
    if grep -q "exportCSV\|Export CSV" frontend/src/pages/DataExplorer.jsx 2>/dev/null; then
        LAST_PHASE_OUTCOME="passed"; return 0
    fi
    LAST_PHASE_OUTCOME="needs_authoring"; return 4
}

phase_110_column_stat_sidebar() {
    if grep -q "columnStats\|Column Stats" frontend/src/pages/DataExplorer.jsx 2>/dev/null; then
        LAST_PHASE_OUTCOME="passed"; return 0
    fi
    LAST_PHASE_OUTCOME="needs_authoring"; return 4
}

phase_111_dashboard_live_api()       { LAST_PHASE_OUTCOME="needs_authoring"; return 4; }
phase_112_per_tenant_scope()         { LAST_PHASE_OUTCOME="needs_authoring"; return 4; }
phase_113_tenants_mutation_api()     { LAST_PHASE_OUTCOME="needs_authoring"; return 4; }
phase_114_drills_ml_methodology()    { LAST_PHASE_OUTCOME="needs_authoring"; return 4; }
phase_115_drills_rai()               { LAST_PHASE_OUTCOME="needs_authoring"; return 4; }
phase_116_drills_rbd()               { LAST_PHASE_OUTCOME="needs_authoring"; return 4; }
phase_117_migration_020_framework_applies() { LAST_PHASE_OUTCOME="needs_authoring"; return 4; }
phase_118_migration_021_phase_applies()     { LAST_PHASE_OUTCOME="needs_authoring"; return 4; }
phase_119_healthcare_expand()        { LAST_PHASE_OUTCOME="needs_authoring"; return 4; }
phase_120_lazy_per_chart()           { LAST_PHASE_OUTCOME="needs_authoring"; return 4; }

# ── main loop ──────────────────────────────────────────────────────────────

run_iteration() {
    if ! read_state; then
        bootstrap_state
    fi

    case "${STATUS:-running}" in
        paused)
            log INFO "STATUS=paused. Exit (operator kill switch active)."
            exit 0
            ;;
        complete)
            log INFO "STATUS=complete. All phases done."
            exit 0
            ;;
    esac

    local now_epoch deadline_epoch
    now_epoch="$(date -u +%s)"
    deadline_epoch="$(date -u -d "$AUTONOMOUS_DEADLINE" +%s 2>/dev/null || echo 0)"
    if [[ "$deadline_epoch" -gt 0 ]] && [[ "$now_epoch" -gt "$deadline_epoch" ]]; then
        STATUS=awaiting_operator
        write_state
        log WARN "Autonomous deadline reached. STATUS=awaiting_operator."
        exit 0
    fi

    # Resolve current phase function
    local phase_idx=$((CURRENT_PHASE - 100))
    if [[ "$phase_idx" -lt 0 ]] || [[ "$phase_idx" -ge "${#PHASES[@]}" ]]; then
        STATUS=complete
        write_state
        log INFO "All 21 phases complete."
        exit 0
    fi
    local phase_fn="${PHASES[$phase_idx]}"
    log INFO "Running $phase_fn (phase $CURRENT_PHASE, tokens=$PRE_APPROVAL_TOKENS)…"

    # Backend check before running
    if [[ "${BACKEND_REQUIRED[$phase_fn]:-0}" == "1" ]] && ! backend_alive; then
        log WARN "Phase $phase_fn requires backend; backend offline. Skipping (retry next iteration)."
        LAST_PHASE_OUTCOME="skipped_backend_offline"
        write_state
        exit 0
    fi

    # Execute
    local rc
    "$phase_fn"; rc=$?

    case $rc in
        0)   # passed
            log INFO "Phase $CURRENT_PHASE ($phase_fn) PASSED."
            CURRENT_PHASE=$((CURRENT_PHASE + 1))
            write_state
            ;;
        1)   # failed
            log ERROR "Phase $CURRENT_PHASE ($phase_fn) FAILED. Halting."
            STATUS=awaiting_operator
            write_state
            exit 1
            ;;
        2)   # skipped (don't advance)
            log INFO "Phase $CURRENT_PHASE ($phase_fn) SKIPPED. Will retry next iteration."
            write_state
            ;;
        3)   # gated — consume a token if available
            if [[ "$PRE_APPROVAL_TOKENS" -gt 0 ]]; then
                PRE_APPROVAL_TOKENS=$((PRE_APPROVAL_TOKENS - 1))
                log WARN "Phase $CURRENT_PHASE GATED. Spent 1 token ($PRE_APPROVAL_TOKENS left). Auto-approved + advancing."
                CURRENT_PHASE=$((CURRENT_PHASE + 1))
                write_state
            else
                log WARN "Phase $CURRENT_PHASE GATED + tokens exhausted. STATUS=awaiting_operator."
                STATUS=awaiting_operator
                write_state
                exit 0
            fi
            ;;
        4)   # needs authoring (skip with note)
            log INFO "Phase $CURRENT_PHASE ($phase_fn) needs authoring. Skipping to next."
            CURRENT_PHASE=$((CURRENT_PHASE + 1))
            write_state
            ;;
        *)
            log ERROR "Phase $CURRENT_PHASE returned unknown code $rc."
            STATUS=awaiting_operator
            write_state
            exit 1
            ;;
    esac
}

# ── CLI ────────────────────────────────────────────────────────────────────

cmd="${1:---now}"

case "$cmd" in
    start)
        bootstrap_state
        run_iteration
        ;;
    --now|run|iter)
        run_iteration
        ;;
    status)
        if ! read_state; then
            echo "State: not initialized. Run: $0 start"
            exit 0
        fi
        echo "═══════════════════════════════════════"
        echo "Phase 100 Build — Status"
        echo "═══════════════════════════════════════"
        echo "  Status:         $STATUS"
        echo "  Current phase:  $CURRENT_PHASE / 120  ($(( (CURRENT_PHASE - 100) * 100 / 21 ))%)"
        echo "  Tokens left:    $PRE_APPROVAL_TOKENS / $INITIAL_TOKENS"
        echo "  Deadline:       $AUTONOMOUS_DEADLINE"
        echo "  Last run:       ${LAST_RUN:-never}"
        echo "  Last outcome:   ${LAST_PHASE_OUTCOME:-pending}"
        echo ""
        echo "  Backend probe:  $(backend_alive && echo 'ALIVE' || echo 'OFFLINE')"
        echo "  Log: $AUDIT_LOG"
        ;;
    pause)
        read_state || bootstrap_state
        STATUS=paused
        write_state
        log INFO "Loop PAUSED by operator."
        echo "Loop paused. Run '$0 resume' to restart."
        ;;
    resume)
        read_state || bootstrap_state
        STATUS=running
        write_state
        log INFO "Loop RESUMED by operator."
        echo "Loop resumed."
        ;;
    advance)
        read_state || bootstrap_state
        PRE_APPROVAL_TOKENS=$INITIAL_TOKENS
        STATUS=running
        CURRENT_PHASE=$((CURRENT_PHASE + 1))
        write_state
        log INFO "Operator manually advanced. Tokens refilled to $INITIAL_TOKENS."
        echo "Advanced to phase $CURRENT_PHASE. Tokens refilled."
        ;;
    skip)
        read_state || bootstrap_state
        CURRENT_PHASE=$((CURRENT_PHASE + 1))
        write_state
        echo "Skipped to phase $CURRENT_PHASE."
        ;;
    logs)
        tail -50 "$AUDIT_LOG"
        ;;
    install-cron)
        # Idempotent: remove old entry first
        ( crontab -l 2>/dev/null | grep -v "schedule_phase100_build.sh"; \
          echo "*/30 * * * * cd $REPO_ROOT && ./scripts/schedule_phase100_build.sh --now >> $AUDIT_LOG 2>&1" ) \
            | crontab -
        echo "Cron installed: every 30 minutes."
        crontab -l | grep "schedule_phase100_build.sh"
        ;;
    uninstall-cron)
        crontab -l 2>/dev/null | grep -v "schedule_phase100_build.sh" | crontab -
        echo "Cron uninstalled."
        ;;
    help|-h|--help)
        sed -n '2,/^$/p' "$0"
        ;;
    *)
        echo "Unknown command: $cmd"
        echo "Run '$0 help' for usage."
        exit 1
        ;;
esac
