#!/usr/bin/env bash
# pending_tasks_runner — single dispatcher for all 10 pending cron tasks.
#
# Per operator 2026-06-01: "create cron job for all pending task ..complete
# it with all approval"
#
# Each subcommand is a cron-safe task that:
#   - exits 0 on success, non-zero on failure
#   - logs to jobs/logs/pending_<task>.log
#   - never blocks awaiting input
#   - never invokes §42-gated operations (push/destroy/publish)
#
# Usage:
#   bash scripts/pending_tasks_runner.sh <task>
#
# Tasks:
#   drill              — run insurance drill
#   openapi            — regenerate OpenAPI snapshot
#   boot               — verify backend create_app() works
#   data-manifest      — verify data/insurance/_manifest.json integrity
#   reports-cleanup    — purge jobs/reports older than 30 days
#   voice-prune        — keep last 90 days in voice_history.db
#   module-sync        — drift-check between scaffolder ALL_MODULES + templates dir
#   prod-aggregate     — write production-readiness aggregate report
#   push-hint          — log whether origin is configured + commits behind
#   claude-md-drift    — check global CLAUDE.md §72 module count vs reality

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON="${PYTHON:-/media/praveen/praveenlinux21/praveen/aman/cuda/venv/bin/python}"
LOG_DIR="$REPO/jobs/logs"
REPORT_DIR="$REPO/jobs/reports"
mkdir -p "$LOG_DIR" "$REPORT_DIR"

TASK="${1:-help}"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

log() { printf '[%s] %s\n' "$TS" "$*"; }

case "$TASK" in
    drill)
        log "running insurance drill"
        "$PYTHON" "$REPO/tests/drills/drill_insurance_dept_artifacts.py" 2>&1 | tail -10
        ;;

    openapi)
        log "refreshing OpenAPI snapshot"
        "$PYTHON" "$REPO/scripts/generate_openapi_snapshot.py" 2>&1 | tail -3
        ;;

    boot)
        log "verifying backend create_app()"
        "$PYTHON" -c "
import sys
sys.path.insert(0, '$REPO/backend')
try:
    from main import create_app
    app = create_app()
    n = len([r for r in app.routes if hasattr(r, 'path')])
    print(f'BOOT_OK routes={n}')
except Exception as e:
    print(f'BOOT_FAIL {type(e).__name__}: {e}')
    sys.exit(1)
"
        ;;

    data-manifest)
        log "verifying data manifest"
        MAN="$REPO/data/insurance/_manifest.json"
        if [[ ! -f "$MAN" ]]; then
            log "manifest missing"
            exit 1
        fi
        OK=$("$PYTHON" -c "
import json
m = json.load(open('$MAN'))
n_ok = sum(1 for d in m['downloads'] if d['status'] == 'ok')
n_fail = sum(1 for d in m['downloads'] if d['status'] == 'fail')
print(f'ok={n_ok} fail={n_fail}')
" 2>&1)
        log "data manifest: $OK"
        ;;

    reports-cleanup)
        log "purging jobs/reports older than 30 days"
        N=$(find "$REPORT_DIR" -mindepth 1 -mtime +30 -type f -print | wc -l)
        find "$REPORT_DIR" -mindepth 1 -mtime +30 -type f -delete 2>/dev/null || true
        find "$REPORT_DIR" -mindepth 1 -mtime +30 -type d -empty -delete 2>/dev/null || true
        log "purged $N old report files"
        ;;

    voice-prune)
        log "pruning voice_history.db (90-day retention)"
        DB="$REPO/data/voice_history.db"
        if [[ -f "$DB" ]]; then
            N=$(sqlite3 "$DB" "SELECT COUNT(*) FROM voice_history WHERE ts < datetime('now', '-90 days');")
            sqlite3 "$DB" "DELETE FROM voice_history WHERE ts < datetime('now', '-90 days'); VACUUM;"
            log "pruned $N voice rows >90d old"
        else
            log "voice_history.db missing — skipped"
        fi
        ;;

    module-sync)
        log "module-sync drift check"
        SCAFFOLDER=/home/praveen/.claude/scripts/scaffold-production-readiness.sh
        TEMPLATES_DIR=/home/praveen/.claude/templates/production-readiness
        SCAFFOLD_N=$(grep -oP 'ALL_MODULES=\(\K[^)]+' "$SCAFFOLDER" | wc -w)
        TEMPLATE_N=$(find "$TEMPLATES_DIR" -maxdepth 1 -mindepth 1 -type d | wc -l)
        log "scaffolder lists $SCAFFOLD_N · template dir has $TEMPLATE_N"
        if [[ "$SCAFFOLD_N" -ne "$TEMPLATE_N" ]]; then
            log "DRIFT DETECTED — update scaffolder OR add module dir"
            exit 1
        fi
        log "in sync"
        ;;

    prod-aggregate)
        log "production-readiness aggregate"
        OUT="$REPORT_DIR/prod_readiness_$(date -u +%Y%m%d).md"
        {
            echo "# Production Readiness Aggregate — $(date -u)"
            echo
            echo "## Drill"
            tail -5 "$LOG_DIR/pending_drill.log" 2>/dev/null || echo "(no drill log)"
            echo
            echo "## Boot"
            tail -3 "$LOG_DIR/pending_boot.log" 2>/dev/null || echo "(no boot log)"
            echo
            echo "## Module sync"
            tail -3 "$LOG_DIR/pending_module-sync.log" 2>/dev/null || echo "(no sync log)"
            echo
            echo "## Modules available"
            ls /home/praveen/.claude/templates/production-readiness/ 2>/dev/null | sort | sed 's/^/  - /'
        } > "$OUT"
        log "aggregate: $OUT"
        ;;

    push-hint)
        log "git remote + push status"
        cd "$REPO"
        REMOTE=$(git remote get-url origin 2>/dev/null || echo "(no origin)")
        log "remote: $REMOTE"
        BEHIND=$(git log --oneline 2>/dev/null | wc -l)
        FROM_LAST_PUSH=$(git rev-list --count HEAD ^origin/main 2>/dev/null || echo "$BEHIND")
        log "commits ahead of origin/main: $FROM_LAST_PUSH"
        if [[ "$REMOTE" != "(no origin)" && "$FROM_LAST_PUSH" -gt 0 ]]; then
            log "HINT: git push origin main  (gated — operator-approved bundle)"
        fi
        ;;

    claude-md-drift)
        log "CLAUDE.md §72 module-count drift check"
        CMD=/home/praveen/.claude/CLAUDE.md
        STATED=$(grep -oP '72\.2 The \K[0-9]+' "$CMD" | head -1)
        ACTUAL=$(find /home/praveen/.claude/templates/production-readiness -maxdepth 1 -mindepth 1 -type d | wc -l)
        log "stated=$STATED  actual=$ACTUAL"
        if [[ -n "$STATED" && "$STATED" -ne "$ACTUAL" ]]; then
            log "DRIFT — §72.2 says $STATED, dir has $ACTUAL"
            exit 1
        fi
        log "in sync"
        ;;

    help|*)
        echo "usage: $0 <task>"
        echo "tasks: drill openapi boot data-manifest reports-cleanup voice-prune"
        echo "       module-sync prod-aggregate push-hint claude-md-drift"
        ;;
esac
