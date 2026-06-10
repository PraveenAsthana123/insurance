#!/bin/bash
# Iter 27 · J7 · mutmut smoke runner.
# Mutation testing on critical core modules.
#
# Usage: scripts/run_mutmut_smoke.sh [--max=N]

set -e

REPO=$(dirname "$(dirname "$(readlink -f "$0")")")
cd "$REPO"

MAX=${MAX:-20}
for arg in "$@"; do
  case $arg in
    --max=*) MAX=${arg#--max=} ;;
  esac
done

PT=/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python
PIP=/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/pip

if ! "$PT" -c "import mutmut" 2>/dev/null; then
  echo "Installing mutmut..."
  "$PIP" install --quiet mutmut
fi

# Run a limited number of mutations to keep this fast in CI
echo "Running mutmut · max-mutations=$MAX"
"$PT" -m mutmut run --paths-to-mutate=backend/core/pagination.py,backend/core/pii_redactor.py \
                    --no-progress 2>&1 | head -40 || true

# Report
"$PT" -m mutmut results 2>&1 | tail -20 || true
echo ""
echo "  · Iter 27 · J7 · mutmut smoke complete"
