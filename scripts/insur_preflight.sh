#!/usr/bin/env bash
# insur_preflight.sh — §60 path-verification + key-tool reachability check.
# Per §57.5 5-question runbook — answers "WHAT can break?" before it breaks.
LOG=/mnt/deepa/insur_project/jobs/logs/insur_preflight.log
TS=$(date -Iseconds)
PROBLEMS=0

check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "[$TS] $name: OK" >>"$LOG"
  else
    echo "[$TS] $name: FAIL — $*" >>"$LOG"
    PROBLEMS=$((PROBLEMS+1))
  fi
}

check "cuda venv python"     test -x /media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python
check "kaggle CLI"           test -x /home/praveen/.local/bin/kaggle
check "kaggle credentials"   test -f /home/praveen/.kaggle/kaggle.json
check "insur_project/data"   test -d /mnt/deepa/insur_project/data/insurance
check "blueprint.json"       test -f /mnt/deepa/insur_project/data/insurance/blueprint.json

if [[ $PROBLEMS -gt 0 ]]; then
  echo "[$TS] PREFLIGHT: $PROBLEMS problem(s) — see above" >>"$LOG"
  exit 1
fi
echo "[$TS] PREFLIGHT: all clear" >>"$LOG"
exit 0
