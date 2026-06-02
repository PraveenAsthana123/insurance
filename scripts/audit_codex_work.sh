#!/usr/bin/env bash
# audit_codex_work.sh — surface what Codex (parallel session) has shipped.
#
# Per operator 2026-06-01 ("what codex is working you should get to know").
# Run from either session to see the cross-session work surface.

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

red()    { printf "\033[1;31m%s\033[0m\n" "$*"; }
green()  { printf "\033[1;32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[1;33m%s\033[0m\n" "$*"; }
blue()   { printf "\033[1;34m%s\033[0m\n" "$*"; }

cd "$REPO"

blue "═══ Codex scripts ═══"
for f in setup_claude_autonomy.sh automation_job_runner.py watch_codex_approvals.sh \
         install_codex_approval_cron.sh install_codex_approval_advanced.sh \
         archon_auto_approve_safe.py voice_in.py voice_out.py; do
    if [[ -f "scripts/$f" ]]; then
        green "  ✓ scripts/$f ($(wc -l <"scripts/$f") LOC)"
    else
        red "  ✗ scripts/$f missing"
    fi
done

echo
blue "═══ Codex docs ═══"
for d in CLAUDE_AUTONOMY_APPROVAL_POLICY.md NO_APPROVAL_AUTONOMY_POLICY.md \
         CODEX_APPROVAL_CRON_POLICY.md CODEX_APPROVAL_ADVANCED_POLICY.md \
         CODEX_APPROVAL_CRON_RUN_PLAN.md APPROVAL_GOVERNANCE.md; do
    if [[ -f "docs/$d" ]]; then
        green "  ✓ docs/$d"
    else
        yellow "  ! docs/$d not present yet"
    fi
done

echo
blue "═══ Codex cron blocks ═══"
crontab -l 2>/dev/null | awk '
    /^# === INSUR-AUTOMATION-JOBS/ { codex_block="automation"; print " ", $0; next }
    /^# === CODEX-SAFE-APPROVAL/   { codex_block="approval";   print " ", $0; next }
    /^# === .* — end/              { codex_block=""; next }
    codex_block != "" && $0 ~ /^[0-9*]/ { print "    →", $0 }
'

echo
blue "═══ Codex log files (last 3 lines each) ═══"
for log in jobs/logs/codex_approval_*.log jobs/logs/automation_*.log; do
    if [[ -f "$log" ]]; then
        echo "  $log:"
        tail -3 "$log" 2>/dev/null | sed 's|^|    |'
    fi
done

echo
blue "═══ Recent commits (any session) ═══"
git log --since='4 hours ago' --oneline | head -15 | sed 's|^|  |'

echo
blue "═══ Recently modified files (last 1h) ═══"
find . -maxdepth 4 -type f -mmin -60 \
    \( -name "*.py" -o -name "*.sh" -o -name "*.md" -o -name "*.yml" \) \
    -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./*pycache*" \
    2>/dev/null | head -20 | sed 's|^|  |'

echo
blue "═══ Coordination doc ═══"
if [[ -f "$REPO/docs/CLAUDE_CODEX_COORDINATION.md" ]]; then
    green "  ✓ docs/CLAUDE_CODEX_COORDINATION.md present"
else
    yellow "  ! coordination doc missing"
fi

green ""
green "✓ Audit complete. See docs/CLAUDE_CODEX_COORDINATION.md for file-ownership table."
