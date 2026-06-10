#!/usr/bin/env bash
# refresh_insurance_catalog.sh — autonomous loop body per global §82.9 / §80.
#
# Cron-safe operations (no operator approval needed):
#   - re-run the generator (deterministic)
#   - regenerate sample data files (deterministic)
#   - run the drill (read-only)
#   - append audit row
#
# Gated operations (per §42 — never from cron):
#   - git push
#   - file deletes outside data/insurance/
#   - any prod / external write
#
# Exit codes: 0 OK · 1 generator failed · 2 drill failed · 3 audit write failed

set -uo pipefail

ROOT="${ROOT:-/mnt/deepa/insur_project}"
PY="${PY:-/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python}"
AUDIT="$ROOT/.agent/insurance_catalog_audit.jsonl"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

mkdir -p "$(dirname "$AUDIT")"

note() { echo "[$(date -u +%H:%M:%S)] $*"; }

audit() {
  local status="$1"; shift
  local detail="$*"
  printf '{"ts":"%s","status":"%s","detail":%s,"host":"%s"}\n' \
    "$TS" "$status" "$(printf '%s' "$detail" | "$PY" -c 'import json,sys; print(json.dumps(sys.stdin.read()))')" \
    "$(hostname)" >> "$AUDIT" || return 3
}

cd "$ROOT"

note "Regenerating insurance catalog…"
if ! "$PY" config/build_insurance_catalog.py > /tmp/insur_catalog_gen.json 2> /tmp/insur_catalog_gen.err; then
  audit "FAIL_GENERATOR" "$(tr '\n' ' ' < /tmp/insur_catalog_gen.err | head -c 500)"
  if [[ -x "$HOME/agent_notify.sh" ]]; then
    "$HOME/agent_notify.sh" "Insurance catalog refresh FAILED" "$(tail -1 /tmp/insur_catalog_gen.err)"
  fi
  exit 1
fi
SUMMARY="$(cat /tmp/insur_catalog_gen.json | tr -d '\n')"
note "Generator OK · $SUMMARY"

note "Running drill…"
if ! "$PY" tests/drills/drill_insurance_catalog.py > /tmp/insur_catalog_drill.log 2>&1; then
  audit "FAIL_DRILL" "$(tail -20 /tmp/insur_catalog_drill.log | tr -d '\n' | head -c 500)"
  if [[ -x "$HOME/agent_notify.sh" ]]; then
    "$HOME/agent_notify.sh" "Insurance catalog DRILL FAILED" "$(tail -2 /tmp/insur_catalog_drill.log)"
  fi
  exit 2
fi
note "Drill OK"

audit "OK" "$SUMMARY"
note "Cycle complete · audit appended."
exit 0
