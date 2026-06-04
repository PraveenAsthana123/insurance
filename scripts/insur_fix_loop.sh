#!/usr/bin/env bash
# insur_fix_loop.sh — 6-stage idempotent fix loop for the insurance workstream.
#
# Per global §43 (drills) + §57 (production-grade discipline) + §70 (scheduled
# audit) + §71 (correction discipline). Runs every 30 min via cron + 09:00 +
# 21:00 comprehensive.
#
# Stages:
#   1. enrich         — seed any new derived skeletons (idempotent)
#   2. audit          — validate structural alignment (290 checks)
#   3. drill          — run negative-assertion drill (173/173 must pass)
#   4. build          — production build (catches JSX errors)
#   5. smoke          — curl 17 tab routes on dev server (each must return 200)
#   6. report         — write per-stage status to jobs/reports/insurance/
#
# Exit 0 if all 6 stages green. Exit non-zero on first failure.
# Outputs land under jobs/reports/insurance/ and jobs/logs/insurance/.

set -euo pipefail

ROOT="/mnt/deepa/insur_project"
VENV_PY="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"
TS="$(date +%Y%m%d_%H%M%S)"
REPORT_DIR="$ROOT/jobs/reports/insurance"
LOG_DIR="$ROOT/jobs/logs/insurance"
LOG_FILE="$LOG_DIR/insur_fix_loop_${TS}.log"
REPORT_FILE="$REPORT_DIR/insur_fix_loop_${TS}.md"
LOCK_FILE="$LOG_DIR/.fix_loop.lock"
mkdir -p "$REPORT_DIR" "$LOG_DIR"

cd "$ROOT"

# Acquire exclusive lock so 09:00 + 21:00 comprehensive don't collide with
# the */30 light run that fires at the same minute. flock auto-releases on
# script exit. -n = non-blocking; exits 0 if can't acquire (skip this run).
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$(date +%H:%M:%S)] another insur_fix_loop is already running — skipping this tick" >> "$LOG_DIR/cron.log"
  exit 0
fi

# Comprehensive run only when flag is passed (09:00 + 21:00 cron entries).
COMPREHENSIVE="${1:-}"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }

stage_status=()
declare -A stage_result

run_stage() {
  local name="$1"; shift
  log "▶ stage: $name"
  if "$@" >> "$LOG_FILE" 2>&1; then
    stage_status+=("✓ $name")
    stage_result[$name]="pass"
    log "  ✓ $name OK"
    return 0
  else
    stage_status+=("✗ $name (see log)")
    stage_result[$name]="fail"
    log "  ✗ $name FAILED — see $LOG_FILE"
    return 1
  fi
}

# Stage 0: rotation — keep N=50 most recent of each output type (prevents
# unbounded disk growth from cron). Runs first so even a failed loop tick
# still does the housekeeping.
KEEP=50
rotate() {
  local pattern="$1"
  local files=( $(ls -t $pattern 2>/dev/null) )
  if (( ${#files[@]} > KEEP )); then
    for f in "${files[@]:$KEEP}"; do rm -f "$f"; done
  fi
}
rotate "$REPORT_DIR/insur_fix_loop_*.md"
rotate "$REPORT_DIR/insurance_alignment_*.md"
rotate "$REPORT_DIR/insurance_alignment_*.json"
rotate "$LOG_DIR/insur_fix_loop_*.log"
# cron.log is append-only single file → tail-truncate to last 2000 lines (≈ 6 weeks)
if [[ -f "$LOG_DIR/cron.log" ]] && (( $(wc -l < "$LOG_DIR/cron.log") > 2000 )); then
  tail -2000 "$LOG_DIR/cron.log" > "$LOG_DIR/cron.log.tmp" && mv "$LOG_DIR/cron.log.tmp" "$LOG_DIR/cron.log"
fi
stage_status+=("✓ 0.rotate (kept $KEEP most recent of each + cron.log tail 2000)")
stage_result["0.rotate"]="pass"

# Stage 1: enrich (idempotent) + back-fill orphan AI catalog entries
run_stage "1.enrich" "$VENV_PY" scripts/insurance_enrich_processes.py || true
run_stage "1b.backfill_orphan_ai" "$VENV_PY" scripts/insurance_backfill_orphan_ai.py || true

# Stage 2: audit (290 checks must pass)
run_stage "2.audit" "$VENV_PY" scripts/insurance_alignment_audit.py || true

# Stage 3: drill (173/173 must pass)
run_stage "3.drill" "$VENV_PY" tests/drills/drill_insurance_alignment.py || true

# Stage 4: build (only on comprehensive run — heavy, ~45s)
if [[ "$COMPREHENSIVE" == "--comprehensive" ]]; then
  run_stage "4.build" bash -c "cd $ROOT/frontend && timeout 480 npm run build" || true
else
  stage_status+=("— 4.build (skipped — light run)")
  stage_result["4.build"]="skip"
fi

# Stage 5: smoke (17 tab routes — only if dev server is up on :5173)
SERVER_UP=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5173/" 2>/dev/null || echo "DOWN")
if [[ "$SERVER_UP" == "200" ]]; then
  TABS=(readme tech-stack demo-story as-is-to-be problem data manual automatic flow-diagram output visualization dashboard resai expai governance tests security)
  failed=0
  for tab in "${TABS[@]}"; do
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5173/insurance/7/B2C/CL_FNOL?tab=$tab")
    if [[ "$code" != "200" ]]; then failed=$((failed+1)); fi
    echo "  $code  ?tab=$tab" >> "$LOG_FILE"
  done
  if [[ $failed -eq 0 ]]; then
    stage_status+=("✓ 5.smoke (17/17 routes 200)")
    stage_result["5.smoke"]="pass"
    log "  ✓ smoke OK (17/17 routes 200)"
  else
    stage_status+=("✗ 5.smoke ($failed/17 routes non-200)")
    stage_result["5.smoke"]="fail"
    log "  ✗ smoke FAIL ($failed/17 routes non-200)"
  fi
else
  stage_status+=("— 5.smoke (skipped — dev server down)")
  stage_result["5.smoke"]="skip"
  log "  — smoke skipped — dev server returned $SERVER_UP"
fi

# Stage 6: report (this stage always succeeds — just writes summary)
cat > "$REPORT_FILE" <<EOF
# Insurance fix-loop run · $TS

Mode: ${COMPREHENSIVE:-light}
Log:  \`$LOG_FILE\`
Repo: \`$ROOT\`

## Stage results

$(printf "%s\n" "${stage_status[@]}" | sed 's/^/- /')

## Trailing log tail (last 20 lines)

\`\`\`
$(tail -20 "$LOG_FILE")
\`\`\`

## Composes with

- §43 drill discipline · §57 production-grade · §70 scheduled audit · §71 correction discipline
- §65.8 8-tier testing dispatch · §73 17-tab right pane

EOF

log "REPORT: $REPORT_FILE"

# Exit non-zero if any non-skipped stage failed
fail=0
for k in "${!stage_result[@]}"; do
  [[ "${stage_result[$k]}" == "fail" ]] && fail=$((fail+1))
done

if [[ $fail -gt 0 ]]; then
  log "✗ FAIL — $fail stage(s) failed"
  exit 1
fi
log "✓ ALL GREEN"
exit 0
