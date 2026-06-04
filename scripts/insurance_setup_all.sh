#!/usr/bin/env bash
# Insurance alignment — one-command end-to-end setup.
#
# Idempotent. Pre-approved per .claude/settings.local.json.
# Per global §61: invoke the project venv interpreter via absolute path.
#
# Steps:
#   1. Initialize / refresh operator-editable state files
#   2. Run the audit (writes jobs/reports/insurance/*.{json,md})
#   3. Install / refresh the hourly cron entries (audit + rollup)
#   4. Run the work_tracker rollup
#   5. Run the drill (positive + negative invariants)
#   6. Verify the production build still passes
#   7. Print status banner
#
# Usage:
#   bash scripts/insurance_setup_all.sh          # full setup
#   bash scripts/insurance_setup_all.sh --skip-build  # skip vite build
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY="/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python"
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
  esac
done

cyan()  { printf "\033[36m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }

cyan "[1/6] Initializing operator-editable state files…"
"$PY" "$ROOT/scripts/insurance_init_state.py" | sed 's/^/  /'
green "  ✓ state files current"

cyan "[2/6] Running insurance alignment audit…"
"$PY" "$ROOT/scripts/insurance_alignment_audit.py"
LATEST="$ROOT/jobs/reports/insurance/insurance_alignment_latest.json"
if "$PY" -c "import json,sys; d=json.load(open(sys.argv[1])); sys.exit(0 if d['summary']['failed']==0 else 1)" "$LATEST"; then
  green "  ✓ audit green ($(stat -c%s "$LATEST") bytes)"
else
  red   "  ✗ audit has failed rows — see $LATEST"
  exit 1
fi

cyan "[3/6] Installing / refreshing hourly cron entries (audit + rollup)…"
bash "$ROOT/scripts/install_insurance_alignment_cron.sh" >/dev/null
if crontab -l 2>/dev/null | grep -q insurance_alignment_audit.py && \
   crontab -l 2>/dev/null | grep -q insurance_workforce_rollup.py; then
  green "  ✓ both cron entries live (audit at :12, rollup at :13)"
else
  red   "  ✗ cron entries not visible in crontab"
  exit 1
fi

cyan "[4/6] Running work_tracker rollup…"
"$PY" "$ROOT/scripts/insurance_workforce_rollup.py" | tail -2
ROLLUP_OUT="$ROOT/data/work_tracker/insurance_alignment.json"
if [[ -s "$ROLLUP_OUT" ]]; then
  green "  ✓ rollup written ($(stat -c%s "$ROLLUP_OUT") bytes)"
else
  red   "  ✗ rollup output empty"
  exit 1
fi

cyan "[5/6] Running drill (positive + negative invariants)…"
DRILL_OUT="$("$PY" "$ROOT/tests/drills/drill_insurance_alignment.py" 2>&1)"
if echo "$DRILL_OUT" | tail -3 | grep -q "ALL invariants green"; then
  GREEN_LINE=$(echo "$DRILL_OUT" | grep -E "drill_insurance_alignment — [0-9]+/[0-9]+ green$")
  green "  ✓ $GREEN_LINE"
else
  red   "  ✗ drill failed — last 10 lines:"
  echo "$DRILL_OUT" | tail -10
  exit 1
fi

if [[ $SKIP_BUILD -eq 1 ]]; then
  cyan "[6/6] Skipping vite build (--skip-build)"
else
  cyan "[6/6] Running production build…"
  if (cd "$ROOT/frontend" && npm run build 2>&1 | tail -2 | grep -q "built in"); then
    green "  ✓ vite build clean"
  else
    red   "  ✗ vite build failed"
    exit 1
  fi
fi

echo
green "═══════════════════════════════════════════════════════════════"
green "  Insurance alignment surface is set up end-to-end."
green "═══════════════════════════════════════════════════════════════"
printf "  Audit report : %s\n" "$ROOT/jobs/reports/insurance/insurance_alignment_latest.md"
printf "  Cron logs    : %s\n" "$ROOT/jobs/logs/insurance_alignment_cron.log"
printf "                 %s\n" "$ROOT/jobs/logs/insurance_workforce_rollup_cron.log"
printf "  Blueprint    : %s\n" "$ROOT/data/insurance/blueprint.json"
printf "  State files  : %s\n" "$ROOT/data/insurance/{capability_status,maturity_state,implementation_state}.json"
printf "  Rollup       : %s\n" "$ROOT/data/work_tracker/insurance_alignment.json"
printf "  Plan doc     : %s\n" "$ROOT/docs/INSURANCE_PROJECT_ALIGNMENT_PLAN.md"
printf "  UI route     : http://localhost:5173/insurance (when vite dev is up)\n"
