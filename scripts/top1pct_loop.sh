#!/bin/bash
# top1pct_loop.sh · daily diagnostic loop · finds next P0 to close.
#
# Per docs/TOP_1_PCT_PLAN_2026-06-09.md · this script is DIAGNOSTIC ONLY.
# It does NOT auto-edit code (operator reviews each iteration).
#
# It DOES:
#   - Read the plan
#   - Find the next PENDING P0
#   - Append daily status line to docs/TOP_1_PCT_STATUS.md
#   - Optionally: write a daily report under jobs/reports/top1pct/

set -e

REPO=/mnt/deepa/insur_project
PLAN=$REPO/docs/TOP_1_PCT_PLAN_2026-06-09.md
STATUS=$REPO/docs/TOP_1_PCT_STATUS.md
REPORTS_DIR=$REPO/jobs/reports/top1pct
LOG=$REPORTS_DIR/loop-$(date -u +%Y%m%d).log

mkdir -p "$REPORTS_DIR"

echo "=== Top-1% loop $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" | tee -a "$LOG"

if [ ! -f "$PLAN" ]; then
  echo "  ✗ plan not found: $PLAN" | tee -a "$LOG"
  exit 1
fi

# Find first PENDING row in the P0 backlog table
NEXT_ITEM=$(grep -E '^\| [0-9]+ \|' "$PLAN" | grep -F "PENDING" | head -1)

if [ -z "$NEXT_ITEM" ]; then
  echo "  ✓ no PENDING P0 items · backlog closed" | tee -a "$LOG"
  exit 0
fi

echo "  → next P0: $NEXT_ITEM" | tee -a "$LOG"

# Initialize status doc if missing
if [ ! -f "$STATUS" ]; then
  cat > "$STATUS" << 'EOF'
# Top-1% Daily Status

This file is appended by `scripts/top1pct_loop.sh` daily.

| Date | Next P0 | Status |
|---|---|---|
EOF
fi

# Append status row (short form)
ITEM_SHORT=$(echo "$NEXT_ITEM" | awk -F'|' '{print $3}' | sed 's/^ //;s/ $//' | cut -c1-60)
DATE_UTC=$(date -u +%Y-%m-%d)
echo "| $DATE_UTC | $ITEM_SHORT | PENDING |" >> "$STATUS"

# Quick health: count PENDING vs DONE
N_PENDING=$(grep -E '^\| [0-9]+ \|' "$PLAN" | grep -c "PENDING" || true)
N_DONE=$(grep -E '^\| [0-9]+ \|' "$PLAN" | grep -c "DONE" || true)
TOTAL=$((N_PENDING + N_DONE))

echo "  · P0 backlog: $N_DONE done · $N_PENDING pending · $TOTAL total" | tee -a "$LOG"

# Composite score estimate (per plan trajectory · linear interp)
SCORE=$((25 + N_DONE * 5))
[ $SCORE -gt 88 ] && SCORE=88
echo "  · composite score estimate: $SCORE / 100" | tee -a "$LOG"

# Emit JSON snapshot for backend consumption
SNAPSHOT=$REPORTS_DIR/snapshot.json
cat > "$SNAPSHOT" << EOF
{
  "date_utc": "$DATE_UTC",
  "p0_pending": $N_PENDING,
  "p0_done": $N_DONE,
  "p0_total": $TOTAL,
  "composite_score": $SCORE,
  "target_score": 88,
  "next_item": "$ITEM_SHORT"
}
EOF
echo "  · snapshot: $SNAPSHOT" | tee -a "$LOG"

echo "  ✓ loop done · operator reviews next P0 before next iteration" | tee -a "$LOG"
exit 0
